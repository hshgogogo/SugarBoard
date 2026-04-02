import type { CSSProperties } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { AppShell } from '@/components/app-shell';
import {
  ActionChecklist,
  MetricRibbon,
  NewsTicker,
  QuestionList,
  WatchList,
} from '@/components/strategy-kit';
import { ChartCard, PageTitle, SectionTitle, Surface } from '@/components/ui-kit';
import { getFeatureBySlug, strategyBoards, tickerItems } from '@/lib/strategy-data';

export function generateStaticParams() {
  return strategyBoards.flatMap((board) =>
    board.features.map((feature) => ({
      boardSlug: board.slug,
      featureSlug: feature.slug,
    })),
  );
}

export default async function FeaturePage({
  params,
}: {
  params: Promise<{ boardSlug: string; featureSlug: string }>;
}) {
  const { boardSlug, featureSlug } = await params;
  const result = getFeatureBySlug(boardSlug, featureSlug);

  if (!result) notFound();

  const { board, feature } = result;
  const siblingFeatures = board.features.filter((item) => item.slug !== feature.slug);

  return (
    <AppShell currentPath={`/boards/${board.slug}`}>
      <section className="page-stack">
        <PageTitle
          eyebrow={`${board.title} / ${feature.englishTitle}`}
          title={feature.title}
          description={feature.summary}
          actions={
            <div className="button-row wrap">
              <Link href={`/boards/${board.slug}`} className="button ghost">
                返回板块页
              </Link>
            </div>
          }
        />

        <Surface className="hero-surface" style={{ '--board-accent': board.accent } as CSSProperties}>
          <SectionTitle
            title="核心读数"
            subtitle={`${feature.status} · 更新时间 ${feature.updatedAt}`}
          />
          <MetricRibbon metrics={feature.metrics} />
        </Surface>

        <div className="panel-grid two-up">
          {feature.charts.map((chart) => (
            <ChartCard key={chart.title} chart={chart} />
          ))}
        </div>

        <div className="panel-grid two-up">
          <QuestionList title="决策时要追问的问题" questions={feature.keyQuestions} />
          <WatchList title="当前值得盯住的信号" items={feature.watchItems} />
        </div>

        <ActionChecklist title="建议动作" items={feature.actions} />

        <Surface>
          <SectionTitle
            title="同板块其他功能"
            subtitle="继续切换同一板块中的其他页面，保持判断路径清晰。"
          />
          <div className="related-links-grid">
            {siblingFeatures.map((item) => (
              <Link key={item.slug} href={`/boards/${board.slug}/${item.slug}`} className="list-row interactive compact-row">
                <div>
                  <strong>{item.title}</strong>
                  <p className="muted-copy">{item.summary}</p>
                </div>
                <span className="tiny-meta">{item.status}</span>
              </Link>
            ))}
          </div>
        </Surface>

        <NewsTicker items={tickerItems} />
      </section>
    </AppShell>
  );
}
