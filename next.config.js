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
          // Content-Security-Policy intentionally NOT set. This platform is embedded
          // in a cross-origin iframe on the SCAGO site (Framer), and per an explicit
          // product decision it is treated as a low-risk nonprofit surface — all CSP
          // restrictions (including frame-ancestors) are removed so nothing can
          // interfere with framing or in-frame behaviour. Framing is therefore
          // unrestricted (no CSP, no X-Frame-Options anywhere). Note: CSP was never
          // what blocked in-iframe LOGIN — that is governed by third-party cookies,
          // handled via SameSite=None;Secure on the Supabase auth cookies + (ideally)
          // serving the LMS from a subdomain of the embedding site. See docs/embedding.md.
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
