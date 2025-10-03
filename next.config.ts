import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { 
        protocol: 'https',
        hostname: 'www.mii.co.id',
        port: '',
        pathname: '/**',
      },
      { 
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'http', // or 'https'
        hostname: '**', // This allows all hostnames, use with caution
        port: '',
        pathname: '**',
      },
      {
        protocol: 'https', // or 'https'
        hostname: '**', // This allows all hostnames, use with caution
        port: '',
        pathname: '**',
      }
    ],
  },
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
