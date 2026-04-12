-- Migration 025: Fix RLS for platform_admin cross-tenant access
-- The slides admin policy used current_institution_id() which returns the user's
-- own institution_id, blocking platform_admin from accessing other tenants' slides.

-- Fix slides: allow platform_admin unrestricted access
DROP POLICY IF EXISTS "Admins can manage slides for their institution" ON public.slides;

CREATE POLICY "Admins can manage slides for their institution" ON public.slides
FOR ALL USING (
  is_admin() AND (
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'platform_admin'
    OR
    EXISTS (
      SELECT 1 FROM lessons l JOIN courses c ON c.id = l.course_id
      WHERE l.id = slides.lesson_id AND c.institution_id = current_institution_id()
    )
  )
);

-- Fix slide_templates
DROP POLICY IF EXISTS "Admins can manage own institution templates" ON public.slide_templates;
DROP POLICY IF EXISTS "Users can view own institution templates" ON public.slide_templates;

CREATE POLICY "Admins can manage slide templates" ON public.slide_templates
FOR ALL USING (
  is_admin() AND (
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'platform_admin'
    OR institution_id = current_institution_id()
  )
);

CREATE POLICY "Users can view slide templates" ON public.slide_templates
FOR SELECT USING (
  (SELECT role FROM public.users WHERE id = auth.uid()) = 'platform_admin'
  OR institution_id = current_institution_id()
);

-- Fix content_activity_log
DROP POLICY IF EXISTS "Admins can view own institution activity" ON public.content_activity_log;
DROP POLICY IF EXISTS "Authenticated users can log activity" ON public.content_activity_log;

CREATE POLICY "Admins can view activity" ON public.content_activity_log
FOR SELECT USING (
  is_admin() AND (
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'platform_admin'
    OR institution_id = current_institution_id()
  )
);

CREATE POLICY "Authenticated users can log activity" ON public.content_activity_log
FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL AND (
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'platform_admin'
    OR institution_id = current_institution_id()
  )
);
