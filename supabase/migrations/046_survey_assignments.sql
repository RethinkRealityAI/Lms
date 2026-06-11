-- ============================================================
-- 046: Centralized survey assignments
-- Applied via Supabase MCP; this file is the version-controlled source.
--   One place to attach completion surveys to: every course
--   (institution default), specific courses, or whole programs.
--   Resolution precedence at completion time:
--     courses.completion_survey_template_id (per-course override, set in
--     course settings) → survey_assignments scope='course' →
--     survey_assignments scope='all_courses' (institution default).
--   Program surveys (scope='program') are shown once, when the learner
--   completes the FINAL course of the program; responses are stored in
--   course_feedback_responses with program_id set (one per user+program).
-- ============================================================

create table if not exists public.survey_assignments (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  survey_template_id uuid not null references public.survey_templates(id) on delete cascade,
  scope text not null check (scope in ('all_courses', 'course', 'program')),
  course_id uuid references public.courses(id) on delete cascade,
  program_id uuid references public.programs(id) on delete cascade,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint survey_assignments_scope_shape check (
    (scope = 'course' and course_id is not null and program_id is null)
    or (scope = 'program' and program_id is not null and course_id is null)
    or (scope = 'all_courses' and course_id is null and program_id is null)
  )
);

-- one default per institution, one assignment per course / per program
create unique index if not exists survey_assignments_one_default
  on public.survey_assignments (institution_id) where scope = 'all_courses';
create unique index if not exists survey_assignments_one_per_course
  on public.survey_assignments (course_id) where scope = 'course';
create unique index if not exists survey_assignments_one_per_program
  on public.survey_assignments (program_id) where scope = 'program';
create index if not exists idx_survey_assignments_institution
  on public.survey_assignments (institution_id);

alter table public.survey_assignments enable row level security;

-- students need read access to resolve their completion survey
drop policy if exists "Users read institution survey assignments" on public.survey_assignments;
create policy "Users read institution survey assignments" on public.survey_assignments
  for select using (
    institution_id = (select u.institution_id from public.users u where u.id = auth.uid())
  );

drop policy if exists "Admins manage survey assignments" on public.survey_assignments;
create policy "Admins manage survey assignments" on public.survey_assignments
  for all using (
    public.is_admin() and (
      institution_id = (select u.institution_id from public.users u where u.id = auth.uid())
      or (select u.role from public.users u where u.id = auth.uid()) = 'platform_admin'
    )
  ) with check (
    public.is_admin() and (
      institution_id = (select u.institution_id from public.users u where u.id = auth.uid())
      or (select u.role from public.users u where u.id = auth.uid()) = 'platform_admin'
    )
  );

-- ── Program survey responses live alongside course feedback ─────────────────
alter table public.course_feedback_responses
  add column if not exists program_id uuid references public.programs(id) on delete cascade;

-- one program-survey response per user per program (course rows unaffected)
create unique index if not exists course_feedback_one_per_user_program
  on public.course_feedback_responses (user_id, program_id)
  where program_id is not null;
