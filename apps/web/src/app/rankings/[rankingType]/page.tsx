import { notFound } from 'next/navigation';

import { RankingPageClient } from '@/components/ranking-page-client';
import type { RankingType } from '@/lib/api-contract';

const RANKING_TYPES: RankingType[] = ['artists', 'characters', 'series', 'movies'];

type Params = Promise<{ rankingType: string }> | { rankingType: string };

export function generateStaticParams() {
  return RANKING_TYPES.map((rankingType) => ({ rankingType }));
}

export const dynamicParams = false;

export default async function RankingPage({
  params,
}: {
  params: Params;
}) {
  const { rankingType: rankingTypeParam } = await params;
  if (!RANKING_TYPES.includes(rankingTypeParam as RankingType)) notFound();

  return <RankingPageClient rankingType={rankingTypeParam as RankingType} />;
}
