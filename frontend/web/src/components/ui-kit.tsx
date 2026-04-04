import Link from 'next/link';
import type { CSSProperties, ReactNode } from 'react';

import type {
  AnalysisJobSummary,
  ChartSpec,
  KpiCard,
  MetricCard,
  ProvenanceBlock,
  RankingPanel,
} from '@/lib/api-contract';
import {
  getAnalysisStatusLabel,
  getFreshnessLabel,
  getFreshnessTone,
  getRiskLabel,
  getRiskTone,
  getStatusTone,
  getToneClass,
  getTrendLabel,
} from '@/lib/display';
import { formatDate, formatDateTime, formatNumber, formatPercent, makeHref } from '@/lib/query';

export function Surface({
  children,
  className,
  style,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <section className={['surface', className].filter(Boolean).join(' ')} style={style}>
      {children}
    </section>
  );
}

export function Badge({
  tone = 'neutral',
  children,
}: {
  tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'info';
  children: ReactNode;
}) {
  return <span className={['badge', getToneClass(tone)].join(' ')}>{children}</span>;
}

export function PageTitle({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <div className="page-title">
      <div>
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
        <h1>{title}</h1>
        <p className="page-description">{description}</p>
      </div>
      {actions ? <div className="page-actions">{actions}</div> : null}
    </div>
  );
}

export function SectionTitle({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="section-title-row">
      <div>
        <h2 className="section-title">{title}</h2>
        {subtitle ? <p className="section-subtitle">{subtitle}</p> : null}
      </div>
      {action ? <div>{action}</div> : null}
    </div>
  );
}

export function StateCard({
  title,
  description,
  tone = 'neutral',
  actions,
}: {
  title: string;
  description: string;
  tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'info';
  actions?: ReactNode;
}) {
  return (
    <Surface className={['state-card', `state-${tone}`].join(' ')}>
      <Badge tone={tone}>{title}</Badge>
      <p>{description}</p>
      {actions ? <div className="state-actions">{actions}</div> : null}
    </Surface>
  );
}

export function KpiGrid({ cards }: { cards: KpiCard[] }) {
  return (
    <div className="kpi-grid">
      {cards.map((card) => (
        <Surface key={card.key} className="kpi-card">
          <p className="muted-label">{card.label}</p>
          <div className="value-row">
            <strong>{formatNumber(card.value, card.unit)}</strong>
            <span className="muted-emphasis">{card.emphasis ?? '—'}</span>
          </div>
          <div className="delta-row">
            <span>
              {card.delta_value === undefined || card.delta_value === null
                ? 'Δ —'
                : `Δ ${formatNumber(card.delta_value, card.unit)}`}
            </span>
            <Badge tone={card.delta_percent && card.delta_percent > 0 ? 'success' : 'neutral'}>
              {formatPercent(card.delta_percent)}
            </Badge>
          </div>
        </Surface>
      ))}
    </div>
  );
}

export function MetricGrid({ cards }: { cards: MetricCard[] }) {
  return (
    <div className="metric-grid">
      {cards.map((card) => (
        <Surface key={card.key} className="metric-card">
          <p className="muted-label">{card.label}</p>
          <strong>{formatNumber(card.value, card.unit)}</strong>
          <div className="delta-row compact">
            <span>趋势 {getTrendLabel(card.trend_direction)}</span>
            <Badge tone={card.delta_percent && card.delta_percent > 0 ? 'success' : 'neutral'}>
              {formatPercent(card.delta_percent)}
            </Badge>
          </div>
        </Surface>
      ))}
    </div>
  );
}

