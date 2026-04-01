import { notFound } from 'next/navigation';
import { FilterControls } from '@/components/filter-controls';
import {
  ChartGrid,
  PageHeader,
  ProvenanceCard,
  RankingTable,
} from '@/components/ui';
import { getBootstrapFilters, getRankingPage } from '@/lib/mock-api';
import {
  getRankingTypeLabel,
  parseFilterSet,
  readCsvParam,
  readParam,
} from '@/lib/query';

type RankingRouteParams = { rankingType: string };
type RankingPageProps = {
  params: Promise<RankingRouteParams>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const RANKING_TYPES = new Set(['artists', 'characters', 'series', 'movies']);

export default async function RankingPage({ params, searchParams }: RankingPageProps) {
  const resolvedParams = await params;
  const rankingType = resolvedParams.rankingType;
  if (!RANKING_TYPES.has(rankingType)) notFound();

  const query = searchParams ? await searchParams : {};
  const bootstrap = await getBootstrapFilters(readParam(query, 'as_of'));
  const filters = parseFilterSet(query, bootstrap.data.default_filters);
  const data = await getRankingPage({
    rankingType: rankingType as 'artists' | 'characters' | 'series' | 'movies',
    filters,
    page: Number(readParam(query, 'page') ?? 1),
    pageSize: Number(readParam(query, 'page_size') ?? 20),
    sortBy: (readParam(query, 'sort_by') as 'rank' | 'score' | 'delta_value' | 'delta_percent' | undefined) ?? 'rank',
    sortOrder: (readParam(query, 'sort_order') as 'asc' | 'desc' | undefined) ?? 'asc',
  });

  return (
    <div className="page-stack">
      <section className="hero-panel stack">
        <PageHeader
          eyebrow="Rankings"
          title={getRankingTypeLabel(data.data.ranking_type)}
          description="同一页面结构承载四类榜单，通过统一筛选器和右侧辅助分析实现榜单对比。"
        />
      </section>
      <FilterControls bootstrap={bootstrap.data} initialFilters={filters} />
      <section className="detail-grid">
        <div className="stack">
          <RankingTable filters={filters} items={data.data.items} rankingType={data.data.ranking_type} />
          <ChartGrid charts={data.data.analysis_panels} />
        </div>
        <div className="stack">
          <ProvenanceCard provenance={data.data.provenance} />
          <div className="surface-card stack">
            <strong>当前筛选摘要</strong>
            <div className="fact-grid">
              <div className="fact-item">
                <div className="muted">日期</div>
                <strong>{filters.as_of ?? '最新快照'}</strong>
              </div>
              <div className="fact-item">
                <div className="muted">窗口</div>
                <strong>{filters.window ?? '30d'}</strong>
              </div>
              <div className="fact-item">
                <div className="muted">来源</div>
                <strong>{readCsvParam(query, 'source_ids').length || '全部'}</strong>
              </div>
              <div className="fact-item">
                <div className="muted">平台</div>
                <strong>{readCsvParam(query, 'platform_ids').length || '全部'}</strong>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
