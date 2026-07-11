-- Migration 055: institution_memberships dual-access
-- Enables ONE auth account to belong to MULTIPLE institutions (shared login, dual access).
--
-- Background: the platform runs a single Supabase project, so auth.users email is globally
-- unique — a person can only ever have one account. Previously public.users carried a single
-- institution_id and the whole app treated that as "the" institution, so a GANSID account was
-- blocked from ever accessing SCAGO. The institution_memberships table existed but had RLS
-- enabled with ZERO policies (unusable -> empty), so the signup "best-effort" upsert always
-- silently failed.
--
-- This migration makes institution_memberships the ACCESS SET: users.institution_id stays as
-- the "primary/home" institution (default landing), while membership rows grant access to any
-- number of institutions. Content RLS is unchanged (student visibility is enrollment/published
-- based and institution scoping is application-level), so this is purely an access-model change.

-- 1) Backfill: every existing user becomes a member of their current (primary) institution,
--    so nobody loses access. Map non-membership roles onto the membership role CHECK.
INSERT INTO public.institution_memberships (institution_id, user_id, role, is_active)
SELECT u.institution_id, u.id,
       CASE
         WHEN u.role IN ('institution_admin','instructor','student') THEN u.role
         WHEN u.role IN ('admin','platform_admin') THEN 'institution_admin'
         ELSE 'student'
       END,
       COALESCE(u.is_active, true)
FROM public.users u
WHERE u.institution_id IS NOT NULL
ON CONFLICT (institution_id, user_id) DO NOTHING;

-- 2) RLS policies. The table had RLS on but no policies. Reads: own rows + admins. Writes go
--    through the SECURITY DEFINER join_institution() RPC (clients never write this table
--    directly), plus an institution-scoped admin-manage policy for future admin UI.
DROP POLICY IF EXISTS "Users read own memberships" ON public.institution_memberships;
CREATE POLICY "Users read own memberships" ON public.institution_memberships
  FOR SELECT USING (user_id = auth.uid());

-- Admin reads are covered by the institution-scoped "Admins manage memberships" (FOR ALL)
-- below — deliberately NO unscoped "is_admin()" read policy, so an institution_admin cannot
-- read another tenant's memberships (platform_admin still can, via the scoped policy).
DROP POLICY IF EXISTS "Admins read memberships" ON public.institution_memberships;

DROP POLICY IF EXISTS "Admins manage memberships" ON public.institution_memberships;
CREATE POLICY "Admins manage memberships" ON public.institution_memberships
  FOR ALL
  USING (
    public.is_admin() AND (
      EXISTS (SELECT 1 FROM public.users me WHERE me.id = auth.uid() AND me.role = 'platform_admin')
      OR institution_id = (SELECT me.institution_id FROM public.users me WHERE me.id = auth.uid())
    )
  )
  WITH CHECK (
    public.is_admin() AND (
      EXISTS (SELECT 1 FROM public.users me WHERE me.id = auth.uid() AND me.role = 'platform_admin')
      OR institution_id = (SELECT me.institution_id FROM public.users me WHERE me.id = auth.uid())
    )
  );

-- 3) get_my_institution_slugs(): the set of institution slugs the caller may enter
--    (active memberships UNION their primary users.institution_id). Consumed by the middleware
--    tenant guard, the student page, and the login redirect. auth.uid()-bound.
CREATE OR REPLACE FUNCTION public.get_my_institution_slugs()
RETURNS text[]
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT COALESCE(array_agg(DISTINCT i.slug), ARRAY[]::text[])
  FROM public.institutions i
  WHERE i.id IN (
    SELECT m.institution_id FROM public.institution_memberships m
      WHERE m.user_id = auth.uid() AND m.is_active
    UNION
    SELECT u.institution_id FROM public.users u
      WHERE u.id = auth.uid() AND u.institution_id IS NOT NULL
  );
$$;

-- 4) join_institution(slug): idempotently add the CALLER as a student member of slug.
--    The self-service "sign in to access the other program too" path.
CREATE OR REPLACE FUNCTION public.join_institution(p_slug text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_inst uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  SELECT id INTO v_inst FROM public.institutions WHERE slug = p_slug;
  IF v_inst IS NULL THEN RAISE EXCEPTION 'unknown institution: %', p_slug; END IF;
  INSERT INTO public.institution_memberships (institution_id, user_id, role, is_active)
  VALUES (v_inst, auth.uid(), 'student', true)
  ON CONFLICT (institution_id, user_id) DO NOTHING;
END;
$$;

-- 5) signup_precheck(email, slug): pre-auth helper so the signup form shows a friendly
--    "you already have an account with X — just sign in" message instead of a dead-end block.
--    Returns only account existence + the primary institution's display name (parity with
--    Supabase's existing "User already registered" response) — never password data.
--      status 'available'          -> no account, proceed with normal signup
--      status 'member'             -> already a member of THIS portal, just sign in
--      status 'other_institution'  -> has an account elsewhere; sign in to add this portal
CREATE OR REPLACE FUNCTION public.signup_precheck(p_email text, p_slug text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user_id uuid;
  v_primary_name text;
  v_target uuid;
  v_is_member boolean := false;
BEGIN
  SELECT u.id, i.name INTO v_user_id, v_primary_name
  FROM public.users u LEFT JOIN public.institutions i ON i.id = u.institution_id
  WHERE lower(u.email) = lower(p_email)
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('status', 'available');
  END IF;

  SELECT id INTO v_target FROM public.institutions WHERE slug = p_slug;
  SELECT EXISTS (
    SELECT 1 FROM public.institution_memberships m
    WHERE m.user_id = v_user_id AND m.institution_id = v_target
  ) INTO v_is_member;

  IF v_is_member THEN
    RETURN jsonb_build_object('status', 'member', 'primary_name', v_primary_name);
  END IF;
  RETURN jsonb_build_object('status', 'other_institution', 'primary_name', v_primary_name);
END;
$$;

-- 6) Grants — strip default PUBLIC execute, grant narrowly.
REVOKE ALL ON FUNCTION public.get_my_institution_slugs() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.join_institution(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.signup_precheck(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_institution_slugs() TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_institution(text) TO authenticated;
-- signup_precheck runs pre-auth on the signup form, so anon needs it.
GRANT EXECUTE ON FUNCTION public.signup_precheck(text, text) TO anon, authenticated;
-- Supabase default privileges auto-grant EXECUTE to anon at CREATE time; the two
-- auth.uid()-bound functions never need it (least privilege). signup_precheck keeps anon.
REVOKE EXECUTE ON FUNCTION public.get_my_institution_slugs() FROM anon;
REVOKE EXECUTE ON FUNCTION public.join_institution(text) FROM anon;
