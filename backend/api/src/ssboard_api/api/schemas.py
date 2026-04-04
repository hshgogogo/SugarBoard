from __future__ import annotations

from datetime import date, datetime
from enum import Enum
from typing import Any
from uuid import UUID

from pydantic import AnyUrl, BaseModel, ConfigDict, Field


class RankingType(str, Enum):
    artists = "artists"
    characters = "characters"
    series = "series"
    movies = "movies"


class EntityType(str, Enum):
    work = "work"
    person = "person"
    character = "character"


class WorkType(str, Enum):
    movie = "movie"
    series = "series"


class Window(str, Enum):
    d7 = "7d"
    d30 = "30d"
    d90 = "90d"
    d365 = "365d"


class FreshnessStatus(str, Enum):
    fresh = "fresh"
    delayed = "delayed"
    stale = "stale"
    unknown = "unknown"


class SourceType(str, Enum):
    official_api = "official_api"
    public_disclosure = "public_disclosure"
    partner_export = "partner_export"
    manual_import = "manual_import"
    controlled_collection = "controlled_collection"


class AuthorizationStatus(str, Enum):
    licensed = "licensed"
    public = "public"
    internal_manual = "internal_manual"
    restricted = "restricted"
    unknown = "unknown"


class ChartType(str, Enum):
    line = "line"
    bar = "bar"
    area = "area"
    pie = "pie"
    stacked_bar = "stacked_bar"


class TrendDirection(str, Enum):
    up = "up"
    down = "down"
    flat = "flat"


class AnalysisStatus(str, Enum):
    queued = "queued"
    planning = "planning"
    running = "running"
    summarizing = "summarizing"
    succeeded = "succeeded"
    failed = "failed"
    blocked = "blocked"
    needs_refine = "needs_refine"
    cancelled = "cancelled"


class RiskLevel(str, Enum):
    green = "green"
    yellow = "yellow"
    red = "red"


class ExecutionMode(str, Enum):
    sync_sql = "sync_sql"
    async_sql = "async_sql"


class IntentType(str, Enum):
    overview = "overview"
    ranking_compare = "ranking_compare"
    trend_explain = "trend_explain"
    entity_deep_dive = "entity_deep_dive"
    source_compare = "source_compare"
    anomaly_detection = "anomaly_detection"
    custom_readonly_sql = "custom_readonly_sql"


class AnalysisStepName(str, Enum):
    planning = "planning"
    sql_execution = "sql_execution"
    chart_compilation = "chart_compilation"
    summary_generation = "summary_generation"


class AnalysisStepStatus(str, Enum):
    pending = "pending"
    running = "running"
    succeeded = "succeeded"
    failed = "failed"
    skipped = "skipped"


class EventType(str, Enum):
    announcement = "announcement"
    premiere = "premiere"
    release = "release"
    award = "award"
    ranking_peak = "ranking_peak"
    other = "other"


class ProgressStep(str, Enum):
    queued = "queued"
    planning = "planning"
    running = "running"
    summarizing = "summarizing"


class TableDataType(str, Enum):
    string = "string"
    integer = "integer"
    number = "number"
    date = "date"
    datetime = "datetime"


class ArtifactType(str, Enum):
    chart = "chart"
    table_snapshot = "table_snapshot"
    sql_text = "sql_text"
    summary_markdown = "summary_markdown"


class ApiWarning(BaseModel):
    code: str
    message: str
    details: dict[str, Any] = Field(default_factory=dict)


class PaginationMeta(BaseModel):
    page: int = Field(ge=1)
    page_size: int = Field(ge=1)
    total: int = Field(ge=0)


class ResponseMeta(BaseModel):
    request_id: UUID
    generated_at: datetime
    warnings: list[ApiWarning] = Field(default_factory=list)
    pagination: PaginationMeta | None = None


class ApiError(BaseModel):
    code: str
    message: str
    details: dict[str, Any] = Field(default_factory=dict)
    retryable: bool
    hint: str | None = None


class ErrorResponse(BaseModel):
    error: ApiError
    meta: ResponseMeta


class FilterSet(BaseModel):
    as_of: date | None = None
    window: Window | None = None
    source_ids: list[UUID] = Field(default_factory=list)
    platform_ids: list[UUID] = Field(default_factory=list)
    genres: list[str] = Field(default_factory=list)


class FilterOption(BaseModel):
    id: str
    label: str
    count: int | None = None


class DateOption(BaseModel):
    value: date
    label: str


class RecommendedQuestion(BaseModel):
    id: str
    label: str
    question: str


