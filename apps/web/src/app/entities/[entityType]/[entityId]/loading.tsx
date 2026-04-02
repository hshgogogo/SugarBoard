import { RouteSkeleton } from '@/components/route-skeleton';

export default function Loading() {
  return <RouteSkeleton currentPath="/entities" title="正在加载实体详情" description="实体基础信息、趋势、关系与时间线模块正在准备中。" />;
}
