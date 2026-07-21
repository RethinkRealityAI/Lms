# Embedding the LMS in another site (iframe)

The platform is embedded on the SCAGO public site
(`https://www.sicklecellanemia.ca/`, HCP e-learning page). The site runs on
**Framer**, which renders custom embeds inside its own sandbox iframe on
`framerusercontent.com`.

## Current state (authoritative — read this first)

- **CSP is fully removed** (`next.config.js` sets no `Content-Security-Policy`
  and no `X-Frame-Options`). Framing is unrestricted, so the Framer sandbox
  nesting can't block the frame from loading. (Earlier we tried an allow-listed
  `frame-ancestors`, but Framer's intermediate sandbox origin is in the ancestor
  chain and can't be reliably enumerated — §1 below is kept as history.)
- **In-iframe login is a COOKIE problem, not a CSP problem.** Auth cookies in a
  cross-origin iframe are third-party. We set them `SameSite=None; Secure`
  (`src/lib/supabase/cookie-options.ts`, applied in the browser, server, and
  middleware Supabase clients) so the session survives the frame in
  **Chrome / Firefox / Edge**.
- **Safari still won't persist an in-frame session** (ITP blocks third-party
  cookies regardless of SameSite). The only cross-browser-complete fix is to
  serve the LMS from a **subdomain of the embedding site** (e.g.
  `learn.sicklecellanemia.ca` → the Netlify site) so the iframe is *same-site*
  and cookies are first-party everywhere, Safari included. See §4.
- The old "break out to a top-level tab for login" flow was **removed** by
  product decision (inline login is wanted). §3 is kept as history.

---

## 1. Framing is allow-listed (done)

By default the app blocked being framed anywhere but its own origin
(anti-clickjacking). Two independent headers enforced that and **both** had to
change:

### `next.config.js` — CSP `frame-ancestors`
```
frame-ancestors 'self' https://www.sicklecellanemia.ca https://sicklecellanemia.ca
```
This is the modern, precise control: it names exactly which parent origins may
frame us. **Add new embed hosts here** — never widen it to `*` or `https:`,
which would re-open clickjacking.

The old `X-Frame-Options: SAMEORIGIN` header was **removed** from
`next.config.js`. XFO can only say `DENY` or `SAMEORIGIN` — it has no syntax for
"allow this one external site", so keeping it would have overridden the CSP fix
in browsers that honour XFO. `frame-ancestors` fully replaces it.

### `netlify.toml` — edge header
Netlify was *also* sending `X-Frame-Options = "DENY"` at the CDN edge on every
route — the most restrictive of the lot, and it would have blocked the embed
even after the CSP change. That line was **removed**. Framing protection now
lives entirely in the CSP `frame-ancestors` directive above.

> After changing either file you must **redeploy** — headers are build/edge-time,
> not runtime. Verify live with:
> `curl -sI https://<lms-domain>/gansid/student | grep -i -E 'content-security|frame'`
> You should see the `frame-ancestors` list and **no** `x-frame-options`.

---

## 2. Signup confirmation URL — keep it on the LMS domain (NOT the embed page)

**Question:** for signup email confirmation, should the redirect use the
embedding page's URL (`https://www.sicklecellanemia.ca/...`)?

**Answer: No.** It must stay on the LMS's own domain, pointing at
`/auth/callback` — which is what the code already does
(`src/app/login/page.tsx`, via `NEXT_PUBLIC_SITE_URL || window.location.origin`).

Why: the confirmation link has to land on a page that runs the Supabase
auth-callback logic (it exchanges the emailed token for a real session). The
WordPress page has none of that code — clicking "confirm" there would just load
a static page and the token would go nowhere, so the account would never
actually get confirmed.

- Set `NEXT_PUBLIC_SITE_URL` to the LMS's own public origin (the domain the
  iframe's `src` points at), e.g. `https://<lms-domain>`.
- In Supabase → Auth → URL Configuration, the **Site URL** and **Redirect URLs**
  allow-list must contain that same LMS origin's `/auth/callback` and
  `/reset-password` — again, the LMS domain, never `sicklecellanemia.ca`.
- `window.location.origin` inside an iframe already resolves to the **iframe's
  own** origin (the LMS), never the parent page's URL, so no code change is
  needed for the redirect to be correct.

---

## 3. The real gotcha: signed-in sessions inside a cross-site iframe

CSP only controls whether the frame is *allowed to load*. It does **not** fix
authentication inside the frame. This is the thing to design around.

