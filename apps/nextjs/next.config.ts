import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    authInterrupts: true,
  },
  async rewrites() {
    return [
      {
        source: '/.well-known/:slug*',
        destination: '/api/oauth/.well-known/:slug*',
      },
    ];
  },
}
 

export default nextConfig;
