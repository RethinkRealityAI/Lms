-- Migration 028: Course Programs
-- Groups multiple courses into a "program"; completing every course in a program
-- auto-issues a program-level certificate via an AFTER INSERT trigger on certificates.
--
-- NOTE: This migration was originally applied directly to the live database and was
-- missing from version control. It is reconstructed here (idempotent) from the live
-- schema so a fresh `supabase db reset` reproduces programs correctly.

-- ── Tables ───────────────────────────────────────────────────────────────────
create table if not exists public.programs (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  title text not null,
  description text,
  certificate_template_id uuid references public.certificate_templates(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.program_courses (
  program_id uuid not null references public.programs(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  order_index integer not null default 0,
  primary key (program_id, course_id)
);

create index if not exists idx_program_courses_program on public.program_courses(program_id);
create index if not exists idx_program_courses_course on public.program_courses(course_id);

-- ── certificates.program_id (program certs have course_id NULL, program_id set) ──
alter table public.certificates
  add column if not exists program_id uuid references public.programs(id) on delete set null;

create index if not exists idx_certificates_program on public.certificates(program_id);

-- ── RLS ──────────────────────────────────────────────────────────────────────
alter table public.programs enable row level security;
alter table public.program_courses enable row level security;

drop policy if exists "Admins manage programs" on public.programs;
create policy "Admins manage programs" on public.programs
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Read programs in institution" on public.programs;
create policy "Read programs in institution" on public.programs
  for select using (
    public.is_admin()
    or institution_id in (select users.institution_id from public.users where users.id = auth.uid())
  );

drop policy if exists "Admins manage program_courses" on public.program_courses;
create policy "Admins manage program_courses" on public.program_courses
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Read program_courses" on public.program_courses;
create policy "Read program_courses" on public.program_courses
  for select using (true);

-- ── Auto-issue program certificates ──────────────────────────────────────────
create or replace function public.award_program_certificates()
returns trigger
language plpgsql
security definer
as $function$
declare
  prog record;
  total_courses int;
  completed_courses int;
begin
  -- only react to course certificates (ignore program certs to avoid recursion)
  if new.course_id is null then return new; end if;

  for prog in
    select pc.program_id, p.certificate_template_id, p.institution_id
    from public.program_courses pc
    join public.programs p on p.id = pc.program_id
    where pc.course_id = new.course_id
  loop
    select count(*) into total_courses
      from public.program_courses where program_id = prog.program_id;

    select count(distinct c.course_id) into completed_courses
      from public.certificates c
      where c.user_id = new.user_id
        and c.course_id in (select course_id from public.program_courses where program_id = prog.program_id);

    if total_courses > 0 and completed_courses >= total_courses then
      if not exists (
        select 1 from public.certificates
        where user_id = new.user_id and program_id = prog.program_id
      ) then
        insert into public.certificates (user_id, program_id, institution_id, template_id, issued_at)
        values (new.user_id, prog.program_id, prog.institution_id, prog.certificate_template_id, now());
      end if;
    end if;
  end loop;
  return new;
end;
$function$;

drop trigger if exists trg_award_program_certificates on public.certificates;
create trigger trg_award_program_certificates
  after insert on public.certificates
  for each row execute function public.award_program_certificates();
