'use client';

/**
 * Cross-origin iframe detection for the "break auth out to top-level" flow.
 *
 * When the LMS is embedded in a cross-origin iframe (e.g. the SCAGO public site
 * frames the student portal), the app's Supabase auth cookies are THIRD-PARTY
 * cookies. Safari (ITP) blocks these by default and Chrome/Firefox increasingly
 * restrict them, so a session created *inside* the frame silently fails to
 * persist — the classic "I logged in but it acts logged-out" bug.
 *
 * The login page uses this to detect that situation and, instead of running auth
 * in-frame, break out to a TOP-LEVEL tab where cookies are first-party. See
 * docs/embedding.md §3.
 *
 * Returns false for normal top-level loads AND for same-origin frames (cookies
 * work in both). Returns true only for a genuine cross-origin embed.
 */
export function isEmbedded(): boolean {
  if (typeof window === 'undefined') return false; // SSR
  try {
    if (window.self === window.top) return false; // not framed at all
    // Framed: if the parent is same-origin we can read its location and cookies
    // work, so it's not a problem embed. A cross-origin parent throws on access
    // below (caught) — that's the case we must break out of.
    return window.top?.location.origin !== window.location.origin;
  } catch {
    return true; // cross-origin parent access threw ⇒ embedded cross-origin
  }
}
