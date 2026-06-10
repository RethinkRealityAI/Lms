-- ============================================================
-- 043: Legacy course completions — import + claim-time materialization
-- Applied via Supabase MCP; this file is the version-controlled source.
--   1. legacy_course_completions: per legacy-user per-course EdApp export
--      rows (completion date, progress %, time spent), course-mapped where
--      possible (course_id null = unmapped, e.g. EdApp "Module 14" CME row)
--   2. materialize_legacy_completions(): turns stored rows into real
--      progress + enrollments + (backdated) certificates for a claimed user.
--      Completed courses → all lessons complete + certificate (program certs
--      cascade via the 028/037 trigger). Partial courses → first
--      round(progress% × lessons) lessons complete. Idempotent; never
--      downgrades existing progress.
--   3. claim_legacy_profile() + admin_link_legacy_profile() now call it —
--      every claim path resumes the learner where they left off.
--   4. admin_backfill_legacy_completions(): re-runs materialization for
--      ALREADY-linked legacy users (for data imported after they claimed).
-- ============================================================

-- ── 1. Table ─────────────────────────────────────────────────────────────────
create table if not exists public.legacy_course_completions (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  legacy_user_id uuid not null references public.legacy_users(id) on delete cascade,
  external_user_id text,
  email text,
  external_course_id text not null,
  course_title text not null,
  course_id uuid references public.courses(id) on delete set null,
  completed_at timestamptz,
  progress_percent numeric not null default 0,
  lessons_completed integer,
  lessons_total integer,
  time_spent_minutes numeric,
  created_at timestamptz not null default now(),
  unique (legacy_user_id, external_course_id)
);

create index if not exists idx_legacy_completions_legacy_user on public.legacy_course_completions(legacy_user_id);
create index if not exists idx_legacy_completions_course on public.legacy_course_completions(course_id);
create index if not exists idx_legacy_completions_institution on public.legacy_course_completions(institution_id);

alter table public.legacy_course_completions enable row level security;

drop policy if exists "Admins read legacy completions" on public.legacy_course_completions;
create policy "Admins read legacy completions" on public.legacy_course_completions
  for select using (
    public.is_admin() and (
      institution_id = (select u.institution_id from public.users u where u.id = auth.uid())
      or (select u.role from public.users u where u.id = auth.uid()) = 'platform_admin'
    )
  );
-- writes happen via the service-role import script only (no client policy)

-- ── 2. Materialization ───────────────────────────────────────────────────────
create or replace function public.materialize_legacy_completions(
  p_user_id uuid, p_legacy_user_id uuid
) returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  rec record;
  v_total int;
  v_target int;
  v_completed_courses int := 0;
  v_partial_courses int := 0;
  v_certs int := 0;
  v_is_complete boolean;
  v_done_at timestamptz;
  v_template uuid;
  v_inserted uuid;
begin
  for rec in
    select lcc.*, c.institution_id as course_institution
    from public.legacy_course_completions lcc
    join public.courses c on c.id = lcc.course_id and c.deleted_at is null
    where lcc.legacy_user_id = p_legacy_user_id
      and lcc.course_id is not null
  loop
    v_is_complete := rec.completed_at is not null or rec.progress_percent >= 100;
    v_done_at := coalesce(rec.completed_at, now());

    select count(*) into v_total
      from public.lessons l where l.course_id = rec.course_id and l.deleted_at is null;
    if v_total = 0 then continue; end if;

    if v_is_complete then
      v_target := v_total;
    else
      v_target := floor(rec.progress_percent / 100.0 * v_total);
      if v_target <= 0 then
        -- still enroll learners with any recorded time so the course shows up
        if rec.progress_percent <= 0 and coalesce(rec.time_spent_minutes, 0) <= 0 then
          continue;
        end if;
        v_target := 0;
      end if;
    end if;

    -- enrollment
    if not exists (
      select 1 from public.course_enrollments
      where user_id = p_user_id and course_id = rec.course_id
    ) then
      insert into public.course_enrollments (user_id, course_id)
      values (p_user_id, rec.course_id);
    end if;

    -- progress: first v_target lessons in order; upgrade-only (never
    -- downgrades a lesson the user already completed natively)
    if v_target > 0 then
      insert into public.progress (user_id, lesson_id, completed, completed_at)
      select p_user_id, l.id, true, v_done_at
      from public.lessons l
      where l.course_id = rec.course_id and l.deleted_at is null
      order by l.order_index asc
      limit v_target
      on conflict (user_id, lesson_id) do update
        set completed = true,
            completed_at = coalesce(public.progress.completed_at, excluded.completed_at)
        where public.progress.completed = false;
    end if;

    if v_is_complete then
      v_completed_courses := v_completed_courses + 1;

      -- certificate (backdated to the EdApp completion date); program
      -- certificates cascade via trg_award_program_certificates
      if not exists (
        select 1 from public.certificates
        where user_id = p_user_id and course_id = rec.course_id
      ) then
        v_template := coalesce(
          (select template_id from public.course_certificate_templates
             where course_id = rec.course_id limit 1),
          (select id from public.certificate_templates
             where institution_id = rec.course_institution and is_default = true limit 1)
        );
        insert into public.certificates (user_id, course_id, institution_id, template_id, issued_at)
        values (p_user_id, rec.course_id, rec.course_institution, v_template, v_done_at)
        on conflict (user_id, course_id) do nothing
        returning id into v_inserted;
        if v_inserted is not null then v_certs := v_certs + 1; end if;
      end if;
    elsif v_target > 0 then
      v_partial_courses := v_partial_courses + 1;
    end if;
  end loop;

  return jsonb_build_object(
    'courses_completed', v_completed_courses,
    'courses_partial', v_partial_courses,
    'certificates_issued', v_certs
  );
