import Link from 'next/link';
import type { ReactNode } from 'react';

import type { DateOption, FilterOption, FilterSet, WindowOption } from '@/lib/api-contract';
import { makeHref, toggleArrayValue } from '@/lib/query';

const WINDOW_OPTIONS: WindowOption[] = ['7d', '30d', '90d', '365d'];

type QueryPatch = Record<string, string | string[] | null | undefined>;

function buildBaseQuery(filters: FilterSet, stickyQuery?: QueryPatch): QueryPatch {
  return {
    ...stickyQuery,
    as_of: filters.as_of ?? null,
    window: filters.window ?? '30d',
    source_ids: filters.source_ids,
    platform_ids: filters.platform_ids,
    genres: filters.genres,
  };
}

function FilterChip({ href, active, label }: { href: string; active: boolean; label: string }) {
  return (
    <Link href={href} className={['filter-chip', active ? 'active' : ''].join(' ')}>
      {label}
    </Link>
  );
}

function FilterGroup({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="filter-group">
      <p className="muted-label">{title}</p>
      <div className="filter-chip-row">{children}</div>
    </div>
  );
}

export function FilterToolbar({
  basePath,
  filters,
  dates,
  sources,
  platforms,
  genres,
  stickyQuery,
  includeWindow = true,
  title = '统一筛选器',
  description = '优先把数据范围、口径和最新快照固定下来，再进入榜单或详情。',
}: {
  basePath: string;
  filters: FilterSet;
  dates: DateOption[];
  sources: FilterOption[];
  platforms: FilterOption[];
  genres: FilterOption[];
  stickyQuery?: QueryPatch;
  includeWindow?: boolean;
  title?: string;
  description?: string;
}) {
  const baseQuery = buildBaseQuery(filters, stickyQuery);
  const clearHref = makeHref(basePath, {
    ...stickyQuery,
    as_of: filters.as_of ?? null,
    window: includeWindow ? filters.window ?? '30d' : stickyQuery?.window,
    source_ids: [],
    platform_ids: [],
    genres: [],
    page: 1,
  });

  return (
    <section className="surface filter-toolbar">
      <div className="section-title-row">
        <div>
          <h2 className="section-title">{title}</h2>
          <p className="section-subtitle">{description}</p>
        </div>
        <Link href={clearHref} className="text-link">
          清空筛选
        </Link>
      </div>
      <div className="filter-grid">
        <FilterGroup title="快照日期">
          {dates.slice(0, 4).map((option) => (
            <FilterChip
              key={option.value}
              href={makeHref(basePath, { ...baseQuery, as_of: option.value, page: 1 })}
              active={filters.as_of === option.value}
              label={option.label}
            />
          ))}
        </FilterGroup>

        {includeWindow ? (
          <FilterGroup title="趋势窗口">
            {WINDOW_OPTIONS.map((option) => (
              <FilterChip
                key={option}
                href={makeHref(basePath, { ...baseQuery, window: option, page: 1 })}
                active={filters.window === option}
                label={option}
              />
            ))}
          </FilterGroup>
        ) : null}

        <FilterGroup title="来源范围">
          {sources.map((option) => (
            <FilterChip
              key={option.id}
              href={makeHref(basePath, {
                ...baseQuery,
                source_ids: toggleArrayValue(filters.source_ids, option.id),
                page: 1,
              })}
              active={filters.source_ids.includes(option.id)}
              label={`${option.label}${option.count ? ` (${option.count})` : ''}`}
            />
          ))}
        </FilterGroup>

        <FilterGroup title="平台范围">
          {platforms.map((option) => (
            <FilterChip
              key={option.id}
              href={makeHref(basePath, {
                ...baseQuery,
                platform_ids: toggleArrayValue(filters.platform_ids, option.id),
                page: 1,
              })}
              active={filters.platform_ids.includes(option.id)}
              label={option.label}
            />
          ))}
        </FilterGroup>

        <FilterGroup title="题材范围">
          {genres.map((option) => (
            <FilterChip
              key={option.id}
              href={makeHref(basePath, {
                ...baseQuery,
                genres: toggleArrayValue(filters.genres, option.id),
                page: 1,
              })}
              active={filters.genres.includes(option.id)}
              label={option.label}
            />
          ))}
        </FilterGroup>
      </div>
    </section>
  );
}
