-- ============================================================
-- 037: Analytics events + certificate revocation status
-- Applied via Supabase MCP; this file is the version-controlled source.
--   1. Bring the dormant analytics_events table to life: RLS policies,
--      indexes, and SECURITY DEFINER trigger capture for lesson completion,
--      enrollment, certificate issue/revoke, and user role/active changes.
--      Sign-in events are inserted app-side (login + auth callback).
--   2. Certificates: revoked_at/revoked_by/revoke_reason columns —
--      revocation becomes a status change, not a DELETE.
--   3. issue_course_certificate v2: un-revokes (re-issues) when a revoked
--      cert exists and the course is complete again.
--   4. award_program_certificates v3 + backfill v2: ignore revoked certs;
--      trigger also fires on certificate restore (UPDATE).
--   5. Analytics views switched to security_invoker (advisor ERROR fix).
-- ============================================================

-- ── 2. Certificate revocation status ─────────────────────────────────────────
alter table public.certificates
  add column if not exists revoked_at timestamptz,
  add column if not exists revoked_by uuid references public.users(id) on delete set null,
  add column if not exists revoke_reason text;

-- ── 1. analytics_events: indexes + RLS ───────────────────────────────────────
create index if not exists idx_analytics_events_institution_created
  on public.analytics_events (institution_id, created_at desc);
create index if not exists idx_analytics_events_user_created
  on public.analytics_events (user_id, created_at desc);
create index if not exists idx_analytics_events_type
  on public.analytics_events (event_type);

drop policy if exists "Admins read institution events" on public.analytics_events;
create policy "Admins read institution events" on public.analytics_events
  for select using (
    public.is_admin() and (
      institution_id = (select u.institution_id from public.users u where u.id = auth.uid())
      or (select u.role from public.users u where u.id = auth.uid()) = 'platform_admin'
    )
  );

-- App-side sign-in capture: a user may record their own sign_in event only
drop policy if exists "Users log own sign-in" on public.analytics_events;
create policy "Users log own sign-in" on public.analytics_events
  for insert with check (
    user_id = auth.uid() and event_type = 'sign_in'
  );

-- Helper used by all capture triggers (never breaks the underlying write)
create or replace function public.log_analytics_event(
  p_institution uuid, p_user uuid, p_event text, p_entity_type text, p_entity uuid, p_payload jsonb default '{}'::jsonb
) returns void language plpgsql security definer set search_path = public as $$
begin
  if p_institution is null then return; end if;
  insert into public.analytics_events (institution_id, user_id, event_type, entity_type, entity_id, payload)
  values (p_institution, p_user, p_event, p_entity_type, p_entity, coalesce(p_payload, '{}'::jsonb));
exception when others then
  null;
end; $$;
revoke execute on function public.log_analytics_event(uuid, uuid, text, text, uuid, jsonb) from public, anon, authenticated;

-- Trigger: lesson completed
create or replace function public.trg_log_lesson_completed()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_inst uuid;
  v_course uuid;
begin
  if new.completed = true and (tg_op = 'INSERT' or old.completed is distinct from true) then
    select l.course_id, c.institution_id into v_course, v_inst
      from public.lessons l join public.courses c on c.id = l.course_id
      where l.id = new.lesson_id;
    perform public.log_analytics_event(v_inst, new.user_id, 'lesson_completed', 'lesson', new.lesson_id,
      jsonb_build_object('course_id', v_course));
  end if;
  return new;
end; $$;
drop trigger if exists trg_log_lesson_completed on public.progress;
create trigger trg_log_lesson_completed
  after insert or update on public.progress
  for each row execute function public.trg_log_lesson_completed();

-- Trigger: enrollment created / removed
create or replace function public.trg_log_enrollment()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_inst uuid;
  v_row record;
begin
  v_row := coalesce(new, old);
  select institution_id into v_inst from public.courses where id = v_row.course_id;
  if tg_op = 'INSERT' then
    perform public.log_analytics_event(v_inst, new.user_id, 'enrolled', 'course', new.course_id, '{}'::jsonb);
    return new;
  else
    perform public.log_analytics_event(v_inst, old.user_id, 'unenrolled', 'course', old.course_id, '{}'::jsonb);
    return old;
  end if;
