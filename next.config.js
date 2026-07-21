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
              // YouTube IFrame Player API (custom video block player — no API key required)
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://unpkg.com https://www.youtube.com https://s.ytimg.com",
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
              // Frame ancestors: framing restriction intentionally REMOVED so the app
              // can be embedded on the SCAGO site. That site runs on **Framer**, which
              // renders custom embeds inside its OWN sandbox iframe served from
              // framerusercontent.com — so the real ancestor chain is
              //   sicklecellanemia.ca (top) → framerusercontent.com (Framer sandbox) → us
              // and `frame-ancestors` requires EVERY ancestor to match. An allow-list
              // can't reliably enumerate Framer's embed/preview origins (they differ
              // between published site, canvas, and preview), so with no frame-ancestors
              // directive (and no X-Frame-Options) any site may now frame the app.
              //
              // Trade-off: this drops the clickjacking protection that frame-ancestors
              // gave. Acceptable here (no destructive one-click actions without a
              // confirmation/login), but to RE-TIGHTEN once the embed is confirmed
              // working, restore a scoped list that also covers Framer, e.g.:
              //   "frame-ancestors 'self' https://www.sicklecellanemia.ca https://sicklecellanemia.ca https://framerusercontent.com https://framer.com https://*.framer.app https://*.framer.website",
            ].join('; '),
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
