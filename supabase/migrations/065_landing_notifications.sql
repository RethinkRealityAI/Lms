-- 065_landing_notifications.sql
--
-- Admin-controlled notification banner for the PUBLIC marketing/landing pages
-- (src/app/page.tsx — the SCAGO + GANSID landing pages). This is the landing-page
-- sibling of the migration-045 announcements system, but for UNAUTHENTICATED
-- visitors: there is no signed-in user, so there is no per-user dismissal table and
-- no audience targeting. Instead the row is publicly readable (only while live/in
-- window) via a SECURITY DEFINER RPC, and "dismiss" is a client-side localStorage
-- flag keyed by the notification id + updated_at.
--
-- Admins manage content AND look (accent color, icon, logo, CTA button + secondary
-- link, schedule) from the admin dashboard — the same left-form / live-preview
-- pattern as the announcements manager.

-- ---------------------------------------------------------------------------
-- Table
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.landing_notifications (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id      uuid NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  title               text NOT NULL,
  body                text NOT NULL,
  -- Look controls
  icon                text NOT NULL DEFAULT 'megaphone'
                        CHECK (icon IN ('megaphone', 'info', 'sparkles', 'heart', 'bell', 'party', 'none')),
  accent_color        text,           -- null = institution primary color
  show_logo           boolean NOT NULL DEFAULT false,
  -- Primary CTA button (url may be an on-page anchor like '#support', an http(s)
  -- URL, or an app path).
  cta_label           text,
  cta_url             text,
  -- Secondary text link (same url conventions) — lets the notice link to an
  -- on-page section (e.g. the support section) in addition to the button.
  secondary_cta_label text,
  secondary_cta_url   text,
  -- Behavior
  dismissible         boolean NOT NULL DEFAULT true,
  starts_at           timestamptz NOT NULL DEFAULT now(),
  ends_at             timestamptz,
  is_active           boolean NOT NULL DEFAULT true,
  created_by          uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_landing_notifications_institution_active
  ON public.landing_notifications (institution_id, is_active, starts_at);

-- ---------------------------------------------------------------------------
-- RLS — admin-only table access. Public reads go exclusively through the RPC
-- below (so anon can never enumerate scheduled/inactive rows).
-- ---------------------------------------------------------------------------
ALTER TABLE public.landing_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage landing notifications" ON public.landing_notifications;
CREATE POLICY "Admins manage landing notifications"
  ON public.landing_notifications FOR ALL
  USING (
    public.is_admin() AND (
      institution_id = (SELECT institution_id FROM public.users WHERE id = auth.uid())
      OR (SELECT role FROM public.users WHERE id = auth.uid()) = 'platform_admin'
    )
  )
  WITH CHECK (
    public.is_admin() AND (
      institution_id = (SELECT institution_id FROM public.users WHERE id = auth.uid())
      OR (SELECT role FROM public.users WHERE id = auth.uid()) = 'platform_admin'
    )
  );

-- ---------------------------------------------------------------------------
-- Public read RPC — returns only LIVE, in-window rows for the given institution
-- slug. SECURITY DEFINER so it bypasses the admin-only RLS above, but it never
-- exposes inactive/scheduled/expired rows. Callable by anon (landing page).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_active_landing_notifications(p_slug text)
RETURNS TABLE (
  id                  uuid,
  institution_id      uuid,
  title               text,
  body                text,
  icon                text,
  accent_color        text,
  show_logo           boolean,
  cta_label           text,
  cta_url             text,
  secondary_cta_label text,
  secondary_cta_url   text,
  dismissible         boolean,
  starts_at           timestamptz,
  ends_at             timestamptz,
  updated_at          timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT
    ln.id, ln.institution_id, ln.title, ln.body, ln.icon, ln.accent_color,
    ln.show_logo, ln.cta_label, ln.cta_url, ln.secondary_cta_label,
    ln.secondary_cta_url, ln.dismissible, ln.starts_at, ln.ends_at, ln.updated_at
  FROM public.landing_notifications ln
  JOIN public.institutions i ON i.id = ln.institution_id
  WHERE i.slug = p_slug
    AND ln.is_active
    AND ln.starts_at <= now()
    AND (ln.ends_at IS NULL OR ln.ends_at > now())
  ORDER BY ln.starts_at DESC, ln.created_at DESC;
$$;

-- Only the landing page (anon) and authenticated visitors call this; strip the
-- default PUBLIC grant and re-grant explicitly.
REVOKE ALL ON FUNCTION public.get_active_landing_notifications(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_active_landing_notifications(text) TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- Seed — one editable "HCP program is back" welcome notice per institution,
-- inactive by default so admins can review + turn it on. Skipped if a row
-- already exists for the institution.
-- ---------------------------------------------------------------------------
INSERT INTO public.landing_notifications (
  institution_id, title, body, icon, accent_color, show_logo,
  cta_label, cta_url, secondary_cta_label, secondary_cta_url,
  dismissible, is_active
)
SELECT
  i.id,
  'The HCP E-Learning Program is back! 🎉',
  E'Thank you for your patience while we transitioned from EdApp to our new proprietary learning platform, purpose-built for this program.\n\nThe experience will feel largely the same, and your profile and progress have been transferred as faithfully as possible. As a precaution you may find yourself one lesson behind — module content has been rearranged, so lesson slides are no longer 1:1 with the old platform.\n\nIf you run into any issues or have feedback, please use the support tools inside the modules and on your dashboard.',
  'party',
  '#059669',
  true,
  'Sign in to continue learning',
  '/login',
  'See how to get support',
  '#support',
  true,
  false
FROM public.institutions i
WHERE i.slug IN ('scago', 'gansid')
  AND NOT EXISTS (
    SELECT 1 FROM public.landing_notifications ln WHERE ln.institution_id = i.id
  );
