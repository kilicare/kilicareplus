import type { NextConfig } from 'next'
import withPWA from 'next-pwa'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      { protocol: 'http', hostname: 'res.cloudinary.com' },
      { protocol: 'http', hostname: 'localhost', port: '8000' },
      { protocol: 'https', hostname: '*.cloudinary.com' },
      { protocol: 'http', hostname: '*.cloudinary.com' },
    ],
    formats: ['image/avif', 'image/webp'],
  },
  // Turbopack configuration for next-pwa compatibility
  turbopack: {},
  webpack: (config, { isServer }) => {
    // Webpack config for next-pwa compatibility
    return config
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
    ]
  },
}

export default withPWA({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
})(nextConfig)