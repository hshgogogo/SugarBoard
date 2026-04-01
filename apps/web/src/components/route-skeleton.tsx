import { AppShell } from '@/components/app-shell';

export function RouteSkeleton({
  title,
  description,
  currentPath,
}: {
  title: string;
  description: string;
  currentPath: string;
}) {
  return (
    <AppShell currentPath={currentPath}>
      <section className="page-stack">
        <div className="page-title skeleton-surface">
          <div>
            <p className="eyebrow">Loading</p>
            <h1>{title}</h1>
            <p className="page-description">{description}</p>
          </div>
        </div>
        <div className="skeleton-grid three-up">
          <div className="skeleton-card tall" />
          <div className="skeleton-card tall" />
          <div className="skeleton-card tall" />
        </div>
        <div className="skeleton-grid two-up">
          <div className="skeleton-card wide" />
          <div className="skeleton-card wide" />
        </div>
      </section>
    </AppShell>
  );
}
