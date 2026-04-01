import {
  AnalysisContext,
  AnalysisJob,
  AnalysisJobListResponse,
  AnalysisJobResponse,
  AnalysisJobSummary,
  AnalysisPlan,
  AnalysisRequest,
  AnalysisResult,
  AnalysisStatus,
  ChartPoint,
  ChartSpec,
  ChartSeries,
  EntityDetailResponse,
  EntityProfile,
  EntityReference,
  EntityType,
  FilterBootstrapResponse,
  FilterOption,
  FilterSet,
  HomeOverviewResponse,
  KpiCard,
  LabelValue,
  MethodologyRef,
  ProvenanceBlock,
  RankingItem,
  RankingListResponse,
  RankingPanel,
  RankingPreviewItem,
  RankingType,
  RelatedGroup,
  ResponseMeta,
  RiskLevel,
  SourceAttribution,
  TablePreview,
  TimelineEvent,
  WindowOption,
} from '@/lib/api-contract';
import { getRankingTypeLabel, rankingTypeToEntityType } from '@/lib/query';

type SortBy = 'rank' | 'score' | 'delta_value' | 'delta_percent';
type SortOrder = 'asc' | 'desc';
type StoredJobProfile = 'sync_success' | 'async_success' | 'blocked' | 'needs_refine' | 'failed';

type CatalogItem = EntityReference & {
  ranking_type: RankingType;
  source_ids: string[];
  platform_ids: string[];
  genres: string[];
  score_base: number;
  delta_value: number;
  delta_percent: number;
  source_weights: number[];
};

type StoredJob = {
  id: string;
  question: string;
  context: AnalysisContext | null;
  profile: StoredJobProfile;
  created_at: string;
  cancelled_at?: string | null;
};

const STORAGE_KEY = 'ssboard-analysis-jobs-v1';
const NOW = '2026-04-01T09:46:00+08:00';
const SNAPSHOT_DATE = '2026-03-31';
const AVAILABLE_DATES = ['2026-03-31', '2026-03-24', '2026-03-17', '2026-03-10'];
const WINDOWS: WindowOption[] = ['7d', '30d', '90d', '365d'];
const COLORS = ['#D7B46A', '#7BC6FF', '#8AE0B0', '#FF8B8B', '#9C8CFF'];
let responseCounter = 0;

const SOURCES: FilterOption[] = [
  { id: makeUuid(10, 1), label: '云合数据', count: 1280 },
  { id: makeUuid(10, 2), label: '猫眼专业版导入', count: 960 },
  { id: makeUuid(10, 3), label: '灯塔授权报表', count: 845 },
  { id: makeUuid(10, 4), label: '公开公示汇编', count: 420 },
];

const SOURCE_ATTRIBUTIONS: SourceAttribution[] = [
  {
    id: SOURCES[0].id,
    source_name: SOURCES[0].label,
    source_type: 'partner_export',
    authorization_status: 'licensed',
    ingested_at: '2026-04-01T08:35:00+08:00',
    updated_at: '2026-04-01T08:40:00+08:00',
    caliber_note: '热度指数按授权导出日表对齐。',
  },
  {
    id: SOURCES[1].id,
    source_name: SOURCES[1].label,
    source_type: 'manual_import',
    authorization_status: 'internal_manual',
    ingested_at: '2026-04-01T08:20:00+08:00',
    updated_at: '2026-04-01T08:30:00+08:00',
    caliber_note: '用于补齐票务热度与上新节奏。',
  },
  {
    id: SOURCES[2].id,
    source_name: SOURCES[2].label,
    source_type: 'partner_export',
    authorization_status: 'licensed',
    ingested_at: '2026-04-01T08:05:00+08:00',
    updated_at: '2026-04-01T08:10:00+08:00',
    caliber_note: '用于平台播放趋势对比。',
  },
  {
    id: SOURCES[3].id,
    source_name: SOURCES[3].label,
    source_type: 'public_disclosure',
    authorization_status: 'public',
    ingested_at: '2026-03-31T20:00:00+08:00',
    updated_at: '2026-03-31T20:00:00+08:00',
    caliber_note: '公开档期与奖项事件。',
  },
];

const PLATFORMS: FilterOption[] = [
  { id: makeUuid(20, 1), label: '腾讯视频', count: 320 },
  { id: makeUuid(20, 2), label: '爱奇艺', count: 310 },
  { id: makeUuid(20, 3), label: '优酷', count: 240 },
  { id: makeUuid(20, 4), label: '芒果TV', count: 205 },
  { id: makeUuid(20, 5), label: '全国院线', count: 160 },
];

const GENRES: FilterOption[] = [
  { id: '古装', label: '古装', count: 128 },
  { id: '悬疑', label: '悬疑', count: 102 },
  { id: '都市', label: '都市', count: 95 },
  { id: '喜剧', label: '喜剧', count: 84 },
  { id: '剧情', label: '剧情', count: 120 },
  { id: '动画', label: '动画', count: 42 },
];

const RECOMMENDED_QUESTIONS = [
  {
    id: 'rq-1',
    label: '电影热榜波动',
    question: '最近 7 天电影热榜前十有哪些对象波动最大？',
  },
  {
    id: 'rq-2',
    label: '剧集平台分布',
    question: '当前剧集热榜按平台分布如何？',
  },
  {
    id: 'rq-3',
    label: '艺人趋势对比',
    question: '比较赵今麦与檀健次过去 30 天热度走势。',
  },
  {
    id: 'rq-4',
    label: '角色变化总结',
    question: '最近一周角色热榜上升最快的是谁，背后原因是什么？',
  },
];

