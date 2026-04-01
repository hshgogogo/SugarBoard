import type { FilterSet, RankingType, WindowOption } from '@/lib/api-contract';

type SearchParamsInput =
  | Record<string, string | string[] | undefined>
  | URLSearchParams
  | undefined
  | null;

const rankingTypeLabels: Record<RankingType, string> = {
  artists: '艺人热榜',
  characters: '角色热榜',
  series: '剧集热榜',
  movies: '电影热榜',
};

export function getRankingTypeLabel(rankingType: RankingType): string {
  return rankingTypeLabels[rankingType];
}

export function readParam(params: SearchParamsInput, key: string): string | undefined {
  if (!params) return undefined;
  if (params instanceof URLSearchParams) {
    return params.get(key) ?? undefined;
  }
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

export function readCsvParam(params: SearchParamsInput, key: string): string[] {
  const value = readParam(params, key);
  if (!value) return [];
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

export function parseFilterSet(
  params: SearchParamsInput,
  defaults: Partial<FilterSet> = {},
): FilterSet {
  const windowValue = readParam(params, 'window') as WindowOption | undefined;

  return {
    as_of: readParam(params, 'as_of') ?? defaults.as_of ?? null,
    window: windowValue ?? defaults.window ?? '30d',
    source_ids: readCsvParam(params, 'source_ids').length
      ? readCsvParam(params, 'source_ids')
      : defaults.source_ids ?? [],
    platform_ids: readCsvParam(params, 'platform_ids').length
      ? readCsvParam(params, 'platform_ids')
      : defaults.platform_ids ?? [],
    genres: readCsvParam(params, 'genres').length ? readCsvParam(params, 'genres') : defaults.genres ?? [],
  };
}

export function buildQueryString(values: Record<string, string | string[] | null | undefined>): string {
  const query = new URLSearchParams();

  Object.entries(values).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    if (Array.isArray(value)) {
      if (!value.length) return;
      query.set(key, value.join(','));
      return;
    }
    query.set(key, value);
  });

  return query.toString();
}

export function mergeQueryString(
  current: URLSearchParams,
  patch: Record<string, string | string[] | null | undefined>,
): string {
  const next = new URLSearchParams(current.toString());

  Object.entries(patch).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0)) {
      next.delete(key);
      return;
    }
    next.set(key, Array.isArray(value) ? value.join(',') : value);
  });

  return next.toString();
}

export function toggleArrayValue(values: string[], value: string): string[] {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
}

export function parseIntegerParam(
  params: SearchParamsInput,
  key: string,
  fallback: number,
): number {
  const value = Number(readParam(params, key));
  if (!Number.isFinite(value) || value < 1) return fallback;
  return Math.floor(value);
}

export function formatNumber(value: number, unit?: string | null): string {
  const formatted = new Intl.NumberFormat('zh-CN', {
    maximumFractionDigits: Math.abs(value) >= 100 ? 0 : 1,
  }).format(value);
  return unit ? `${formatted}${unit}` : formatted;
}

export function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;
}

export function formatDate(value: string): string {
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(value));
}

export function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

export function rankingTypeToEntityType(rankingType: RankingType): 'person' | 'character' | 'work' {
  if (rankingType === 'artists') return 'person';
  if (rankingType === 'characters') return 'character';
  return 'work';
}

export function makeHref(pathname: string, query: Record<string, string | string[] | null | undefined>): string {
  const queryString = buildQueryString(query);
  return queryString ? `${pathname}?${queryString}` : pathname;
}
