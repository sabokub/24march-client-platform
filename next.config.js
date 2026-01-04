/** @type {import('next').NextConfig} */
const nextConfig = {
  // Security Headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ]
  },
  
  // Server Actions configuration
  experimental: {
    serverActions: {
      allowedOrigins: [
        'localhost:3000',
        '*.preview.emergentagent.com',
        '*.vercel.app',
      ],
    },
  },

  // Image domains for external images
  images: {
    domains: [
      'images.unsplash.com',
      '*.supabase.co',
    ],
  },
}

module.exports = nextConfig
