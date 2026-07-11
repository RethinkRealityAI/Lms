-- Migration 061: issue_course_certificate ignores soft-deleted (trashed) quiz blocks.
--
-- Migration 060 gave lesson_blocks a deleted_at; the student viewer filters it, but
-- the cert RPC's gating_blocks did not — it excluded trashed quizzes only indirectly,
-- via their (also-trashed) slide being absent from vis_slides. That relied on the
-- invariant "a trashed block always has a trashed slide", which holds today (slides
-- are the only thing that soft-deletes blocks) but would silently break — and start
-- refusing certificates for quizzes students can't see — the moment block-level
-- soft-delete is added. Add an explicit `b.deleted_at IS NULL` so the server mirrors
-- the client's block filter directly. No behaviour change today (trashed blocks are
-- already excluded); this only removes the hidden dependency.
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
