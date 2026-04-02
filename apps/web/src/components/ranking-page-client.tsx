'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

import { AppShell } from '@/components/app-shell';
import { FilterToolbar } from '@/components/filter-toolbar';
import {
  Badge,
  ChartCard,
  PageTitle,
  ProvenanceCard,
  SectionTitle,
  Sparkline,
  StateCard,
  Surface,
} from '@/components/ui-kit';
import type { FilterBootstrapResponse, RankingListResponse, RankingType } from '@/lib/api-contract';
import { getRankingTypeChineseLabel } from '@/lib/display';
import { getBootstrapFilters, getRankingPage } from '@/lib/mock-api';
import {
  formatDate,
  formatNumber,
  formatPercent,
  makeHref,
  parseFilterSet,
  parseIntegerParam,
  readParam,
} from '@/lib/query';

const SORT_OPTIONS = [
  { key: 'rank', label: '按排名' },
  { key: 'score', label: '按分值' },
  { key: 'delta_value', label: '按涨跌值' },
  { key: 'delta_percent', label: '按涨跌幅' },
] as const;
const SORT_ORDERS = [
  { key: 'asc', label: '升序' },
  { key: 'desc', label: '降序' },
] as const;

export function RankingPageClient({ rankingType }: { rankingType: RankingType }) {
  const searchParams = useSearchParams();
  const [bootstrap, setBootstrap] = useState<FilterBootstrapResponse | null>(null);
  const [rankingResponse, setRankingResponse] = useState<RankingListResponse | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const nextBootstrap = await getBootstrapFilters();
      const filters = parseFilterSet(searchParams, nextBootstrap.data.default_filters);
      const page = parseIntegerParam(searchParams, 'page', 1);
      const pageSize = parseIntegerParam(searchParams, 'page_size', 20);
      const sortBy = (readParam(searchParams, 'sort_by') ?? 'rank') as
        | 'rank'
        | 'score'
        | 'delta_value'
        | 'delta_percent';
      const sortOrder = (readParam(searchParams, 'sort_order') ?? 'asc') as 'asc' | 'desc';
      const nextRankingResponse = await getRankingPage({
        rankingType,
        filters,
        page,
        pageSize,
        sortBy,
        sortOrder,
      });

      if (cancelled) return;
      setBootstrap(nextBootstrap);
      setRankingResponse(nextRankingResponse);
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [rankingType, searchParams]);

  if (!bootstrap || !rankingResponse) {
    return (
      <AppShell currentPath={`/rankings/${rankingType}`}>
        <section className="page-stack">
          <div className="page-title skeleton-surface">
            <div>
              <p className="eyebrow">Rankings</p>
              <h1>正在加载榜单</h1>
              <p className="page-description">榜单筛选、主表和趋势侧栏正在准备中。</p>
            </div>
          </div>
          <div className="skeleton-grid three-up">
            <div className="skeleton-card tall" />
            <div className="skeleton-card tall" />
            <div className="skeleton-card tall" />
          </div>
        </section>
      </AppShell>
    );
  }

  const filters = parseFilterSet(searchParams, bootstrap.data.default_filters);
  const page = parseIntegerParam(searchParams, 'page', 1);
  const pageSize = parseIntegerParam(searchParams, 'page_size', 20);
  const sortBy = (readParam(searchParams, 'sort_by') ?? 'rank') as
    | 'rank'
    | 'score'
    | 'delta_value'
    | 'delta_percent';
  const sortOrder = (readParam(searchParams, 'sort_order') ?? 'asc') as 'asc' | 'desc';

  const total = rankingResponse.meta.pagination?.total ?? rankingResponse.data.items.length;
  const hasItems = rankingResponse.data.items.length > 0;
  const emptyHref = makeHref(`/rankings/${rankingType}`, {
    as_of: filters.as_of ?? null,
    source_ids: filters.source_ids,
    platform_ids: filters.platform_ids,
    genres: filters.genres,
    window: filters.window ?? '30d',
    sort_by: sortBy,
    sort_order: sortOrder,
    page: '999',
  });
  const resetHref = makeHref(`/rankings/${rankingType}`, {
    as_of: filters.as_of ?? null,
    window: filters.window ?? '30d',
  });

  return (
    <AppShell currentPath={`/rankings/${rankingType}`}>
      <section className="page-stack">
        <PageTitle
          eyebrow="Rankings"
          title={getRankingTypeChineseLabel(rankingType)}
          description="使用统一页面结构承载四类榜单：左侧筛选、中间主表、右侧趋势与来源拆解。"
          actions={
            <div className="button-row wrap">
              <Link href={emptyHref} className="button ghost">
                查看空态样例
              </Link>
              <Link href="/ai" className="button primary">
                用 AI 解释榜单
              </Link>
            </div>
          }
        />

        <div className="tab-row">
          {(['artists', 'characters', 'series', 'movies'] as RankingType[]).map((item) => (
            <Link
              key={item}
              href={makeHref(`/rankings/${item}`, {
                as_of: filters.as_of ?? null,
                source_ids: filters.source_ids,
                platform_ids: filters.platform_ids,
                genres: filters.genres,
                window: filters.window ?? '30d',
              })}
              className={['tab-link', item === rankingType ? 'active' : ''].join(' ')}
            >
              {getRankingTypeChineseLabel(item)}
            </Link>
          ))}
        </div>

        <FilterToolbar
          basePath={`/rankings/${rankingType}`}
          filters={filters}
          dates={bootstrap.data.available_dates}
          sources={bootstrap.data.sources}
          platforms={bootstrap.data.platforms}
          genres={bootstrap.data.genres}
          stickyQuery={{ sort_by: sortBy, sort_order: sortOrder, page_size: String(pageSize) }}
          title="榜单筛选栏"
          description="榜单日期、来源、平台、题材与趋势窗口统一在这里切换；当前页默认按 contract 排序。"
        />

        <div className="rankings-layout">
          <aside className="sidebar-stack">
            <Surface>
              <SectionTitle title="排序与浏览范围" subtitle="榜单支持 Top 100 分页；这里先用 mock 数据把列表壳子做出来。" />
              <div className="filter-group">
                <p className="muted-label">排序字段</p>
                <div className="filter-chip-row">
                  {SORT_OPTIONS.map((option) => (
                    <Link
                      key={option.key}
                      href={makeHref(`/rankings/${rankingType}`, {
                        as_of: filters.as_of ?? null,
                        source_ids: filters.source_ids,
                        platform_ids: filters.platform_ids,
                        genres: filters.genres,
                        window: filters.window ?? '30d',
                        sort_by: option.key,
                        sort_order: sortOrder,
                        page_size: String(pageSize),
                        page: 1,
                      })}
                      className={['filter-chip', sortBy === option.key ? 'active' : ''].join(' ')}
                    >
                      {option.label}
                    </Link>
                  ))}
                </div>
              </div>
              <div className="filter-group">
                <p className="muted-label">排序方向</p>
                <div className="filter-chip-row">
                  {SORT_ORDERS.map((option) => (
                    <Link
                      key={option.key}
                      href={makeHref(`/rankings/${rankingType}`, {
                        as_of: filters.as_of ?? null,
                        source_ids: filters.source_ids,
                        platform_ids: filters.platform_ids,
                        genres: filters.genres,
                        window: filters.window ?? '30d',
                        sort_by: sortBy,
                        sort_order: option.key,
                        page_size: String(pageSize),
                        page: 1,
                      })}
                      className={['filter-chip', sortOrder === option.key ? 'active' : ''].join(' ')}
                    >
                      {option.label}
                    </Link>
                  ))}
                </div>
              </div>
              <div className="detail-card">
                <p className="muted-label">当前浏览</p>
                <p>
                  第 {page} 页 / 共 {Math.max(1, Math.ceil(total / pageSize))} 页
                </p>
                <p className="tiny-meta">总对象数 {total}，每页 {pageSize} 条。</p>
              </div>
            </Surface>

            <ProvenanceCard provenance={rankingResponse.data.provenance} compact />
          </aside>

          <div className="content-column stack-gap">
            <Surface>
              <SectionTitle title="榜单主表" subtitle="包含排名、对象、分值、涨跌、标签、来源提示、快照日期与趋势 sparkline。" />

              {hasItems ? (
                <div className="result-table-wrapper">
                  <table className="result-table ranking-table">
                    <thead>
                      <tr>
                        <th>排名</th>
                        <th>对象</th>
                        <th>分值</th>
                        <th>涨跌</th>
                        <th>标签</th>
                        <th>来源拆解</th>
                        <th>快照</th>
                        <th>趋势</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rankingResponse.data.items.map((item) => (
                        <tr key={item.entity.id}>
                          <td>
                            <div className="rank-cell">
                              <strong>#{item.rank}</strong>
                              <span className="tiny-meta">prev {item.previous_rank ?? '—'}</span>
                            </div>
                          </td>
                          <td>
                            <Link href={makeHref(`/entities/${item.entity.entity_type}/${item.entity.id}`, { as_of: filters.as_of ?? null })} className="table-link">
                              <strong>{item.entity.name}</strong>
                              <span className="tiny-meta">{item.entity.subtitle ?? '查看实体详情'}</span>
                            </Link>
                          </td>
                          <td>{formatNumber(item.score, '分')}</td>
                          <td>
                            <div className="stack-list compact-list dense">
                              <Badge tone={(item.delta_percent ?? 0) > 0 ? 'success' : 'neutral'}>
                                {formatPercent(item.delta_percent)}
                              </Badge>
                              <span className="tiny-meta">Δ {formatNumber(item.delta_value ?? 0, '分')}</span>
                            </div>
                          </td>
                          <td>{item.tags.join(' / ')}</td>
                          <td>
                            <div className="stack-list compact-list dense">
                              {item.source_breakdown.slice(0, 2).map((source) => (
                                <span key={source.source_id} className="tiny-meta">
                                  {source.source_name}: {source.metric_ratio ?? 0}%
                                </span>
                              ))}
                            </div>
                          </td>
                          <td>{formatDate(rankingResponse.data.provenance.snapshot_date)}</td>
                          <td>
                            <Sparkline chart={item.sparkline} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <StateCard
                  title="当前筛选结果为空"
                  description="这个空态既可覆盖筛选后无数据，也可覆盖页码超出范围的情况。建议回退到第 1 页或减少筛选条件。"
                  tone="warning"
                  actions={
                    <div className="button-row wrap">
                      <Link href={resetHref} className="button primary">
                        重置到默认视图
                      </Link>
                      <Link href={emptyHref} className="button ghost">
                        保留空态链接
                      </Link>
                    </div>
                  }
                />
              )}
            </Surface>
          </div>

          <aside className="sidebar-stack">
            {rankingResponse.data.analysis_panels.map((chart) => (
              <ChartCard key={chart.title} chart={chart} />
            ))}
          </aside>
        </div>
      </section>
    </AppShell>
  );
}