const METHODOLOGY_MAP: Record<string, MethodologyRef> = {
  home: {
    key: 'home-overview-v1',
    label: '首页概览口径',
    metric_or_ranking_type: 'homepage',
    formula_summary: '基于最新 published snapshot，聚合四类榜单 TopN、在榜作品数与覆盖率指标。',
    caliber_note: '首页指标与榜单预览统一受筛选器影响。',
    notes: ['默认使用最新可用快照日期。', '来源范围与更新时间必须同时展示。'],
  },
  artists: {
    key: 'artists-ranking-v1',
    label: '艺人热榜口径',
    metric_or_ranking_type: 'artists',
    formula_summary: '综合讨论度、作品带动与跨平台曝光表现形成日榜分值。',
    caliber_note: '仅计算已发布快照中的授权来源。',
    notes: ['默认按分值降序。'],
  },
  characters: {
    key: 'characters-ranking-v1',
    label: '角色热榜口径',
    metric_or_ranking_type: 'characters',
    formula_summary: '结合角色提及热度、作品表现与衍生讨论趋势形成综合分。',
    caliber_note: '角色与饰演者关系来自已发布关系表。',
    notes: ['适用于角色详情与角色榜。'],
  },
  series: {
    key: 'series-ranking-v1',
    label: '剧集热榜口径',
    metric_or_ranking_type: 'series',
    formula_summary: '按播放热度、讨论热度、平台表现与上新动能综合排名。',
    caliber_note: '平台分布与题材过滤在查询时同步生效。',
    notes: ['默认展示 Top 100，可分页浏览。'],
  },
  movies: {
    key: 'movies-ranking-v1',
    label: '电影热榜口径',
    metric_or_ranking_type: 'movies',
    formula_summary: '按票务热度、讨论热度、上映节点与来源覆盖率形成综合评分。',
    caliber_note: '上映事件来自公开公示与授权报表。',
    notes: ['可按来源与题材交叉过滤。'],
  },
  detail: {
    key: 'entity-detail-v1',
    label: '实体详情口径',
    metric_or_ranking_type: 'detail',
    formula_summary: '详情页趋势、关联与时间线均读取已发布聚合视图。',
    caliber_note: '缺失关系数据时允许分区降级为空态。',
    notes: ['关系模块仅使用列表/卡片，不渲染交互图谱。'],
  },
  analysis: {
    key: 'analysis-v1',
    label: 'AI 分析口径',
    metric_or_ranking_type: 'analysis',
    formula_summary: 'AI 仅访问白名单视图，执行只读 SQL，并返回归一化图表和表格预览。',
    caliber_note: '高风险请求不会执行。',
    notes: ['risk levels: green/yellow/red', 'status supports blocked 与 needs_refine'],
  },
};

const DEFAULT_FILTERS: FilterSet = {
  as_of: SNAPSHOT_DATE,
  window: '30d',
  source_ids: [],
  platform_ids: [],
  genres: [],
};

const artistNames = ['赵今麦', '檀健次', '白鹿', '成毅', '虞书欣', '张凌赫', '周也', '许凯', '陈哲远', '刘浩存'];
const characterNames = ['沈知意', '裴行舟', '顾昭宁', '魏清和', '林惊雨', '韩知夏', '苏念初', '谢予安', '江离', '程见微'];
const seriesTitles = ['长安镜像', '北海回声', '春山如黛', '晨昏线外', '雾港旧事', '海潮信号', '霓光之城', '一纸繁星', '九州夜航', '云端之下'];
const movieTitles = ['云海归途', '逆风航线', '星河补给站', '深海八公里', '盛夏拼图', '荒原频率', '风起南湾', '烟火停泊', '回声证词', '午夜裁缝'];

const ALL_CATALOG = [
  ...buildCatalog('artists', artistNames),
  ...buildCatalog('characters', characterNames),
  ...buildCatalog('series', seriesTitles),
  ...buildCatalog('movies', movieTitles),
];

const INITIAL_STORED_JOBS: StoredJob[] = [
  {
    id: makeUuid(90, 1),
    question: '最近 7 天电影热榜前十有哪些对象波动最大？',
    context: { filters: DEFAULT_FILTERS, ranking_type: 'movies' },
    profile: 'sync_success',
    created_at: '2026-04-01T09:28:00+08:00',
  },
  {
    id: makeUuid(90, 2),
    question: '比较《长安镜像 01》与《北海回声 02》过去 30 天热度走势。',
    context: { filters: DEFAULT_FILTERS, ranking_type: 'series' },
    profile: 'async_success',
    created_at: new Date(Date.now() - 4_000).toISOString(),
  },
  {
    id: makeUuid(90, 3),
    question: '给我导出所有底层原始表，并生成 Python 脚本。',
    context: { filters: DEFAULT_FILTERS },
    profile: 'blocked',
    created_at: '2026-04-01T09:10:00+08:00',
  },
  {
    id: makeUuid(90, 4),
    question: '帮我比较所有平台今年全部上新的剧集并自动给结论。',
    context: { filters: DEFAULT_FILTERS, ranking_type: 'series' },
    profile: 'needs_refine',
    created_at: '2026-04-01T08:58:00+08:00',
  },
  {
    id: makeUuid(90, 5),
    question: '模拟失败：最近 30 天艺人热榜异常值检测。',
    context: { filters: DEFAULT_FILTERS, ranking_type: 'artists' },
    profile: 'failed',
    created_at: '2026-04-01T08:45:00+08:00',
  },
];

export async function getBootstrapFilters(asOf?: string | null): Promise<FilterBootstrapResponse> {
  return {
    data: {
      default_filters: { ...DEFAULT_FILTERS, as_of: asOf ?? DEFAULT_FILTERS.as_of },
      available_dates: AVAILABLE_DATES.map((value) => ({ value, label: value })),
      sources: SOURCES,
      platforms: PLATFORMS,
      genres: GENRES,
      recommended_questions: RECOMMENDED_QUESTIONS,
    },
    meta: createMeta(),
  };
}

