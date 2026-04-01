export type RankingType = 'artists' | 'characters' | 'series' | 'movies';
export type EntityType = 'work' | 'person' | 'character';
export type WindowOption = '7d' | '30d' | '90d' | '365d';
export type FreshnessStatus = 'fresh' | 'delayed' | 'stale' | 'unknown';
export type TrendDirection = 'up' | 'down' | 'flat';
export type RiskLevel = 'green' | 'yellow' | 'red';
export type AnalysisStatus =
  | 'queued'
  | 'planning'
  | 'running'
  | 'summarizing'
  | 'succeeded'
  | 'failed'
  | 'blocked'
  | 'needs_refine'
  | 'cancelled';

export interface ApiWarning {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface PaginationMeta {
  page: number;
  page_size: number;
  total: number;
}

export interface ResponseMeta {
  request_id: string;
  generated_at: string;
  warnings: ApiWarning[];
  pagination?: PaginationMeta | null;
}

export interface FilterSet {
  as_of?: string | null;
  window?: WindowOption | null;
  source_ids: string[];
  platform_ids: string[];
  genres: string[];
}

export interface FilterOption {
  id: string;
  label: string;
  count?: number | null;
}

export interface DateOption {
  value: string;
  label: string;
}

export interface RecommendedQuestion {
  id: string;
  label: string;
  question: string;
}

export interface SourceAttribution {
  id: string;
  source_name: string;
  source_type:
    | 'official_api'
    | 'public_disclosure'
    | 'partner_export'
    | 'manual_import'
    | 'controlled_collection';
  authorization_status: 'licensed' | 'public' | 'internal_manual' | 'restricted' | 'unknown';
  ingested_at: string;
  updated_at: string;
  caliber_note?: string | null;
}

export interface MethodologyRef {
  key: string;
  label: string;
  metric_or_ranking_type: string;
  formula_summary: string;
  caliber_note?: string | null;
  notes?: string[];
}

export interface ProvenanceBlock {
  snapshot_id: string;
  snapshot_date: string;
  refreshed_at: string;
  freshness_status: FreshnessStatus;
  sources: SourceAttribution[];
  methodology_refs: MethodologyRef[];
}

export interface EntityReference {
  id: string;
  entity_type: EntityType;
  name: string;
  subtitle?: string | null;
  work_type?: 'movie' | 'series' | null;
  avatar_url?: string | null;
  tags: string[];
}

export interface LabelValue {
  label: string;
  value: string;
}

export interface MetricCard {
  key: string;
  label: string;
  value: number;
  unit?: string | null;
  delta_value?: number | null;
  delta_percent?: number | null;
  trend_direction?: TrendDirection | null;
}

export interface ChartPoint {
  x: string;
  y: number;
  label?: string | null;
  meta?: Record<string, unknown>;
}

export interface ChartSeries {
  name: string;
  color?: string | null;
  points: ChartPoint[];
}

export interface ChartSpec {
  chart_type: 'line' | 'bar' | 'area' | 'pie' | 'stacked_bar';
  title: string;
  subtitle?: string | null;
  x_axis_label?: string | null;
  y_axis_label?: string | null;
  unit?: string | null;
  stacked?: boolean;
  series: ChartSeries[];
  note?: string | null;
}

export interface SourceMetricBreakdown {
  source_id: string;
  source_name: string;
  metric_value: number;
  metric_ratio?: number | null;
}

export interface RankingPreviewItem {
  rank: number;
  entity: EntityReference;
  score: number;
  delta_percent?: number | null;
  tags: string[];
}

export interface RankingPanel {
  ranking_type: RankingType;
  title: string;
  items: RankingPreviewItem[];
  provenance: ProvenanceBlock;
}

export interface KpiCard {
  key: string;
  label: string;
  value: number;
  unit?: string | null;
  delta_value?: number | null;
  delta_percent?: number | null;
  emphasis?: string | null;
}

export interface AnalysisProgress {
  current_step: 'queued' | 'planning' | 'running' | 'summarizing';
  percent: number;
  message?: string | null;
}

export interface AnalysisJobError {
  code: string;
  message: string;
  retryable: boolean;
  step?: string | null;
  retry_after_seconds?: number | null;
  details?: Record<string, unknown>;
}

export interface AnalysisJobSummary {
  id: string;
  question: string;
  status: AnalysisStatus;
  risk_level: RiskLevel;
  execution_mode: 'sync_sql' | 'async_sql' | null;
  created_at: string;
  updated_at: string;
  finished_at?: string | null;
  can_cancel: boolean;
  execution_duration_ms?: number | null;
  status_message?: string | null;
  progress?: AnalysisProgress | null;
  last_error?: AnalysisJobError | null;
}

export interface FilterBootstrapData {
  default_filters: FilterSet;
  available_dates: DateOption[];
  sources: FilterOption[];
  platforms: FilterOption[];
  genres: FilterOption[];
  recommended_questions: RecommendedQuestion[];
}

export interface FilterBootstrapResponse {
  data: FilterBootstrapData;
  meta: ResponseMeta;
}

export interface HomeOverviewData {
  filters: FilterSet;
  kpis: KpiCard[];
  ranking_panels: RankingPanel[];
  analysis_panels: ChartSpec[];
  recent_analysis_jobs: AnalysisJobSummary[];
  provenance: ProvenanceBlock;
}

export interface HomeOverviewResponse {
  data: HomeOverviewData;
  meta: ResponseMeta;
}

export interface RankingItem {
  rank: number;
  previous_rank?: number | null;
  rank_change?: number | null;
  entity: EntityReference;
  score: number;
  delta_value?: number | null;
  delta_percent?: number | null;
  tags: string[];
  sparkline?: ChartSpec | null;
  source_breakdown: SourceMetricBreakdown[];
}

export interface RankingListData {
  ranking_type: RankingType;
  title: string;
  filters: FilterSet;
  items: RankingItem[];
  analysis_panels: ChartSpec[];
  provenance: ProvenanceBlock;
}

export interface RankingListResponse {
  data: RankingListData;
  meta: ResponseMeta;
}

export interface EntityProfile {
  id: string;
  entity_type: EntityType;
  name: string;
  subtitle?: string | null;
  avatar_url?: string | null;
  description?: string | null;
  hero_facts: LabelValue[];
  tags: string[];
  updated_at: string;
}

export interface RankingHistoryEntry {
  snapshot_date: string;
  ranking_type: RankingType;
  rank: number;
}

export interface RelatedEntityItem {
  entity: EntityReference;
  relation_label: string;
  metric_label?: string | null;
  metric_value?: number | null;
}

export interface RelatedGroup {
  title: string;
  items: RelatedEntityItem[];
}

export interface TimelineEvent {
  id: string;
  event_date: string;
  event_type: 'announcement' | 'premiere' | 'release' | 'award' | 'ranking_peak' | 'other';
  title: string;
  description?: string | null;
  source_name?: string | null;
}

export interface EntityDetailData {
  entity: EntityProfile;
  metric_cards: MetricCard[];
  trend_panels: ChartSpec[];
  ranking_history: RankingHistoryEntry[];
  related_groups: RelatedGroup[];
  timeline: TimelineEvent[];
  provenance: ProvenanceBlock;
}

export interface EntityDetailResponse {
  data: EntityDetailData;
  meta: ResponseMeta;
}

export interface AnalysisContext {
  filters?: FilterSet;
  ranking_type?: RankingType | null;
  entity_refs?: EntityReference[];
}

export interface AnalysisRequest {
  question: string;
  context?: AnalysisContext | null;
}

export interface GuardrailSummary {
  allowed_views: string[];
  row_limit: number;
  timeout_ms: number;
  notes?: string[];
}

export interface AnalysisPlan {
  intent:
    | 'overview'
    | 'ranking_compare'
    | 'trend_explain'
    | 'entity_deep_dive'
    | 'source_compare'
    | 'anomaly_detection'
    | 'custom_readonly_sql';
  risk_level: RiskLevel;
  execution_mode: 'sync_sql' | 'async_sql' | null;
  sql_text?: string | null;
  sql_explanation: string;
  guardrail_summary: GuardrailSummary;
  data_scope: FilterSet;
  recommended_visualization?: ChartSpec | null;
  risk_reason: string;
  refine_suggestions: string[];
}

export interface AnalysisStep {
  name: 'planning' | 'sql_execution' | 'chart_compilation' | 'summary_generation';
  status: 'pending' | 'running' | 'succeeded' | 'failed' | 'skipped';
  started_at: string;
  finished_at?: string | null;
  error_code?: string | null;
}

export interface TableColumn {
  key: string;
  label: string;
  data_type: 'string' | 'integer' | 'number' | 'date' | 'datetime';
}

export interface TablePreview {
  columns: TableColumn[];
  rows: Record<string, string | number | null>[];
}

export interface AnalysisArtifact {
  id: string;
  artifact_type: 'chart' | 'table_snapshot' | 'sql_text' | 'summary_markdown';
  label: string;
  mime_type?: string | null;
  download_url?: string | null;
  expires_at?: string | null;
}

export interface AnalysisResult {
  summary_markdown: string;
  chart: ChartSpec;
  table_preview: TablePreview;
  artifacts: AnalysisArtifact[];
  provenance: ProvenanceBlock;
}

export interface AnalysisJob extends AnalysisJobSummary {
  context?: AnalysisContext | null;
  plan?: AnalysisPlan | null;
  steps: AnalysisStep[];
  result?: AnalysisResult | null;
}

export interface AnalysisJobListData {
  items: AnalysisJobSummary[];
}

export interface AnalysisJobListResponse {
  data: AnalysisJobListData;
  meta: ResponseMeta;
}

export interface AnalysisJobData {
  job: AnalysisJob;
}

export interface AnalysisJobResponse {
  data: AnalysisJobData;
  meta: ResponseMeta;
}
