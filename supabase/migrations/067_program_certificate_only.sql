-- Migration 067: program-certificate-only mode (suppress per-course certificates)
--
-- Some programs (all of SCAGO's, by default) should award a SINGLE certificate on
-- completion of the WHOLE program, with NO visible per-course certificates along
-- the way. GANSID keeps the existing behaviour (a certificate per course + a
-- program certificate).
--
-- Design — "internal" course certificates:
--   The program certificate is awarded by the AFTER-INSERT trigger
--   award_program_certificates(), which fires when a course certificate exists for
--   every course in the program. Rather than rework that battle-tested completion
--   signal, we KEEP issuing (and fully server-verifying) the per-course certificate
--   when a program is certificate-only — but flag it `hidden`, so:
--     * the student never sees it, gets no course certificate number, no PDF, no email;
--     * the program-award trigger still counts it and issues the one program cert;
--     * all server-side quiz/lesson verification in issue_course_certificate is preserved.
--   The student experiences exactly one certificate, at the end of the program.
--
-- Existing already-issued certificates are left untouched (hidden defaults false),
-- so SCAGO learners who earned per-course certs under the old behaviour keep them.

-- 1. Per-program toggle. Default false = current GANSID behaviour (per-course certs).
alter table public.programs
  add column if not exists program_certificate_only boolean not null default false;

comment on column public.programs.program_certificate_only is
  'When true, per-course certificates for this program''s courses are issued internally (hidden) only to drive the single program certificate; students see only the program certificate.';

-- 2. Hidden flag on certificates. A course cert issued under a certificate-only
--    program is hidden from the student; it exists only to drive the program cert.
alter table public.certificates
  add column if not exists hidden boolean not null default false;

comment on column public.certificates.hidden is
  'Internal certificate not shown to the student (no number/PDF/email surfaced). Set on per-course certs issued under a program_certificate_only program; program certs are never hidden.';

create index if not exists idx_certificates_hidden on public.certificates(hidden) where hidden = true;

-- 3. issue_course_certificate v6 — hide the per-course cert when the course belongs
--    to a certificate-only program, and return `suppressed` + `program_certificate_id`
--    so the client surfaces the program certificate (not the course one).
--    All eligibility / quiz-gating logic is unchanged from v5 (migration 061).
create or replace function public.issue_course_certificate(p_course_id uuid)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_user uuid := auth.uid();
  v_institution uuid;
  v_total int;
  v_done int;
  v_quiz_missing int;
  v_template uuid;
  v_id uuid;
  v_number text;
  v_revoked_at timestamptz;
  v_suppressed boolean := false;
  v_program_cert_id uuid;
  c_quiz_enforcement_since constant timestamptz := '2026-07-11 02:47:00+00';
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

  -- Does this course belong to any program that suppresses per-course certificates?
  select exists (
    select 1
    from public.program_courses pc
    join public.programs p on p.id = pc.program_id
    where pc.course_id = p_course_id and p.program_certificate_only = true
  ) into v_suppressed;

  select id, certificate_number, revoked_at into v_id, v_number, v_revoked_at
    from public.certificates
    where user_id = v_user and course_id = p_course_id;

  if found and v_revoked_at is null then
    -- Already issued. Surface any program certificate the learner already holds
    -- for a program containing this course, so the client can celebrate it.
    select c.id into v_program_cert_id
      from public.certificates c
      join public.program_courses pc on pc.program_id = c.program_id
      where c.user_id = v_user and pc.course_id = p_course_id and c.revoked_at is null
      limit 1;
    return jsonb_build_object(
      'certificate_id', v_id, 'certificate_number', v_number, 'already_issued', true,
      'suppressed', v_suppressed, 'program_certificate_id', v_program_cert_id);
  end if;

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

  with live_lessons as (
    select id from public.lessons
    where course_id = p_course_id and deleted_at is null
  ),
  vis_slides as (
    select id, lesson_id from public.slides
    where lesson_id in (select id from live_lessons)
      and deleted_at is null and status = 'published'
  ),
  gating_blocks as (
    select b.id, b.lesson_id
    from public.lesson_blocks b
    where b.lesson_id in (select id from live_lessons)
      and b.deleted_at is null
      and b.block_type = 'quiz_inline'
      and coalesce(b.data->>'required', 'true') <> 'false'
      and b.data->>'question_type' in ('multiple_choice','true_false','categorize','select_all')
      and public.quiz_block_is_satisfiable(b.data)
      and (
        b.slide_id is null
        or b.slide_id in (select id from vis_slides)
      )
  )
  select count(*) into v_quiz_missing
  from gating_blocks g
  where not exists (
      select 1 from public.quiz_block_responses r
      where r.block_id = g.id and r.user_id = v_user and r.is_correct = true)
    and not exists (
      select 1 from public.progress pr
      where pr.user_id = v_user and pr.lesson_id = g.lesson_id
        and pr.completed = true
        and pr.completed_at < c_quiz_enforcement_since);

  if v_quiz_missing > 0 then
    raise exception 'Course quizzes are not all answered correctly (% remaining). Revisit the lessons and answer each required quiz.', v_quiz_missing;
  end if;

  if v_id is not null then
    -- Restore a revoked cert. Leave `hidden` as-is (existing certs unchanged).
    update public.certificates
      set revoked_at = null, revoked_by = null, revoke_reason = null,
          issued_at = now(), pdf_url = null
      where id = v_id;
    select c.id into v_program_cert_id
      from public.certificates c
      join public.program_courses pc on pc.program_id = c.program_id
      where c.user_id = v_user and pc.course_id = p_course_id and c.revoked_at is null
      limit 1;
    return jsonb_build_object(
      'certificate_id', v_id, 'certificate_number', v_number, 'already_issued', false,
      'suppressed', v_suppressed, 'program_certificate_id', v_program_cert_id);
  end if;

  v_template := coalesce(
    (select template_id from public.course_certificate_templates
       where course_id = p_course_id order by assigned_at asc nulls last limit 1),
    (select id from public.certificate_templates
       where institution_id = v_institution and is_default = true
       limit 1)
  );

  -- Insert the (verified) course certificate. When the program is certificate-only
  -- it is flagged hidden; the AFTER-INSERT trigger still counts it toward the program.
  insert into public.certificates (user_id, course_id, institution_id, template_id, issued_at, hidden)
  values (v_user, p_course_id, v_institution, v_template, now(), v_suppressed)
  on conflict (user_id, course_id) do nothing
  returning id, certificate_number into v_id, v_number;

  if v_id is null then
    select id, certificate_number into v_id, v_number
      from public.certificates
      where user_id = v_user and course_id = p_course_id;
    select c.id into v_program_cert_id
      from public.certificates c
      join public.program_courses pc on pc.program_id = c.program_id
      where c.user_id = v_user and pc.course_id = p_course_id and c.revoked_at is null
      limit 1;
    return jsonb_build_object(
      'certificate_id', v_id, 'certificate_number', v_number, 'already_issued', true,
      'suppressed', v_suppressed, 'program_certificate_id', v_program_cert_id);
  end if;

  -- The AFTER-INSERT trigger has now run; a program certificate may have been
  -- awarded (this being the final course). Surface it for the celebration.
  select c.id into v_program_cert_id
    from public.certificates c
    join public.program_courses pc on pc.program_id = c.program_id
    where c.user_id = v_user and pc.course_id = p_course_id and c.revoked_at is null
    limit 1;

  return jsonb_build_object(
    'certificate_id', v_id, 'certificate_number', v_number, 'already_issued', false,
    'suppressed', v_suppressed, 'program_certificate_id', v_program_cert_id);
end;
$function$;

-- 4. Analytics views must not count internal hidden certs as issued (otherwise a
--    SCAGO learner shows N per-course "certs" on the leaderboard / course stats).
--    Mirrors supabase/snapshots/analytics-views.sql (keep both in sync). Only the
--    certificate sub-queries change (added `and certificates.hidden = false`).
create or replace view public.v_student_progress
with (security_invoker = true)
as
select
  u.id as user_id,
  u.email,
  u.full_name,
  u.created_at as joined_at,
  u.institution_id,
  coalesce(e.enrollment_count, 0::bigint) as enrollment_count,
  coalesce(p.completed_lessons, 0::bigint) as completed_lessons,
  coalesce(qa.quiz_count, 0::bigint) as quiz_attempts,
  qa.avg_quiz_score,
  coalesce(cert.certificate_count, 0::bigint) as certificate_count,
  coalesce(cert.certificate_count, 0::bigint) as certificates_earned,
  greatest(p.last_activity, ev.last_event_at) as last_activity
from users u
  left join (
    select ce.user_id, count(*) as enrollment_count
    from course_enrollments ce
    join courses c on c.id = ce.course_id and c.deleted_at is null
    group by ce.user_id
  ) e on e.user_id = u.id
  left join (
    select pr.user_id, count(*) as completed_lessons, max(pr.completed_at) as last_activity
    from progress pr
    join lessons l on l.id = pr.lesson_id and l.deleted_at is null
    where pr.completed = true
    group by pr.user_id
  ) p on p.user_id = u.id
  left join (
    select analytics_events.user_id, max(analytics_events.created_at) as last_event_at
    from analytics_events
    group by analytics_events.user_id
  ) ev on ev.user_id = u.id
  left join (
    select qbr.user_id,
      count(*) as quiz_count,
      round(count(*) filter (where qbr.is_correct)::numeric / nullif(count(*), 0)::numeric * 100, 1) as avg_quiz_score
    from quiz_block_responses qbr
    group by qbr.user_id
  ) qa on qa.user_id = u.id
  left join (
    select certificates.user_id, count(*) as certificate_count
    from certificates
    where certificates.revoked_at is null and certificates.hidden = false
    group by certificates.user_id
  ) cert on cert.user_id = u.id
where u.role = 'student'::text;

create or replace view public.v_course_stats
with (security_invoker = true)
as
select
  c.id as course_id,
  c.title as course_title,
  c.is_published,
  c.institution_id,
  c.created_at,
  coalesce(e.enrollment_count, 0::bigint) as enrollment_count,
  coalesce(l.lesson_count, 0::bigint) as lesson_count,
  coalesce(p.completed_lesson_count, 0::bigint) as completed_lesson_count,
  coalesce(p.unique_completers, 0::bigint) as unique_completers,
  case
    when coalesce(e.enrollment_count, 0::bigint) > 0 and coalesce(l.lesson_count, 0::bigint) > 0
    then round(coalesce(full_comp.fully_completed_count, 0::bigint)::numeric / e.enrollment_count::numeric * 100::numeric, 1)
    else 0::numeric
  end as completion_rate,
  case
    when coalesce(e.enrollment_count, 0::bigint) > 0 and coalesce(l.lesson_count, 0::bigint) > 0
    then round(coalesce(p.completed_lesson_count, 0::bigint)::numeric / (e.enrollment_count * l.lesson_count)::numeric * 100::numeric, 1)
    else 0::numeric
  end as avg_progress_pct,
  coalesce(q.quiz_attempt_count, 0::bigint) as quiz_attempt_count,
  q.avg_quiz_score,
  coalesce(r.review_count, 0::bigint) as review_count,
  r.avg_rating,
  coalesce(cert.certificate_count, 0::bigint) as certificate_count
from courses c
  left join ( select course_enrollments.course_id, count(*) as enrollment_count
    from course_enrollments group by course_enrollments.course_id) e on e.course_id = c.id
  left join ( select lessons.course_id, count(*) as lesson_count
    from lessons where lessons.deleted_at is null group by lessons.course_id) l on l.course_id = c.id
  left join ( select les.course_id, count(*) as completed_lesson_count, count(distinct pr.user_id) as unique_completers
    from progress pr join lessons les on les.id = pr.lesson_id and les.deleted_at is null
    where pr.completed = true group by les.course_id) p on p.course_id = c.id
  left join ( select sub.course_id, count(*) as fully_completed_count
    from ( select ce.user_id, ce.course_id
      from course_enrollments ce
        join lessons les on les.course_id = ce.course_id and les.deleted_at is null
        left join progress pr on pr.lesson_id = les.id and pr.user_id = ce.user_id and pr.completed = true
      group by ce.user_id, ce.course_id
      having count(les.id) = count(pr.id)) sub
    group by sub.course_id) full_comp on full_comp.course_id = c.id
  left join ( select qbr.course_id,
      count(*) as quiz_attempt_count,
      round(count(*) filter (where qbr.is_correct)::numeric / nullif(count(*), 0)::numeric * 100, 1) as avg_quiz_score
    from quiz_block_responses qbr
    group by qbr.course_id) q on q.course_id = c.id
  left join ( select course_reviews.course_id, count(*) as review_count, round(avg(course_reviews.rating), 1) as avg_rating
    from course_reviews group by course_reviews.course_id) r on r.course_id = c.id
  left join ( select certificates.course_id, count(*) as certificate_count
    from certificates where certificates.revoked_at is null and certificates.hidden = false
    group by certificates.course_id) cert on cert.course_id = c.id;

-- 5. Default SCAGO programs to certificate-only (GANSID unchanged). Resolve the
--    institution by slug rather than hardcoding a UUID. Only flips programs still
--    at the default (false); never overrides an admin's explicit choice.
update public.programs
  set program_certificate_only = true
  where program_certificate_only = false
    and institution_id = (select id from public.institutions where slug = 'scago');
