import { RouteSkeleton } from '@/components/route-skeleton';

export default function Loading() {
  return <RouteSkeleton currentPath="/rankings/artists" title="正在加载榜单页" description="榜单主表、右侧分析与筛选栏正在准备中。" />;
}
