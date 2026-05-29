import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@snapgad/db', '@snapgad/api', '@snapgad/types', '@snapgad/ui'],
};

export default nextConfig;
