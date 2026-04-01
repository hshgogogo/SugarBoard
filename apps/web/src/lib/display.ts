import type {
  AnalysisStatus,
  EntityType,
  FreshnessStatus,
  RankingType,
  RiskLevel,
  TimelineEvent,
  TrendDirection,
} from '@/lib/api-contract';

export function getRankingTypeChineseLabel(type: RankingType): string {
  if (type === 'artists') return '艺人热榜';
  if (type === 'characters') return '角色热榜';
  if (type === 'series') return '剧集热榜';
  return '电影热榜';
}

export function getEntityTypeChineseLabel(type: EntityType): string {
  if (type === 'person') return '艺人';
  if (type === 'character') return '角色';
  return '作品';
}

export function getRiskLabel(level: RiskLevel): string {
  if (level === 'green') return '低风险 / 可执行';
  if (level === 'yellow') return '中风险 / 需限缩';
  return '高风险 / 已阻断';
}

export function getAnalysisStatusLabel(status: AnalysisStatus): string {
  switch (status) {
    case 'queued':
      return '排队中';
    case 'planning':
      return '规划中';
    case 'running':
      return '执行中';
    case 'summarizing':
      return '生成摘要';
    case 'succeeded':
      return '已完成';
    case 'failed':
      return '失败';
    case 'blocked':
      return '已阻断';
    case 'needs_refine':
      return '需收敛';
    case 'cancelled':
      return '已取消';
  }
}

export function getFreshnessLabel(status: FreshnessStatus): string {
  if (status === 'fresh') return '已刷新';
  if (status === 'delayed') return '轻微延迟';
  if (status === 'stale') return '数据陈旧';
  return '未知';
}

export function getTrendLabel(direction?: TrendDirection | null): string {
  if (direction === 'up') return '上升';
  if (direction === 'down') return '下降';
  if (direction === 'flat') return '持平';
  return '—';
}

export function getEventTypeLabel(type: TimelineEvent['event_type']): string {
  switch (type) {
    case 'announcement':
      return '官宣';
    case 'premiere':
      return '首映';
    case 'release':
      return '上线 / 上映';
    case 'award':
      return '奖项';
    case 'ranking_peak':
      return '榜单峰值';
    default:
      return '其他';
  }
}

export function getToneClass(
  tone: 'neutral' | 'success' | 'warning' | 'danger' | 'info',
): string {
  return `tone-${tone}`;
}

export function getRiskTone(level: RiskLevel): 'success' | 'warning' | 'danger' {
  if (level === 'green') return 'success';
  if (level === 'yellow') return 'warning';
  return 'danger';
}

export function getStatusTone(
  status: AnalysisStatus,
): 'neutral' | 'success' | 'warning' | 'danger' | 'info' {
  switch (status) {
    case 'succeeded':
      return 'success';
    case 'blocked':
      return 'danger';
    case 'failed':
      return 'danger';
    case 'needs_refine':
      return 'warning';
    case 'queued':
    case 'planning':
    case 'running':
    case 'summarizing':
      return 'info';
    case 'cancelled':
      return 'neutral';
  }
}

export function getFreshnessTone(
  status: FreshnessStatus,
): 'success' | 'warning' | 'danger' | 'neutral' {
  if (status === 'fresh') return 'success';
  if (status === 'delayed') return 'warning';
  if (status === 'stale') return 'danger';
  return 'neutral';
}
