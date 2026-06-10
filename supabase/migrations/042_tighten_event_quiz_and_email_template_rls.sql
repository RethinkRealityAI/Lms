-- ============================================================
-- 042: RLS tightening (security-review follow-up to 037/039/041)
-- Applied via Supabase MCP; this file is the version-controlled source.
--   1. analytics_events "Users log own sign-in": institution_id must be the
--      caller's own institution (was: any UUID — cross-tenant feed pollution)
--   2. quiz_block_responses: institution_id bound to caller's institution +
--      sane attempt_count range
--   3. email_templates: admin policy institution-scoped (platform_admin exempt)
-- ============================================================

-- ── 1. Sign-in events bound to the caller's institution ─────────────────────
drop policy if exists "Users log own sign-in" on public.analytics_events;
create policy "Users log own sign-in" on public.analytics_events
  for insert with check (
    user_id = auth.uid()
    and event_type = 'sign_in'
    and institution_id = (select u.institution_id from public.users u where u.id = auth.uid())
  );

-- ── 2. Quiz responses bound to the caller's institution ─────────────────────
drop policy if exists "Users manage own quiz responses" on public.quiz_block_responses;
create policy "Users manage own quiz responses" on public.quiz_block_responses
  for all using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and institution_id = (select u.institution_id from public.users u where u.id = auth.uid())
  );

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'quiz_block_responses_attempt_count_range'
      and conrelid = 'public.quiz_block_responses'::regclass
  ) then
    alter table public.quiz_block_responses
      add constraint quiz_block_responses_attempt_count_range
      check (attempt_count >= 1 and attempt_count <= 100000);
  end if;
end $$;

-- ── 3. Email templates: institution-scoped admin management ─────────────────
drop policy if exists "Admins can manage email templates" on public.email_templates;
create policy "Admins can manage email templates" on public.email_templates
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