end; $$;
drop trigger if exists trg_log_enrollment on public.course_enrollments;
create trigger trg_log_enrollment
  after insert or delete on public.course_enrollments
  for each row execute function public.trg_log_enrollment();

-- Trigger: certificate issued / revoked / restored
create or replace function public.trg_log_certificate_events()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    perform public.log_analytics_event(new.institution_id, new.user_id, 'certificate_issued',
      case when new.program_id is not null then 'program' else 'course' end,
      coalesce(new.course_id, new.program_id),
      jsonb_build_object('certificate_id', new.id, 'certificate_number', new.certificate_number,
                         'awarded_by', new.awarded_by, 'award_reason', new.award_reason));
  elsif tg_op = 'UPDATE' then
    if new.revoked_at is not null and old.revoked_at is null then
      perform public.log_analytics_event(new.institution_id, new.user_id, 'certificate_revoked',
        case when new.program_id is not null then 'program' else 'course' end,
        coalesce(new.course_id, new.program_id),
        jsonb_build_object('certificate_id', new.id, 'certificate_number', new.certificate_number,
                           'revoked_by', new.revoked_by, 'revoke_reason', new.revoke_reason));
    elsif new.revoked_at is null and old.revoked_at is not null then
      perform public.log_analytics_event(new.institution_id, new.user_id, 'certificate_restored',
        case when new.program_id is not null then 'program' else 'course' end,
        coalesce(new.course_id, new.program_id),
        jsonb_build_object('certificate_id', new.id, 'certificate_number', new.certificate_number));
    end if;
  end if;
  return new;
end; $$;
drop trigger if exists trg_log_certificate_events on public.certificates;
create trigger trg_log_certificate_events
  after insert or update on public.certificates
  for each row execute function public.trg_log_certificate_events();

