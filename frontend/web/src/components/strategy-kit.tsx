import Link from 'next/link';
import type { CSSProperties } from 'react';

import { Badge, SectionTitle, Surface } from '@/components/ui-kit';
import type {
  StrategyBoard,
  StrategyFeature,
  StrategyMetric,
  StrategyWatchItem,
} from '@/lib/strategy-data';

function boardStyle(accent: string): CSSProperties {
  return { '--board-accent': accent } as CSSProperties;
}

function statusTone(status: StrategyFeature['status']): 'success' | 'warning' | 'info' {
  if (status === '重点跟踪') return 'success';
  if (status === '机会窗口') return 'warning';
  return 'info';
}

export function MetricRibbon({ metrics }: { metrics: StrategyMetric[] }) {
  return (
    <div className="metric-ribbon">
      {metrics.map((metric) => (
        <div key={metric.label} className="metric-ribbon__item">
          <span className="metric-ribbon__label">{metric.label}</span>
          <strong>{metric.value}</strong>
          <p>{metric.note}</p>
        </div>
      ))}
    </div>
  );
}

export function BoardOverviewCard({ board }: { board: StrategyBoard }) {
  return (
    <Surface className="board-overview-card" style={boardStyle(board.accent)}>
      <div className="board-overview-card__header">
        <div>
          <p className="eyebrow">{board.englishTitle}</p>
          <h2>{board.title}</h2>
        </div>
        <Badge tone="info">{board.features.length} 个功能页</Badge>
      </div>
      <p className="board-overview-card__summary">{board.summary}</p>
      <MetricRibbon metrics={board.metrics} />
      <div className="board-overview-card__footer">
        <div className="stack-list compact-list">
          {board.features.slice(0, 4).map((feature) => (
            <Link
              key={feature.slug}
              href={`/boards/${board.slug}/${feature.slug}`}
              className="list-row interactive compact-row"
            >
              <div>
                <strong>{feature.title}</strong>
                <p className="muted-copy">{feature.englishTitle}</p>
              </div>
              <span className="tiny-meta">{feature.status}</span>
            </Link>
          ))}
        </div>
        <Link href={`/boards/${board.slug}`} className="button ghost board-overview-card__cta">
          进入板块页
        </Link>
      </div>
    </Surface>
  );
}

export function FeatureCard({
  board,
  feature,
}: {
  board: StrategyBoard;
  feature: StrategyFeature;
}) {
  return (
    <Surface className="feature-card" style={boardStyle(board.accent)}>
      <div className="feature-card__top">
        <div>
          <p className="eyebrow">{feature.englishTitle}</p>
          <h3>{feature.title}</h3>
        </div>
        <Badge tone={statusTone(feature.status)}>{feature.status}</Badge>
      </div>
      <p className="feature-card__summary">{feature.summary}</p>
      <div className="feature-card__metric-grid">
        {feature.metrics.slice(0, 3).map((metric) => (
          <div key={metric.label} className="feature-card__metric">
            <span>{metric.label}</span>
            <strong>{metric.value}</strong>
          </div>
        ))}
      </div>
      <div className="stack-list compact-list">
        {feature.watchItems.slice(0, 2).map((item) => (
          <div key={item.title} className="list-row compact-row">
            <div>
              <strong>{item.title}</strong>
              <p className="muted-copy">{item.description}</p>
            </div>
            <span className="tiny-meta">{item.metric}</span>
          </div>
        ))}
      </div>
      <div className="feature-card__actions">
        <span className="tiny-meta">更新于 {feature.updatedAt}</span>
        <Link href={`/boards/${board.slug}/${feature.slug}`} className="button ghost">
          打开功能页
        </Link>
      </div>
    </Surface>
  );
}

export function QuestionList({
  title,
  questions,
}: {
  title: string;
  questions: string[];
}) {
  return (
    <Surface>
      <SectionTitle title={title} subtitle="帮助制片人与项目团队在会上快速对齐判断标准。" />
      <ul className="signal-list">
        {questions.map((question) => (
          <li key={question}>{question}</li>
        ))}
      </ul>
    </Surface>
  );
}

export function WatchList({
  title,
  items,
}: {
  title: string;
  items: StrategyWatchItem[];
}) {
  return (
    <Surface>
      <SectionTitle title={title} subtitle="把需要盯住的变化、风险和机会浓缩成可快速浏览的 watchlist。" />
      <div className="stack-list">
        {items.map((item) => (
          <div key={item.title} className="list-row separated">
            <div>
              <strong>{item.title}</strong>
              <p className="muted-copy">{item.description}</p>
            </div>
            <span className="metric-pill">{item.metric}</span>
          </div>
        ))}
      </div>
    </Surface>
  );
}

export function ActionChecklist({
  title,
  items,
}: {
  title: string;
  items: string[];
}) {
  return (
    <Surface>
      <SectionTitle title={title} subtitle="把观察结果转成制片、平台、宣发都能直接执行的动作建议。" />
      <ul className="signal-list signal-list--accent">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </Surface>
  );
}

export function NewsTicker({ items }: { items: string[] }) {
  return (
    <div className="news-ticker" aria-label="Dashboard ticker">
      <div className="news-ticker__track">
        {[...items, ...items].map((item, index) => (
          <span key={`${item}-${index}`} className="news-ticker__item">
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}
