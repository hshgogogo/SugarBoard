import Link from 'next/link';
import type { ReactNode } from 'react';

export function AppShell({
  currentPath,
  children,
}: {
  currentPath: string;
  children: ReactNode;
}) {
  const items = [
    { href: '/', label: '首页总览' },
    { href: '/rankings/artists', label: '榜单页' },
    { href: '/ai', label: 'AI 工作台' },
  ];

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="brand-kicker">SSBoard v1</p>
          <Link href="/" className="brand-link">
            中国影视行业情报台
          </Link>
        </div>
        <nav className="topnav" aria-label="Primary">
          {items.map((item) => {
            const active =
              item.href === '/'
                ? currentPath === '/'
                : currentPath === item.href || currentPath.startsWith(item.href.replace(/\/(artists|characters|series|movies)$/, ''));

            return (
              <Link key={item.href} href={item.href} className={['nav-link', active ? 'active' : ''].join(' ')}>
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="topbar-meta">
          <span>桌面端原型</span>
          <span>只读分析</span>
          <span>contract-first</span>
        </div>
      </header>
      <main className="page-shell">{children}</main>
    </div>
  );
}
