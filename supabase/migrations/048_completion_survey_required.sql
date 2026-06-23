-- 048_completion_survey_required
-- Adds a per-course toggle for whether the resolved end-of-course completion
-- survey must be submitted before the course counts as complete and its
-- certificate is issued. Default ON. Grandfathering is handled in application
-- logic — an already-issued certificate is never revoked or re-gated, so
-- learners who finished before this change are unaffected.
-- Applied to production via Supabase MCP on 2026-06-19.
--
-- Companion data changes applied the same day (data, not schema):
--   * Created GANSID default "Course Feedback" survey_template + an
--     all_courses survey_assignment (SCAGO already had its "Module Survey"
--     assigned at all_courses scope).
--   * Deleted 6 redundant in-lesson SCAGO "Module Survey" feedback blocks
--     (now served by the assigned completion survey). Pedagogical in-lesson
--     activities (Reflection / Check Your Growth / etc.) were left intact.

ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS completion_survey_required boolean NOT NULL DEFAULT true;
