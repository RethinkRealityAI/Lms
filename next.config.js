/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  async headers() {
    return [
      {
        // Apply security headers to all routes
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              // Default: only same-origin
              "default-src 'self'",
              // Scripts: self + inline (Next.js needs inline) + eval (dev only via nonce ideally, but needed for HMR)
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://unpkg.com",
              // Styles: self + inline (Tailwind/shadcn inject inline styles)
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              // Images: self + data URIs + blob + Supabase storage + any https (course content may reference external images)
              "img-src 'self' data: blob: https:",
              // Fonts: self + Google Fonts
              "font-src 'self' data: https://fonts.gstatic.com",
              // Connect: self + Supabase API + Supabase realtime
              "connect-src 'self' https://ylmnbbrpaeiogdeqezlo.supabase.co wss://ylmnbbrpaeiogdeqezlo.supabase.co https://*.supabase.co",
              // Frames: allow any https source (H5P, YouTube, Vimeo, Google Docs, external LMS tools)
              "frame-src 'self' https: http://localhost:*",
              // Media: self + Supabase storage + any https (video/audio in lesson blocks)
              "media-src 'self' blob: https:",
              // Objects: none (no Flash/Java)
              "object-src 'none'",
              // Base URI: self only
              "base-uri 'self'",
              // Form actions: self + Supabase auth
              "form-action 'self' https://ylmnbbrpaeiogdeqezlo.supabase.co",
              // Frame ancestors: self only (prevent clickjacking)
              "frame-ancestors 'self'",
            ].join('; '),
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
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
    ];
  },
};

module.exports = nextConfig;
