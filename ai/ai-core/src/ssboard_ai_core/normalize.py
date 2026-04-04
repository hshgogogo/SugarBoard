from __future__ import annotations

import re
from dataclasses import dataclass, field

from .models import AnalysisContext, FilterSet, Intent


WINDOW_PATTERNS = [
    (re.compile(r"(近|最近|过去)\s*7\s*天"), "7d"),
    (re.compile(r"(近|最近|过去)\s*30\s*天"), "30d"),
    (re.compile(r"(近|最近|过去)\s*90\s*天"), "90d"),
    (re.compile(r"(近|最近|过去)\s*1\s*年"), "365d"),
    (re.compile(r"近一周"), "7d"),
    (re.compile(r"近一个月|上月|最近一个月"), "30d"),
    (re.compile(r"近三个月"), "90d"),
    (re.compile(r"近一年"), "365d"),
]

TOP_N_PATTERN = re.compile(r"(?:top\s*|前)(\d{1,3})", re.IGNORECASE)
TITLE_PATTERN = re.compile(r"《([^》]+)》")


@dataclass
class NormalizedRequest:
    question: str
    normalized_question: str
    context: AnalysisContext
    filters: FilterSet
    ranking_type: str | None = None
    entity_names: list[str] = field(default_factory=list)
    top_n: int | None = None
    inferred_intent: Intent = Intent.OVERVIEW
    is_broad_query: bool = False
    is_ambiguous: bool = False
    asks_export: bool = False
    asks_external_action: bool = False
    asks_prediction: bool = False
    asks_direct_sql: bool = False


def normalize_request(question: str, context: AnalysisContext | None = None) -> NormalizedRequest:
    context = context or AnalysisContext()
    normalized = re.sub(r"\s+", " ", question.strip())
    normalized = normalized.replace("？", "?").replace("，", ",")
    filters = FilterSet(
        as_of=context.filters.as_of,
        window=context.filters.window,
        source_ids=list(context.filters.source_ids),
        platform_ids=list(context.filters.platform_ids),
        genres=list(context.filters.genres),
    )

    for pattern, window in WINDOW_PATTERNS:
        if pattern.search(normalized):
            filters.window = window
            break

    ranking_type = context.ranking_type or _infer_ranking_type(normalized)
    top_n = _infer_top_n(normalized)
    entity_names = _extract_entity_names(normalized, context)
    inferred_intent = _infer_intent(normalized, ranking_type, entity_names)

    broad_keywords = ("所有", "全部", "全量", "全部数据", "所有艺人", "所有电影", "所有剧集")
    ambiguous = not entity_names and ranking_type is None and inferred_intent in {Intent.OVERVIEW, Intent.ENTITY_DEEP_DIVE}

    return NormalizedRequest(
        question=question,
        normalized_question=normalized,
        context=context,
        filters=filters,
        ranking_type=ranking_type,
        entity_names=entity_names,
        top_n=top_n,
        inferred_intent=inferred_intent,
        is_broad_query=any(keyword in normalized for keyword in broad_keywords),
        is_ambiguous=ambiguous,
        asks_export=_contains_any(normalized.lower(), ["导出", "下载", "excel", "csv", "原始数据", "全量数据"]),
        asks_external_action=_contains_any(
            normalized.lower(),
            ["python", "shell", "脚本", "notebook", "爬虫", "抓取", "外部网络", "curl", "wget"],
        ),
        asks_prediction=_contains_any(normalized, ["预测", "未来", "下周", "下个月", "会不会", "为什么一定会"]),
        asks_direct_sql=_contains_any(normalized.lower(), ["select ", "sql", "from ", "where "]),
    )


def _contains_any(text: str, needles: list[str]) -> bool:
    return any(needle in text for needle in needles)


def _infer_ranking_type(question: str) -> str | None:
    mapping = {
        "艺人": "artists",
        "角色": "characters",
        "剧集": "series",
        "电视剧": "series",
        "电影": "movies",
    }
    for token, ranking_type in mapping.items():
        if token in question:
            return ranking_type
    return None


def _infer_top_n(question: str) -> int | None:
    match = TOP_N_PATTERN.search(question)
    if match:
        return int(match.group(1))
    return 20 if "榜" in question else None


def _extract_entity_names(question: str, context: AnalysisContext) -> list[str]:
    names = TITLE_PATTERN.findall(question)
    if context.entity_refs:
        names.extend(entity.name for entity in context.entity_refs if entity.name)
    deduped: list[str] = []
    for name in names:
        if name not in deduped:
            deduped.append(name)
    return deduped


def _infer_intent(question: str, ranking_type: str | None, entity_names: list[str]) -> Intent:
    if any(keyword in question for keyword in ["来源", "按来源", "来源对比", "平台分布", "占比", "分布"]):
        return Intent.SOURCE_COMPARE
    if any(keyword in question for keyword in ["趋势", "走势", "变化", "波动"]) and entity_names:
        return Intent.TREND_EXPLAIN
    if any(keyword in question for keyword in ["详情", "深挖", "关系", "合作", "关联"]):
        return Intent.ENTITY_DEEP_DIVE
    if any(keyword in question for keyword in ["异常检测", "异常点", "离群", "聚类", "相关性"]):
        return Intent.ANOMALY_DETECTION
    if any(keyword in question.lower() for keyword in ["select ", "sql", "from ", "where "]):
        return Intent.CUSTOM_READONLY_SQL
    if ranking_type or any(keyword in question for keyword in ["榜", "前十", "top", "排名", "冠军"]):
        return Intent.RANKING_COMPARE
    return Intent.OVERVIEW
