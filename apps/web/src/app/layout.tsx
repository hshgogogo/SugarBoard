import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'SSBoard v1',
  description: 'SSBoard Chinese entertainment analytics prototype',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>
        <div className="shell">
          <main className="shell__main">{children}</main>
        </div>
      </body>
    </html>
  );
}
