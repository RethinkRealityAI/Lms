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

### Cutover runbook (do the steps IN THIS ORDER)

Facts established by inspection (2026-07-24), so nobody has to rediscover them:

- **DNS for `sicklecellanemia.ca` is hosted at IONOS** — nameservers are
  `ns10xx.ui-dns.{de,org,biz,com}`. It is NOT on Netlify DNS and NOT on Framer.
  The record below is added in the **IONOS** control panel.
- The apex (`sicklecellanemia.ca`) and `www` (CNAME → `sites.framer.app`) belong
  to the **Framer** marketing site. **Do not touch either one.**
- `learn.sicklecellanemia.ca` does not exist yet — clean slate, no conflict.
- The LMS Netlify project is **`org-lms`** (`org-lms.netlify.app`).

**Step 1 — DNS (IONOS).** Add ONE record:

| Field | Value |
|---|---|
| Type | `CNAME` |
| Host / name | `learn` |
| Points to | `org-lms.netlify.app` |
| TTL | 3600 (or 600 while testing) |

Use a **CNAME**, never an A record — Netlify's edge IPs are load-balanced and
change without notice, so a hardcoded A record eventually breaks.

Do NOT delegate the domain's nameservers to Netlify DNS: the apex and `www`
are Framer's, and moving NS would require re-creating every Framer record.
External DNS + this one CNAME is the correct, low-risk setup.

**Step 2 — Netlify.** `org-lms` → Domain management → add domain alias
`learn.sicklecellanemia.ca`. Once the CNAME resolves, Netlify verifies it and
auto-provisions the Let's Encrypt certificate (usually minutes).

**Step 3 — Netlify env + REDEPLOY.** Set
`NEXT_PUBLIC_SITE_URL=https://learn.sicklecellanemia.ca`.

> **Gotcha that bites every time:** `NEXT_PUBLIC_*` values are inlined into the
> bundle at **build** time. Changing the variable does nothing to the running
> site until you trigger a **new deploy**. Set it, then redeploy.

**Step 4 — Supabase** → Auth → URL Configuration. Set Site URL to
`https://learn.sicklecellanemia.ca`, and **add** (do not replace) these to the
redirect allow-list:

- `https://learn.sicklecellanemia.ca/auth/callback`
- `https://learn.sicklecellanemia.ca/reset-password`

Keep the existing `*.netlify.app` entries until the new domain is confirmed
working — confirmation/reset emails already sent point at the OLD origin, and
removing it early dead-ends those users mid-signup.

**Step 5 — Framer.** Point the embed iframe `src` at
`https://learn.sicklecellanemia.ca/scago/student`.

**Step 6 (after verifying).** Optionally set `learn.sicklecellanemia.ca` as the
Netlify **primary domain** so `org-lms.netlify.app` 301s to it. Only after the
embed is updated.

**No application code change is required.** `/auth/callback` derives every
redirect from `requestUrl.origin`, so it follows whatever domain serves it; the
only origin-dependent value is `NEXT_PUBLIC_SITE_URL` (step 3).

Now `www.sicklecellanemia.ca` (parent) and `learn.sicklecellanemia.ca` (iframe)
share the registrable domain `sicklecellanemia.ca` → same-site → cookies are
first-party → login persists in the iframe on every browser. With this in place,
the `SameSite=None; Secure` setting is harmless (works same-site too) but no
longer load-bearing, and Safari is no longer a problem.

Note the distinction that makes this work: `SameSite` is evaluated against the
**registrable domain** (eTLD+1), not the origin. `learn.` and `www.` are
different *origins* but the same *site*, which is exactly why the third-party
cookie restrictions (Safari ITP, Chrome's 3P-cookie phase-out) stop applying.

**Optional later hardening — only after the cutover is verified.** Once every
embed points at `learn.sicklecellanemia.ca`, `AUTH_COOKIE_OPTIONS`
(`src/lib/supabase/cookie-options.ts`) can be tightened from `sameSite: 'none'`
to `'lax'` for CSRF resistance, since same-site framing no longer needs `None`.
Do NOT do this while any page still embeds the `*.netlify.app` origin — that
embed is genuinely cross-site and `Lax` would silently break its login. The
value is already centralised, so it is a one-line change that applies to the
browser, server, and middleware clients together (they must always match).
