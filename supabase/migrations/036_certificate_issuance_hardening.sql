-- ============================================================
-- 036: Certificate issuance hardening (audit follow-up)
-- Applied via Supabase MCP; this file is the version-controlled source.
--   1. Server-verified course certificate issuance RPC (issue_course_certificate)
--      — replaces the client-trusted INSERT path
--   2. Drop the open "Students can earn certificates" INSERT policy
--   3. Partial unique index: one program certificate per user per program
--   4. award_program_certificates(): institution-default template fallback,
--      published/live course filtering, pinned search_path, race-safe insert
--   5. backfill_program_certificates(): admin RPC to retroactively award
--      program certs (e.g. after program membership changes)
--   6. Institution-scoped admin write RLS on programs / program_courses
--      (platform_admin exempt)
-- ============================================================

-- ── 3. One program certificate per user per program ─────────────────────────
create unique index if not exists certificates_user_program_key
  on public.certificates (user_id, program_id)
  where program_id is not null;

-- ── 4. Program certificate trigger v2 ────────────────────────────────────────
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
  -- only react to course certificates (ignore program certs to avoid recursion)
  if new.course_id is null then return new; end if;

  for prog in
    select pc.program_id, p.certificate_template_id, p.institution_id
    from public.program_courses pc
    join public.programs p on p.id = pc.program_id
    where pc.course_id = new.course_id
  loop
    -- only live, published courses count toward (and are required for) completion
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
        and c.deleted_at is null
        and coalesce(c.is_published, true) = true;

    if total_courses > 0 and completed_courses >= total_courses then
      -- program template, falling back to the institution default
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

-- ── 1. Server-verified course certificate issuance ──────────────────────────
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

  -- already issued? return the existing certificate
  select id, certificate_number into v_id, v_number
    from public.certificates
    where user_id = v_user and course_id = p_course_id;
  if found then
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

  -- template: course assignment, falling back to the institution default
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
    -- lost a concurrent race; return the winner's row
    select id, certificate_number into v_id, v_number
      from public.certificates
      where user_id = v_user and course_id = p_course_id;
    return jsonb_build_object('certificate_id', v_id, 'certificate_number', v_number, 'already_issued', true);
  end if;

  return jsonb_build_object('certificate_id', v_id, 'certificate_number', v_number, 'already_issued', false);
end;
$function$;

revoke execute on function public.issue_course_certificate(uuid) from public, anon;
grant execute on function public.issue_course_certificate(uuid) to authenticated;

-- ── 5. Retroactive program certificate backfill (admin only) ─────────────────
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

  -- non-platform admins may only backfill programs in their own institution
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
    where c.deleted_at is null and coalesce(c.is_published, true) = true
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

revoke execute on function public.backfill_program_certificates(uuid) from public, anon;
grant execute on function public.backfill_program_certificates(uuid) to authenticated;

-- ── 2. Certificates are no longer client-insertable by students ─────────────
drop policy if exists "Students can earn certificates" on public.certificates;

-- ── 6. Institution-scoped admin write RLS on programs ───────────────────────
drop policy if exists "Admins manage programs" on public.programs;
create policy "Admins manage programs" on public.programs
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

drop policy if exists "Admins manage program_courses" on public.program_courses;
create policy "Admins manage program_courses" on public.program_courses
  for all using (
    public.is_admin() and exists (
      select 1 from public.programs p
      where p.id = program_id and (
        p.institution_id = (select u.institution_id from public.users u where u.id = auth.uid())
        or (select u.role from public.users u where u.id = auth.uid()) = 'platform_admin'
      )
    )
  ) with check (
    public.is_admin() and exists (
      select 1 from public.programs p
      where p.id = program_id and (
        p.institution_id = (select u.institution_id from public.users u where u.id = auth.uid())
        or (select u.role from public.users u where u.id = auth.uid()) = 'platform_admin'
      )
    )
  );
