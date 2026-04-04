import { AppShell } from '@/components/app-shell';
import {
  BoardOverviewCard,
  FeatureCard,
  MetricRibbon,
  NewsTicker,
} from '@/components/strategy-kit';
import { PageTitle, SectionTitle, StateCard, Surface } from '@/components/ui-kit';
import { strategyBoards, tickerItems } from '@/lib/strategy-data';

export default function HomePage() {
  const spotlightFeatures = strategyBoards.flatMap((board) =>
    board.features.slice(0, 1).map((feature) => ({ board, feature })),
  );

  return (
    <AppShell currentPath="/">
      <section className="page-stack">
        <PageTitle
          eyebrow="Dashboard 2.0"
          title="制片人决策总览"
          description="这一版按 2.0 新方案重组为五大板块，并把每个功能拆成独立页面，方便你从宏观判断一路下钻到具体动作。"
        />

        <Surface className="hero-surface">
          <SectionTitle
            title="五大板块总览"
            subtitle="先看行业宏观与平台竞争，再看营销与技术决策。右侧侧栏改成图标式导航，进入任一板块后再继续打开具体功能页。"
          />
          <MetricRibbon
            metrics={[
              { label: '一级板块', value: '5 个', note: '宏观雷达、平台竞对、营销策略、外部技术、国产生态。' },
              { label: '功能页面', value: '22 个', note: '每个功能单独成页，减少信息挤压。' },
              { label: '当前风格', value: '大屏看板', note: '整体视觉向你给的电视大屏方案靠拢。' },
            ]}
          />
        </Surface>

        <div className="board-overview-grid">
          {strategyBoards.map((board) => (
            <BoardOverviewCard key={board.slug} board={board} />
          ))}
        </div>

        <Surface>
          <SectionTitle
            title="今日重点功能"
            subtitle="每个板块先抽一项最值得看的功能作为入口，后续可继续切入对应的独立功能页。"
          />
          <div className="feature-grid feature-grid--compact">
            {spotlightFeatures.map(({ board, feature }) => (
              <FeatureCard key={`${board.slug}-${feature.slug}`} board={board} feature={feature} />
            ))}
          </div>
        </Surface>

        <StateCard
          title="结构已切换到 2.0"
          description="首页现在只负责做总览和导流，不再把所有功能塞进同一页。真正的功能信息会按板块分组，并在独立功能页中展开。"
          tone="success"
        />

        <NewsTicker items={tickerItems} />
      </section>
    </AppShell>
  );
}