When the LMS runs in an iframe on `sicklecellanemia.ca`, its Supabase auth
cookies are **third-party cookies** (the cookie's domain ≠ the top page's
domain). Browser behaviour:

- **Safari (ITP):** blocks third-party cookie access outright, by default.
- **Firefox (Total Cookie Protection) & Chrome:** partition or increasingly
  restrict third-party cookies.

Net effect: a visitor could sign in *inside the embed* and the session may
**silently fail to persist** on a large share of browsers — the classic
"I logged in but it immediately acts logged-out" iframe bug. The public,
**unauthenticated** tutorial widgets are unaffected (they set no cookies); this
only bites once real login/enrolment happens inside the frame.

### Recommended pattern — break auth out to top-level (first-party)

Do the sign-in / sign-up on the LMS as a **top-level** page (first-party
cookies always work), then let the learner use the embed once authenticated.
Two ways to do it, pick per how "seamless" it needs to feel:

**A. Break the frame out for auth (simplest, most reliable).**
Any sign-in / sign-up / "start a module" control inside the embed opens the LMS
top-level instead of navigating within the iframe:
```html
<!-- inside the embed -->
<a href="https://<lms-domain>/gansid/student" target="_top">Sign in / open the portal</a>
```
`target="_top"` replaces the whole browser tab with the LMS on its own domain —
auth cookies are now first-party and stick. (Requires the iframe **not** to have
a `sandbox` attribute that omits `allow-top-navigation-by-user-activation`.)

**B. Storage Access API (keeps them in the frame).**
On a user gesture, request first-party cookie access before auth:
```js
if (document.requestStorageAccess) {
  try { await document.requestStorageAccess(); } catch (_) { /* fall back to A */ }
}
```
Standards-based and keeps the experience inline, but needs a click, isn't
universal yet, and should fall back to pattern A when denied.

### Making the LMS iframe-aware (optional helper)
If we want the app to auto-break-out for auth when it detects it's embedded:
```ts
// src/lib/embed.ts
export function isEmbedded(): boolean {
  try { return window.self !== window.top; }
  catch { return true; } // cross-origin access throws ⇒ we're in a cross-site frame
}
```
Then on the login page, when `isEmbedded()` is true, render the primary
sign-in / sign-up action as a top-level link/button to
`https://<lms-domain>/…/login` (pattern A) instead of submitting inside the
frame. *Not wired up yet — ask and I'll add it; it's a small, self-contained
change.*

---

## Quick checklist for a new embed host

1. Add its `https://…` origin(s) to `frame-ancestors` in `next.config.js`.
2. Confirm `netlify.toml` sends **no** `X-Frame-Options`.
3. Redeploy; verify headers with the `curl -I` above.
4. `NEXT_PUBLIC_SITE_URL` + Supabase redirect allow-list stay on the **LMS**
   origin (never the embedding site).
5. Decide the auth model: unauthenticated content embeds fine as-is; for
   reliable **in-frame login on every browser (incl. Safari), use the subdomain
   in §4** — otherwise inline login works only in Chrome/Firefox/Edge.

---

## 4. RECOMMENDED: serve the LMS from a subdomain of the embedding site

This is the clean fix that makes in-iframe login work in **all** browsers,
Safari included, with no cookie hacks and no top-level break-out — because the
iframe becomes **same-site** with the parent, so the auth cookies are no longer
third-party.

Setup (one-time):

1. **Netlify** → the `org-lms` site → Domain management → add a custom domain,
   e.g. `learn.sicklecellanemia.ca`.
2. **DNS** (on the Framer/registrar side for sicklecellanemia.ca): add the
   record Netlify shows — typically a `CNAME` `learn` → `org-lms.netlify.app`
   (or Netlify's provided target). Wait for it to verify + issue TLS.
3. **Supabase** → Auth → URL Configuration: add
   `https://learn.sicklecellanemia.ca/auth/callback` (and `/reset-password`) to
   the redirect allow-list; set Site URL to `https://learn.sicklecellanemia.ca`.
   Set `NEXT_PUBLIC_SITE_URL=https://learn.sicklecellanemia.ca` in Netlify env.
4. **Embed** `https://learn.sicklecellanemia.ca/scago/student` instead of the
   `*.netlify.app` URL.

Now `www.sicklecellanemia.ca` (parent) and `learn.sicklecellanemia.ca` (iframe)
share the registrable domain `sicklecellanemia.ca` → same-site → cookies are
first-party → login persists in the iframe on every browser. With this in place,
the `SameSite=None; Secure` setting is harmless (works same-site too) but no
longer load-bearing, and Safari is no longer a problem.
