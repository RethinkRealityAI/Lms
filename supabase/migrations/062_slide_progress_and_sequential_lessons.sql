-- Migration 062: per-slide progress + per-course sequential lessons
-- The viewer only tracked whole-lesson completion (progress table), so the progress bar
-- sat at 0% until a lesson finished and there was no way to show which slides a learner had
-- seen. slide_progress records each slide a learner has viewed (one row per user+slide),
-- powering the smooth progress bar, the sidebar per-slide checkmarks, and jump-to-slide.
--
-- courses.sequential_lessons (default true) gates lessons: a learner can't open lesson N
-- until lesson N-1 is complete. Per-course so non-linear/reference courses can opt out.

CREATE TABLE IF NOT EXISTS public.slide_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  slide_id uuid NOT NULL REFERENCES public.slides(id) ON DELETE CASCADE,
  course_id uuid REFERENCES public.courses(id) ON DELETE CASCADE,
  lesson_id uuid REFERENCES public.lessons(id) ON DELETE SET NULL,
  institution_id uuid REFERENCES public.institutions(id) ON DELETE CASCADE,
  viewed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, slide_id)
);
CREATE INDEX IF NOT EXISTS idx_slide_progress_user_course ON public.slide_progress (user_id, course_id);

ALTER TABLE public.slide_progress ENABLE ROW LEVEL SECURITY;

-- Learners manage their own rows; the institution binding (dual access, migration 056) stops
-- a learner from tagging a row to an institution they don't belong to.
DROP POLICY IF EXISTS "Users manage own slide progress" ON public.slide_progress;
CREATE POLICY "Users manage own slide progress" ON public.slide_progress
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (
    user_id = auth.uid()
    AND (institution_id IS NULL OR institution_id = ANY (public.get_my_institution_ids()))
  );

-- Admins read (for future analytics). Unscoped is_admin() mirrors the existing progress /
-- quiz_block_responses admin-read policies; institution scoping stays app-level.
DROP POLICY IF EXISTS "Admins read slide progress" ON public.slide_progress;
CREATE POLICY "Admins read slide progress" ON public.slide_progress
  FOR SELECT USING (public.is_admin());

-- Per-course sequential-lesson gating (default ON so it's enforced immediately; admins can
-- turn it off per course for non-linear content).
ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS sequential_lessons boolean NOT NULL DEFAULT true;
