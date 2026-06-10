-- ============================================================
-- 039: Assignment due dates, sequential programs, inline-quiz response
--      capture, and activity-log hygiene
-- Applied via Supabase MCP; this file is the version-controlled source.
--   1. due_date on course_user_assignments / course_group_assignments
--   2. programs.sequential — courses must be completed in order
--   3. quiz_block_responses — persists inline quiz_inline answers per user
--   4. content_activity_log: one-time prune + prune_content_activity_log()
--      admin RPC (no pg_cron on this instance)
-- ============================================================

-- ── 1. Assignment due dates ──────────────────────────────────────────────────
alter table public.course_user_assignments add column if not exists due_date timestamptz;
alter table public.course_group_assignments add column if not exists due_date timestamptz;

-- ── 2. Sequential programs ───────────────────────────────────────────────────
alter table public.programs add column if not exists sequential boolean not null default false;

-- ── 3. Inline quiz responses ─────────────────────────────────────────────────
create table if not exists public.quiz_block_responses (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid references public.institutions(id) on delete cascade,
  course_id uuid references public.courses(id) on delete cascade,
  lesson_id uuid references public.lessons(id) on delete cascade,
  block_id uuid not null references public.lesson_blocks(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  response jsonb not null default '{}'::jsonb,
  is_correct boolean,
  attempt_count integer not null default 1,
  answered_at timestamptz not null default now(),
  unique (block_id, user_id)
);

create index if not exists idx_quiz_block_responses_course on public.quiz_block_responses(course_id);
create index if not exists idx_quiz_block_responses_user on public.quiz_block_responses(user_id);
create index if not exists idx_quiz_block_responses_institution on public.quiz_block_responses(institution_id);

alter table public.quiz_block_responses enable row level security;

drop policy if exists "Users manage own quiz responses" on public.quiz_block_responses;
create policy "Users manage own quiz responses" on public.quiz_block_responses
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "Admins read institution quiz responses" on public.quiz_block_responses;
create policy "Admins read institution quiz responses" on public.quiz_block_responses
  for select using (
    public.is_admin() and (
      institution_id = (select u.institution_id from public.users u where u.id = auth.uid())
      or (select u.role from public.users u where u.id = auth.uid()) = 'platform_admin'
    )
  );

-- ── 4. Activity log hygiene ──────────────────────────────────────────────────
-- One-time prune: keep the last 30 days (auto-save flooding left ~190k rows)
delete from public.content_activity_log where created_at < now() - interval '30 days';

create or replace function public.prune_content_activity_log(p_keep_days integer default 90)
returns integer language plpgsql security definer set search_path = public as $$
declare
  v_deleted int;
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  delete from public.content_activity_log where created_at < now() - make_interval(days => greatest(p_keep_days, 7));
  get diagnostics v_deleted = row_count;
  return v_deleted;
end; $$;
revoke execute on function public.prune_content_activity_log(integer) from public, anon;
grant execute on function public.prune_content_activity_log(integer) to authenticated;
