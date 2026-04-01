'use client';

import { startTransition, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import type { FilterBootstrapData, FilterSet } from '@/lib/api-contract';
import { buildQueryString } from '@/lib/query';

type FilterFormState = {
  as_of: string;
  window: string;
  source_ids: string[];
  platform_ids: string[];
  genres: string[];
};

export function FilterControls({
  bootstrap,
  initialFilters,
}: {
  bootstrap: FilterBootstrapData;
  initialFilters: FilterSet;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [form, setForm] = useState<FilterFormState>({
    as_of: initialFilters.as_of ?? bootstrap.default_filters.as_of ?? '',
    window: initialFilters.window ?? bootstrap.default_filters.window ?? '30d',
    source_ids: initialFilters.source_ids,
    platform_ids: initialFilters.platform_ids,
    genres: initialFilters.genres,
  });

  function toggle(key: 'source_ids' | 'platform_ids' | 'genres', value: string) {
    setForm((current) => {
      const items = current[key].includes(value)
        ? current[key].filter((item) => item !== value)
        : [...current[key], value];
      return { ...current, [key]: items };
    });
  }

  function apply() {
    startTransition(() => {
      router.push(
        `${pathname}?${buildQueryString({
          as_of: form.as_of,
          window: form.window,
          source_ids: form.source_ids,
          platform_ids: form.platform_ids,
          genres: form.genres,
        })}`,
      );
    });
  }

  function reset() {
    const defaults = bootstrap.default_filters;
    const next = {
      as_of: defaults.as_of ?? '',
      window: defaults.window ?? '30d',
      source_ids: defaults.source_ids,
      platform_ids: defaults.platform_ids,
      genres: defaults.genres,
    };
    setForm(next);
    startTransition(() => {
      router.push(
        `${pathname}?${buildQueryString({
          as_of: next.as_of,
          window: next.window,
          source_ids: next.source_ids,
          platform_ids: next.platform_ids,
          genres: next.genres,
        })}`,
      );
    });
  }

  return (
    <section className="surface-card filter-panel stack">
      <div className="toolbar">
        <div>
          <strong>统一筛选器</strong>
          <p className="muted">首页、榜单页与 AI 上下文共享同一套公共筛选条件。</p>
        </div>
        <div className="split-inline">
          <button className="button-ghost" onClick={reset} type="button">
            重置
          </button>
          <button className="button-solid" onClick={apply} type="button">
            应用筛选
          </button>
        </div>
      </div>
      <div className="filter-grid">
        <div className="filter-block">
          <label htmlFor="as-of">快照日期</label>
          <select
            className="field"
            id="as-of"
            onChange={(event) => setForm((current) => ({ ...current, as_of: event.target.value }))}
            value={form.as_of}
          >
            {bootstrap.available_dates.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div className="filter-block">
          <label htmlFor="window">趋势窗口</label>
          <select
            className="field"
            id="window"
            onChange={(event) => setForm((current) => ({ ...current, window: event.target.value }))}
            value={form.window}
          >
            {['7d', '30d', '90d', '365d'].map((windowValue) => (
              <option key={windowValue} value={windowValue}>
                {windowValue}
              </option>
            ))}
          </select>
        </div>
      </div>
      <OptionGroup
        active={form.source_ids}
        label="来源范围"
        onToggle={(value) => toggle('source_ids', value)}
        options={bootstrap.sources.map((item) => ({
          value: item.id,
          label: `${item.label}${item.count ? ` · ${item.count}` : ''}`,
        }))}
      />
      <OptionGroup
        active={form.platform_ids}
        label="平台"
        onToggle={(value) => toggle('platform_ids', value)}
        options={bootstrap.platforms.map((item) => ({
          value: item.id,
          label: `${item.label}${item.count ? ` · ${item.count}` : ''}`,
        }))}
      />
      <OptionGroup
        active={form.genres}
        label="题材"
        onToggle={(value) => toggle('genres', value)}
        options={bootstrap.genres.map((item) => ({
          value: item.id,
          label: `${item.label}${item.count ? ` · ${item.count}` : ''}`,
        }))}
      />
    </section>
  );
}

function OptionGroup({
  label,
  options,
  active,
  onToggle,
}: {
  label: string;
  options: { value: string; label: string }[];
  active: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <div className="filter-block">
      <label>{label}</label>
      <div className="filter-chip-group">
        {options.map((option) => {
          const selected = active.includes(option.value);
          return (
            <button
              key={option.value}
              className={selected ? 'chip chip--active' : 'chip'}
              onClick={() => onToggle(option.value)}
              type="button"
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
