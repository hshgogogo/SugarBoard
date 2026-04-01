import Link from 'next/link';
import type {
  AnalysisJob,
  AnalysisJobSummary,
  AnalysisPlan,
  AnalysisResult,
  ChartSpec,
  EntityDetailData,
  FilterSet,
  KpiCard,
  MetricCard,
  ProvenanceBlock,
  RankingItem,
  RankingPanel,
  RankingType,
  RelatedGroup,
  TimelineEvent,
} from '@/lib/api-contract';
import {
  formatDate,
  formatDateTime,
  formatNumber,
  formatPercent,
  getRankingTypeLabel,
  makeHref,
  rankingTypeToEntityType,
} from '@/lib/query';

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow: string;
  title: string;
  description: string;
  actions?: React.ReactNode;
}) {
  return (
    <header className="page-header">
      <div>
        <p className="page-header__eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {actions ? <div className="hero-actions">{actions}</div> : null}
    </header>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  aside,
}: {
  eyebrow: string;
  title: string;
  description: string;
  aside?: React.ReactNode;
}) {
  return (
    <div className="section-heading">
      <div>
        <p className="section-heading__eyebrow">{eyebrow}</p>
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
      {aside}
    </div>
  );
}

export function SummaryGrid({ items }: { items: KpiCard[] }) {
  return (
    <section className="summary-grid">
      {items.map((item) => (
        <article key={item.key} className="summary-card">
          <div className="summary-card__label">{item.label}</div>
          <div className="summary-card__value">{formatNumber(item.value, item.unit)}</div>
          {item.delta_percent !== null && item.delta_percent !== undefined ? (
            <DeltaBadge value={item.delta_percent} />
          ) : null}
          {item.emphasis ? <div className="summary-card__emphasis">{item.emphasis}</div> : null}
        </article>
      ))}
    </section>
  );
}

export function MetricGrid({ items }: { items: MetricCard[] }) {
  return (
    <section className="metric-grid">
      {items.map((item) => (
        <article key={item.key} className="metric-card">
          <div className="metric-card__label">{item.label}</div>
          <div className="metric-card__value">{formatNumber(item.value, item.unit)}</div>
          <DeltaBadge value={item.delta_percent ?? 0} />
        </article>
      ))}
    </section>
  );
}

export function RankingPanels({
  panels,
  filters,
}: {
  panels: RankingPanel[];
  filters: FilterSet;
}) {
  return (
    <section className="panel-grid">
      {panels.map((panel) => (
        <article key={panel.ranking_type} className="surface-card stack">
          <SectionHeading
            eyebrow="Top 5"
            title={panel.title}
            description={`${panel.provenance.sources.length} 个来源参与，更新时间 ${formatDateTime(panel.provenance.refreshed_at)}`}
            aside={
              <Link
                className="button-link"
                href={makeHref(`/rankings/${panel.ranking_type}`, filterSetToQuery(filters))}
              >
                查看完整榜单
              </Link>
            }
          />
          <div className="ranking-list">
            {panel.items.map((item) => (
              <div key={item.entity.id} className="ranking-list__row">
                <div className="row-meta">
                  <span className="muted">#{item.rank}</span>
                  {item.delta_percent ? <DeltaBadge value={item.delta_percent} /> : null}
                </div>
                <Link
                  className="entity-link"
                  href={makeHref(
                    `/entities/${rankingTypeToEntityType(panel.ranking_type)}/${item.entity.id}`,
                    { as_of: filters.as_of ?? undefined },
                  )}
                >
                  <strong>{item.entity.name}</strong>
                  <span className="muted">{item.entity.subtitle ?? '查看详情页样本'}</span>
                  <span className="muted">{formatNumber(item.score, '分')} / {item.tags.join(' · ')}</span>
                </Link>
              </div>
            ))}
          </div>
        </article>
      ))}
    </section>
  );
}

