-- Migration 016: User groups and course assignments
-- Adds user_groups, user_group_members, course_user_assignments, course_group_assignments tables
-- Adds access_mode column to courses

-- 1. Add access_mode to courses
ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS access_mode text NOT NULL DEFAULT 'all'
  CHECK (access_mode IN ('all', 'restricted'));

-- 2. user_groups table
CREATE TABLE IF NOT EXISTS public.user_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (institution_id, name)
);

ALTER TABLE public.user_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage user_groups"
  ON public.user_groups FOR ALL
  USING (public.is_admin());

CREATE POLICY "Users can read own institution groups"
  ON public.user_groups FOR SELECT
  USING (
    institution_id IN (
      SELECT institution_id FROM public.users WHERE id = auth.uid()
    )
  );

-- 3. user_group_members table
CREATE TABLE IF NOT EXISTS public.user_group_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.user_groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  added_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (group_id, user_id)
);

ALTER TABLE public.user_group_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage user_group_members"
  ON public.user_group_members FOR ALL
  USING (public.is_admin());

CREATE POLICY "Users can read own memberships"
  ON public.user_group_members FOR SELECT
  USING (user_id = auth.uid());

-- 4. course_user_assignments table
CREATE TABLE IF NOT EXISTS public.course_user_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  assigned_by uuid REFERENCES public.users(id),
  UNIQUE (course_id, user_id)
);

ALTER TABLE public.course_user_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage course_user_assignments"
  ON public.course_user_assignments FOR ALL
  USING (public.is_admin());

CREATE POLICY "Users can read own course assignments"
  ON public.course_user_assignments FOR SELECT
  USING (user_id = auth.uid());

-- 5. course_group_assignments table
CREATE TABLE IF NOT EXISTS public.course_group_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  group_id uuid NOT NULL REFERENCES public.user_groups(id) ON DELETE CASCADE,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  assigned_by uuid REFERENCES public.users(id),
  UNIQUE (course_id, group_id)
);

ALTER TABLE public.course_group_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage course_group_assignments"
  ON public.course_group_assignments FOR ALL
  USING (public.is_admin());

CREATE POLICY "Users can read own group course assignments"
  ON public.course_group_assignments FOR SELECT
  USING (
    group_id IN (
      SELECT group_id FROM public.user_group_members WHERE user_id = auth.uid()
    )
  );

-- 6. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_group_members_user_id ON public.user_group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_user_group_members_group_id ON public.user_group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_course_user_assignments_course_id ON public.course_user_assignments(course_id);
CREATE INDEX IF NOT EXISTS idx_course_user_assignments_user_id ON public.course_user_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_course_group_assignments_course_id ON public.course_group_assignments(course_id);
CREATE INDEX IF NOT EXISTS idx_course_group_assignments_group_id ON public.course_group_assignments(group_id);
CREATE INDEX IF NOT EXISTS idx_courses_access_mode ON public.courses(access_mode);