export async function getHomeOverview(filters: FilterSet): Promise<HomeOverviewResponse> {
  const artists = getFilteredCatalog('artists', filters).slice(0, 5);
  const characters = getFilteredCatalog('characters', filters).slice(0, 5);
  const series = getFilteredCatalog('series', filters).slice(0, 5);
  const movies = getFilteredCatalog('movies', filters).slice(0, 5);
  const worksCount = new Set([...series, ...movies].map((item) => item.id)).size;
  const champion = [...artists, ...characters, ...series, ...movies].sort((a, b) => b.delta_percent - a.delta_percent)[0];

  const kpis: KpiCard[] = [
    { key: 'works_on_board', label: '在榜作品数', value: worksCount, unit: '部', delta_value: 6, delta_percent: 4.8, emphasis: '跨剧集/电影口径' },
    { key: 'new_releases', label: '上新作品数', value: 18 - filters.platform_ids.length * 2, unit: '部', delta_value: 2, delta_percent: 12.5, emphasis: '近 7 天' },
    { key: 'heat_champion', label: '热度涨幅冠军', value: champion?.delta_percent ?? 0, unit: '%', delta_value: champion?.delta_value ?? 0, delta_percent: champion?.delta_percent ?? 0, emphasis: champion?.name ?? '暂无' },
    { key: 'coverage', label: '数据覆盖率', value: 92 - filters.source_ids.length * 2, unit: '%', delta_value: 1.8, delta_percent: 2.0, emphasis: '授权 + 公开来源' },
  ];

  const ranking_panels: RankingPanel[] = [
    createRankingPanel('artists', artists),
    createRankingPanel('characters', characters),
    createRankingPanel('series', series),
    createRankingPanel('movies', movies),
  ];

  const analysis_panels: ChartSpec[] = [
    createTrendChart('大盘热度走势', filters.window ?? '30d'),
    createDistributionChart(filters),
  ];

  const recent_analysis_jobs = listMaterializedJobs().slice(0, 5).map(toSummary);

  return {
    data: {
      filters,
      kpis,
      ranking_panels,
      analysis_panels,
      recent_analysis_jobs,
      provenance: makeProvenance('home', filters),
    },
    meta: createMeta(),
  };
}

export async function getRankingPage(input: {
  rankingType: RankingType;
  filters: FilterSet;
  page?: number;
  pageSize?: number;
  sortBy?: SortBy;
  sortOrder?: SortOrder;
}): Promise<RankingListResponse> {
  const { rankingType, filters } = input;
  const page = input.page ?? 1;
  const pageSize = input.pageSize ?? 20;
  const sortBy = input.sortBy ?? 'rank';
  const sortOrder = input.sortOrder ?? 'asc';
  let items = getFilteredCatalog(rankingType, filters).map<RankingItem>((item, index) => ({
    rank: index + 1,
    previous_rank: Math.max(index + 1 + Math.round(item.delta_percent / 8), 1),
    rank_change: -Math.round(item.delta_percent / 8),
    entity: toEntityReference(item),
    score: Number((item.score_base + filters.source_ids.length * 1.6 + filters.platform_ids.length * 1.2).toFixed(1)),
    delta_value: Number(item.delta_value.toFixed(1)),
    delta_percent: Number(item.delta_percent.toFixed(1)),
    tags: item.tags,
    sparkline: createSparkline(item.name, item.score_base),
    source_breakdown: SOURCE_ATTRIBUTIONS.slice(0, 3).map((source, sourceIndex) => ({
      source_id: source.id,
      source_name: source.source_name,
      metric_value: Math.round(item.score_base * item.source_weights[sourceIndex]),
      metric_ratio: Number((item.source_weights[sourceIndex] * 100).toFixed(1)),
    })),
  }));

  items = sortRankingItems(items, sortBy, sortOrder).map((item, index) => ({
    ...item,
    rank: index + 1,
  }));

  const total = items.length;
  const pageItems = items.slice((page - 1) * pageSize, page * pageSize);

  return {
    data: {
      ranking_type: rankingType,
      title: getRankingTypeLabel(rankingType),
      filters,
      items: pageItems,
      analysis_panels: [
        createRankingCompareChart(rankingType, filters),
        createSourceStackChart(rankingType),
      ],
      provenance: makeProvenance(rankingType, filters),
    },
    meta: createMeta({ page, page_size: pageSize, total }),
  };
}

export async function getEntityDetail(input: {
  entityType: EntityType;
  entityId: string;
  trendWindow?: WindowOption;
  asOf?: string | null;
}): Promise<EntityDetailResponse | null> {
  const item = ALL_CATALOG.find((entry) => entry.id === input.entityId && entry.entity_type === input.entityType);
  if (!item) return null;

  const profile: EntityProfile = {
    id: item.id,
    entity_type: item.entity_type,
    name: item.name,
    subtitle: item.subtitle,
    avatar_url: item.avatar_url,
    description: buildEntityDescription(item),
    hero_facts: buildHeroFacts(item),
    tags: item.tags,
    updated_at: '2026-04-01T08:45:00+08:00',
  };

  return {
    data: {
      entity: profile,
      metric_cards: buildEntityMetrics(item),
      trend_panels: [
        createEntityTrendChart(item, input.trendWindow ?? '30d'),
        createEntityContributionChart(item),
      ],
      ranking_history: AVAILABLE_DATES.map((snapshot, index) => ({
        snapshot_date: snapshot,
        ranking_type: item.ranking_type,
        rank: Math.max(1, 8 + index * 3 + (item.score_base % 5)),
      })),
      related_groups: buildRelatedGroups(item),
      timeline: buildTimeline(item),
      provenance: makeProvenance('detail', { ...DEFAULT_FILTERS, as_of: input.asOf ?? SNAPSHOT_DATE }),
    },
    meta: createMeta(),
  };
}

export async function listAnalysisJobs(options?: {
  page?: number;
  pageSize?: number;
  status?: AnalysisStatus;
}): Promise<AnalysisJobListResponse> {
  await wait(180);
  const page = options?.page ?? 1;
  const pageSize = options?.pageSize ?? 10;
  const items = listMaterializedJobs()
    .filter((job) => (options?.status ? job.status === options.status : true))
    .map(toSummary);

  return {
    data: { items: items.slice((page - 1) * pageSize, page * pageSize) },
    meta: createMeta({ page, page_size: pageSize, total: items.length }),
  };
}

export async function getAnalysisJob(jobId: string): Promise<AnalysisJobResponse | null> {
  await wait(220);
  const job = listMaterializedJobs().find((item) => item.id === jobId);
  if (!job) return null;
  return {
    data: { job },
    meta: createMeta(),
  };
}

export async function createAnalysisJob(request: AnalysisRequest): Promise<AnalysisJobResponse> {
  await wait(240);
  const jobs = readStoredJobs();
  const profile = classifyProfile(request.question);
  const created: StoredJob = {
    id: makeUuid(91, Date.now() % 1000000),
    question: request.question,
    context: request.context ?? null,
    profile,
    created_at: new Date().toISOString(),
  };
  writeStoredJobs([created, ...jobs]);
  const materialized = materializeStoredJob(created);
  return {
    data: { job: materialized },
    meta: createMeta(),
  };
}

