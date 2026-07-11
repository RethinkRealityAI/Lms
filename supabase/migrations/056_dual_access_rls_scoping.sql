-- Migration 056: dual-access RLS scoping
-- Follow-up to 055. Several STUDENT-facing RLS policies scoped reads/writes to the caller's
-- PRIMARY institution (`= users.institution_id`). Under dual access (one account, multiple
-- institutions) that breaks the secondary-institution experience:
--   * quiz_block_responses WITH CHECK bound to primary → a learner CANNOT save quiz answers
--     on a secondary-institution course → required quizzes never pass → course can't complete
--     → no certificate. (Hard blocker — the viewer writes institution_id = the COURSE's
--     institution, which fails the primary-only check.)
--   * survey_assignments / programs / announcements / user_groups SELECT bound to primary →
--     the secondary institution's completion survey never resolves, its program cards and
--     announcements never show (and the wrong institution's announcements leak in).
--
-- Fix: introduce get_my_institution_ids() (the membership set as UUIDs, mirroring
-- get_my_institution_slugs from 055) and scope these five student-facing policies to it.
-- Admin policies are unchanged (dual access is student-only; admins stay single-institution).
-- App-level queries already target a specific institution/course, so broadening RLS to the
-- membership set does not widen what any screen displays — it only stops RLS from hiding a
-- secondary institution the learner legitimately belongs to. (announcements additionally gets
-- an app-side active-institution filter so only the viewed portal's announcements show.)

CREATE OR REPLACE FUNCTION public.get_my_institution_ids()
RETURNS uuid[]
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT COALESCE(array_agg(DISTINCT id), ARRAY[]::uuid[]) FROM (
    SELECT m.institution_id AS id FROM public.institution_memberships m
      WHERE m.user_id = auth.uid() AND m.is_active
    UNION
    SELECT u.institution_id AS id FROM public.users u
      WHERE u.id = auth.uid() AND u.institution_id IS NOT NULL
  ) s;
$$;
REVOKE ALL ON FUNCTION public.get_my_institution_ids() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_institution_ids() TO authenticated;
-- Supabase default privileges auto-grant EXECUTE to anon at CREATE time; strip it
-- (auth.uid()-bound, so it would just return [] for anon, but least privilege).
REVOKE EXECUTE ON FUNCTION public.get_my_institution_ids() FROM anon;

-- 1) quiz_block_responses — a learner can persist a response for any institution they belong
--    to (still bound to their own user_id, so no spoofing another user; still can't pick an
--    institution they aren't a member of). This unblocks quiz gating + certificate issuance
--    on secondary-institution courses.
DROP POLICY IF EXISTS "Users manage own quiz responses" ON public.quiz_block_responses;
CREATE POLICY "Users manage own quiz responses" ON public.quiz_block_responses
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid() AND institution_id = ANY (public.get_my_institution_ids()));

-- 2) survey_assignments SELECT — completion survey resolution on secondary courses.
DROP POLICY IF EXISTS "Users read institution survey assignments" ON public.survey_assignments;
CREATE POLICY "Users read institution survey assignments" ON public.survey_assignments
  FOR SELECT USING (institution_id = ANY (public.get_my_institution_ids()));

-- 3) programs SELECT — program cards / program certificates for secondary institutions.
DROP POLICY IF EXISTS "Read programs in institution" ON public.programs;
CREATE POLICY "Read programs in institution" ON public.programs
  FOR SELECT USING (is_admin() OR institution_id = ANY (public.get_my_institution_ids()));

-- 4) announcements SELECT — a member sees any of their institutions' live announcements
--    (the app then filters to the ACTIVE portal so only that one shows).
DROP POLICY IF EXISTS "Users read live announcements" ON public.announcements;
CREATE POLICY "Users read live announcements" ON public.announcements
  FOR SELECT USING (
    is_active AND starts_at <= now() AND (ends_at IS NULL OR ends_at > now())
    AND institution_id = ANY (public.get_my_institution_ids())
  );

-- 5) user_groups SELECT — group-restricted course visibility across a learner's institutions.
DROP POLICY IF EXISTS "Users can read own institution groups" ON public.user_groups;
CREATE POLICY "Users can read own institution groups" ON public.user_groups
  FOR SELECT USING (institution_id = ANY (public.get_my_institution_ids()));
