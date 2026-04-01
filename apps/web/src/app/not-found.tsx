import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="page-stack">
      <section className="hero-panel stack">
        <p className="page-header__eyebrow">Not Found</p>
        <h1>当前页面样本不存在</h1>
        <p>可能是实体 ID 无效，或者当前榜单类型不在 v1 范围内。你可以先回到首页总览或榜单页继续浏览。</p>
        <div className="hero-actions">
          <Link className="button-solid" href="/">
            返回首页
          </Link>
          <Link className="button-link" href="/rankings/artists">
            查看榜单页
          </Link>
        </div>
      </section>
    </div>
  );
}