export function RankingTable({
  rankingType,
  items,
  filters,
}: {
  rankingType: RankingType;
  items: RankingItem[];
  filters: FilterSet;
}) {
  return (
    <div className="table-card stack">
      <SectionHeading
        eyebrow="主榜单"
        title={`${getRankingTypeLabel(rankingType)} · 当前筛选结果`}
        description="主表保留排名、分值、涨跌、来源拆解与下钻入口。"
      />
      <div className="table-scroll">
        <table className="data-table">
          <thead>
            <tr>
              <th>排名</th>
              <th>对象</th>
              <th>分值</th>
              <th>涨跌</th>
              <th>来源拆解</th>
              <th>标签</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.entity.id}>
                <td>#{item.rank}</td>
                <td>
                  <Link
                    className="entity-link"
                    href={makeHref(
                      `/entities/${rankingTypeToEntityType(rankingType)}/${item.entity.id}`,
                      { as_of: filters.as_of ?? undefined },
                    )}
                  >
                    <strong>{item.entity.name}</strong>
                    <span className="muted">{item.entity.subtitle ?? '实体详情页'}</span>
                  </Link>
                </td>
                <td>{formatNumber(item.score, '分')}</td>
                <td>
                  <DeltaBadge value={item.delta_percent ?? 0} />
                </td>
                <td>
                  <div className="stack">
                    {item.source_breakdown.slice(0, 2).map((source) => (
                      <span key={source.source_id} className="muted">
                        {source.source_name} · {formatNumber(source.metric_value, '分')}
                      </span>
                    ))}
                  </div>
                </td>
                <td>{item.tags.join(' · ')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function ChartGrid({ charts }: { charts: ChartSpec[] }) {
  return (
    <section className="chart-grid">
      {charts.map((chart, index) => (
        <ChartCard key={`${chart.title}-${index}`} chart={chart} />
      ))}
    </section>
  );
}

export function ChartCard({ chart }: { chart: ChartSpec }) {
  const max = Math.max(1, ...chart.series.flatMap((series) => series.points.map((point) => point.y)));

  return (
    <article className="chart-card">
      <div className="chart-card__header">
        <div>
          <strong>{chart.title}</strong>
          {chart.subtitle ? <p className="card-subtitle">{chart.subtitle}</p> : null}
        </div>
        <span className="chip">{chart.chart_type}</span>
      </div>
      <div className="chart-card__canvas">
        {chart.series.map((series) => (
          <div key={series.name} className="chart-series" style={{ color: series.color ?? '#9d4e2f' }}>
            <div className="split-inline">
              <strong>{series.name}</strong>
              {chart.unit ? <span className="muted">单位：{chart.unit}</span> : null}
            </div>
            <div className="chart-bars">
              {series.points.slice(0, 10).map((point) => (
                <div key={`${series.name}-${point.x}`} className="chart-bars__item">
                  <div
                    className="chart-bars__fill"
                    style={{ height: `${Math.max(8, (point.y / max) * 120)}px` }}
                    title={`${point.x}: ${point.y}`}
                  />
                  <span className="chart-bars__label">{point.x}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      {chart.note ? <p className="muted">{chart.note}</p> : null}
    </article>
  );
}

export function ProvenanceCard({ provenance }: { provenance: ProvenanceBlock }) {
  return (
    <aside className="provenance-card stack">
      <div className="provenance-card__header">
        <div>
          <strong>来源与更新时间</strong>
          <p className="card-subtitle">全站硬约束，所有页面均需可追溯。</p>
        </div>
        <StatusPill tone={freshnessToTone(provenance.freshness_status)} label={provenance.freshness_status} />
      </div>
      <div className="fact-grid">
        <div className="fact-item">
          <div className="muted">快照日期</div>
          <strong>{formatDate(provenance.snapshot_date)}</strong>
        </div>
        <div className="fact-item">
          <div className="muted">最近刷新</div>
          <strong>{formatDateTime(provenance.refreshed_at)}</strong>
        </div>
        <div className="fact-item">
          <div className="muted">方法口径</div>
          <strong>{provenance.methodology_refs[0]?.label ?? '暂无'}</strong>
        </div>
      </div>
      <div className="stack">
        {provenance.sources.map((source) => (
          <div key={source.id} className="fact-item">
            <div className="split-inline">
              <strong>{source.source_name}</strong>
              <span className="chip">{source.authorization_status}</span>
            </div>
            <p className="muted">{source.caliber_note ?? '无额外口径说明'}</p>
            <p className="muted">更新时间：{formatDateTime(source.updated_at)}</p>
          </div>
        ))}
      </div>
    </aside>
  );
}

export function EntityDetailSections({ data }: { data: EntityDetailData }) {
  return (
    <div className="stack">
      <article className="surface-card stack">
        <SectionHeading
          eyebrow="实体概况"
          title={data.entity.name}
          description={data.entity.description ?? '实体详情页模板示例'}
        />
        <div className="fact-grid">
          {data.entity.hero_facts.map((fact) => (
            <div key={fact.label} className="fact-item">
              <div className="muted">{fact.label}</div>
              <strong>{fact.value}</strong>
            </div>
          ))}
        </div>
        <div className="tag-row">
          {data.entity.tags.map((tag) => (
            <span key={tag} className="chip">
              {tag}
            </span>
          ))}
        </div>
      </article>
      <MetricGrid items={data.metric_cards} />
      <ChartGrid charts={data.trend_panels} />
      <article className="surface-card stack">
        <SectionHeading
          eyebrow="近期待势"
          title="榜单轨迹"
          description="详情页必须能说明这个对象最近是否持续在榜。"
        />
        <div className="ranking-list">
          {data.ranking_history.map((entry) => (
            <div key={`${entry.ranking_type}-${entry.snapshot_date}`} className="ranking-list__row">
              <div className="row-meta">
                <strong>{formatDate(entry.snapshot_date)}</strong>
                <span className="chip">{getRankingTypeLabel(entry.ranking_type)}</span>
              </div>
              <div className="muted">当日排名 #{entry.rank}</div>
            </div>
          ))}
        </div>
      </article>
      <article className="surface-card stack">
        <SectionHeading
          eyebrow="关系模块"
          title="关联对象"
          description="详情页用统一模板承载作品 / 艺人 / 角色差异化模块。"
        />
        {data.related_groups.length ? (
          data.related_groups.map((group) => <RelatedGroupSection key={group.title} group={group} />)
        ) : (
          <EmptyState title="当前样本缺少关系数据" description="这是规格允许的降级路径，页面需要保持可打开并明确说明空态原因。" />
        )}
      </article>
      <article className="surface-card stack">
        <SectionHeading
          eyebrow="时间线"
          title="公开事件与节点"
          description="用于解释热度变化背后的时间节点。"
        />
        {data.timeline.length ? <TimelineSection items={data.timeline} /> : <EmptyState title="暂无时间线事件" description="当前样本没有可展示的公开节点，后续可由数据接入补齐。" />}
      </article>
    </div>
  );
}

export function JobStatusList({
  jobs,
  selectedId,
  onSelect,
}: {
  jobs: AnalysisJobSummary[];
  selectedId?: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="job-list">
      {jobs.map((job) => (
        <button
          key={job.id}
          className="job-list__row"
          onClick={() => onSelect(job.id)}
          style={{
            borderColor: selectedId === job.id ? 'rgba(157, 78, 47, 0.36)' : undefined,
          }}
          type="button"
        >
          <div className="row-meta">
            <strong>{job.question}</strong>
            <StatusPill tone={job.risk_level} label={job.risk_level} />
          </div>
          <div className="split-inline">
            <span className="muted">{job.status}</span>
            <span className="muted">{formatDateTime(job.created_at)}</span>
          </div>
          {job.progress ? (
            <div className="stack">
              <div className="progress-bar">
                <span style={{ width: `${job.progress.percent}%` }} />
              </div>
              <span className="muted">{job.progress.message ?? '处理中'}</span>
            </div>
          ) : null}
          {job.status_message ? <span className="muted">{job.status_message}</span> : null}
        </button>
      ))}
    </div>
  );
}

export function AnalysisPlanCard({ plan }: { plan: AnalysisPlan }) {
  return (
    <article className="surface-card stack">
      <SectionHeading
        eyebrow="Plan"
        title="执行计划"
        description={plan.sql_explanation}
        aside={<StatusPill tone={plan.risk_level} label={plan.risk_level} />}
      />
      <div className="fact-grid">
        <div className="fact-item">
          <div className="muted">Intent</div>
          <strong>{plan.intent}</strong>
        </div>
        <div className="fact-item">
          <div className="muted">执行模式</div>
          <strong>{plan.execution_mode ?? '不执行'}</strong>
        </div>
        <div className="fact-item">
          <div className="muted">白名单视图</div>
          <strong>{plan.guardrail_summary.allowed_views.join(' / ')}</strong>
        </div>
      </div>
      {plan.sql_text ? <div className="markdown-card">{plan.sql_text}</div> : null}
      <div className="stack">
        <strong>风险说明</strong>
        <p className="muted">{plan.risk_reason}</p>
        {plan.refine_suggestions.length ? (
          <div className="chip-row">
            {plan.refine_suggestions.map((suggestion) => (
              <span key={suggestion} className="chip chip--active">
                {suggestion}
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </article>
  );
}

export function AnalysisResultCard({ result }: { result: AnalysisResult }) {
  return (
    <div className="stack">
      <article className="surface-card stack">
        <SectionHeading
          eyebrow="Summary"
          title="中文摘要"
          description="AI 结果需要可解释、可追溯，并留在工作台内呈现。"
        />
        <div className="markdown-card">{result.summary_markdown}</div>
      </article>
      <ChartCard chart={result.chart} />
      <article className="table-card stack">
        <SectionHeading
          eyebrow="Preview"
          title="结果表格预览"
          description="同步展示 SQL 结果快照，避免只给结论不给底表。"
        />
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                {result.table_preview.columns.map((column) => (
                  <th key={column.key}>{column.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {result.table_preview.rows.map((row, index) => (
                <tr key={`${row[result.table_preview.columns[0]?.key] ?? index}`}>
                  {result.table_preview.columns.map((column) => (
                    <td key={column.key}>{String(row[column.key] ?? '—')}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>
      <ProvenanceCard provenance={result.provenance} />
    </div>
  );
}

export function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <article className="empty-card">
      <strong>{title}</strong>
      <p>{description}</p>
    </article>
  );
}

function RelatedGroupSection({ group }: { group: RelatedGroup }) {
  return (
    <div className="stack">
      <strong>{group.title}</strong>
      <div className="card-list">
        {group.items.map((item) => (
          <div key={`${group.title}-${item.entity.id}`} className="related-item">
            <div className="row-meta">
              <Link
                className="entity-link"
                href={`/entities/${item.entity.entity_type}/${item.entity.id}`}
              >
                <strong>{item.entity.name}</strong>
                <span className="muted">{item.relation_label}</span>
              </Link>
              {item.metric_value !== null && item.metric_value !== undefined ? (
                <span className="chip">{formatNumber(item.metric_value, item.metric_label ? '' : null)}</span>
              ) : null}
            </div>
            {item.metric_label ? <p className="muted">{item.metric_label}</p> : null}
          </div>
        ))}
      </div>
    </div>
  );
}

function TimelineSection({ items }: { items: TimelineEvent[] }) {
  return (
    <div className="timeline-list">
      {items.map((item) => (
        <div key={item.id} className="timeline-item">
          <div className="row-meta">
            <strong>{item.title}</strong>
            <span className="chip">{item.event_type}</span>
          </div>
          <p className="muted">
            {formatDate(item.event_date)} · {item.source_name ?? '未注明来源'}
          </p>
          {item.description ? <p>{item.description}</p> : null}
        </div>
      ))}
    </div>
  );
}

export function StatusPill({
  tone,
  label,
}: {
  tone: 'green' | 'yellow' | 'red' | 'neutral';
  label: string;
}) {
  const className =
    tone === 'green'
      ? 'status-pill status-pill--green'
      : tone === 'yellow'
        ? 'status-pill status-pill--yellow'
        : tone === 'red'
          ? 'status-pill status-pill--red'
          : 'status-pill status-pill--neutral';
  return <span className={className}>{label}</span>;
}

function DeltaBadge({ value }: { value: number }) {
  const tone = value > 0 ? 'up' : value < 0 ? 'down' : 'flat';
  return <span className={`delta delta--${tone}`}>{formatPercent(value)}</span>;
}

function freshnessToTone(
  freshness: ProvenanceBlock['freshness_status'],
): 'green' | 'yellow' | 'red' | 'neutral' {
  if (freshness === 'fresh') return 'green';
  if (freshness === 'delayed') return 'yellow';
  if (freshness === 'stale') return 'red';
  return 'neutral';
}

function filterSetToQuery(filters: FilterSet) {
  return {
    as_of: filters.as_of ?? undefined,
    window: filters.window ?? undefined,
    source_ids: filters.source_ids,
    platform_ids: filters.platform_ids,
    genres: filters.genres,
  };
}
