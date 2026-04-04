import type { NextConfig } from 'next';

const isGitHubPages = process.env.GITHUB_PAGES === 'true';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: isGitHubPages ? 'export' : undefined,
  trailingSlash: isGitHubPages,
  images: {
    unoptimized: true,
  },
  basePath: isGitHubPages ? '/SugarBoard' : undefined,
  assetPrefix: isGitHubPages ? '/SugarBoard/' : undefined,
};

export default nextConfig;
