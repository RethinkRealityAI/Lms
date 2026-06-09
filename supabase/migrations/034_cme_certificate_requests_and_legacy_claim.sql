-- ============================================================
-- 034: CME Certificate Requests + Legacy-Claim refinements
-- Applied via Supabase MCP; this file is the version-controlled source.
-- ============================================================

-- ── CME certificate requests ────────────────────────────────
CREATE TABLE IF NOT EXISTS public.cme_certificate_requests (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  user_id       uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  program_label text,
  status        text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','issued','declined')),
  requested_at  timestamptz NOT NULL DEFAULT now(),
  resolved_at   timestamptz,
  resolved_by   uuid REFERENCES public.users(id) ON DELETE SET NULL,
  notes         text
);

-- at most one OPEN (pending) request per user
CREATE UNIQUE INDEX IF NOT EXISTS cme_one_pending_per_user
  ON public.cme_certificate_requests (user_id) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS cme_requests_inst_status_idx
  ON public.cme_certificate_requests (institution_id, status);

ALTER TABLE public.cme_certificate_requests ENABLE ROW LEVEL SECURITY;

-- read: own rows or any admin
DROP POLICY IF EXISTS "cme select own or admin" ON public.cme_certificate_requests;
CREATE POLICY "cme select own or admin" ON public.cme_certificate_requests
  FOR SELECT USING (user_id = auth.uid() OR public.is_admin());

-- cancel: a user may delete only their own still-pending request
DROP POLICY IF EXISTS "cme delete own pending" ON public.cme_certificate_requests;
CREATE POLICY "cme delete own pending" ON public.cme_certificate_requests
  FOR DELETE USING (user_id = auth.uid() AND status = 'pending');

-- resolve: admins update (mark issued / declined)
DROP POLICY IF EXISTS "cme admin update" ON public.cme_certificate_requests;
CREATE POLICY "cme admin update" ON public.cme_certificate_requests
  FOR UPDATE USING (public.is_admin());

-- NOTE: no INSERT policy on purpose — inserts go through request_cme_certificate()
-- (SECURITY DEFINER) which enforces eligibility.

-- ── Eligibility: completed every catalog course in the institution ──
CREATE OR REPLACE FUNCTION public.has_completed_all_courses(p_user_id uuid, p_institution_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH pub AS (
    SELECT id FROM public.courses
    WHERE institution_id = p_institution_id
      AND deleted_at IS NULL
      AND COALESCE(is_published, true) = true
      AND slug IS NOT NULL          -- catalog courses (excludes scratch/test courses)
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
     AND NOT EXISTS (SELECT 1 FROM per_course WHERE total = 0 OR done < total);
$$;

-- ── Request a CME certificate (enforces eligibility; idempotent) ──
CREATE OR REPLACE FUNCTION public.request_cme_certificate(p_program_label text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_inst uuid;
  v_existing uuid;
  v_status text;
  v_id uuid;
BEGIN
  SELECT institution_id INTO v_inst FROM public.users WHERE id = auth.uid();
  IF v_inst IS NULL THEN RAISE EXCEPTION 'no_institution'; END IF;

  SELECT id, status INTO v_existing, v_status
  FROM public.cme_certificate_requests
  WHERE user_id = auth.uid() AND status IN ('pending','issued')
  ORDER BY requested_at DESC LIMIT 1;
  IF v_existing IS NOT NULL THEN
    RETURN jsonb_build_object('id', v_existing, 'status', v_status, 'created', false);
  END IF;

  IF NOT public.has_completed_all_courses(auth.uid(), v_inst) THEN
    RAISE EXCEPTION 'not_eligible';
  END IF;

  INSERT INTO public.cme_certificate_requests (institution_id, user_id, program_label, status)
  VALUES (v_inst, auth.uid(), p_program_label, 'pending')
  RETURNING id INTO v_id;

  RETURN jsonb_build_object('id', v_id, 'status', 'pending', 'created', true);
END;
$$;

-- ── Legacy claim: secure own-email retroactive claim ──
CREATE OR REPLACE FUNCTION public.claim_my_legacy_profile()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_email text;
  v_legacy legacy_users%ROWTYPE;
BEGIN
  SELECT email INTO v_email FROM public.users WHERE id = auth.uid();
  IF v_email IS NULL THEN RETURN jsonb_build_object('claimed', false, 'reason', 'no_email'); END IF;

  SELECT * INTO v_legacy FROM public.legacy_users
  WHERE lower(email) = lower(v_email) AND linked_user_id IS NULL LIMIT 1;

  IF NOT FOUND THEN RETURN jsonb_build_object('claimed', false, 'reason', 'no_match'); END IF;

  PERFORM public.claim_legacy_profile(auth.uid(), v_email);
  RETURN jsonb_build_object('claimed', true);
END;
$$;

-- ── Legacy claim: admin manually links a legacy record to an account ──
CREATE OR REPLACE FUNCTION public.admin_link_legacy_profile(p_legacy_user_id uuid, p_user_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_legacy legacy_users%ROWTYPE;
  v_user_inst uuid;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;

  SELECT * INTO v_legacy FROM public.legacy_users WHERE id = p_legacy_user_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'legacy_not_found'; END IF;
  IF v_legacy.linked_user_id IS NOT NULL THEN RAISE EXCEPTION 'already_linked'; END IF;

  SELECT institution_id INTO v_user_inst FROM public.users WHERE id = p_user_id;
  IF v_user_inst IS NULL THEN RAISE EXCEPTION 'user_not_found'; END IF;
  IF v_user_inst <> v_legacy.institution_id THEN RAISE EXCEPTION 'institution_mismatch'; END IF;

  UPDATE public.users SET
    occupation  = COALESCE(occupation, v_legacy.occupation),
    affiliation = COALESCE(affiliation, v_legacy.affiliation),
    country     = COALESCE(country, v_legacy.country),
    updated_at  = now()
  WHERE id = p_user_id;

  UPDATE public.legacy_users SET linked_user_id = p_user_id, accepted_at = now()
  WHERE id = p_legacy_user_id;

  UPDATE public.user_group_members SET user_id = p_user_id, legacy_user_id = NULL
  WHERE legacy_user_id = p_legacy_user_id;

  UPDATE public.user_invitations SET status = 'accepted', accepted_at = now()
  WHERE legacy_user_id = p_legacy_user_id AND status = 'pending';

  RETURN jsonb_build_object('linked', true);
END;
$$;

-- ── Let a user read their OWN linked legacy row (for profile history) ──
DROP POLICY IF EXISTS "legacy users read own linked" ON public.legacy_users;
CREATE POLICY "legacy users read own linked" ON public.legacy_users
  FOR SELECT USING (linked_user_id = auth.uid() OR public.is_admin());

-- ── Grants / hardening ──
GRANT EXECUTE ON FUNCTION public.has_completed_all_courses(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.request_cme_certificate(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_my_legacy_profile() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_link_legacy_profile(uuid, uuid) TO authenticated;
-- harden the raw claim fn: only the signup trigger (definer) should call it, never a client
REVOKE EXECUTE ON FUNCTION public.claim_legacy_profile(uuid, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.claim_legacy_profile(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.claim_legacy_profile(uuid, text) FROM authenticated;
