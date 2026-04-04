from __future__ import annotations

from dataclasses import dataclass, field, fields, is_dataclass
from datetime import date, datetime
from enum import Enum
from typing import Any
from uuid import uuid4


class StrEnum(str, Enum):
    pass


class RiskLevel(StrEnum):
    GREEN = "green"
    YELLOW = "yellow"
    RED = "red"


class ExecutionMode(StrEnum):
    SYNC_SQL = "sync_sql"
    ASYNC_SQL = "async_sql"


class Intent(StrEnum):
    OVERVIEW = "overview"
    RANKING_COMPARE = "ranking_compare"
    TREND_EXPLAIN = "trend_explain"
    ENTITY_DEEP_DIVE = "entity_deep_dive"
    SOURCE_COMPARE = "source_compare"
    ANOMALY_DETECTION = "anomaly_detection"
    CUSTOM_READONLY_SQL = "custom_readonly_sql"


class JobStatus(StrEnum):
    QUEUED = "queued"
    PLANNING = "planning"
    RUNNING = "running"
    SUMMARIZING = "summarizing"
    BLOCKED = "blocked"
    NEEDS_REFINE = "needs_refine"
    SUCCEEDED = "succeeded"
    FAILED = "failed"
    CANCELLED = "cancelled"


class StepName(StrEnum):
    PLANNING = "planning"
    SQL_EXECUTION = "sql_execution"
    CHART_COMPILATION = "chart_compilation"
    SUMMARY_GENERATION = "summary_generation"


class StepStatus(StrEnum):
    PENDING = "pending"
    RUNNING = "running"
    SUCCEEDED = "succeeded"
    FAILED = "failed"
    SKIPPED = "skipped"


class ChartType(StrEnum):
    LINE = "line"
    BAR = "bar"
    AREA = "area"
    PIE = "pie"
    STACKED_BAR = "stacked_bar"


def _serialize(value: Any) -> Any:
    if isinstance(value, Enum):
        return value.value
    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, date):
        return value.isoformat()
    if is_dataclass(value):
        return {f.name: _serialize(getattr(value, f.name)) for f in fields(value)}
    if isinstance(value, list):
        return [_serialize(item) for item in value]
    if isinstance(value, dict):
        return {k: _serialize(v) for k, v in value.items()}
    return value


@dataclass
class Serializable:
    def to_dict(self) -> dict[str, Any]:
        return _serialize(self)


@dataclass
class FilterSet(Serializable):
    as_of: str | None = None
    window: str | None = None
    source_ids: list[str] = field(default_factory=list)
    platform_ids: list[str] = field(default_factory=list)
    genres: list[str] = field(default_factory=list)


@dataclass
class EntityReference(Serializable):
    id: str
    entity_type: str
    name: str
    subtitle: str | None = None
    work_type: str | None = None
    avatar_url: str | None = None
    tags: list[str] = field(default_factory=list)


@dataclass
class AnalysisContext(Serializable):
    filters: FilterSet = field(default_factory=FilterSet)
    ranking_type: str | None = None
    entity_refs: list[EntityReference] = field(default_factory=list)


@dataclass
class AnalysisRequest(Serializable):
    question: str
    context: AnalysisContext | None = None


@dataclass
class GuardrailSummary(Serializable):
    allowed_views: list[str]
    row_limit: int
    timeout_ms: int
    notes: list[str] = field(default_factory=list)


@dataclass
class ChartPoint(Serializable):
    x: str
    y: float
    label: str | None = None
    meta: dict[str, Any] = field(default_factory=dict)


@dataclass
class ChartSeries(Serializable):
    name: str
    points: list[ChartPoint]
    color: str | None = None


@dataclass
class ChartSpec(Serializable):
    chart_type: ChartType
    title: str
    series: list[ChartSeries]
    subtitle: str | None = None
    x_axis_label: str | None = None
    y_axis_label: str | None = None
    unit: str | None = None
    stacked: bool = False
    note: str | None = None


@dataclass
class TableColumn(Serializable):
    key: str
    label: str
    data_type: str


@dataclass
class TablePreview(Serializable):
    columns: list[TableColumn]
    rows: list[dict[str, Any]]

    @classmethod
    def from_rows(cls, rows: list[dict[str, Any]]) -> "TablePreview":
        if not rows:
            return cls(columns=[], rows=[])
        keys = list(rows[0].keys())
        columns = [TableColumn(key=key, label=key, data_type=_infer_column_type(rows, key)) for key in keys]
        return cls(columns=columns, rows=rows)


def _infer_column_type(rows: list[dict[str, Any]], key: str) -> str:
    for row in rows:
        value = row.get(key)
        if value is None:
            continue
        if isinstance(value, bool):
            return "string"
        if isinstance(value, int):
            return "integer"
        if isinstance(value, float):
            return "number"
        if isinstance(value, str):
            if len(value) == 10 and value[4:5] == "-" and value[7:8] == "-":
                return "date"
            if "T" in value and ":" in value:
                return "datetime"
            return "string"
    return "string"


@dataclass
class SourceAttribution(Serializable):
    id: str
    source_name: str
    source_type: str
    authorization_status: str
    ingested_at: str
    updated_at: str
    caliber_note: str | None = None


@dataclass
class MethodologyRef(Serializable):
    key: str
    label: str
    metric_or_ranking_type: str
    formula_summary: str
    caliber_note: str | None = None
    notes: list[str] = field(default_factory=list)


@dataclass
class ProvenanceBlock(Serializable):
    snapshot_id: str
    snapshot_date: str
    refreshed_at: str
    freshness_status: str
    sources: list[SourceAttribution]
    methodology_refs: list[MethodologyRef]


@dataclass
class AnalysisPlan(Serializable):
    intent: Intent
    risk_level: RiskLevel
    execution_mode: ExecutionMode | None
    sql_explanation: str
    guardrail_summary: GuardrailSummary
    data_scope: FilterSet
    risk_reason: str
    sql_text: str | None = None
    recommended_visualization: ChartSpec | None = None
    refine_suggestions: list[str] = field(default_factory=list)


@dataclass
class AnalysisStep(Serializable):
    name: StepName
    status: StepStatus
    started_at: str
    finished_at: str | None = None
    error_code: str | None = None


@dataclass
class AnalysisArtifact(Serializable):
    artifact_type: str
    label: str
    id: str = field(default_factory=lambda: str(uuid4()))
    mime_type: str | None = None
    download_url: str | None = None
    expires_at: str | None = None


@dataclass
class AnalysisResult(Serializable):
    summary_markdown: str
    chart: ChartSpec
    table_preview: TablePreview
    artifacts: list[AnalysisArtifact]
    provenance: ProvenanceBlock


@dataclass
class AnalysisJobError(Serializable):
    code: str
    message: str
    retryable: bool
    step: str | None = None
    retry_after_seconds: int | None = None
    details: dict[str, Any] = field(default_factory=dict)


@dataclass
class AnalysisProgress(Serializable):
    current_step: str
    percent: int
    message: str | None = None


@dataclass
class AnalysisJob(Serializable):
    id: str
    question: str
    status: JobStatus
    risk_level: RiskLevel
    execution_mode: ExecutionMode | None
    created_at: str
    updated_at: str
    can_cancel: bool
    context: AnalysisContext | None = None
    plan: AnalysisPlan | None = None
    steps: list[AnalysisStep] = field(default_factory=list)
    finished_at: str | None = None
    execution_duration_ms: int | None = None
    status_message: str | None = None
    progress: AnalysisProgress | None = None
    last_error: AnalysisJobError | None = None
    result: AnalysisResult | None = None
