-- Migration 063: slide-accurate partial legacy completion (conservative, never over-credits)
-- `materialize_legacy_completions` mapped an EdApp course % onto lesson-floor
-- (`floor(pct × lessons)`). But EdApp's percentage is CONTENT-based, so when early lessons are
-- long, lesson-floor over-credits — marking a lesson complete that the learner was only part-way
-- through. Measured on the 33 partial legacy rows: 64% were over-credited by up to a full lesson.
-- An over-credited lesson also grandfathers its quizzes (materialized completions are backdated
-- before the quiz-enforcement cutoff), so the learner would skip quizzes they never took.
--
-- Fix: for partial completions, complete only lessons whose slides ALL fall within
-- floor(pct × total_published_content_slides) — i.e. lessons the learner fully covered. This
-- never over-credits; the worst case is they re-review (and quiz) the lesson they were mid-way
-- through. Falls back to lesson-floor for slide-less legacy courses. The ≥95%/complete path,
-- enrollment, cert issuance, CME auto-request, backdating and idempotency are all UNCHANGED.
-- Only future claims are affected (no currently-claimed user has a partial course).

CREATE OR REPLACE FUNCTION public.materialize_legacy_completions(p_user_id uuid, p_legacy_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  rec record;
  v_total int;
  v_target int;
  v_total_slides int;
  v_target_slides int;
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
  perform set_config('app.import_source', 'legacy_import', true);

  for rec in
    select lcc.*, c.institution_id as course_institution
    from public.legacy_course_completions lcc
    join public.courses c on c.id = lcc.course_id and c.deleted_at is null
    where lcc.legacy_user_id = p_legacy_user_id
      and lcc.course_id is not null
  loop
    v_is_complete := rec.completed_at is not null or rec.progress_percent >= 95;
    v_done_at := coalesce(rec.completed_at, rec.created_at, now());

    select count(*) into v_total
      from public.lessons l where l.course_id = rec.course_id and l.deleted_at is null;
    if v_total = 0 then continue; end if;

    if v_is_complete then
      v_target := v_total;
    else
      -- Slide-accurate partial completion (migration 063). Complete only lessons the learner
      -- FULLY covered: those whose cumulative published-slide count is within the covered
      -- fraction of the course's content. Never over-credits; falls back to lesson-floor when
      -- the course has no published slides.
      select count(*) into v_total_slides
        from public.slides s join public.lessons l on l.id = s.lesson_id
        where l.course_id = rec.course_id and l.deleted_at is null
          and s.deleted_at is null and s.status = 'published';

      if coalesce(v_total_slides, 0) = 0 then
        v_target := floor(rec.progress_percent / 100.0 * v_total);
      else
        v_target_slides := floor(rec.progress_percent / 100.0 * v_total_slides);
        select count(*) into v_target
        from (
          select sum((
            select count(*) from public.slides s
            where s.lesson_id = l.id and s.deleted_at is null and s.status = 'published'
          )) over (order by l.order_index) as cum
          from public.lessons l
          where l.course_id = rec.course_id and l.deleted_at is null
        ) x
        where x.cum <= v_target_slides;
      end if;

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
             where course_id = rec.course_id
             order by assigned_at asc nulls last
             limit 1),
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

  select lcc.completed_at, lcc.institution_id into v_cme
  from public.legacy_course_completions lcc
  where lcc.legacy_user_id = p_legacy_user_id
    and lcc.course_id is null
    and lcc.course_title ilike '%module 14%'
    and (lcc.completed_at is not null or lcc.progress_percent >= 95)
  limit 1;

  if found then
    if not exists (
      select 1 from public.cme_certificate_requests
      where user_id = p_user_id and status in ('pending', 'issued', 'declined')
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
end; $function$;
