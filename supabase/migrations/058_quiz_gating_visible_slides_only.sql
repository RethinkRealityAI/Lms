-- Migration 058: quiz gating counts a quiz block ONLY when it is on a VISIBLE
-- (published, non-deleted) slide, or is a truly slide-less legacy block.
--
-- Previously issue_course_certificate v3 also gated a quiz when its lesson had
-- ZERO visible slides (the `b.lesson_id not in (select lesson_id from vis_slides)`
-- clause) — a "whole-lesson-hidden" fallback that mirrored the student viewer's
-- old behaviour of dumping a fully-draft/deleted lesson's entire block list onto
-- one page. The viewer now hides that content entirely (buildLessonPages in
-- src/lib/content/lesson-pages.ts renders no pages for an all-hidden lesson), so
-- those quizzes never render and must NOT gate — otherwise a student who
-- (correctly) can't see them would be permanently refused their certificate.
--
-- Ordering: apply this migration to the DB BEFORE the matching viewer change
-- deploys. Old viewer + new RPC is safe (old viewer is STRICTER — it renders and
-- gates the leaked quizzes, so the RPC requiring fewer can never refuse). New
-- viewer + old RPC would brick (viewer hides the quiz, RPC still requires it).
--
-- This change only ever RELAXES gating (removes an OR branch), so it can never
-- block a user who could previously earn a certificate. Everything else in the
-- function is unchanged from v3 (migration 054).
CREATE OR REPLACE FUNCTION public.issue_course_certificate(p_course_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  select id, certificate_number, revoked_at into v_id, v_number, v_revoked_at
    from public.certificates
    where user_id = v_user and course_id = p_course_id;

  if found and v_revoked_at is null then
    return jsonb_build_object('certificate_id', v_id, 'certificate_number', v_number, 'already_issued', true);
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
    update public.certificates
      set revoked_at = null, revoked_by = null, revoke_reason = null,
          issued_at = now(), pdf_url = null
      where id = v_id;
    return jsonb_build_object('certificate_id', v_id, 'certificate_number', v_number, 'already_issued', false);
  end if;

  v_template := coalesce(
    (select template_id from public.course_certificate_templates
       where course_id = p_course_id order by assigned_at asc nulls last limit 1),
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
