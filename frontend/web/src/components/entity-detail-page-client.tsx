'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

import { AppShell } from '@/components/app-shell';
import {
  Badge,
  ChartCard,
  MetricGrid,
  PageTitle,
  ProvenanceCard,
  SectionTitle,
  StateCard,
  Surface,
} from '@/components/ui-kit';
import type { EntityDetailResponse, EntityType, WindowOption } from '@/lib/api-contract';
import { getEntityTypeChineseLabel, getEventTypeLabel } from '@/lib/display';
import { getEntityDetail, sampleEntityIds } from '@/lib/mock-api';
import { formatDate, formatDateTime, formatNumber, makeHref, readParam } from '@/lib/query';

const WINDOWS: WindowOption[] = ['7d', '30d', '90d', '365d'];

function getBackRankingHref(entityType: EntityType, heroFacts: Array<{ label: string; value: string }>, asOf?: string | null) {
  if (entityType === 'person') return makeHref('/rankings/artists', { as_of: asOf ?? null });
  if (entityType === 'character') return makeHref('/rankings/characters', { as_of: asOf ?? null });
  const workType = heroFacts.find((item) => item.label === '作品类型')?.value;
  return makeHref(workType === '电影' ? '/rankings/movies' : '/rankings/series', { as_of: asOf ?? null });
}

