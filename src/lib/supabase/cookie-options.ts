import type { CookieOptions } from '@supabase/ssr';

/**
 * Shared Supabase auth-cookie attributes — MUST be identical across the browser
 * client, the server client, and the middleware client, or refreshed cookies
 * won't match the ones set at sign-in and the session silently drops.
 *
 * `SameSite=None; Secure` is what lets the auth cookie be sent when the LMS runs
 * inside a CROSS-ORIGIN iframe (embedded on the SCAGO / Framer site). With the
 * default `Lax`, the cookie is withheld on the iframe's cross-site requests, so
 * an in-frame login never persists.
 *
 * Caveats this does NOT solve:
 *  - Safari (ITP) blocks third-party cookies outright regardless of SameSite, so
 *    in-frame login still won't persist there. The real cross-browser fix is to
 *    serve the LMS from a SUBDOMAIN of the embedding site (same-site → cookies
 *    just work). See docs/embedding.md.
 *  - `Secure` requires a secure context; that's fine in prod (HTTPS) and on
 *    localhost (treated as secure), so dev is unaffected.
 */
export const AUTH_COOKIE_OPTIONS: CookieOptions = {
  sameSite: 'none',
  secure: true,
};
