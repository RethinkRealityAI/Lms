-- ============================================================
-- 044: Legacy CME auto-request + welcome-back acknowledgment
-- Applied via Supabase MCP; this file is the version-controlled source.
--   1. materialize_legacy_completions v2: when the legacy user completed
--      the EdApp "Module 14" CME-request pseudo-course, auto-file a PENDING
--      cme_certificate_requests row (backdated, source-tagged) so admins can
--      confirm + issue from the existing CME queue.
--   2. legacy_users.welcome_acknowledged_at + acknowledge_legacy_welcome()
--      — powers the one-time "Welcome back" banner for claimed EdApp users.
-- ============================================================

alter table public.legacy_users add column if not exists welcome_acknowledged_at timestamptz;

-- ── 1. Materialize v2 (adds CME auto-request after the course loop) ─────────
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
  v_cme record;
  v_cme_created boolean := false;
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
        if rec.progress_percent <= 0 and coalesce(rec.time_spent_minutes, 0) <= 0 then
          continue;
        end if;
        v_target := 0;
      end if;
    end if;

    if not exists (
      select 1 from public.course_enrollments
      where user_id = p_user_id and course_id = rec.course_id
    ) then
      insert into public.course_enrollments (user_id, course_id)
      values (p_user_id, rec.course_id);
    end if;

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

  -- EdApp "Module 14" = the CME-request module. Completing it means the
  -- learner requested their CME certificate on the old platform — file a
  -- pending, source-tagged request so admins can confirm + issue.
  select lcc.completed_at, lcc.institution_id into v_cme
  from public.legacy_course_completions lcc
  where lcc.legacy_user_id = p_legacy_user_id
    and lcc.course_id is null
    and lcc.course_title ilike '%module 14%'
    and (lcc.completed_at is not null or lcc.progress_percent >= 100)
  limit 1;

  if found then
    if not exists (
      select 1 from public.cme_certificate_requests
      where user_id = p_user_id and status in ('pending', 'issued')
    ) then
      insert into public.cme_certificate_requests
        (institution_id, user_id, program_label, status, requested_at, notes)
      values (
        v_cme.institution_id,
        p_user_id,
        'EdApp import',
        'pending',
        coalesce(v_cme.completed_at, now()),
        'Imported from EdApp — learner completed the CME request module on '
          || to_char(coalesce(v_cme.completed_at, now()), 'DD Mon YYYY')
          || '. Confirm whether the certificate was already delivered, then mark issued.'
      );
      v_cme_created := true;
    end if;
  end if;

  return jsonb_build_object(
    'courses_completed', v_completed_courses,
    'courses_partial', v_partial_courses,
    'certificates_issued', v_certs,
    'cme_request_created', v_cme_created
  );
end;
$function$;

revoke execute on function public.materialize_legacy_completions(uuid, uuid) from public, anon, authenticated;

-- ── 2. Welcome-back acknowledgment (one-time banner dismissal) ───────────────
create or replace function public.acknowledge_legacy_welcome()
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.legacy_users
  set welcome_acknowledged_at = now()
  where linked_user_id = auth.uid() and welcome_acknowledged_at is null;
end;
$$;
revoke execute on function public.acknowledge_legacy_welcome() from public, anon;
grant execute on function public.acknowledge_legacy_welcome() to authenticated;
