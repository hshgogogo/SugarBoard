import { notFound } from 'next/navigation';

import { EntityDetailPageClient } from '@/components/entity-detail-page-client';
import type { EntityType } from '@/lib/api-contract';
import { staticEntityRouteParams } from '@/lib/mock-api';

const ENTITY_TYPES: EntityType[] = ['work', 'person', 'character'];

type Params =
  | Promise<{ entityType: string; entityId: string }>
  | { entityType: string; entityId: string };

export function generateStaticParams() {
  return staticEntityRouteParams;
}

export const dynamicParams = false;

export default async function EntityDetailPage({
  params,
}: {
  params: Params;
}) {
  const { entityType: entityTypeParam, entityId } = await params;
  if (!ENTITY_TYPES.includes(entityTypeParam as EntityType)) notFound();

  return (
    <EntityDetailPageClient
      entityType={entityTypeParam as EntityType}
      entityId={entityId}
    />
  );
}
