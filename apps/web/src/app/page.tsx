import Link from 'next/link';
import { FilterControls } from '@/components/filter-controls';
import {
  ChartGrid,
  PageHeader,
  ProvenanceCard,
  RankingPanels,
  SectionHeading,
  SummaryGrid,
} from '@/components/ui';
import { getBootstrapFilters, getHomeOverview, sampleEntityIds } from '@/lib/mock-api';
import { parseFilterSet, readParam } from '@/lib/query';

type HomePageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = searchParams ? await searchParams : {};
  const bootstrap = await getBootstrapFilters(readParam(params, 'as_of'));
  const filters = parseFilterSet(params, bootstrap.data.default_filters);
  const overview = await getHomeOverview(filters);

  return (
    <div className="page-stack">
      <section className="hero-panel stack">
        <PageHeader
          eyebrow="Homepage Overview"
          title="首页总览"
          description="先看今天最值得关注的对象，再把同一套筛选条件带到榜单页、详情页和 AI 工作台。"
          actions={
            <>
              <Link className="button-link" href="/rankings/artists">
                榜单页
              </Link>
              <Link className="button-link" href={`/entities/work/${sampleEntityIds.work}`}>
                详情页
              </Link>
              <Link className="button-solid" href="/analysis">
                AI 工作台
              </Link>
            </>
          }
        />
        <SummaryGrid items={overview.data.kpis} />
      </section>
      <FilterControls bootstrap={bootstrap.data} initialFilters={filters} />
      <section className="stack">
        <SectionHeading
          eyebrow="Rankings Preview"
          title="四类榜单概览"
          description="首页点击任一卡片即可保留公共筛选条件跳转到对应榜单页。"
        />
        <RankingPanels filters={filters} panels={overview.data.ranking_panels} />
      </section>
      <section className="detail-grid">
        <div className="stack">
          <SectionHeading
            eyebrow="Auxiliary Analysis"
            title="首页辅助分析"
            description="用于快速判断当前口径下的平台与题材结构，以及大盘趋势。"
          />
          <ChartGrid charts={overview.data.analysis_panels} />
          <div className="surface-card stack">
            <SectionHeading
              eyebrow="Recent Jobs"
              title="最近 AI 任务"
              description="让首页就能看到 AI 请求有没有成功、失败或需要缩小范围。"
              aside={<Link className="button-link" href="/analysis">前往工作台</Link>}
            />
            <div className="ranking-list">
              {overview.data.recent_analysis_jobs.map((job) => (
                <Link className="ranking-list__row" href="/analysis" key={job.id}>
                  <div className="row-meta">
                    <strong>{job.question}</strong>
                    <span className="chip">{job.status}</span>
                  </div>
                  <div className="muted">
                    {job.risk_level} / {job.execution_mode ?? '不执行'} / {job.status_message ?? '查看详情'}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
        <ProvenanceCard provenance={overview.data.provenance} />
      </section>
    </div>
  );
}
