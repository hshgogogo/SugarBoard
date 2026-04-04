import Link from 'next/link';
import type { ReactNode } from 'react';

import {
  DASHBOARD_TIMESTAMP,
  strategyNavItems,
  type StrategyNavIcon,
} from '@/lib/strategy-data';

export function AppShell({
  currentPath,
  children,
}: {
  currentPath: string;
  children: ReactNode;
}) {
  return (
    <div className="app-shell">
      <div className="screen-frame">
        <div className="screen-content">
          <header className="screen-header">
            <div className="screen-badge">
              <span>2.0</span>
              <strong>已定</strong>
            </div>
            <div className="screen-heading">
              <p className="screen-heading__eyebrow">影视技术 / 行业宏观</p>
              <h1>制片人决策看板</h1>
              <p className="screen-heading__subtitle">PRODUCER&apos;S STRATEGIC INSIGHTS DASHBOARD</p>
            </div>
            <div className="screen-heading__meta">{DASHBOARD_TIMESTAMP}</div>
          </header>
          <main className="page-shell">{children}</main>
        </div>

        <aside className="side-rail" aria-label="Sidebar navigation">
          <div className="side-rail__group">
            {strategyNavItems.map((item) => {
              const active = item.href === '/' ? currentPath === '/' : currentPath.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={['rail-link', active ? 'active' : ''].join(' ')}
                  title={item.label}
                  aria-label={item.label}
                >
                  <RailIcon kind={item.icon} />
                  <span className="sr-only">{item.label}</span>
                </Link>
              );
            })}
          </div>

          <div className="side-rail__group side-rail__group--footer">
            <button type="button" className="rail-link rail-link--utility" aria-label="设置">
              <RailIcon kind="settings" />
            </button>
            <button type="button" className="rail-link rail-link--utility" aria-label="帮助">
              <RailIcon kind="help" />
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}

function RailIcon({ kind }: { kind: StrategyNavIcon | 'settings' | 'help' }) {
  switch (kind) {
    case 'home':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 11.5L12 4l8 7.5" />
          <path d="M7.5 10.5V20h9V10.5" />
        </svg>
      );
    case 'macro':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="3.5" />
          <path d="M12 3.5v3M12 17.5v3M3.5 12h3M17.5 12h3M5.8 5.8l2.2 2.2M16 16l2.2 2.2M18.2 5.8L16 8M8 16l-2.2 2.2" />
        </svg>
      );
    case 'platform':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <rect x="4" y="5" width="6" height="14" rx="1.8" />
          <rect x="14" y="5" width="6" height="6" rx="1.8" />
          <rect x="14" y="13" width="6" height="6" rx="1.8" />
        </svg>
      );
    case 'marketing':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 16l9-8 7 2-9 8-7-2z" />
          <path d="M12 8l1-4 4 1-1 4" />
          <path d="M6 18l-1.5 2.5" />
        </svg>
      );
    case 'external':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 3l2 5 5 2-5 2-2 5-2-5-5-2 5-2 2-5z" />
          <path d="M18 16l1 2 2 1-2 1-1 2-1-2-2-1 2-1 1-2z" />
        </svg>
      );
    case 'domestic':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="7" cy="12" r="2.2" />
          <circle cx="17" cy="7" r="2.2" />
          <circle cx="17" cy="17" r="2.2" />
          <path d="M9 11l6-3M9 13l6 3M17 9.5v5" />
        </svg>
      );
    case 'settings':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="3" />
          <path d="M12 3.5v2.3M12 18.2v2.3M20.5 12h-2.3M5.8 12H3.5M18.4 5.6l-1.6 1.6M7.2 16.8l-1.6 1.6M18.4 18.4l-1.6-1.6M7.2 7.2L5.6 5.6" />
        </svg>
      );
    case 'help':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="8.5" />
          <path d="M9.6 9.5a2.6 2.6 0 015-1 2.1 2.1 0 01-.8 1.7c-.8.6-1.8 1-1.8 2.3" />
          <circle cx="12" cy="17.5" r=".8" fill="currentColor" stroke="none" />
        </svg>
      );
    default:
      return null;
  }
}
