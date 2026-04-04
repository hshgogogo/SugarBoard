from __future__ import annotations

from datetime import datetime, timedelta, timezone

from .charts import placeholder_chart
from .models import AnalysisContext, AnalysisPlan, ExecutionMode, FilterSet, GuardrailSummary, Intent, RiskLevel
from .normalize import NormalizedRequest, normalize_request
from .registry import ASYNC_TIMEOUT_MS, DEFAULT_ROW_LIMIT, SYNC_TIMEOUT_MS, allowed_views_for_intent
from .risk import RiskAssessment, assess_risk


class AnalysisPlanner:
    def plan(self, question: str, context: AnalysisContext | None = None) -> tuple[AnalysisPlan, NormalizedRequest, RiskAssessment]:
        normalized = normalize_request(question, context)
        assessment = assess_risk(normalized)
        allowed_views = allowed_views_for_intent(normalized.inferred_intent)
        row_limit = _row_limit(normalized)
        timeout_ms = ASYNC_TIMEOUT_MS if assessment.execution_mode == ExecutionMode.ASYNC_SQL else SYNC_TIMEOUT_MS

        guardrail_summary = GuardrailSummary(
            allowed_views=allowed_views,
            row_limit=row_limit,
            timeout_ms=timeout_ms,
            notes=[
                "仅允许 SELECT 语句。",
                "仅允许访问白名单分析视图。",
                "Yellow 请求不会自动执行。",
                "Red 请求直接拒绝，不进入执行链路。",
            ],
        )

        if assessment.risk_level == RiskLevel.GREEN:
            sql_text = _build_sql(normalized, row_limit)
            sql_explanation = _build_sql_explanation(normalized, assessment.execution_mode, row_limit)
            chart = placeholder_chart(normalized.inferred_intent, question)
        elif assessment.risk_level == RiskLevel.YELLOW:
            sql_text = None
            sql_explanation = "当前问题需要先缩小范围或澄清上下文，系统不会自动执行 SQL。"
            chart = None
        else:
            sql_text = None
            sql_explanation = "当前问题触发了 v1 只读分析边界，系统已拒绝生成可执行 SQL。"
            chart = None

        plan = AnalysisPlan(
            intent=normalized.inferred_intent,
            risk_level=assessment.risk_level,
            execution_mode=assessment.execution_mode,
            sql_text=sql_text,
            sql_explanation=sql_explanation,
            guardrail_summary=guardrail_summary,
            data_scope=normalized.filters,
            recommended_visualization=chart,
            risk_reason=assessment.reason,
            refine_suggestions=assessment.refine_suggestions,
        )
        return plan, normalized, assessment


def _row_limit(normalized: NormalizedRequest) -> int:
    if normalized.top_n:
        return min(normalized.top_n, 200)
    if normalized.inferred_intent == Intent.TREND_EXPLAIN:
        return 120
    return DEFAULT_ROW_LIMIT


def _build_sql_explanation(normalized: NormalizedRequest, execution_mode: ExecutionMode | None, row_limit: int) -> str:
    mode_text = execution_mode.value if execution_mode else "none"
    views = ", ".join(allowed_views_for_intent(normalized.inferred_intent)) or "无"
    parts = [
        f"本次请求被识别为 `{normalized.inferred_intent.value}`。",
        f"执行模式为 `{mode_text}`。",
        f"将仅访问白名单视图：{views}。",
        f"结果集上限为 {row_limit} 行。",
    ]
    if normalized.filters.window:
        parts.append(f"时间窗口已归一化为 {normalized.filters.window}。")
    if normalized.ranking_type:
        parts.append(f"榜单类型已归一化为 {normalized.ranking_type}。")
    if normalized.entity_names:
        parts.append(f"实体范围为 {', '.join(normalized.entity_names)}。")
    return " ".join(parts)


def _build_sql(normalized: NormalizedRequest, row_limit: int) -> str:
    if normalized.inferred_intent in {Intent.OVERVIEW, Intent.RANKING_COMPARE, Intent.SOURCE_COMPARE}:
        return _build_ranking_sql(normalized, row_limit)
    if normalized.inferred_intent in {Intent.TREND_EXPLAIN, Intent.ENTITY_DEEP_DIVE}:
        return _build_metric_sql(normalized, row_limit)
    return _build_safe_fallback_sql(row_limit)


def _build_ranking_sql(normalized: NormalizedRequest, row_limit: int) -> str:
    ranking_type = normalized.ranking_type or "movies"
    where = [
        f"ranking_type = '{ranking_type}'",
        "snapshot_date = (SELECT MAX(snapshot_date) FROM ai_read_rankings)",
    ]
    if normalized.filters.source_ids:
        source_ids = ", ".join(f"'{item}'" for item in normalized.filters.source_ids)
        where.append(f"source_id IN ({source_ids})")
    if normalized.filters.platform_ids:
        platform_ids = ", ".join(f"'{item}'" for item in normalized.filters.platform_ids)
        where.append(f"platform_id IN ({platform_ids})")
    if normalized.filters.genres:
        genres = ", ".join(f"'{item}'" for item in normalized.filters.genres)
        where.append(f"genre IN ({genres})")
    if normalized.inferred_intent == Intent.SOURCE_COMPARE:
        return (
            "SELECT source_name, AVG(score) AS metric_value\n"
            "FROM ai_read_rankings\n"
            f"WHERE {' AND '.join(where)}\n"
            "GROUP BY source_name\n"
            "ORDER BY metric_value DESC\n"
            f"LIMIT {row_limit};"
        )
    return (
        "SELECT snapshot_date, rank, entity_name, score, delta_value, delta_percent, source_name\n"
        "FROM ai_read_rankings\n"
        f"WHERE {' AND '.join(where)}\n"
        "ORDER BY rank ASC\n"
        f"LIMIT {row_limit};"
    )


def _build_metric_sql(normalized: NormalizedRequest, row_limit: int) -> str:
    end_date = normalized.filters.as_of or datetime.now(timezone.utc).date().isoformat()
    window_days = _window_days(normalized.filters.window)
    start_date = (datetime.fromisoformat(end_date).date() - timedelta(days=window_days - 1)).isoformat()
    entities = normalized.entity_names or ["目标对象"]
    entity_clause = ", ".join(f"'{name}'" for name in entities)
    return (
        "SELECT snapshot_date, entity_name, metric_value, source_name\n"
        "FROM ai_read_entity_metrics\n"
        "WHERE metric_name = 'heat_score'\n"
        f"  AND entity_name IN ({entity_clause})\n"
        f"  AND snapshot_date BETWEEN DATE '{start_date}' AND DATE '{end_date}'\n"
        "ORDER BY snapshot_date ASC, entity_name ASC\n"
        f"LIMIT {row_limit};"
    )


def _build_safe_fallback_sql(row_limit: int) -> str:
    return (
        "SELECT snapshot_date, entity_name, score\n"
        "FROM ai_read_rankings\n"
        "WHERE snapshot_date = (SELECT MAX(snapshot_date) FROM ai_read_rankings)\n"
        "ORDER BY rank ASC\n"
        f"LIMIT {row_limit};"
    )


def _window_days(window: str | None) -> int:
    mapping = {"7d": 7, "30d": 30, "90d": 90, "365d": 365}
    return mapping.get(window or "30d", 30)
