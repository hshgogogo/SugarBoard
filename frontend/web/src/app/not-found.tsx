import Link from 'next/link';

import { AppShell } from '@/components/app-shell';
import { PageTitle, StateCard } from '@/components/ui-kit';

export default function NotFound() {
  return (
    <AppShell currentPath="/">
      <section className="page-stack">
        <PageTitle
          eyebrow="404"
          title="页面未找到"
          description="当前板块或功能页不存在，可能是链接地址不完整，或该功能还未被纳入 2.0 导航体系。"
          actions={
            <Link href="/" className="button primary">
              返回首页
            </Link>
          }
        />
        <StateCard
          title="请从总览页或对应板块重新进入"
          description="建议先回到总览页，再通过侧栏切入具体板块和功能页，这样能保持清晰的 2.0 浏览路径。"
          tone="warning"
        />
      </section>
    </AppShell>
  );
}
