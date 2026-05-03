import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    turbopackFileSystemCacheForDev: false,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cvupxejjghjuztovggib.supabase.co',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'i.pinimg.com',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
