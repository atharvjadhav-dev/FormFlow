import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  experimental: {
    serverActions: {
      bodySizeLimit: '1mb', // file bytes never pass through Next.js — direct-to-S3 handles those
    },
  },
};

export default nextConfig;
