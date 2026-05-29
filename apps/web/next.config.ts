import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Para evitar errores si hay paquetes de workspaces que no están transpilados
  transpilePackages: ['@snapgad/db', '@snapgad/api', '@snapgad/types', '@snapgad/ui'],
};

export default nextConfig;
