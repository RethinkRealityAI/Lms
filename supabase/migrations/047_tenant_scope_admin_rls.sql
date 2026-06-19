-- 047_tenant_scope_admin_rls
-- Close cross-tenant admin access: institution_admins are bound to their own
-- institution; platform_admin keeps full cross-tenant access. Extends the
-- already-scoped idiom used by announcements/email_templates/programs.
-- Applied to production via Supabase MCP on 2026-06-19.
--
-- Predicate (tables with institution_id):
--   is_admin() AND (institution_id = caller_institution OR caller_is_platform_admin)
-- Child tables (no institution_id) scope through their parent (courses / user_groups).

-- ============ Tables WITH institution_id column (direct scoping) ============

-- modules
DROP POLICY IF EXISTS "Admins can insert modules" ON public.modules;
CREATE POLICY "Admins can insert modules" ON public.modules FOR INSERT
  WITH CHECK (is_admin() AND (institution_id = (SELECT u.institution_id FROM public.users u WHERE u.id = auth.uid())
    OR (SELECT u.role FROM public.users u WHERE u.id = auth.uid()) = 'platform_admin'));
DROP POLICY IF EXISTS "Admins can update modules" ON public.modules;
CREATE POLICY "Admins can update modules" ON public.modules FOR UPDATE
  USING (is_admin() AND (institution_id = (SELECT u.institution_id FROM public.users u WHERE u.id = auth.uid())
    OR (SELECT u.role FROM public.users u WHERE u.id = auth.uid()) = 'platform_admin'))
  WITH CHECK (is_admin() AND (institution_id = (SELECT u.institution_id FROM public.users u WHERE u.id = auth.uid())
    OR (SELECT u.role FROM public.users u WHERE u.id = auth.uid()) = 'platform_admin'));
DROP POLICY IF EXISTS "Admins can delete modules" ON public.modules;
CREATE POLICY "Admins can delete modules" ON public.modules FOR DELETE
  USING (is_admin() AND (institution_id = (SELECT u.institution_id FROM public.users u WHERE u.id = auth.uid())
    OR (SELECT u.role FROM public.users u WHERE u.id = auth.uid()) = 'platform_admin'));

-- lessons
DROP POLICY IF EXISTS "Admins can create lessons" ON public.lessons;
CREATE POLICY "Admins can create lessons" ON public.lessons FOR INSERT
  WITH CHECK (is_admin() AND (institution_id = (SELECT u.institution_id FROM public.users u WHERE u.id = auth.uid())
    OR (SELECT u.role FROM public.users u WHERE u.id = auth.uid()) = 'platform_admin'));
DROP POLICY IF EXISTS "Admins can update lessons" ON public.lessons;
CREATE POLICY "Admins can update lessons" ON public.lessons FOR UPDATE
  USING (is_admin() AND (institution_id = (SELECT u.institution_id FROM public.users u WHERE u.id = auth.uid())
    OR (SELECT u.role FROM public.users u WHERE u.id = auth.uid()) = 'platform_admin'))
  WITH CHECK (is_admin() AND (institution_id = (SELECT u.institution_id FROM public.users u WHERE u.id = auth.uid())
    OR (SELECT u.role FROM public.users u WHERE u.id = auth.uid()) = 'platform_admin'));
DROP POLICY IF EXISTS "Admins can delete lessons" ON public.lessons;
CREATE POLICY "Admins can delete lessons" ON public.lessons FOR DELETE
  USING (is_admin() AND (institution_id = (SELECT u.institution_id FROM public.users u WHERE u.id = auth.uid())
    OR (SELECT u.role FROM public.users u WHERE u.id = auth.uid()) = 'platform_admin'));

-- lesson_blocks
DROP POLICY IF EXISTS "Admins can insert lesson_blocks" ON public.lesson_blocks;
CREATE POLICY "Admins can insert lesson_blocks" ON public.lesson_blocks FOR INSERT
  WITH CHECK (is_admin() AND (institution_id = (SELECT u.institution_id FROM public.users u WHERE u.id = auth.uid())
    OR (SELECT u.role FROM public.users u WHERE u.id = auth.uid()) = 'platform_admin'));
DROP POLICY IF EXISTS "Admins can update lesson_blocks" ON public.lesson_blocks;
CREATE POLICY "Admins can update lesson_blocks" ON public.lesson_blocks FOR UPDATE
  USING (is_admin() AND (institution_id = (SELECT u.institution_id FROM public.users u WHERE u.id = auth.uid())
    OR (SELECT u.role FROM public.users u WHERE u.id = auth.uid()) = 'platform_admin'))
  WITH CHECK (is_admin() AND (institution_id = (SELECT u.institution_id FROM public.users u WHERE u.id = auth.uid())
    OR (SELECT u.role FROM public.users u WHERE u.id = auth.uid()) = 'platform_admin'));
DROP POLICY IF EXISTS "Admins can delete lesson_blocks" ON public.lesson_blocks;
CREATE POLICY "Admins can delete lesson_blocks" ON public.lesson_blocks FOR DELETE
  USING (is_admin() AND (institution_id = (SELECT u.institution_id FROM public.users u WHERE u.id = auth.uid())
    OR (SELECT u.role FROM public.users u WHERE u.id = auth.uid()) = 'platform_admin'));

-- user_groups
DROP POLICY IF EXISTS "Admins can manage user_groups" ON public.user_groups;
CREATE POLICY "Admins can manage user_groups" ON public.user_groups FOR ALL
  USING (is_admin() AND (institution_id = (SELECT u.institution_id FROM public.users u WHERE u.id = auth.uid())
    OR (SELECT u.role FROM public.users u WHERE u.id = auth.uid()) = 'platform_admin'))
  WITH CHECK (is_admin() AND (institution_id = (SELECT u.institution_id FROM public.users u WHERE u.id = auth.uid())
    OR (SELECT u.role FROM public.users u WHERE u.id = auth.uid()) = 'platform_admin'));

