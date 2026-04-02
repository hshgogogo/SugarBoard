import { RouteSkeleton } from '@/components/route-skeleton';

export default function Loading() {
  return <RouteSkeleton currentPath="/ai" title="正在加载 AI 工作台" description="任务状态、执行逻辑与结果视图正在准备中。" />;
}