export async function cancelAnalysisJob(jobId: string): Promise<AnalysisJobResponse | null> {
  await wait(120);
  const jobs = readStoredJobs();
  const next = jobs.map((job) =>
    job.id === jobId
      ? {
          ...job,
          cancelled_at: new Date().toISOString(),
        }
      : job,
  );
  writeStoredJobs(next);
  const updated = listMaterializedJobs().find((item) => item.id === jobId);
  if (!updated) return null;
  return {
    data: { job: updated },
    meta: createMeta(),
  };
}

export const sampleEntityIds = {
  person: ALL_CATALOG.find((item) => item.entity_type === 'person')?.id ?? '',
  character: ALL_CATALOG.find((item) => item.entity_type === 'character')?.id ?? '',
  work: ALL_CATALOG.find((item) => item.entity_type === 'work')?.id ?? '',
  character_empty_relations:
    ALL_CATALOG.find((item) => item.entity_type === 'character' && Number(item.id.slice(-2)) % 5 === 0)?.id ?? '',
  character_empty_timeline:
    ALL_CATALOG.find((item) => item.entity_type === 'character' && Number(item.id.slice(-2)) % 7 === 0)?.id ?? '',
};

function buildCatalog(rankingType: RankingType, baseNames: string[]): CatalogItem[] {
  return Array.from({ length: 60 }, (_, index) => {
    const nameSeed = baseNames[index % baseNames.length];
    const serial = String(index + 1).padStart(2, '0');
    const entityType = rankingTypeToEntityType(rankingType);
    const platform = PLATFORMS[index % PLATFORMS.length];
    const extraPlatform = PLATFORMS[(index + 1) % PLATFORMS.length];
    const genre = GENRES[index % GENRES.length];
    const extraGenre = GENRES[(index + 2) % GENRES.length];
    const scoreBase = 92 - index * 0.7;
    const sourceWeights = normalizeWeights([0.45 + (index % 3) * 0.05, 0.32, 0.23 - (index % 2) * 0.03]);
    const subtitle =
      rankingType === 'artists'
        ? `演员 / ${platform.label}`
        : rankingType === 'characters'
          ? `来自《${seriesTitles[index % seriesTitles.length]} ${serial}》`
          : rankingType === 'series'
            ? `${platform.label} 独播剧`
            : `${platform.label} 上映中`;

    return {
      id: makeUuid(rankBlock(rankingType), index + 1),
      ranking_type: rankingType,
      entity_type: entityType,
      name: rankingType === 'artists' || rankingType === 'characters' ? `${nameSeed}` : `${nameSeed} ${serial}`,
      subtitle,
      work_type: rankingType === 'series' ? 'series' : rankingType === 'movies' ? 'movie' : null,
      avatar_url: null,
      tags: [genre.label, extraGenre.label, rankingType === 'movies' ? '上映期' : '热度样本'],
      source_ids: [SOURCES[index % SOURCES.length].id, SOURCES[(index + 1) % SOURCES.length].id],
      platform_ids: [platform.id, extraPlatform.id],
      genres: [genre.label, extraGenre.label],
      score_base: Number(scoreBase.toFixed(1)),
      delta_value: Number((6.8 - index * 0.1).toFixed(1)),
      delta_percent: Number((16.2 - index * 0.25).toFixed(1)),
      source_weights: sourceWeights,
    };
  });
}

function getFilteredCatalog(rankingType: RankingType, filters: FilterSet): CatalogItem[] {
  return ALL_CATALOG.filter((item) => item.ranking_type === rankingType)
    .filter((item) => !filters.source_ids.length || filters.source_ids.some((id) => item.source_ids.includes(id)))
    .filter((item) => !filters.platform_ids.length || filters.platform_ids.some((id) => item.platform_ids.includes(id)))
    .filter((item) => !filters.genres.length || filters.genres.some((genre) => item.genres.includes(genre)))
    .sort((a, b) => b.score_base - a.score_base);
}

function createRankingPanel(rankingType: RankingType, items: CatalogItem[]): RankingPanel {
  return {
    ranking_type: rankingType,
    title: getRankingTypeLabel(rankingType),
    items: items.map<RankingPreviewItem>((item, index) => ({
      rank: index + 1,
      entity: toEntityReference(item),
      score: item.score_base,
      delta_percent: item.delta_percent,
      tags: item.tags,
    })),
    provenance: makeProvenance(rankingType, DEFAULT_FILTERS),
  };
}

function makeProvenance(
  scope: 'home' | RankingType | 'detail' | 'analysis',
  filters: FilterSet,
): ProvenanceBlock {
  const sourceSubset = filters.source_ids.length
    ? SOURCE_ATTRIBUTIONS.filter((source) => filters.source_ids.includes(source.id))
    : SOURCE_ATTRIBUTIONS.slice(0, 3);
  return {
    snapshot_id: makeUuid(80, 1),
    snapshot_date: filters.as_of ?? SNAPSHOT_DATE,
    refreshed_at: NOW,
    freshness_status: sourceSubset.length > 2 ? 'fresh' : 'delayed',
    sources: sourceSubset,
    methodology_refs: [METHODOLOGY_MAP[scope]],
  };
}

function createMeta(pagination?: { page: number; page_size: number; total: number }): ResponseMeta {
  responseCounter += 1;
  return {
    request_id: makeUuid(99, responseCounter),
    generated_at: NOW,
    warnings: [],
    pagination: pagination ?? null,
  };
}

function createTrendChart(title: string, window: WindowOption): ChartSpec {
  const points = createTimePoints(window, 68, 1.8);
  return {
    chart_type: 'line',
    title,
    subtitle: `窗口：${window}`,
    x_axis_label: '日期',
    y_axis_label: '综合热度',
    unit: '分',
    series: [
      { name: '当前口径', color: COLORS[0], points },
      { name: '上期口径', color: COLORS[1], points: points.map((point, index) => ({ ...point, y: point.y - (index % 2 ? 2.2 : 3.8) })) },
    ],
    note: '趋势图使用已发布日快照样本。',
  };
}

