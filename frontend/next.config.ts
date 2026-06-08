import type { NextConfig } from 'next'
import withPWA from 'next-pwa'

const nextConfig: NextConfig = {
  compress: true,
  poweredByHeader: false,
  generateEtags: true,
  output: 'standalone',
  // Turbopack disabled due to enqueueModel bug in Next.js 16.2.6
  // Using webpack for stability and production readiness

  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      { protocol: 'http',  hostname: 'localhost', port: '8000', pathname: '/media/**' },
      { protocol: 'https', hostname: 'res.cloudinary.com',  pathname: '/**' },
      { protocol: 'https', hostname: '*.cloudinary.com',    pathname: '/**' },
    ],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes:  [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 30,
  },

  experimental: {
    optimizePackageImports: [
      'framer-motion', 'lucide-react',
      '@tanstack/react-query', 'recharts',
    ],
  },

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options',        value: 'DENY' },
          { key: 'X-XSS-Protection',       value: '1; mode=block' },
          { key: 'Referrer-Policy',         value: 'strict-origin-when-cross-origin' },
        ],
      },
      {
        source: '/manifest.json',
        headers: [
          { key: 'Content-Type',  value: 'application/manifest+json' },
          { key: 'Cache-Control', value: 'public, max-age=86400' },
        ],
      },
      {
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control',       value: 'public, max-age=0, must-revalidate' },
          { key: 'Service-Worker-Allowed', value: '/' },
        ],
      },
      {
        // Cache landing page for 5 min
        source: '/',
        headers: [
          { key: 'Cache-Control', value: 'public, s-maxage=300, stale-while-revalidate=600' },
        ],
      },
    ]
  },

  webpack: (config, { dev, isServer }) => {
    if (!dev && !isServer) {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            framerMotion: { test: /[\\/]node_modules[\\/]framer-motion[\\/]/, name: 'framer-motion', chunks: 'all' },
            recharts:     { test: /[\\/]node_modules[\\/]recharts[\\/]/,      name: 'recharts',      chunks: 'all' },
            mapbox:       { test: /[\\/]node_modules[\\/]mapbox-gl[\\/]/,     name: 'mapbox',        chunks: 'all' },
          },
        },
      }
    }
    return config
  },
}

export default withPWA({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
})(nextConfig)