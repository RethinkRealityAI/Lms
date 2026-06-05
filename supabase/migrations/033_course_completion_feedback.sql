-- Migration 033: Course completion feedback
-- A course can attach a survey_template that is shown (optional, prompted) on the
-- completion slide. Learner answers are stored in course_feedback_responses.

alter table public.courses
  add column if not exists completion_survey_template_id uuid
  references public.survey_templates(id) on delete set null;

create table if not exists public.course_feedback_responses (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  template_id uuid references public.survey_templates(id) on delete set null,
  answers jsonb not null default '{}'::jsonb,
  submitted_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (course_id, user_id)
);

create index if not exists idx_course_feedback_course on public.course_feedback_responses(course_id);

alter table public.course_feedback_responses enable row level security;

-- Learners read/write only their own response; admins can read institution responses.
drop policy if exists "Users manage own course feedback" on public.course_feedback_responses;
create policy "Users manage own course feedback" on public.course_feedback_responses
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "Admins read course feedback" on public.course_feedback_responses;
create policy "Admins read course feedback" on public.course_feedback_responses
  for select using (public.is_admin());