function createDistributionChart(filters: FilterSet): ChartSpec {
  const source = filters.platform_ids.length ? PLATFORMS.filter((platform) => filters.platform_ids.includes(platform.id)) : PLATFORMS.slice(0, 4);
  return {
    chart_type: 'stacked_bar',
    title: '平台与题材分布',
    subtitle: '首页辅助分析',
    x_axis_label: '平台',
    y_axis_label: '上榜实体数',
    unit: '个',
    stacked: true,
    series: GENRES.slice(0, 3).map((genre, genreIndex) => ({
      name: genre.label,
      color: COLORS[genreIndex],
      points: source.map((platform, index) => ({
        x: platform.label,
        y: 12 + genreIndex * 3 + index * 2,
      })),
    })),
    note: '用于快速判断当前筛选下的平台/题材结构。',
  };
}

function createRankingCompareChart(rankingType: RankingType, filters: FilterSet): ChartSpec {
  const window = filters.window ?? '30d';
  const topItems = getFilteredCatalog(rankingType, filters).slice(0, 3);
  return {
    chart_type: 'line',
    title: '当前筛选结果趋势对比',
    subtitle: getRankingTypeLabel(rankingType),
    x_axis_label: '日期',
    y_axis_label: '热度分值',
    unit: '分',
    series: topItems.map((item, index) => ({
      name: item.name,
      color: COLORS[index],
      points: createTimePoints(window, item.score_base - 12 + index * 3, 1.2 + index * 0.3),
    })),
    note: '右侧图表与主榜单使用同一筛选条件。',
  };
}

function createSourceStackChart(rankingType: RankingType): ChartSpec {
  return {
    chart_type: 'stacked_bar',
    title: '来源拆解',
    subtitle: `${getRankingTypeLabel(rankingType)} / Top 10`,
    x_axis_label: '来源',
    y_axis_label: '贡献值',
    unit: '分',
    stacked: true,
    series: ['Top 1-3', 'Top 4-6', 'Top 7-10'].map((label, index) => ({
      name: label,
      color: COLORS[index],
      points: SOURCE_ATTRIBUTIONS.slice(0, 3).map((source, sourceIndex) => ({
        x: source.source_name,
        y: 18 - index * 3 + sourceIndex * 2,
      })),
    })),
    note: '来源拆解用于解释榜单结果构成。',
  };
}

function createSparkline(name: string, base: number): ChartSpec {
  return {
    chart_type: 'line',
    title: `${name} sparkline`,
    series: [
      {
        name: 'sparkline',
        color: COLORS[1],
        points: Array.from({ length: 8 }, (_, index) => ({ x: String(index), y: Number((base - 4 + index * 0.6 + (index % 2 ? 1.3 : -0.8)).toFixed(1)) })),
      },
    ],
  };
}

function buildHeroFacts(item: CatalogItem): LabelValue[] {
  if (item.entity_type === 'work') {
    return [
      { label: '作品类型', value: item.work_type === 'movie' ? '电影' : '剧集' },
      { label: '主平台', value: labelById(PLATFORMS, item.platform_ids[0]) },
      { label: '题材', value: item.genres.join(' / ') },
      { label: '最新快照', value: SNAPSHOT_DATE },
    ];
  }
  if (item.entity_type === 'person') {
    return [
      { label: '身份', value: '演员' },
      { label: '重点平台', value: labelById(PLATFORMS, item.platform_ids[0]) },
      { label: '关注题材', value: item.genres.join(' / ') },
      { label: '热度窗口', value: '近 30 天' },
    ];
  }
  return [
    { label: '所属作品', value: `${seriesTitles[item.score_base as unknown as number % seriesTitles.length] ?? '长安镜像'} 01` },
    { label: '饰演者', value: artistNames[item.score_base as unknown as number % artistNames.length] ?? '赵今麦' },
    { label: '题材', value: item.genres.join(' / ') },
    { label: '首发平台', value: labelById(PLATFORMS, item.platform_ids[0]) },
  ];
}

function buildEntityDescription(item: CatalogItem): string {
  if (item.entity_type === 'work') {
    return `${item.name} 为 ${labelById(PLATFORMS, item.platform_ids[0])} 的重点样本，当前用于展示作品详情模板，包括基础信息、趋势、关联角色与时间线。`;
  }
  if (item.entity_type === 'person') {
    return `${item.name} 为当前榜单中的重点艺人样本，可用于判断其作品带动能力、合作对象与近期热度变化。`;
  }
  return `${item.name} 为角色详情模板样本，聚合所属作品、饰演者与角色热度表现。`;
}

function buildEntityMetrics(item: CatalogItem) {
  return [
    { key: 'score', label: '当前分值', value: item.score_base, unit: '分', delta_value: item.delta_value, delta_percent: item.delta_percent, trend_direction: 'up' as const },
    { key: 'rank', label: '当前排名', value: Math.max(1, Math.round(12 - item.delta_percent / 4)), unit: '位', delta_value: 2, delta_percent: 9.1, trend_direction: 'up' as const },
    { key: 'coverage', label: '来源覆盖', value: 3 + (item.source_ids.length % 2), unit: '源', delta_value: 0, delta_percent: 0, trend_direction: 'flat' as const },
    { key: 'momentum', label: '近 7 天动能', value: Math.max(1, item.delta_value * 1.6), unit: '分', delta_value: item.delta_value, delta_percent: item.delta_percent / 2, trend_direction: item.delta_value > 0 ? 'up' as const : 'down' as const },
  ];
}

function createEntityTrendChart(item: CatalogItem, window: WindowOption): ChartSpec {
  return {
    chart_type: 'area',
    title: '核心趋势',
    subtitle: `默认 ${window} 窗口`,
    x_axis_label: '日期',
    y_axis_label: '热度',
    unit: '分',
    series: [{ name: item.name, color: COLORS[0], points: createTimePoints(window, item.score_base - 10, 1.6) }],
    note: '趋势读取日维度快照，不进行实时计算。',
  };
}

function createEntityContributionChart(item: CatalogItem): ChartSpec {
  return {
    chart_type: 'bar',
    title: item.entity_type === 'work' ? '平台/来源贡献' : '关联热度贡献',
    subtitle: '详情页辅助分析',
    x_axis_label: '维度',
    y_axis_label: '贡献值',
    unit: '分',
    series: [
      {
        name: '贡献值',
        color: COLORS[2],
        points: [
          { x: labelById(PLATFORMS, item.platform_ids[0]), y: 32 },
          { x: labelById(PLATFORMS, item.platform_ids[1]), y: 24 },
          { x: labelById(SOURCES, item.source_ids[0]), y: 18 },
          { x: labelById(SOURCES, item.source_ids[1]), y: 12 },
        ],
      },
    ],
    note: '用于解释该实体的主要表现来源。',
  };
}

