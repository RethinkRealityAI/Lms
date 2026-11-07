-- 073: tell learners WHICH required quiz is blocking their certificate, and make a
-- passing quiz answer impossible to downgrade.
--
-- Support reports (SCAGO Modules 3/4/6/7, Sept–Oct 2026): learners reached 100% of
-- lessons with no certificate. issue_course_certificate refused with
-- "Course quizzes are not all answered correctly (N remaining)" — but named no
-- lesson, so learners could not find the quiz. Root causes found in the live data:
--   * a correct answer passed the in-browser gate but the DB row kept an earlier
--     wrong attempt (read-then-write race / dropped write in persistAnswer);
--   * the survey page marked the final lesson complete without its quizzes.
--
-- 1. get_my_missing_course_quizzes(course_id): the exact gating set the certificate
--    RPC counts (same live-lesson / published-slide / required / satisfiable /
--    grandfather rules, copied from issue_course_certificate v5), returned as rows
--    with lesson + slide titles so the UI can deep-link to each quiz.
--    auth.uid()-bound; returns only structure of published content + own state.
-- 2. quiz_block_responses_sticky_correct: BEFORE UPDATE trigger that keeps
--    is_correct = true once true. The client already tries to do this, but its
--    read-then-write can race (a wrong re-attempt read before the correct write
--    lands overwrites it). Enforcing it in the DB removes the race entirely.
--    DELETE (admin progress reset, migration 052) is unaffected.

create or replace function public.get_my_missing_course_quizzes(p_course_id uuid)
returns table (
  block_id uuid,
  lesson_id uuid,
  lesson_title text,
  lesson_order int,
  slide_id uuid,
  slide_title text,
  slide_order int
)
language sql
stable
security definer
set search_path = public
as $$
  with me as (select auth.uid() as uid),
  live_lessons as (
    select l.id, l.title, l.order_index
    from public.lessons l
    join public.courses c on c.id = l.course_id and c.deleted_at is null
    where l.course_id = p_course_id and l.deleted_at is null
  ),
  vis_slides as (
    select s.id, s.lesson_id, s.title, s.order_index
    from public.slides s
    where s.lesson_id in (select id from live_lessons)
      and s.deleted_at is null and s.status = 'published'
  ),
  gating_blocks as (
    select b.id, b.lesson_id, b.slide_id
    from public.lesson_blocks b
    where b.lesson_id in (select id from live_lessons)
      and b.deleted_at is null
      and b.block_type = 'quiz_inline'
      and coalesce(b.data->>'required', 'true') <> 'false'
      and b.data->>'question_type' in ('multiple_choice','true_false','categorize','select_all')
      and public.quiz_block_is_satisfiable(b.data)
      and (b.slide_id is null or b.slide_id in (select id from vis_slides))
  )
  select g.id, ll.id, ll.title, ll.order_index, vs.id, vs.title, vs.order_index
  from gating_blocks g
  cross join me
  join live_lessons ll on ll.id = g.lesson_id
  left join vis_slides vs on vs.id = g.slide_id
  where me.uid is not null
    and not exists (
      select 1 from public.quiz_block_responses r
      where r.block_id = g.id and r.user_id = me.uid and r.is_correct = true)
    and not exists (
      select 1 from public.progress pr
      where pr.user_id = me.uid and pr.lesson_id = g.lesson_id
        and pr.completed = true
        and pr.completed_at < '2026-07-11 02:47:00+00'::timestamptz)
  order by ll.order_index, vs.order_index nulls first;
$$;

revoke all on function public.get_my_missing_course_quizzes(uuid) from public, anon;
grant execute on function public.get_my_missing_course_quizzes(uuid) to authenticated;

create or replace function public.quiz_block_responses_keep_correct()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if old.is_correct = true and new.is_correct is distinct from true then
    new.is_correct := true;
  end if;
  return new;
end;
$$;

drop trigger if exists quiz_block_responses_sticky_correct on public.quiz_block_responses;
create trigger quiz_block_responses_sticky_correct
  before update on public.quiz_block_responses
  for each row execute function public.quiz_block_responses_keep_correct();
