import { notFound } from 'next/navigation';
import {
  EntityDetailSections,
  PageHeader,
  ProvenanceCard,
} from '@/components/ui';
import { getEntityDetail } from '@/lib/mock-api';
import { readParam } from '@/lib/query';

type EntityRouteParams = {
  entityType: string;
  entityId: string;
};

type EntityPageProps = {
  params: Promise<EntityRouteParams>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const ENTITY_TYPES = new Set(['work', 'person', 'character']);

export default async function EntityPage({ params, searchParams }: EntityPageProps) {
  const route = await params;
  if (!ENTITY_TYPES.has(route.entityType)) notFound();

  const query = searchParams ? await searchParams : {};
  const response = await getEntityDetail({
    entityType: route.entityType as 'work' | 'person' | 'character',
    entityId: route.entityId,
    asOf: readParam(query, 'as_of') ?? null,
    trendWindow: (readParam(query, 'trend_window') as '7d' | '30d' | '90d' | '365d' | undefined) ?? '30d',
  });

  if (!response) notFound();

  return (
    <div className="page-stack">
      <section className="hero-panel stack">
        <PageHeader
          eyebrow="Entity Detail"
          title={response.data.entity.name}
          description="详情页需要解释“为什么在榜、近期走势如何、与谁或什么作品相关”，并且在缺失数据时优雅降级。"
        />
      </section>
      <section className="detail-grid">
        <EntityDetailSections data={response.data} />
        <ProvenanceCard provenance={response.data.provenance} />
      </section>
    </div>
  );
}