function buildRelatedGroups(item: CatalogItem): RelatedGroup[] {
  if (item.entity_type === 'work') {
    return [
      {
        title: '演员阵容',
        items: ALL_CATALOG.filter((entry) => entry.entity_type === 'person').slice(0, 4).map((entry, index) => ({
          entity: toEntityReference(entry),
          relation_label: index === 0 ? '领衔主演' : '主演',
          metric_label: '带动指数',
          metric_value: 80 - index * 6,
        })),
      },
      {
        title: '角色列表',
        items: ALL_CATALOG.filter((entry) => entry.entity_type === 'character').slice(0, 4).map((entry, index) => ({
          entity: toEntityReference(entry),
          relation_label: '核心角色',
          metric_label: '讨论热度',
          metric_value: 72 - index * 4,
        })),
      },
      {
        title: '平台信息',
        items: item.platform_ids.map((platformId, index) => ({
          entity: {
            id: platformId,
            entity_type: 'work',
            name: labelById(PLATFORMS, platformId),
            subtitle: '平台维度卡片',
            work_type: null,
            avatar_url: null,
            tags: ['平台'],
          },
          relation_label: index === 0 ? '首发平台' : '补充渠道',
          metric_label: '贡献值',
          metric_value: 34 - index * 8,
        })),
      },
    ];
  }

  if (item.entity_type === 'person') {
    return [
      {
        title: '代表作品',
        items: ALL_CATALOG.filter((entry) => entry.entity_type === 'work').slice(0, 4).map((entry, index) => ({
          entity: toEntityReference(entry),
          relation_label: index === 0 ? '当前带动作品' : '代表作',
          metric_label: '热度关联',
          metric_value: 76 - index * 7,
        })),
      },
      {
        title: '近期合作对象',
        items: ALL_CATALOG.filter((entry) => entry.entity_type === 'person').slice(1, 5).map((entry, index) => ({
          entity: toEntityReference(entry),
          relation_label: '近期合作',
          metric_label: '合作频次',
          metric_value: 5 - index,
        })),
      },
    ];
  }

  if (Number(item.id.slice(-2)) % 5 === 0) {
    return [];
  }

  return [
    {
      title: '所属作品',
      items: ALL_CATALOG.filter((entry) => entry.entity_type === 'work').slice(0, 2).map((entry, index) => ({
        entity: toEntityReference(entry),
        relation_label: index === 0 ? '当前作品' : '历史关联作品',
        metric_label: '角色热度',
        metric_value: 68 - index * 10,
      })),
    },
    {
      title: '饰演者',
      items: ALL_CATALOG.filter((entry) => entry.entity_type === 'person').slice(0, 2).map((entry, index) => ({
        entity: toEntityReference(entry),
        relation_label: index === 0 ? '饰演者' : '宣发联动艺人',
        metric_label: '关联指数',
        metric_value: 74 - index * 12,
      })),
    },
  ];
}

function buildTimeline(item: CatalogItem): TimelineEvent[] {
  const indexSeed = Number(item.id.slice(-2));
  if (indexSeed % 7 === 0) {
    return [];
  }
  return [
    {
      id: makeUuid(70, indexSeed * 10 + 1),
      event_date: '2026-03-01',
      event_type: 'announcement',
      title: item.entity_type === 'work' ? '官方释出首支预告' : '样本进入核心观察池',
      description: '用于说明时间线与公开事件的卡片结构。',
      source_name: '公开公示汇编',
    },
    {
      id: makeUuid(70, indexSeed * 10 + 2),
      event_date: '2026-03-18',
      event_type: item.entity_type === 'work' ? 'release' : 'ranking_peak',
      title: item.entity_type === 'work' ? '进入热榜上升阶段' : '达到近 30 天峰值',
      description: '趋势与事件节点可用于解释热度变化。',
      source_name: '云合数据',
    },
    {
      id: makeUuid(70, indexSeed * 10 + 3),
      event_date: '2026-03-28',
      event_type: 'award',
      title: '舆情/奖项节点触发关注增长',
      description: '示例事件，用于验证详情页时间线模块。',
      source_name: '公开公示汇编',
    },
  ];
}

function listMaterializedJobs(): AnalysisJob[] {
  return readStoredJobs().map(materializeStoredJob).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

function readStoredJobs(): StoredJob[] {
  if (typeof window === 'undefined') return INITIAL_STORED_JOBS;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_STORED_JOBS));
    return INITIAL_STORED_JOBS;
  }
  try {
    return JSON.parse(raw) as StoredJob[];
  } catch {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_STORED_JOBS));
    return INITIAL_STORED_JOBS;
  }
}

function writeStoredJobs(jobs: StoredJob[]) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(jobs));
}

