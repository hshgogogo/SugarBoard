import { AnalysisWorkbench } from '@/components/analysis-workbench';
import { FilterControls } from '@/components/filter-controls';
import { PageHeader } from '@/components/ui';
import { getBootstrapFilters, listAnalysisJobs } from '@/lib/mock-api';
import { parseFilterSet, readParam } from '@/lib/query';

type AnalysisPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AnalysisPage({ searchParams }: AnalysisPageProps) {
  const params = searchParams ? await searchParams : {};
  const bootstrap = await getBootstrapFilters(readParam(params, 'as_of'));
  const filters = parseFilterSet(params, bootstrap.data.default_filters);
  const jobs = await listAnalysisJobs({ pageSize: 8 });

  return (
    <div className="page-stack">
      <section className="hero-panel stack">
        <PageHeader
          eyebrow="AI Workbench"
          title="AI 查询工作台"
          description="在统一筛选上下文里用自然语言发起只读分析，并拿到图表、摘要、表格预览与完整来源追溯。"
        />
      </section>
      <FilterControls bootstrap={bootstrap.data} initialFilters={filters} />
      <AnalysisWorkbench
        bootstrap={bootstrap.data}
        filters={filters}
        initialJobs={jobs.data.items}
      />
    </div>
  );
}
