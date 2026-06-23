# Per-tenant Supabase Auth emails (GANSID + SCAGO)

## The problem this fixes
Supabase Auth (signup confirmation, password reset, magic link) sends **one global
email template** for the whole project. Until now that single template was
GANSID-branded, so **SCAGO signups received GANSID-branded emails**.

> Note: this only affects **Supabase Auth emails**. App-sent emails (certificate
> and assignment notifications via `src/lib/email/mailer.ts`) were already
> per-tenant correct — they resolve `SMTP_FROM_GANSID` / `SMTP_FROM_SCAGO` and the
> stored `email_templates` row by the caller's institution.

## The fix — no new infrastructure
Supabase Auth templates are **Go templates** that expose `{{ .Data }}` (the user's
`user_metadata`). Our signup form already writes `institution_slug` into that
metadata (`src/app/login/page.tsx` → `options.data.institution_slug`). So a single
template can branch per tenant:

```
{{ if eq .Data.institution_slug "scago" }}  …SCAGO…  {{ else }}  …GANSID…  {{ end }}
```

SCAGO users get SCAGO branding; everyone else (including any user whose metadata is
missing the slug) falls back to GANSID — matching `getInstitutionBranding()`.

## How to apply (one-time, in the Supabase Dashboard)
1. Open **Supabase Dashboard → Authentication → Email Templates**.
2. **Confirm signup** → paste the entire contents of `confirm-signup.html`.
3. **Reset password** → paste the entire contents of `reset-password.html`.
4. (Optional) **Invite user** → `invite-user.html` (admin invites; brand as needed).
5. Save each. Send a test signup from `/scago/login` and from `/gansid/login` and
   confirm the received email matches the institution.

## Notes & follow-ups
- **Subject lines** are set in the dashboard, not the HTML. Supabase does not allow
  conditionals in the subject field, so keep it institution-neutral, e.g.
  `Confirm your email` / `Reset your password`.
- **`{{ .ConfirmationURL }}`** already carries the correct redirect. The redirect
  host comes from `emailRedirectTo` (currently `NEXT_PUBLIC_SITE_URL`); both tenants
  share one domain with `/gansid` and `/scago` path prefixes, and `/auth/callback`
  routes the user to their own tenant after confirmation.
- For fully dynamic branded auth emails (logos per tenant, etc.) the long-term
  option is a Supabase **Send Email Hook** (edge function), but the conditional
  template above resolves the reported branding bug without that complexity.