function materializeStoredJob(stored: StoredJob): AnalysisJob {
  const createdAt = new Date(stored.created_at).getTime();
  const now = Date.now();
  const elapsed = now - createdAt;
  const context = stored.context ?? { filters: DEFAULT_FILTERS };
  const plan = buildAnalysisPlan(stored.question, stored.profile, context);

  if (stored.cancelled_at) {
    const cancelledAt = stored.cancelled_at;
    return {
      id: stored.id,
      question: stored.question,
      status: 'cancelled',
      risk_level: plan.risk_level,
      execution_mode: plan.execution_mode,
      created_at: stored.created_at,
      updated_at: cancelledAt,
      finished_at: cancelledAt,
      can_cancel: false,
      execution_duration_ms: Math.max(0, new Date(cancelledAt).getTime() - createdAt),
      status_message: '已收到取消请求，任务停止执行。',
      progress: null,
      last_error: null,
      context,
      plan,
      steps: buildSteps('cancelled', createdAt),
      result: null,
    };
  }

  if (stored.profile === 'blocked') return finalizeJob(stored, plan, 'blocked', elapsed, null, null, '该请求超出白名单分析视图能力，已安全拒绝。');
  if (stored.profile === 'needs_refine') return finalizeJob(stored, plan, 'needs_refine', elapsed, null, null, '问题范围过大，建议缩小口径后重试。');
  if (stored.profile === 'sync_success') return finalizeJob(stored, plan, 'succeeded', elapsed, buildAnalysisResult(stored.question, context), null, '在同步预算内完成分析。');

  if (stored.profile === 'failed') {
    if (elapsed < 1200) return runningJob(stored, plan, 'queued', 6, '任务已进入队列。');
    if (elapsed < 2600) return runningJob(stored, plan, 'planning', 26, '正在校验问题与数据范围。');
    if (elapsed < 5200) return runningJob(stored, plan, 'running', 58, '正在执行只读 SQL。');
    return finalizeJob(
      stored,
      plan,
      'failed',
      elapsed,
      null,
      {
        code: 'MOCK_QUERY_TIMEOUT',
        message: '模拟超时：查询扫描结果超出当前预算。',
        retryable: true,
        step: 'sql_execution',
        retry_after_seconds: 15,
      },
      '执行超时，建议缩小时间窗口或对象范围。',
    );
  }

  if (elapsed < 1200) return runningJob(stored, plan, 'queued', 8, '任务已创建，等待执行资源。');
  if (elapsed < 3200) return runningJob(stored, plan, 'planning', 24, '正在解析问题、匹配白名单视图。');
  if (elapsed < 7200) return runningJob(stored, plan, 'running', 64, '正在执行只读 SQL 与生成图表。');
  if (elapsed < 9200) return runningJob(stored, plan, 'summarizing', 88, '正在生成中文摘要与整理结果。');
  return finalizeJob(stored, plan, 'succeeded', elapsed, buildAnalysisResult(stored.question, context), null, '分析已完成，可查看图表与摘要。');
}

function runningJob(
  stored: StoredJob,
  plan: AnalysisPlan,
  status: Extract<AnalysisStatus, 'queued' | 'planning' | 'running' | 'summarizing'>,
  percent: number,
  message: string,
): AnalysisJob {
  return {
    id: stored.id,
    question: stored.question,
    status,
    risk_level: plan.risk_level,
    execution_mode: plan.execution_mode,
    created_at: stored.created_at,
    updated_at: new Date().toISOString(),
    finished_at: null,
    can_cancel: true,
    execution_duration_ms: null,
    status_message: message,
    progress: {
      current_step: status,
      percent,
      message,
    },
    last_error: null,
    context: stored.context,
    plan,
    steps: buildSteps(status, new Date(stored.created_at).getTime()),
    result: null,
  };
}

function finalizeJob(
  stored: StoredJob,
  plan: AnalysisPlan,
  status: Extract<AnalysisStatus, 'succeeded' | 'failed' | 'blocked' | 'needs_refine'>,
  elapsed: number,
  result: AnalysisResult | null,
  error: AnalysisJob['last_error'],
  message: string,
): AnalysisJob {
  const finishedAt = new Date(new Date(stored.created_at).getTime() + Math.max(elapsed, 1200)).toISOString();
  return {
    id: stored.id,
    question: stored.question,
    status,
    risk_level: plan.risk_level,
    execution_mode: plan.execution_mode,
    created_at: stored.created_at,
    updated_at: finishedAt,
    finished_at: finishedAt,
    can_cancel: false,
    execution_duration_ms: Math.max(1200, elapsed),
    status_message: message,
    progress: null,
    last_error: error,
    context: stored.context,
    plan,
    steps: buildSteps(status, new Date(stored.created_at).getTime()),
    result,
  };
}

function buildSteps(status: AnalysisStatus, createdAt: number) {
  const stepNames: AnalysisJob['steps'][number]['name'][] = ['planning', 'sql_execution', 'chart_compilation', 'summary_generation'];
  return stepNames.map((name, index) => {
    const stepTime = new Date(createdAt + index * 900).toISOString();
    const succeededNames =
      status === 'succeeded'
        ? stepNames
        : status === 'failed'
          ? ['planning', 'sql_execution']
          : status === 'blocked' || status === 'needs_refine'
            ? ['planning']
            : status === 'cancelled'
              ? ['planning']
              : stepNames.slice(0, Math.max(1, ['queued', 'planning', 'running', 'summarizing'].indexOf(status)));
    let stepStatus: AnalysisJob['steps'][number]['status'] = 'pending';
    if (status === 'queued') stepStatus = index === 0 ? 'running' : 'pending';
    else if (status === 'planning') stepStatus = index === 0 ? 'running' : 'pending';
    else if (status === 'running') stepStatus = index === 0 ? 'succeeded' : index === 1 ? 'running' : 'pending';
    else if (status === 'summarizing') stepStatus = index <= 2 ? 'succeeded' : 'running';
    else if (succeededNames.includes(name)) stepStatus = status === 'failed' && name === 'sql_execution' ? 'failed' : 'succeeded';
    else if (status === 'cancelled' && index > 0) stepStatus = 'skipped';
    else if (status === 'blocked' || status === 'needs_refine') stepStatus = index === 0 ? 'succeeded' : 'skipped';

    return {
      name,
      status: stepStatus,
      started_at: stepTime,
      finished_at: stepStatus === 'pending' ? null : stepTime,
      error_code: stepStatus === 'failed' ? 'MOCK_QUERY_TIMEOUT' : null,
    };
  });
}

