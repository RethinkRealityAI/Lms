-- ============================================================================
-- ANALYTICS VIEWS — authoritative snapshot (source of truth: live Supabase)
-- ============================================================================
-- These views were created in the live project via the Supabase MCP and their
-- CREATE statements never landed in supabase/migrations/ (the local folder's
-- numbering has also drifted from the migration ledger in CLAUDE.md). This
-- snapshot exists so a rebuild-from-repo cannot silently resurrect fixed bugs.
--
-- Last updated: 2026-07-10 (remote migrations 049/050/051 per CLAUDE.md:
--   049 fix_student_progress_view  — certificates_earned alias (app read a
--       column the view never output → leaderboard Certs always 0);
--       last_activity = greatest(lesson completion, analytics event)
--   050 student_progress_view_accuracy — completed_lessons joins LIVE lessons
--       (orphaned progress rows from deleted lessons no longer counted);
--       quiz stats moved off the empty legacy quiz_attempts table onto
--       quiz_block_responses; revoked certificates excluded
--   051 course_stats_view_accuracy — same quiz-source + revoked-cert fixes for
--       the per-course view; fixed latent row-multiplication in the quiz join)
--
-- Definition invariants (do not regress):
--   * lesson counts join lessons WHERE deleted_at IS NULL
--   * certificate counts exclude revoked (revoked_at IS NULL)
--   * quiz stats come from quiz_block_responses (inline quizzes), NOT the
--     unused quiz_attempts table
--   * both views run with security_invoker = true (RLS of the caller applies)

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
    where certificates.revoked_at is null
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
    from certificates where certificates.revoked_at is null
    group by certificates.course_id) cert on cert.course_id = c.id;