export function ProvenanceCard({
  provenance,
  compact = false,
}: {
  provenance: ProvenanceBlock;
  compact?: boolean;
}) {
  return (
    <Surface className={compact ? 'provenance-card compact' : 'provenance-card'}>
      <SectionTitle
        title="来源与更新时间"
        subtitle="所有可视数据均绑定 published snapshot、来源范围与方法口径。"
        action={
          <Badge tone={getFreshnessTone(provenance.freshness_status)}>
            {getFreshnessLabel(provenance.freshness_status)}
          </Badge>
        }
      />
      <div className="provenance-top-grid">
        <div>
          <p className="muted-label">快照日期</p>
          <strong>{formatDate(provenance.snapshot_date)}</strong>
        </div>
        <div>
          <p className="muted-label">最近刷新</p>
          <strong>{formatDateTime(provenance.refreshed_at)}</strong>
        </div>
        <div>
          <p className="muted-label">来源范围</p>
          <strong>{provenance.sources.length} 个来源</strong>
        </div>
      </div>
      <div className="stack-list compact-list">
        {provenance.sources.map((source) => (
          <div key={source.id} className="list-row separated">
            <div>
              <div className="inline-meta">
                <strong>{source.source_name}</strong>
                <Badge
                  tone={
                    source.authorization_status === 'licensed'
                      ? 'success'
                      : source.authorization_status === 'public'
                        ? 'info'
                        : 'warning'
                  }
                >
                  {source.authorization_status}
                </Badge>
              </div>
              <p className="muted-copy">{source.caliber_note ?? '无额外口径说明。'}</p>
            </div>
            <span className="tiny-meta">更新时间 {formatDateTime(source.updated_at)}</span>
          </div>
        ))}
      </div>
      <div className="stack-list compact-list">
        {provenance.methodology_refs.map((method) => (
          <div key={method.key} className="method-card">
            <div className="inline-meta space-between">
              <strong>{method.label}</strong>
              <span className="tiny-meta">{method.metric_or_ranking_type}</span>
            </div>
            <p className="muted-copy">{method.formula_summary}</p>
            {method.caliber_note ? <p className="tiny-meta">口径备注：{method.caliber_note}</p> : null}
            {method.notes?.length ? (
              <ul className="tiny-list">
                {method.notes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            ) : null}
          </div>
        ))}
      </div>
    </Surface>
  );
}

export function ChartCard({ chart }: { chart: ChartSpec }) {
  const maxValue = Math.max(1, ...chart.series.flatMap((series) => series.points.map((point) => point.y)));

  return (
    <Surface className="chart-card">
      <SectionTitle title={chart.title} subtitle={chart.subtitle ?? chart.note ?? undefined} />
      <div className="legend-row">
        {chart.series.map((series) => (
          <span key={series.name} className="legend-item">
            <span className="legend-dot" style={{ backgroundColor: series.color ?? '#d7b46a' }} />
            {series.name}
          </span>
        ))}
      </div>
      <div className="chart-series-stack">
        {chart.series.map((series) => (
          <div key={series.name} className="chart-series-block">
            <div className="inline-meta space-between">
              <strong>{series.name}</strong>
              <span className="tiny-meta">
                {series.points[series.points.length - 1]?.y ?? '—'}
                {chart.unit ?? ''}
              </span>
            </div>
            <div className="chart-bars" aria-label={`${series.name} 图表`}>
              {series.points.slice(-10).map((point) => (
                <div key={`${series.name}-${point.x}`} className="chart-bar-item">
                  <div
                    className="chart-bar"
                    style={{
                      height: `${Math.max(10, (point.y / maxValue) * 100)}%`,
                      backgroundColor: series.color ?? '#d7b46a',
                    }}
                    title={`${point.x}: ${point.y}${chart.unit ?? ''}`}
                  />
                  <span>{point.x}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      {chart.note ? <p className="tiny-meta">{chart.note}</p> : null}
    </Surface>
  );
}

export function RankingPreviewGrid({
  panels,
  filters,
}: {
  panels: RankingPanel[];
  filters: {
    as_of?: string | null;
    source_ids: string[];
    platform_ids: string[];
    genres: string[];
    window?: string | null;
  };
}) {
  return (
    <div className="panel-grid two-up">
      {panels.map((panel) => (
        <Surface key={panel.ranking_type} className="ranking-preview-card">
          <SectionTitle
            title={panel.title}
            subtitle={`Top ${panel.items.length} 预览`}
            action={
              <Link
                className="text-link"
                href={makeHref(`/rankings/${panel.ranking_type}`, {
                  as_of: filters.as_of ?? null,
                  source_ids: filters.source_ids,
                  platform_ids: filters.platform_ids,
                  genres: filters.genres,
                  window: filters.window ?? '30d',
                })}
              >
                打开榜单 →
              </Link>
            }
          />
          <div className="stack-list compact-list">
            {panel.items.map((item) => (
              <Link
                key={item.entity.id}
                className="list-row interactive"
                href={makeHref(`/entities/${item.entity.entity_type}/${item.entity.id}`, {
                  as_of: panel.provenance.snapshot_date,
                })}
              >
                <div>
                  <div className="inline-meta">
                    <span className="rank-chip">#{item.rank}</span>
                    <strong>{item.entity.name}</strong>
                  </div>
                  <p className="muted-copy">{item.entity.subtitle ?? item.tags.join(' / ')}</p>
                </div>
                <div className="align-right">
                  <strong>{formatNumber(item.score, '分')}</strong>
                  <span className="tiny-meta">{formatPercent(item.delta_percent)}</span>
                </div>
              </Link>
            ))}
          </div>
        </Surface>
      ))}
    </div>
  );
}

export function JobSummaryList({
  jobs,
  hrefBuilder,
  emptyTitle = '暂无任务',
  emptyDescription = '最近没有分析任务记录，可从推荐问题或实体上下文发起。',
}: {
  jobs: AnalysisJobSummary[];
  hrefBuilder?: (job: AnalysisJobSummary) => string;
  emptyTitle?: string;
  emptyDescription?: string;
}) {
  if (!jobs.length) {
    return <StateCard title={emptyTitle} description={emptyDescription} tone="neutral" />;
  }

  return (
    <div className="stack-list compact-list">
      {jobs.map((job) => {
        const content = (
          <>
            <div>
              <div className="inline-meta wrap">
                <Badge tone={getStatusTone(job.status)}>{getAnalysisStatusLabel(job.status)}</Badge>
                <Badge tone={getRiskTone(job.risk_level)}>{getRiskLabel(job.risk_level)}</Badge>
              </div>
              <strong>{job.question}</strong>
              <p className="muted-copy">{job.status_message ?? '展示任务状态、风险与更新时间。'}</p>
            </div>
            <div className="align-right">
              <span className="tiny-meta">更新于 {formatDateTime(job.updated_at)}</span>
              <span className="tiny-meta">{job.execution_mode ?? 'no-run'}</span>
            </div>
          </>
        );

        return hrefBuilder ? (
          <Link key={job.id} className="list-row interactive" href={hrefBuilder(job)}>
            {content}
          </Link>
        ) : (
          <div key={job.id} className="list-row separated">
            {content}
          </div>
        );
      })}
    </div>
  );
}

export function Sparkline({ chart }: { chart: ChartSpec | null | undefined }) {
  if (!chart?.series[0]?.points.length) return <span className="tiny-meta">无趋势样本</span>;

  const points = chart.series[0].points;
  const max = Math.max(...points.map((point) => point.y), 1);

  return (
    <div className="sparkline" aria-label="趋势概览">
      {points.map((point) => (
        <span
          key={point.x}
          className="sparkline-bar"
          style={{ height: `${Math.max(12, (point.y / max) * 100)}%` }}
          title={`${point.x}: ${point.y}`}
        />
      ))}
    </div>
  );
}
