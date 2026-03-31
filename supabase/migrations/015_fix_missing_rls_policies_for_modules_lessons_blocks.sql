-- ============================================================
-- Migration 015: Fix missing RLS policies for modules,
-- lessons (broken INSERT policy), and lesson_blocks
-- ============================================================

-- 1. MODULES — add missing INSERT / UPDATE / DELETE policies
--    (only SELECT "Anyone can read modules" existed before)
CREATE POLICY "Admins can insert modules"
  ON public.modules FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update modules"
  ON public.modules FOR UPDATE
  USING (public.is_admin());

CREATE POLICY "Admins can delete modules"
  ON public.modules FOR DELETE
  USING (public.is_admin());

-- 2. LESSONS — fix broken INSERT policy
--    (was using inline EXISTS FROM users → infinite recursion; use is_admin() instead)
DROP POLICY IF EXISTS "Admins can create lessons" ON public.lessons;

CREATE POLICY "Admins can create lessons"
  ON public.lessons FOR INSERT
  WITH CHECK (public.is_admin());

-- 3. LESSON_BLOCKS — add missing INSERT / UPDATE / DELETE policies
--    (only SELECT "Anyone can read lesson_blocks" existed before)
CREATE POLICY "Admins can insert lesson_blocks"
  ON public.lesson_blocks FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update lesson_blocks"
  ON public.lesson_blocks FOR UPDATE
  USING (public.is_admin());

CREATE POLICY "Admins can delete lesson_blocks"
  ON public.lesson_blocks FOR DELETE
  USING (public.is_admin());
