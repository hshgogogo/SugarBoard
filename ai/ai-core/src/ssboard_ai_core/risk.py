from __future__ import annotations

from dataclasses import dataclass, field

from .models import ExecutionMode, JobStatus, RiskLevel
from .normalize import NormalizedRequest
from .registry import MAX_GREEN_ROWS


@dataclass
class RiskAssessment:
    risk_level: RiskLevel
    reason: str
    refine_suggestions: list[str] = field(default_factory=list)
    execution_mode: ExecutionMode | None = None
    terminal_status: JobStatus | None = None
    error_code: str | None = None


RED_KEYWORDS = ["insert ", "update ", "delete ", "drop ", "alter ", "truncate ", ";--", "/*", "*/"]


def assess_risk(normalized: NormalizedRequest) -> RiskAssessment:
    lower = normalized.normalized_question.lower()

    if any(keyword in lower for keyword in RED_KEYWORDS):
        return RiskAssessment(
            risk_level=RiskLevel.RED,
            reason="检测到疑似写操作或注入样式输入，已按只读边界拒绝。",
            terminal_status=JobStatus.FAILED,
            error_code="GUARDRAIL_REJECTED",
        )

    if normalized.asks_export or normalized.asks_external_action:
        return RiskAssessment(
            risk_level=RiskLevel.RED,
            reason="该请求包含导出、脚本执行或外部抓取意图，超出 SSBoard v1 只读分析边界。",
            terminal_status=JobStatus.FAILED,
            error_code="GUARDRAIL_REJECTED",
        )

    if normalized.asks_prediction or normalized.inferred_intent.value == "anomaly_detection":
        return RiskAssessment(
            risk_level=RiskLevel.RED,
            reason="该问题属于预测或高级分析意图，当前 v1 不支持自动执行。",
            terminal_status=JobStatus.FAILED,
            error_code="UNSUPPORTED_ANALYSIS_INTENT",
        )

    if normalized.asks_direct_sql:
        return RiskAssessment(
            risk_level=RiskLevel.YELLOW,
            reason="请用业务问题而不是直接提交 SQL，系统需要先做白名单规划与限缩。",
            refine_suggestions=[
                "请改成业务问题，例如“最近7天电影热榜前10是谁？”",
                "请补充具体榜单类型、时间范围或实体名称。",
            ],
            terminal_status=JobStatus.NEEDS_REFINE,
        )

    if normalized.is_broad_query:
        return RiskAssessment(
            risk_level=RiskLevel.YELLOW,
            reason="问题范围过大，直接执行会产生过宽结果集，不适合在工作台中直接展示。",
            refine_suggestions=[
                "请限定时间范围，例如最近7天、30天或90天。",
                "请限定榜单类型，例如艺人榜、电影榜、剧集榜。",
                "请限定结果规模，例如前10或前20。",
            ],
            terminal_status=JobStatus.BLOCKED,
        )

    if normalized.is_ambiguous:
        return RiskAssessment(
            risk_level=RiskLevel.YELLOW,
            reason="问题上下文不足，暂时无法确定分析对象或口径。",
            refine_suggestions=[
                "请补充具体实体名称，例如《庆余年》或某位艺人。",
                "请说明希望看的榜单类型或时间窗口。",
            ],
            terminal_status=JobStatus.NEEDS_REFINE,
        )

    if normalized.top_n is not None and normalized.top_n > MAX_GREEN_ROWS:
        return RiskAssessment(
            risk_level=RiskLevel.YELLOW,
            reason="请求结果规模超过 Green 路径建议上限，需要先缩小范围。",
            refine_suggestions=[
                "请将结果限制在前200以内。",
                "或补充来源、平台、题材等筛选条件。",
            ],
            terminal_status=JobStatus.BLOCKED,
        )

    execution_mode = _execution_mode_for_green(normalized)
    return RiskAssessment(
        risk_level=RiskLevel.GREEN,
        reason="请求满足只读、白名单、有界结果集的 Green 执行条件。",
        execution_mode=execution_mode,
    )


def _execution_mode_for_green(normalized: NormalizedRequest) -> ExecutionMode:
    if normalized.top_n and normalized.top_n > 50:
        return ExecutionMode.ASYNC_SQL
    if normalized.filters.window in {"90d", "365d"}:
        return ExecutionMode.ASYNC_SQL
    if len(normalized.entity_names) > 2:
        return ExecutionMode.ASYNC_SQL
    return ExecutionMode.SYNC_SQL
