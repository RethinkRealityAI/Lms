# Embedding the LMS in another site (iframe)

The platform is embedded on the SCAGO public site
(`https://www.sicklecellanemia.ca/`, e.g. the HCP e-learning page under
Resources & Education → E-learning → HCP Modules). This doc records what was
changed to allow that, and the one gotcha that governs whether **signed-in**
embedding will actually work in every browser.

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
5. Decide the auth model: unauthenticated content embeds fine as-is; anything
   requiring login should use the top-level break-out (§3).