end;
$function$;

-- internal: called by claim paths + backfill only, never by clients
revoke execute on function public.materialize_legacy_completions(uuid, uuid) from public, anon, authenticated;

-- ── 3a. claim_legacy_profile: link + materialize (extends 035 body) ─────────
create or replace function public.claim_legacy_profile(p_user_id uuid, p_email text)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_legacy legacy_users%rowtype;
begin
  select * into v_legacy from public.legacy_users
  where lower(email) = lower(p_email) and linked_user_id is null limit 1;
  if not found then return; end if;

  update public.users set
    occupation     = coalesce(v_legacy.occupation, occupation),
    affiliation    = coalesce(v_legacy.affiliation, affiliation),
    country        = coalesce(country, v_legacy.country),
    institution_id = coalesce(institution_id, v_legacy.institution_id),
    updated_at     = now()
  where id = p_user_id;

  update public.legacy_users set linked_user_id = p_user_id, accepted_at = now()
  where id = v_legacy.id;
  update public.user_group_members set user_id = p_user_id, legacy_user_id = null
  where legacy_user_id = v_legacy.id;
  update public.user_invitations set status = 'accepted', accepted_at = now()
  where legacy_user_id = v_legacy.id and status = 'pending';

  -- resume where they left off: progress, enrollments, certificates
  perform public.materialize_legacy_completions(p_user_id, v_legacy.id);
end;
$$;
revoke execute on function public.claim_legacy_profile(uuid, text) from public, anon, authenticated;

-- ── 3b. admin_link_legacy_profile: link + materialize (extends 034 body) ────
create or replace function public.admin_link_legacy_profile(p_legacy_user_id uuid, p_user_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_legacy legacy_users%rowtype;
  v_user_inst uuid;
  v_result jsonb;
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;

  select * into v_legacy from public.legacy_users where id = p_legacy_user_id;
  if not found then raise exception 'legacy_not_found'; end if;
  if v_legacy.linked_user_id is not null then raise exception 'already_linked'; end if;

  select institution_id into v_user_inst from public.users where id = p_user_id;
  if v_user_inst is null then raise exception 'user_not_found'; end if;
  if v_user_inst <> v_legacy.institution_id then raise exception 'institution_mismatch'; end if;

  update public.users set
    occupation  = coalesce(occupation, v_legacy.occupation),
    affiliation = coalesce(affiliation, v_legacy.affiliation),
    country     = coalesce(country, v_legacy.country),
    updated_at  = now()
  where id = p_user_id;

  update public.legacy_users set linked_user_id = p_user_id, accepted_at = now()
  where id = p_legacy_user_id;

  update public.user_group_members set user_id = p_user_id, legacy_user_id = null
  where legacy_user_id = p_legacy_user_id;

  update public.user_invitations set status = 'accepted', accepted_at = now()
  where legacy_user_id = p_legacy_user_id and status = 'pending';

  v_result := public.materialize_legacy_completions(p_user_id, p_legacy_user_id);

  return jsonb_build_object('linked', true) || coalesce(v_result, '{}'::jsonb);
end;
$$;
revoke execute on function public.admin_link_legacy_profile(uuid, uuid) from public, anon;
grant execute on function public.admin_link_legacy_profile(uuid, uuid) to authenticated;

-- ── 4. Backfill for legacy users who claimed BEFORE the import ──────────────
create or replace function public.admin_backfill_legacy_completions()
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_caller_role text := (select role from public.users where id = auth.uid());
  v_caller_inst uuid := (select institution_id from public.users where id = auth.uid());
  rec record;
  v_users int := 0;
  v_certs int := 0;
  v_result jsonb;
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;

  for rec in
    select distinct lu.id as legacy_id, lu.linked_user_id
    from public.legacy_users lu
    join public.legacy_course_completions lcc on lcc.legacy_user_id = lu.id
    where lu.linked_user_id is not null
      and (v_caller_role = 'platform_admin' or lu.institution_id = v_caller_inst)
  loop
    v_result := public.materialize_legacy_completions(rec.linked_user_id, rec.legacy_id);
    v_users := v_users + 1;
    v_certs := v_certs + coalesce((v_result->>'certificates_issued')::int, 0);
  end loop;

  return jsonb_build_object('users_processed', v_users, 'certificates_issued', v_certs);
end;
$$;
revoke execute on function public.admin_backfill_legacy_completions() from public, anon;
grant execute on function public.admin_backfill_legacy_completions() to authenticated;
