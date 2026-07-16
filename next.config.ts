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
      // TEMPORAL (MVP):
      // Se permite media.istockphoto.com únicamente para imágenes de prueba.
      // En la versión final todas las imágenes deberán provenir de Supabase Storage
      // y este dominio deberá eliminarse.
      {
        protocol: 'https',
        hostname: 'media.istockphoto.com',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
