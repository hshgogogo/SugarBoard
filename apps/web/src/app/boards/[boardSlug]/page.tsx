import type { CSSProperties } from 'react';
import { notFound } from 'next/navigation';

import { AppShell } from '@/components/app-shell';
import { FeatureCard, MetricRibbon, NewsTicker } from '@/components/strategy-kit';
import { PageTitle, SectionTitle, Surface } from '@/components/ui-kit';
import { getBoardBySlug, strategyBoards, tickerItems } from '@/lib/strategy-data';

export function generateStaticParams() {
  return strategyBoards.map((board) => ({ boardSlug: board.slug }));
}

export default async function BoardPage({
  params,
}: {
  params: Promise<{ boardSlug: string }>;
}) {
  const { boardSlug } = await params;
  const board = getBoardBySlug(boardSlug);

  if (!board) notFound();

  return (
    <AppShell currentPath={`/boards/${board.slug}`}>
      <section className="page-stack">
        <PageTitle
          eyebrow={board.englishTitle}
          title={board.title}
          description={board.summary}
        />

        <Surface className="hero-surface" style={{ '--board-accent': board.accent } as CSSProperties}>
          <SectionTitle
            title="板块策略说明"
            subtitle={board.statusLine}
          />
          <MetricRibbon metrics={board.metrics} />
        </Surface>

        <Surface>
          <SectionTitle
            title="功能分组"
            subtitle="这里的每一张卡片都会进入独立功能页；侧栏负责板块级切换，这一层负责功能级切换。"
          />
          <div className="feature-grid">
            {board.features.map((feature) => (
              <FeatureCard key={feature.slug} board={board} feature={feature} />
            ))}
          </div>
        </Surface>

        <NewsTicker items={tickerItems} />
      </section>
    </AppShell>
  );
}