class SourceAttribution(BaseModel):
    id: UUID
    source_name: str
    source_type: SourceType
    authorization_status: AuthorizationStatus
    ingested_at: datetime
    updated_at: datetime
    caliber_note: str | None = None


class MethodologyRef(BaseModel):
    key: str
    label: str
    metric_or_ranking_type: str
    formula_summary: str
    caliber_note: str | None = None
    notes: list[str] = Field(default_factory=list)


class ProvenanceBlock(BaseModel):
    snapshot_id: UUID
    snapshot_date: date
    refreshed_at: datetime
    freshness_status: FreshnessStatus
    sources: list[SourceAttribution]
    methodology_refs: list[MethodologyRef]


class EntityReference(BaseModel):
    id: UUID
    entity_type: EntityType
    name: str
    subtitle: str | None = None
    work_type: WorkType | None = None
    avatar_url: AnyUrl | None = None
    tags: list[str] = Field(default_factory=list)


class LabelValue(BaseModel):
    label: str
    value: str


class MetricCard(BaseModel):
    key: str
    label: str
    value: float
    unit: str | None = None
    delta_value: float | None = None
    delta_percent: float | None = None
    trend_direction: TrendDirection | None = None


class ChartPoint(BaseModel):
    x: str
    y: float
    label: str | None = None
    meta: dict[str, Any] = Field(default_factory=dict)


class ChartSeries(BaseModel):
    name: str
    color: str | None = None
    points: list[ChartPoint]


class ChartSpec(BaseModel):
    chart_type: ChartType
    title: str
    subtitle: str | None = None
    x_axis_label: str | None = None
    y_axis_label: str | None = None
    unit: str | None = None
    stacked: bool = False
    series: list[ChartSeries]
    note: str | None = None


class SourceMetricBreakdown(BaseModel):
    source_id: UUID
    source_name: str
    metric_value: float
    metric_ratio: float | None = None


class RankingPreviewItem(BaseModel):
    rank: int = Field(ge=1)
    entity: EntityReference
    score: float
    delta_percent: float | None = None
    tags: list[str] = Field(default_factory=list)


class RankingPanel(BaseModel):
    ranking_type: RankingType
    title: str
    items: list[RankingPreviewItem]
    provenance: ProvenanceBlock


class KpiCard(BaseModel):
    key: str
    label: str
    value: float
    unit: str | None = None
    delta_value: float | None = None
    delta_percent: float | None = None
    emphasis: str | None = None


class AnalysisProgress(BaseModel):
    current_step: ProgressStep
    percent: int = Field(ge=0, le=100)
    message: str | None = None


class AnalysisJobError(BaseModel):
    code: str
    message: str
    retryable: bool
    step: str | None = None
    retry_after_seconds: int | None = Field(default=None, ge=0)
    details: dict[str, Any] = Field(default_factory=dict)


class AnalysisJobSummary(BaseModel):
    id: UUID
    question: str
    status: AnalysisStatus
    risk_level: RiskLevel
    execution_mode: ExecutionMode | None = None
    created_at: datetime
    updated_at: datetime
    finished_at: datetime | None = None
    can_cancel: bool
    execution_duration_ms: int | None = Field(default=None, ge=0)
    status_message: str | None = None
    progress: AnalysisProgress | None = None
    last_error: AnalysisJobError | None = None


class FilterBootstrapData(BaseModel):
    default_filters: FilterSet
    available_dates: list[DateOption]
    sources: list[FilterOption]
    platforms: list[FilterOption]
    genres: list[FilterOption]
    recommended_questions: list[RecommendedQuestion]


class FilterBootstrapResponse(BaseModel):
    data: FilterBootstrapData
    meta: ResponseMeta


class HomeOverviewData(BaseModel):
    filters: FilterSet
    kpis: list[KpiCard]
    ranking_panels: list[RankingPanel]
    analysis_panels: list[ChartSpec]
    recent_analysis_jobs: list[AnalysisJobSummary]
    provenance: ProvenanceBlock


class HomeOverviewResponse(BaseModel):
    data: HomeOverviewData
    meta: ResponseMeta


class RankingItem(BaseModel):
    rank: int = Field(ge=1)
    previous_rank: int | None = Field(default=None, ge=1)
    rank_change: int | None = None
    entity: EntityReference
    score: float
    delta_value: float | None = None
    delta_percent: float | None = None
    tags: list[str] = Field(default_factory=list)
    sparkline: ChartSpec | None = None
    source_breakdown: list[SourceMetricBreakdown] = Field(default_factory=list)