-- ── 3. issue_course_certificate v2 (revocation-aware) ────────────────────────
create or replace function public.issue_course_certificate(p_course_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_user uuid := auth.uid();
  v_institution uuid;
  v_total int;
  v_done int;
  v_template uuid;
  v_id uuid;
  v_number text;
  v_revoked_at timestamptz;
begin
  if v_user is null then
    raise exception 'Not authenticated';
  end if;

  select institution_id into v_institution
    from public.courses
    where id = p_course_id and deleted_at is null;
  if not found then
    raise exception 'Course not found';
  end if;

  select id, certificate_number, revoked_at into v_id, v_number, v_revoked_at
    from public.certificates
    where user_id = v_user and course_id = p_course_id;

  if found and v_revoked_at is null then
    return jsonb_build_object('certificate_id', v_id, 'certificate_number', v_number, 'already_issued', true);
  end if;

  -- server-side completion check: every live lesson must have a completed progress row
  select count(*) into v_total
    from public.lessons l
    where l.course_id = p_course_id and l.deleted_at is null;

  select count(*) into v_done
    from public.lessons l
    join public.progress pr on pr.lesson_id = l.id and pr.user_id = v_user and pr.completed = true
    where l.course_id = p_course_id and l.deleted_at is null;

  if v_total = 0 or v_done < v_total then
    raise exception 'Course is not complete (% of % lessons done)', v_done, v_total;
  end if;

  -- a revoked certificate exists and the course is complete again: restore it
  if v_id is not null then
    update public.certificates
      set revoked_at = null, revoked_by = null, revoke_reason = null,
          issued_at = now(), pdf_url = null
      where id = v_id;
    return jsonb_build_object('certificate_id', v_id, 'certificate_number', v_number, 'already_issued', false);
  end if;

  v_template := coalesce(
    (select template_id from public.course_certificate_templates where course_id = p_course_id limit 1),
    (select id from public.certificate_templates
       where institution_id = v_institution and is_default = true
       limit 1)
  );

  insert into public.certificates (user_id, course_id, institution_id, template_id, issued_at)
  values (v_user, p_course_id, v_institution, v_template, now())
  on conflict (user_id, course_id) do nothing
  returning id, certificate_number into v_id, v_number;

  if v_id is null then
    select id, certificate_number into v_id, v_number
      from public.certificates
      where user_id = v_user and course_id = p_course_id;
    return jsonb_build_object('certificate_id', v_id, 'certificate_number', v_number, 'already_issued', true);
  end if;

  return jsonb_build_object('certificate_id', v_id, 'certificate_number', v_number, 'already_issued', false);
end;
$function$;

-- ── 4. Program trigger + backfill ignore revoked certificates ────────────────
create or replace function public.award_program_certificates()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
declare
  prog record;
  total_courses int;
  completed_courses int;
  v_template uuid;
begin
  if new.course_id is null then return new; end if;
  -- also fire when a revoked course cert is restored
  if tg_op = 'UPDATE' and not (new.revoked_at is null and old.revoked_at is not null) then
    return new;
  end if;

  for prog in
    select pc.program_id, p.certificate_template_id, p.institution_id
    from public.program_courses pc
    join public.programs p on p.id = pc.program_id
    where pc.course_id = new.course_id
  loop
    select count(*) into total_courses
      from public.program_courses pc
      join public.courses c on c.id = pc.course_id
      where pc.program_id = prog.program_id
        and c.deleted_at is null
        and coalesce(c.is_published, true) = true;

    select count(distinct cert.course_id) into completed_courses
      from public.certificates cert
      join public.program_courses pc on pc.course_id = cert.course_id and pc.program_id = prog.program_id
      join public.courses c on c.id = cert.course_id
      where cert.user_id = new.user_id
        and cert.revoked_at is null
        and c.deleted_at is null
        and coalesce(c.is_published, true) = true;

    if total_courses > 0 and completed_courses >= total_courses then
      v_template := coalesce(
        prog.certificate_template_id,
        (select id from public.certificate_templates
           where institution_id = prog.institution_id and is_default = true
           limit 1)
      );
      insert into public.certificates (user_id, program_id, institution_id, template_id, issued_at)
      values (new.user_id, prog.program_id, prog.institution_id, v_template, now())
      on conflict (user_id, program_id) where program_id is not null do nothing;
    end if;
  end loop;
  return new;
end;
$function$;

-- re-create the trigger to also fire on restore (UPDATE)
drop trigger if exists trg_award_program_certificates on public.certificates;
create trigger trg_award_program_certificates
  after insert or update on public.certificates
  for each row execute function public.award_program_certificates();

create or replace function public.backfill_program_certificates(p_program_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_prog record;
  v_template uuid;
  v_total int;
  v_count int := 0;
  r record;
begin
  if not public.is_admin() then
    raise exception 'Admins only';
  end if;

  select * into v_prog from public.programs where id = p_program_id;
  if not found then
    raise exception 'Program not found';
  end if;

  if (select u.role from public.users u where u.id = auth.uid()) <> 'platform_admin'
     and v_prog.institution_id is distinct from (select u.institution_id from public.users u where u.id = auth.uid()) then
    raise exception 'Program belongs to another institution';
  end if;

  select count(*) into v_total
    from public.program_courses pc
    join public.courses c on c.id = pc.course_id
    where pc.program_id = p_program_id
      and c.deleted_at is null
      and coalesce(c.is_published, true) = true;
  if v_total = 0 then return 0; end if;

  v_template := coalesce(
    v_prog.certificate_template_id,
    (select id from public.certificate_templates
       where institution_id = v_prog.institution_id and is_default = true
       limit 1)
  );

  for r in
    select cert.user_id
    from public.certificates cert
    join public.program_courses pc on pc.course_id = cert.course_id and pc.program_id = p_program_id
    join public.courses c on c.id = cert.course_id
    where cert.revoked_at is null
      and c.deleted_at is null and coalesce(c.is_published, true) = true
    group by cert.user_id
    having count(distinct cert.course_id) >= v_total
  loop
    if not exists (
      select 1 from public.certificates
      where user_id = r.user_id and program_id = p_program_id
    ) then
      insert into public.certificates (user_id, program_id, institution_id, template_id, issued_at)
      values (r.user_id, p_program_id, v_prog.institution_id, v_template, now())
      on conflict (user_id, program_id) where program_id is not null do nothing;
      v_count := v_count + 1;
    end if;
  end loop;

  return v_count;
end;
$function$;

-- ── 5. Analytics views: enforce caller's RLS (advisor ERROR fix) ─────────────
alter view if exists public.v_course_stats set (security_invoker = true);
alter view if exists public.v_completion_trend set (security_invoker = true);
alter view if exists public.v_enrollment_trend set (security_invoker = true);
alter view if exists public.v_student_progress set (security_invoker = true);
alter view if exists public.v_platform_stats set (security_invoker = true);
