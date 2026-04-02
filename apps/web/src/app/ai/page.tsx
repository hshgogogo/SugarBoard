import { AppShell } from '@/components/app-shell';
import { AiWorkbench } from '@/components/ai-workbench';
import { getBootstrapFilters, listAnalysisJobs } from '@/lib/mock-api';

export default async function AiPage() {
  const [bootstrap, jobs] = await Promise.all([
    getBootstrapFilters(),
    listAnalysisJobs({ page: 1, pageSize: 20 }),
  ]);

  return (
    <AppShell currentPath="/ai">
      <AiWorkbench initialBootstrap={bootstrap.data} initialJobs={jobs.data.items} />
    </AppShell>
  );
}
