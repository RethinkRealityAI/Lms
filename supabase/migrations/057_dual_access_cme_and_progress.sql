-- Migration 057: per-institution CME + institution-scoped profile progress (dual-access follow-up)
-- Two pre-existing single-institution assumptions that dual access (055/056) exposed:
--   * CME requests were bound to the user's PRIMARY institution — request_cme_certificate
--     read users.institution_id, the existing-request check was global, and the unique index
--     was (user_id) WHERE pending. A dual-access learner could never request a SECOND
--     institution's CME cert, and a cert held in one institution showed "issued" in the other.
--   * The profile "Learning Progress" card read v_student_progress, which aggregates per user
--     with no institution dimension → combined totals across both institutions on every portal.
-- Both are fixed to key off the active portal institution (verified as a member via
-- get_my_institution_ids() from 056).

-- 1) CME: one PENDING request per (user, institution).
DROP INDEX IF EXISTS public.cme_one_pending_per_user;
CREATE UNIQUE INDEX IF NOT EXISTS cme_one_pending_per_user_inst
  ON public.cme_certificate_requests (user_id, institution_id) WHERE status = 'pending';

-- 2) Institution-aware request RPC (replaces the primary-bound (text) overload). Requires the
--    caller to be a member of p_institution_id, and scopes the existing-request + eligibility
--    checks + insert to it. SECURITY DEFINER, authenticated-only (anon stripped).
DROP FUNCTION IF EXISTS public.request_cme_certificate(text);
CREATE OR REPLACE FUNCTION public.request_cme_certificate(p_institution_id uuid, p_program_label text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_existing uuid; v_status text; v_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  IF p_institution_id IS NULL OR NOT (p_institution_id = ANY (public.get_my_institution_ids())) THEN
    RAISE EXCEPTION 'not_member';
  END IF;

  SELECT id, status INTO v_existing, v_status
  FROM public.cme_certificate_requests
  WHERE user_id = auth.uid() AND institution_id = p_institution_id AND status IN ('pending','issued')
  ORDER BY requested_at DESC LIMIT 1;
  IF v_existing IS NOT NULL THEN
    RETURN jsonb_build_object('id', v_existing, 'status', v_status, 'created', false);
  END IF;

  IF NOT public.has_completed_all_courses(auth.uid(), p_institution_id) THEN
    RAISE EXCEPTION 'not_eligible';
  END IF;

  INSERT INTO public.cme_certificate_requests (institution_id, user_id, program_label, status)
  VALUES (p_institution_id, auth.uid(), p_program_label, 'pending')
  RETURNING id INTO v_id;

  RETURN jsonb_build_object('id', v_id, 'status', 'pending', 'created', true);
END; $$;
REVOKE ALL ON FUNCTION public.request_cme_certificate(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.request_cme_certificate(uuid, text) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.request_cme_certificate(uuid, text) FROM anon;

-- 3) Institution-scoped "my learning progress" for the profile stats card. Mirrors
--    v_student_progress's definitions (live lessons only; revoked certs excluded; quiz stats
--    from quiz_block_responses) but filtered to ONE institution's courses and bound to auth.uid().
CREATE OR REPLACE FUNCTION public.get_my_student_progress(p_institution_id uuid)
RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT jsonb_build_object(
    'enrollment_count', (
      SELECT count(*) FROM public.course_enrollments ce
      JOIN public.courses c ON c.id = ce.course_id AND c.deleted_at IS NULL AND c.institution_id = p_institution_id
      WHERE ce.user_id = auth.uid()),
    'completed_lessons', (
      SELECT count(*) FROM public.progress pr
      JOIN public.lessons l ON l.id = pr.lesson_id AND l.deleted_at IS NULL
      JOIN public.courses c ON c.id = l.course_id AND c.institution_id = p_institution_id
      WHERE pr.user_id = auth.uid() AND pr.completed = true),
    'quiz_attempts', (
      SELECT count(*) FROM public.quiz_block_responses qbr
      WHERE qbr.user_id = auth.uid() AND qbr.institution_id = p_institution_id),
    'avg_quiz_score', (
      SELECT round(count(*) FILTER (WHERE is_correct)::numeric / nullif(count(*),0)::numeric * 100, 1)
      FROM public.quiz_block_responses qbr
      WHERE qbr.user_id = auth.uid() AND qbr.institution_id = p_institution_id),
    'certificates_earned', (
      SELECT count(*) FROM public.certificates c
      WHERE c.user_id = auth.uid() AND c.institution_id = p_institution_id AND c.revoked_at IS NULL),
    'last_activity', (
      SELECT max(pr.completed_at) FROM public.progress pr
      JOIN public.lessons l ON l.id = pr.lesson_id AND l.deleted_at IS NULL
      JOIN public.courses c ON c.id = l.course_id AND c.institution_id = p_institution_id
      WHERE pr.user_id = auth.uid() AND pr.completed = true)
  );
$$;
REVOKE ALL ON FUNCTION public.get_my_student_progress(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_student_progress(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.get_my_student_progress(uuid) FROM anon;