-- certificate_templates
DROP POLICY IF EXISTS "Admins can manage certificate templates" ON public.certificate_templates;
CREATE POLICY "Admins can manage certificate templates" ON public.certificate_templates FOR ALL
  USING (is_admin() AND (institution_id = (SELECT u.institution_id FROM public.users u WHERE u.id = auth.uid())
    OR (SELECT u.role FROM public.users u WHERE u.id = auth.uid()) = 'platform_admin'))
  WITH CHECK (is_admin() AND (institution_id = (SELECT u.institution_id FROM public.users u WHERE u.id = auth.uid())
    OR (SELECT u.role FROM public.users u WHERE u.id = auth.uid()) = 'platform_admin'));

-- certificates (manage + read-all)
DROP POLICY IF EXISTS "Admins can manage certificates" ON public.certificates;
CREATE POLICY "Admins can manage certificates" ON public.certificates FOR ALL
  USING (is_admin() AND (institution_id = (SELECT u.institution_id FROM public.users u WHERE u.id = auth.uid())
    OR (SELECT u.role FROM public.users u WHERE u.id = auth.uid()) = 'platform_admin'))
  WITH CHECK (is_admin() AND (institution_id = (SELECT u.institution_id FROM public.users u WHERE u.id = auth.uid())
    OR (SELECT u.role FROM public.users u WHERE u.id = auth.uid()) = 'platform_admin'));
DROP POLICY IF EXISTS "Admins can read all certificates" ON public.certificates;
CREATE POLICY "Admins can read all certificates" ON public.certificates FOR SELECT
  USING (is_admin() AND (institution_id = (SELECT u.institution_id FROM public.users u WHERE u.id = auth.uid())
    OR (SELECT u.role FROM public.users u WHERE u.id = auth.uid()) = 'platform_admin'));

-- ============ Child tables WITHOUT institution_id (scope via parent) ============

-- user_group_members -> user_groups.institution_id
DROP POLICY IF EXISTS "Admins can manage user_group_members" ON public.user_group_members;
CREATE POLICY "Admins can manage user_group_members" ON public.user_group_members FOR ALL
  USING (is_admin() AND ((SELECT u.role FROM public.users u WHERE u.id = auth.uid()) = 'platform_admin'
    OR EXISTS (SELECT 1 FROM public.user_groups g WHERE g.id = user_group_members.group_id
      AND g.institution_id = (SELECT u.institution_id FROM public.users u WHERE u.id = auth.uid()))))
  WITH CHECK (is_admin() AND ((SELECT u.role FROM public.users u WHERE u.id = auth.uid()) = 'platform_admin'
    OR EXISTS (SELECT 1 FROM public.user_groups g WHERE g.id = user_group_members.group_id
      AND g.institution_id = (SELECT u.institution_id FROM public.users u WHERE u.id = auth.uid()))));

-- course_user_assignments -> courses.institution_id
DROP POLICY IF EXISTS "Admins can manage course_user_assignments" ON public.course_user_assignments;
CREATE POLICY "Admins can manage course_user_assignments" ON public.course_user_assignments FOR ALL
  USING (is_admin() AND ((SELECT u.role FROM public.users u WHERE u.id = auth.uid()) = 'platform_admin'
    OR EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_user_assignments.course_id
      AND c.institution_id = (SELECT u.institution_id FROM public.users u WHERE u.id = auth.uid()))))
  WITH CHECK (is_admin() AND ((SELECT u.role FROM public.users u WHERE u.id = auth.uid()) = 'platform_admin'
    OR EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_user_assignments.course_id
      AND c.institution_id = (SELECT u.institution_id FROM public.users u WHERE u.id = auth.uid()))));

-- course_group_assignments -> courses.institution_id
DROP POLICY IF EXISTS "Admins can manage course_group_assignments" ON public.course_group_assignments;
CREATE POLICY "Admins can manage course_group_assignments" ON public.course_group_assignments FOR ALL
  USING (is_admin() AND ((SELECT u.role FROM public.users u WHERE u.id = auth.uid()) = 'platform_admin'
    OR EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_group_assignments.course_id
      AND c.institution_id = (SELECT u.institution_id FROM public.users u WHERE u.id = auth.uid()))))
  WITH CHECK (is_admin() AND ((SELECT u.role FROM public.users u WHERE u.id = auth.uid()) = 'platform_admin'
    OR EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_group_assignments.course_id
      AND c.institution_id = (SELECT u.institution_id FROM public.users u WHERE u.id = auth.uid()))));

-- course_certificate_templates -> courses.institution_id
DROP POLICY IF EXISTS "Admins can manage course certificate templates" ON public.course_certificate_templates;
CREATE POLICY "Admins can manage course certificate templates" ON public.course_certificate_templates FOR ALL
  USING (is_admin() AND ((SELECT u.role FROM public.users u WHERE u.id = auth.uid()) = 'platform_admin'
    OR EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_certificate_templates.course_id
      AND c.institution_id = (SELECT u.institution_id FROM public.users u WHERE u.id = auth.uid()))))
  WITH CHECK (is_admin() AND ((SELECT u.role FROM public.users u WHERE u.id = auth.uid()) = 'platform_admin'
    OR EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_certificate_templates.course_id
      AND c.institution_id = (SELECT u.institution_id FROM public.users u WHERE u.id = auth.uid()))));