export function EntityDetailPageClient({
  entityType,
  entityId,
}: {
  entityType: EntityType;
  entityId: string;
}) {
  const searchParams = useSearchParams();
  const [detail, setDetail] = useState<EntityDetailResponse | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const trendWindow = (readParam(searchParams, 'trend_window') ?? '30d') as WindowOption;
      const asOf = readParam(searchParams, 'as_of') ?? null;
      const nextDetail = await getEntityDetail({
        entityType,
        entityId,
        trendWindow,
        asOf,
      });

      if (cancelled) return;
      setDetail(nextDetail);
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [entityId, entityType, searchParams]);

  if (!detail) {
    return (
      <AppShell currentPath="/entities">
        <section className="page-stack">
          <div className="page-title skeleton-surface">
            <div>
              <p className="eyebrow">Entity Detail</p>
              <h1>正在加载实体详情</h1>
              <p className="page-description">基础信息、趋势、关系和时间线正在准备中。</p>
            </div>
          </div>
          <div className="skeleton-grid two-up">
            <div className="skeleton-card wide" />
            <div className="skeleton-card wide" />
          </div>
        </section>
      </AppShell>
    );
  }

  const trendWindow = (readParam(searchParams, 'trend_window') ?? '30d') as WindowOption;
  const asOf = readParam(searchParams, 'as_of') ?? null;
  const entity = detail.data.entity;
  const backRankingHref = getBackRankingHref(entity.entity_type, entity.hero_facts, asOf);
  const relationEmpty = detail.data.related_groups.length === 0;
  const timelineEmpty = detail.data.timeline.length === 0;

  return (
    <AppShell currentPath="/entities">
      <section className="page-stack">
        <PageTitle
          eyebrow={`${getEntityTypeChineseLabel(entity.entity_type)} Detail`}
          title={entity.name}
          description={entity.description ?? '统一详情模板承载基础信息、趋势、关系、时间线与来源口径。'}
          actions={
            <div className="button-row wrap">
              <Link href={backRankingHref} className="button ghost">
                返回对应榜单
              </Link>
              <Link href="/ai" className="button primary">
                在 AI 中继续分析
              </Link>
            </div>
          }
        />

        <div className="surface context-strip">
          <div className="filter-group">
            <p className="muted-label">趋势窗口</p>
            <div className="filter-chip-row">
              {WINDOWS.map((window) => (
                <Link
                  key={window}
                  href={makeHref(`/entities/${entity.entity_type}/${entity.id}`, {
                    as_of: asOf ?? null,
                    trend_window: window,
                  })}
                  className={['filter-chip', trendWindow === window ? 'active' : ''].join(' ')}
                >
                  {window}
                </Link>
              ))}
            </div>
          </div>
          <div className="button-row wrap">
            <Link href={`/entities/character/${sampleEntityIds.character_empty_relations}`} className="button ghost">
              缺关系样例
            </Link>
            <Link href={`/entities/character/${sampleEntityIds.character_empty_timeline}`} className="button ghost">
              缺时间线样例
            </Link>
          </div>
        </div>

        <ProvenanceCard provenance={detail.data.provenance} compact />

        <div className="detail-hero-layout">
          <Surface className="hero-card">
            <SectionTitle title="基础信息卡" subtitle="名称、标签、平台 / 题材 / 类型、更新时间与描述统一放在头部。" />
            <div className="avatar-placeholder">{entity.name.slice(0, 1)}</div>
            <div className="stack-list compact-list dense">
              <p className="entity-subtitle">{entity.subtitle ?? `${getEntityTypeChineseLabel(entity.entity_type)} 样本`}</p>
              <p>{entity.description}</p>
              <div className="tag-row">
                {entity.tags.map((tag) => (
                  <Badge key={tag} tone="neutral">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="facts-grid">
              {entity.hero_facts.map((fact) => (
                <div key={fact.label} className="detail-card">
                  <p className="muted-label">{fact.label}</p>
                  <strong>{fact.value}</strong>
                </div>
              ))}
            </div>
            <p className="tiny-meta">最近更新 {formatDateTime(entity.updated_at)}</p>
          </Surface>

          <div className="content-column stack-gap">
            <MetricGrid cards={detail.data.metric_cards} />
            <div className="panel-grid two-up">
              {detail.data.trend_panels.map((panel) => (
                <ChartCard key={panel.title} chart={panel} />
              ))}
            </div>
            <Surface>
              <SectionTitle title="近期榜单轨迹" subtitle="默认按日维度快照展示历史排名，和趋势图保持同一时间上下文。" />
              <div className="timeline-list">
                {detail.data.ranking_history.map((entry) => (
                  <div key={`${entry.snapshot_date}-${entry.rank}`} className="timeline-item">
                    <span className="timeline-dot" />
                    <div>
                      <strong>{formatDate(entry.snapshot_date)}</strong>
                      <p className="muted-copy">{entry.ranking_type} / 排名 #{entry.rank}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Surface>
          </div>
        </div>

        <div className="panel-grid two-up">
          <Surface>
            <SectionTitle title="关联信息区" subtitle="作品 / 艺人 / 角色统一使用列表或卡片，不做复杂交互图谱。" />
            {relationEmpty ? (
              <StateCard
                title="当前实体缺少关系数据"
                description="这是详情页的 section-level empty state：主体信息仍然可用，关系区仅给出缺失说明。"
                tone="warning"
              />
            ) : (
              <div className="stack-list">
                {detail.data.related_groups.map((group) => (
                  <div key={group.title} className="detail-card">
                    <h3>{group.title}</h3>
                    <div className="stack-list compact-list dense">
                      {group.items.map((item) => (
                        <Link
                          key={`${group.title}-${item.entity.id}`}
                          href={makeHref(`/entities/${item.entity.entity_type}/${item.entity.id}`, { as_of: asOf ?? null })}
                          className="list-row interactive"
                        >
                          <div>
                            <strong>{item.entity.name}</strong>
                            <p className="muted-copy">{item.relation_label}</p>
                          </div>
                          <span className="tiny-meta">
                            {item.metric_label ? `${item.metric_label} ${formatNumber(item.metric_value ?? 0)}` : '查看详情'}
                          </span>
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Surface>

          <Surface>
            <SectionTitle title="事件时间线" subtitle="定档 / 上映 / 开播 / 公开事件等节点用于解释热度变化。" />
            {timelineEmpty ? (
              <StateCard
                title="当前实体暂无时间线事件"
                description="时间线数据缺失时，只降级当前模块，不影响基础信息、趋势和关系信息展示。"
                tone="warning"
              />
            ) : (
              <div className="timeline-list">
                {detail.data.timeline.map((event) => (
                  <div key={event.id} className="timeline-item">
                    <span className="timeline-dot" />
                    <div>
                      <div className="inline-meta wrap">
                        <Badge tone="info">{getEventTypeLabel(event.event_type)}</Badge>
                        <strong>{event.title}</strong>
                      </div>
                      <p className="muted-copy">{event.description ?? '暂无更多描述。'}</p>
                      <p className="tiny-meta">
                        {formatDate(event.event_date)} / 来源 {event.source_name ?? '未知'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Surface>
        </div>
      </section>
    </AppShell>
  );
}
