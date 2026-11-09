-- 066_landing_returning_info.sql
--
-- Admin-editable copy for the "Returning from EdApp" section on the public
-- landing page (rendered below the notification banner). One row per institution
-- (single config, not a list). Same public-read pattern as migration 065:
-- admin-only table RLS + a SECURITY DEFINER RPC for anonymous reads of the
-- ACTIVE row.

CREATE TABLE IF NOT EXISTS public.landing_returning_info (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id    uuid NOT NULL UNIQUE REFERENCES public.institutions(id) ON DELETE CASCADE,
  is_active         boolean NOT NULL DEFAULT true,
  accent_color      text,           -- null = default green (#059669)
  eyebrow           text NOT NULL DEFAULT '',
  heading           text NOT NULL DEFAULT '',
  intro             text NOT NULL DEFAULT '',
  email_note_title  text NOT NULL DEFAULT '',
  email_note_body   text NOT NULL DEFAULT '',
  signup_title      text NOT NULL DEFAULT '',
  signup_body       text NOT NULL DEFAULT '',
  signup_button     text NOT NULL DEFAULT '',
  signin_title      text NOT NULL DEFAULT '',
  signin_body       text NOT NULL DEFAULT '',
  signin_button     text NOT NULL DEFAULT '',
  footer_note       text NOT NULL DEFAULT '',
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.landing_returning_info ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage returning info" ON public.landing_returning_info;
CREATE POLICY "Admins manage returning info"
  ON public.landing_returning_info FOR ALL
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

CREATE OR REPLACE FUNCTION public.get_landing_returning_info(p_slug text)
RETURNS TABLE (
  eyebrow           text,
  heading           text,
  intro             text,
  email_note_title  text,
  email_note_body   text,
  signup_title      text,
  signup_body       text,
  signup_button     text,
  signin_title      text,
  signin_body       text,
  signin_button     text,
  footer_note       text,
  accent_color      text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT
    r.eyebrow, r.heading, r.intro, r.email_note_title, r.email_note_body,
    r.signup_title, r.signup_body, r.signup_button,
    r.signin_title, r.signin_body, r.signin_button,
    r.footer_note, r.accent_color
  FROM public.landing_returning_info r
  JOIN public.institutions i ON i.id = r.institution_id
  WHERE i.slug = p_slug AND r.is_active;
$$;

REVOKE ALL ON FUNCTION public.get_landing_returning_info(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_landing_returning_info(text) TO anon, authenticated;

-- Seed one row per institution with the default copy (SCAGO active; GANSID
-- seeded off since the section only renders on the SCAGO landing today).
INSERT INTO public.landing_returning_info (
  institution_id, is_active, accent_color, eyebrow, heading, intro,
  email_note_title, email_note_body, signup_title, signup_body, signup_button,
  signin_title, signin_body, signin_button, footer_note
)
SELECT
  i.id,
  (i.slug = 'scago'),
  '#059669',
  'Returning from EdApp?',
  'Your account and progress are already here.',
  'We’ve carried over your profile, completed modules, and certificates from EdApp. There’s nothing to re-enrol in and nothing to rebuild — the one thing to know is which email to use.',
  'Use the same email you used on EdApp',
  'That’s how we recognise you. As long as the email matches, your history reconnects to your account automatically — even the first time you log in here.',
  'First time on the new platform',
  'Create your login once with your EdApp email and pick a password. Your profile and progress are restored the moment you sign up — no enrolment forms, no starting over.',
  'Set up my account',
  'Already set up your login?',
  'Just sign in and pick up right where you left off. Everything you completed is waiting on your dashboard.',
  'Sign in',
  'Not sure the emails match, or something looks off? Use the support tools below and we’ll link it for you.'
FROM public.institutions i
WHERE i.slug IN ('scago', 'gansid')
  AND NOT EXISTS (
    SELECT 1 FROM public.landing_returning_info r WHERE r.institution_id = i.id
  );