function buildAnalysisPlan(question: string, profile: StoredJobProfile, context: AnalysisContext): AnalysisPlan {
  const riskLevel: RiskLevel = profile === 'blocked' ? 'red' : profile === 'needs_refine' ? 'yellow' : 'green';
  const executionMode = profile === 'blocked' || profile === 'needs_refine' ? null : profile === 'sync_success' ? 'sync_sql' : 'async_sql';
  return {
    intent: inferIntent(question),
    risk_level: riskLevel,
    execution_mode: executionMode,
    sql_text: riskLevel === 'green' ? 'SELECT snapshot_date, entity_name, score FROM ai_read_rankings WHERE snapshot_date >= :start_date' : null,
    sql_explanation: riskLevel === 'green'
      ? '先定位白名单分析视图，再按时间窗口、榜单对象与筛选条件生成只读 SQL，最后返回归一化图表与摘要。'
      : '问题先经过风险判定；若范围过大或涉及不安全操作，将返回限缩建议或拒绝原因。',
    guardrail_summary: {
      allowed_views: ['ai_read_rankings', 'ai_read_entity_metrics', 'ai_read_release_events'],
      row_limit: 500,
      timeout_ms: 12_000,
      notes: ['仅允许 SELECT。', '不访问 staging/raw 表。'],
    },
    data_scope: context.filters ?? DEFAULT_FILTERS,
    recommended_visualization: createTrendChart('AI 推荐图表', context.filters?.window ?? '30d'),
    risk_reason:
      riskLevel === 'red'
        ? '请求包含原始表导出 / 脚本执行等高风险动作，不在 v1 白名单范围内。'
        : riskLevel === 'yellow'
          ? '问题描述过宽，可能导致查询范围过大或口径不明确。'
          : '问题属于只读分析场景，可在白名单视图中安全执行。',
    refine_suggestions:
      riskLevel === 'green'
        ? ['可继续限定时间窗口或对象，以获得更聚焦的分析。']
        : [
            '限定榜单类型，例如电影热榜或艺人热榜。',
            '补充时间范围，例如近 7 天或近 30 天。',
            '指定平台、题材或对象，减少结果范围。',
          ],
  };
}

function buildAnalysisResult(question: string, context: AnalysisContext): AnalysisResult {
  const chart = createTrendChart('分析结果图表', context.filters?.window ?? '30d');
  const table_preview: TablePreview = {
    columns: [
      { key: 'entity_name', label: '对象', data_type: 'string' },
      { key: 'score', label: '热度分值', data_type: 'number' },
      { key: 'delta_percent', label: '涨跌幅', data_type: 'number' },
      { key: 'snapshot_date', label: '快照日期', data_type: 'date' },
    ],
    rows: getFilteredCatalog(context.ranking_type ?? 'movies', context.filters ?? DEFAULT_FILTERS)
      .slice(0, 5)
      .map((item) => ({
        entity_name: item.name,
        score: item.score_base,
        delta_percent: item.delta_percent,
        snapshot_date: SNAPSHOT_DATE,
      })),
  };

  return {
    summary_markdown: `- 问题：${question}\n- 结论：当前样本显示头部对象在近 30 天保持稳定领先，波动主要来自上映/开播节点与平台资源倾斜。\n- 建议：继续结合来源拆解与单体详情页验证异常波动原因。`,
    chart,
    table_preview,
    artifacts: [
      { id: makeUuid(92, 1), artifact_type: 'chart', label: '结果图表', mime_type: 'application/json', download_url: null, expires_at: null },
      { id: makeUuid(92, 2), artifact_type: 'table_snapshot', label: '结果表格', mime_type: 'application/json', download_url: null, expires_at: null },
      { id: makeUuid(92, 3), artifact_type: 'summary_markdown', label: '中文摘要', mime_type: 'text/markdown', download_url: null, expires_at: null },
    ],
    provenance: makeProvenance('analysis', context.filters ?? DEFAULT_FILTERS),
  };
}

function classifyProfile(question: string): StoredJobProfile {
  if (/原始表|python|脚本|导出|抓取/i.test(question)) return 'blocked';
  if (/全部|所有平台|所有来源|全部对象/i.test(question)) return 'needs_refine';
  if (/失败/i.test(question)) return 'failed';
  if (/对比|趋势|最近|近\s*\d+/i.test(question) || question.length > 24) return 'async_success';
  return 'sync_success';
}

function inferIntent(question: string): AnalysisPlan['intent'] {
  if (/对比|比较/i.test(question)) return 'ranking_compare';
  if (/趋势|走势/i.test(question)) return 'trend_explain';
  if (/平台|来源/i.test(question)) return 'source_compare';
  if (/异常|波动/i.test(question)) return 'anomaly_detection';
  if (/详情|深挖/i.test(question)) return 'entity_deep_dive';
  return 'overview';
}

function toSummary(job: AnalysisJob): AnalysisJobSummary {
  const { plan, steps, result, context, ...summary } = job;
  return summary;
}

function sortRankingItems(items: RankingItem[], sortBy: SortBy, sortOrder: SortOrder) {
  const factor = sortOrder === 'asc' ? 1 : -1;
  return [...items].sort((a, b) => {
    const aValue = sortBy === 'rank' ? a.rank : sortBy === 'score' ? a.score : sortBy === 'delta_value' ? a.delta_value ?? 0 : a.delta_percent ?? 0;
    const bValue = sortBy === 'rank' ? b.rank : sortBy === 'score' ? b.score : sortBy === 'delta_value' ? b.delta_value ?? 0 : b.delta_percent ?? 0;
    return (aValue - bValue) * factor;
  });
}

function createTimePoints(window: WindowOption, base: number, variance: number): ChartPoint[] {
  const count = window === '7d' ? 7 : window === '30d' ? 10 : window === '90d' ? 12 : 14;
  return Array.from({ length: count }, (_, index) => ({
    x: count <= 10 ? `03/${String(index + 1).padStart(2, '0')}` : `W${index + 1}`,
    y: Number((base + Math.sin(index / 1.8) * variance + index * 0.6).toFixed(1)),
  }));
}

function toEntityReference(item: CatalogItem): EntityReference {
  return {
    id: item.id,
    entity_type: item.entity_type,
    name: item.name,
    subtitle: item.subtitle,
    work_type: item.work_type,
    avatar_url: item.avatar_url,
    tags: item.tags,
  };
}

function labelById(collection: FilterOption[], id: string): string {
  return collection.find((item) => item.id === id)?.label ?? '未知';
}

function normalizeWeights(values: number[]): number[] {
  const total = values.reduce((sum, value) => sum + value, 0);
  return values.map((value) => Number((value / total).toFixed(2)));
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function makeUuid(block: number, index: number): string {
  const tail = String(index).padStart(12, '0');
  return `00000000-0000-4${String(block).slice(0, 2).padStart(2, '0')}-8${String(block).slice(-2).padStart(2, '0')}-${tail}`;
}

function rankBlock(rankingType: RankingType) {
  if (rankingType === 'artists') return 31;
  if (rankingType === 'characters') return 32;
  if (rankingType === 'series') return 33;
  return 34;
}
