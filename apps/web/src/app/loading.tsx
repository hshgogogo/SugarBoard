import { RouteSkeleton } from '@/components/route-skeleton';

export default function Loading() {
  return (
    <RouteSkeleton
      currentPath="/"
      title="正在加载制片人决策看板"
      description="侧栏导航、板块页和功能页正在装配中，请稍候。"
    />
  );
}