class RankingListData(BaseModel):
    ranking_type: RankingType
    title: str
    filters: FilterSet
    items: list[RankingItem]
    analysis_panels: list[ChartSpec]
    provenance: ProvenanceBlock


class RankingListResponse(BaseModel):
    data: RankingListData
    meta: ResponseMeta


class EntityProfile(BaseModel):
    id: UUID
    entity_type: EntityType
    name: str
    subtitle: str | None = None
    avatar_url: AnyUrl | None = None
    description: str | None = None
    hero_facts: list[LabelValue]
    tags: list[str] = Field(default_factory=list)
    updated_at: datetime


class RankingHistoryEntry(BaseModel):
    snapshot_date: date
    ranking_type: RankingType
    rank: int = Field(ge=1)


class RelatedEntityItem(BaseModel):
    entity: EntityReference
    relation_label: str
    metric_label: str | None = None
    metric_value: float | None = None


class RelatedGroup(BaseModel):
    title: str
    items: list[RelatedEntityItem]


class TimelineEvent(BaseModel):
    id: UUID
    event_date: date
    event_type: EventType
    title: str
    description: str | None = None
    source_name: str | None = None


class EntityDetailData(BaseModel):
    entity: EntityProfile
    metric_cards: list[MetricCard]
    trend_panels: list[ChartSpec]
    ranking_history: list[RankingHistoryEntry]
    related_groups: list[RelatedGroup]
    timeline: list[TimelineEvent]
    provenance: ProvenanceBlock


class EntityDetailResponse(BaseModel):
    data: EntityDetailData
    meta: ResponseMeta


class AnalysisContext(BaseModel):
    filters: FilterSet | None = None
    ranking_type: RankingType | None = None
    entity_refs: list[EntityReference] = Field(default_factory=list)


class AnalysisRequest(BaseModel):
    question: str = Field(min_length=1, max_length=1000)
    context: AnalysisContext | None = None


class GuardrailSummary(BaseModel):
    allowed_views: list[str]
    row_limit: int = Field(ge=1)
    timeout_ms: int = Field(ge=1)
    notes: list[str] = Field(default_factory=list)


class AnalysisPlan(BaseModel):
    intent: IntentType
    risk_level: RiskLevel
    execution_mode: ExecutionMode | None = None
    sql_text: str | None = None
    sql_explanation: str
    guardrail_summary: GuardrailSummary
    data_scope: FilterSet
    recommended_visualization: ChartSpec | None = None
    risk_reason: str
    refine_suggestions: list[str] = Field(default_factory=list)


class AnalysisStep(BaseModel):
    name: AnalysisStepName
    status: AnalysisStepStatus
    started_at: datetime
    finished_at: datetime | None = None
    error_code: str | None = None


class TableColumn(BaseModel):
    key: str
    label: str
    data_type: TableDataType


class TablePreview(BaseModel):
    columns: list[TableColumn]
    rows: list[dict[str, Any]]


class AnalysisArtifact(BaseModel):
    id: UUID
    artifact_type: ArtifactType
    label: str
    mime_type: str | None = None
    download_url: AnyUrl | None = None
    expires_at: datetime | None = None


class AnalysisResult(BaseModel):
    summary_markdown: str
    chart: ChartSpec
    table_preview: TablePreview
    artifacts: list[AnalysisArtifact]
    provenance: ProvenanceBlock


class AnalysisJob(BaseModel):
    model_config = ConfigDict(arbitrary_types_allowed=True)

    id: UUID
    question: str
    status: AnalysisStatus
    risk_level: RiskLevel
    execution_mode: ExecutionMode | None = None
    created_at: datetime
    updated_at: datetime
    finished_at: datetime | None = None
    can_cancel: bool
    execution_duration_ms: int | None = Field(default=None, ge=0)
    status_message: str | None = None
    progress: AnalysisProgress | None = None
    last_error: AnalysisJobError | None = None
    context: AnalysisContext | None = None
    plan: AnalysisPlan | None = None
    steps: list[AnalysisStep]
    result: AnalysisResult | None = None


class AnalysisJobListData(BaseModel):
    items: list[AnalysisJobSummary]


class AnalysisJobListResponse(BaseModel):
    data: AnalysisJobListData
    meta: ResponseMeta


class AnalysisJobData(BaseModel):
    job: AnalysisJob


class AnalysisJobResponse(BaseModel):
    data: AnalysisJobData
    meta: ResponseMeta


# Thin aliases to keep later ai-core/backend integration naming close.
StepName = AnalysisStepName
StepStatus = AnalysisStepStatus
