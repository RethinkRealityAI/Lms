-- ============================================================
-- 035: Security hardening for CME + legacy-claim (audit follow-up to 034)
-- Applied via Supabase MCP; this file is the version-controlled source.
--   1. Pin search_path on pre-existing SECURITY DEFINER fns (is_admin, claim_legacy_profile)
--   2. Bind has_completed_all_courses to the caller (no probing other users)
--   3. Strip default PUBLIC/anon EXECUTE from the 4 new RPCs
--   4. Institution-scope admin RLS on cme_certificate_requests (+ WITH CHECK)
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role IN ('admin','platform_admin','institution_admin')
  );
$$;

CREATE OR REPLACE FUNCTION public.claim_legacy_profile(p_user_id uuid, p_email text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_legacy legacy_users%ROWTYPE;
BEGIN
  SELECT * INTO v_legacy FROM public.legacy_users
  WHERE lower(email) = lower(p_email) AND linked_user_id IS NULL LIMIT 1;
  IF NOT FOUND THEN RETURN; END IF;

  UPDATE public.users SET
    occupation     = COALESCE(v_legacy.occupation, occupation),
    affiliation    = COALESCE(v_legacy.affiliation, affiliation),
    country        = COALESCE(v_legacy.country, country),
    institution_id = COALESCE(institution_id, v_legacy.institution_id),
    updated_at     = now()
  WHERE id = p_user_id;

  UPDATE public.legacy_users SET linked_user_id = p_user_id, accepted_at = now()
  WHERE id = v_legacy.id;
  UPDATE public.user_group_members SET user_id = p_user_id, legacy_user_id = NULL
  WHERE legacy_user_id = v_legacy.id;
  UPDATE public.user_invitations SET status = 'accepted', accepted_at = now()
  WHERE legacy_user_id = v_legacy.id AND status = 'pending';
END;
$$;
REVOKE EXECUTE ON FUNCTION public.claim_legacy_profile(uuid, text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.has_completed_all_courses(p_user_id uuid, p_institution_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE
    WHEN p_user_id IS DISTINCT FROM auth.uid() AND NOT public.is_admin() THEN false
    ELSE (
      WITH pub AS (
        SELECT id FROM public.courses
        WHERE institution_id = p_institution_id
          AND deleted_at IS NULL
          AND COALESCE(is_published, true) = true
          AND slug IS NOT NULL
      ),
      per_course AS (
        SELECT c.id AS course_id,
          (SELECT count(*) FROM public.lessons l
             WHERE l.course_id = c.id AND l.deleted_at IS NULL) AS total,
          (SELECT count(*) FROM public.lessons l
             JOIN public.progress p ON p.lesson_id = l.id AND p.user_id = p_user_id AND p.completed = true
             WHERE l.course_id = c.id AND l.deleted_at IS NULL) AS done
        FROM pub c
      )
      SELECT (SELECT count(*) FROM per_course) > 0
         AND NOT EXISTS (SELECT 1 FROM per_course WHERE total = 0 OR done < total)
    )
  END;
$$;

REVOKE EXECUTE ON FUNCTION public.has_completed_all_courses(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.request_cme_certificate(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.claim_my_legacy_profile() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_link_legacy_profile(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_completed_all_courses(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.request_cme_certificate(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_my_legacy_profile() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_link_legacy_profile(uuid, uuid) TO authenticated;

DROP POLICY IF EXISTS "cme select own or admin" ON public.cme_certificate_requests;
CREATE POLICY "cme select own or admin" ON public.cme_certificate_requests
  FOR SELECT USING (
    user_id = auth.uid()
    OR (
      public.is_admin() AND (
        institution_id = (SELECT u.institution_id FROM public.users u WHERE u.id = auth.uid())
        OR (SELECT u.role FROM public.users u WHERE u.id = auth.uid()) = 'platform_admin'
      )
    )
  );

DROP POLICY IF EXISTS "cme admin update" ON public.cme_certificate_requests;
CREATE POLICY "cme admin update" ON public.cme_certificate_requests
  FOR UPDATE USING (
    public.is_admin() AND (
      institution_id = (SELECT u.institution_id FROM public.users u WHERE u.id = auth.uid())
      OR (SELECT u.role FROM public.users u WHERE u.id = auth.uid()) = 'platform_admin'
    )
  )
  WITH CHECK (public.is_admin());
