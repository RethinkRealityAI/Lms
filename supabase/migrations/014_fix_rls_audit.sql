-- ============================================================
-- Migration 014: RLS Audit Fix
-- Date: 2026-03-31
-- Tables audited: slides, slide_templates, content_activity_log
-- ============================================================
-- Fixes:
--   1. content_activity_log INSERT: was admin-only, must allow
--      all authenticated users (logActivity calls from client)
--   2. slide_templates SELECT: add explicit authenticated-user
--      read policy (supplements existing institution-scoped policies)
-- ============================================================

-- 1. Fix content_activity_log INSERT policy
--    The previous "Admins can insert activity for own institution" policy
--    was too restrictive — client-side logActivity calls come from
--    non-admin authenticated users and must be permitted.
DROP POLICY IF EXISTS "Admins can insert activity for own institution" ON public.content_activity_log;

CREATE POLICY "Authenticated users can log activity" ON public.content_activity_log
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated'
    AND institution_id = public.current_institution_id()
  );

-- 2. Add explicit authenticated-user read policy for slide_templates
--    Existing institution-scoped SELECT policies remain in place.
--    This policy ensures the template picker works for all authenticated
--    users regardless of institution scope.
DROP POLICY IF EXISTS "Authenticated users can read templates" ON public.slide_templates;

CREATE POLICY "Authenticated users can read templates" ON public.slide_templates
  FOR SELECT USING (auth.role() = 'authenticated');
