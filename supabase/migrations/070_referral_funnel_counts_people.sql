-- Migration 070: the referral funnel's last step must count PEOPLE
--
-- WHY: FUNNEL_STEPS is documented as "ordered stages, all counting people" —
-- that is what makes each stage a subset of the one above it and each
-- "% of previous" figure meaningful. The last step, however, read the
-- `certificates` total, which counts CERTIFICATES. A learner who finishes
-- three modules holds three, so on any real cohort the funnel WIDENS at the
-- end and prints a conversion above 100% — which reads as a bug on a page an
-- external partner is looking at, and undermines every honest number beside it.
--
-- Adds `totals.learners_certificated`: distinct cohort members holding at
-- least one live certificate. `totals.certificates` is untouched and still
-- powers the "Certificates earned" stat tile and the table view, where the
-- raw count IS the question being asked.
--
-- Institution scoping is preserved on BOTH counts: under dual access
-- (migration 055) one login can belong to several institutions, so an unscoped
-- join reports another tenant's certificates in this ambassador's numbers.
--
-- Everything else in the function is byte-for-byte the 068 definition.

CREATE OR REPLACE FUNCTION public.get_referral_report(
  p_token text,
  p_from date DEFAULT NULL,
  p_to date DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $function$
DECLARE
  v_code public.referral_codes%ROWTYPE;
  v_institution RECORD;
  v_from timestamptz;
  v_to timestamptz;
  v_axis_start date;
  v_result jsonb;
BEGIN
  IF p_token IS NULL OR length(btrim(p_token)) < 16 THEN
    RETURN NULL;
  END IF;

  SELECT * INTO v_code
  FROM public.referral_codes
  WHERE public_token = btrim(p_token) AND archived_at IS NULL;

  IF v_code.id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT id, name, slug INTO v_institution
  FROM public.institutions WHERE id = v_code.institution_id;

  v_from := COALESCE(p_from, '1970-01-01'::date)::timestamptz;
  v_to := (COALESCE(p_to, (now() AT TIME ZONE 'utc')::date) + 1)::timestamptz;

  IF p_from IS NOT NULL THEN
    v_axis_start := p_from;
  ELSE
    SELECT LEAST(
      COALESCE((SELECT min(visit_day) FROM public.referral_visits WHERE referral_code_id = v_code.id), v_code.created_at::date),
      COALESCE((SELECT min(created_at)::date FROM public.users WHERE referral_code_id = v_code.id), v_code.created_at::date),
      v_code.created_at::date
    ) INTO v_axis_start;
  END IF;
  v_axis_start := GREATEST(v_axis_start, (v_to - interval '731 days')::date);

  WITH
  cohort AS (
    SELECT u.id, u.created_at, u.occupation, u.country
    FROM public.users u
    WHERE u.referral_code_id = v_code.id
      AND u.created_at >= v_from AND u.created_at < v_to
  ),
  course_lessons AS (
    SELECT c.id AS course_id, c.title, count(l.id) AS total_lessons
    FROM public.courses c
    LEFT JOIN public.lessons l ON l.course_id = c.id AND l.deleted_at IS NULL
    WHERE c.institution_id = v_code.institution_id AND c.deleted_at IS NULL
    GROUP BY c.id, c.title
  ),
  learner_courses AS (
    SELECT
      e.user_id,
      e.course_id,
      cl.title,
      cl.total_lessons,
      (
        SELECT count(*)
        FROM public.progress p
        JOIN public.lessons l ON l.id = p.lesson_id
        WHERE p.user_id = e.user_id
          AND p.completed
          AND l.course_id = e.course_id
          AND l.deleted_at IS NULL
      ) AS completed_lessons
    FROM public.course_enrollments e
    JOIN cohort ON cohort.id = e.user_id
    JOIN course_lessons cl ON cl.course_id = e.course_id
  ),
  learner_courses_flagged AS (
    SELECT *,
      (total_lessons > 0 AND completed_lessons >= total_lessons) AS is_complete
    FROM learner_courses
  ),
  day_axis AS (
    SELECT generate_series(
      v_axis_start::timestamptz,
      v_to - interval '1 day',
      interval '1 day'
    )::date AS day
  ),
  visits_by_day AS (
    SELECT visit_day AS day, count(*) AS n
    FROM public.referral_visits
    WHERE referral_code_id = v_code.id
      AND visit_day >= v_from::date AND visit_day < v_to::date
    GROUP BY visit_day
  ),
  signups_by_day AS (
    SELECT (created_at AT TIME ZONE 'utc')::date AS day, count(*) AS n
    FROM cohort GROUP BY 1
  )
  SELECT jsonb_build_object(
    'code', jsonb_build_object(
      'code', v_code.code,
      'label', v_code.label,
      'description', v_code.description,
      'owner_name', v_code.owner_name,
      'is_active', v_code.is_active,
      'created_at', v_code.created_at
    ),
    'institution', jsonb_build_object('name', v_institution.name, 'slug', v_institution.slug),
    'range', jsonb_build_object(
      'from', v_axis_start,
      'to', COALESCE(p_to, (now() AT TIME ZONE 'utc')::date),
      'is_all_time', p_from IS NULL
    ),
    'generated_at', now(),
    'totals', jsonb_build_object(
      'visits', (SELECT COALESCE(sum(n), 0) FROM visits_by_day),
      'signups', (SELECT count(*) FROM cohort),
      'learners_started', (SELECT count(DISTINCT user_id) FROM learner_courses_flagged),
      'course_enrollments', (SELECT count(*) FROM learner_courses_flagged),
      'lessons_completed', (SELECT COALESCE(sum(completed_lessons), 0) FROM learner_courses_flagged),
      'courses_completed', (SELECT count(*) FROM learner_courses_flagged WHERE is_complete),
      'learners_completed', (SELECT count(DISTINCT user_id) FROM learner_courses_flagged WHERE is_complete),
      -- PEOPLE holding at least one certificate — the funnel step.
      'learners_certificated', (
        SELECT count(DISTINCT ct.user_id) FROM public.certificates ct
        JOIN cohort ON cohort.id = ct.user_id
        WHERE ct.revoked_at IS NULL
          AND ct.institution_id = v_code.institution_id
      ),
      -- CERTIFICATES issued — one learner can hold several. Stat tile + table.
      'certificates', (
        SELECT count(*) FROM public.certificates ct
        JOIN cohort ON cohort.id = ct.user_id
        WHERE ct.revoked_at IS NULL
          AND ct.institution_id = v_code.institution_id
      )
    ),
    'profile_stated', jsonb_build_object(
      'occupation', (SELECT count(*) FROM cohort WHERE NULLIF(btrim(COALESCE(occupation,'')), '') IS NOT NULL),
      'country', (SELECT count(*) FROM cohort WHERE NULLIF(btrim(COALESCE(country,'')), '') IS NOT NULL),
      'total', (SELECT count(*) FROM cohort)
    ),
    'daily', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'day', d.day,
        'visits', COALESCE(v.n, 0),
        'signups', COALESCE(s.n, 0)
      ) ORDER BY d.day)
      FROM day_axis d
      LEFT JOIN visits_by_day v ON v.day = d.day
      LEFT JOIN signups_by_day s ON s.day = d.day
    ), '[]'::jsonb),
    'courses', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('title', title, 'enrolled', n, 'completed', done)
                       ORDER BY n DESC, title)
      FROM (
        SELECT title, count(*) AS n, count(*) FILTER (WHERE is_complete) AS done
        FROM learner_courses_flagged
        GROUP BY course_id, title
      ) t
    ), '[]'::jsonb),
    'occupations', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('label', lbl, 'count', n) ORDER BY n DESC, lbl)
      FROM (
        SELECT btrim(occupation) AS lbl, count(*) AS n
        FROM cohort
        WHERE NULLIF(btrim(COALESCE(occupation,'')), '') IS NOT NULL
        GROUP BY 1 ORDER BY n DESC LIMIT 12
      ) t
    ), '[]'::jsonb),
    'countries', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('label', lbl, 'count', n) ORDER BY n DESC, lbl)
      FROM (
        SELECT btrim(country) AS lbl, count(*) AS n
        FROM cohort
        WHERE NULLIF(btrim(COALESCE(country,'')), '') IS NOT NULL
        GROUP BY 1 ORDER BY n DESC LIMIT 12
      ) t
    ), '[]'::jsonb),
    'lifetime', jsonb_build_object(
      'visits', (SELECT count(*) FROM public.referral_visits WHERE referral_code_id = v_code.id),
      'signups', (SELECT count(*) FROM public.users WHERE referral_code_id = v_code.id),
      'certificates', (
        SELECT count(*) FROM public.certificates ct
        JOIN public.users u ON u.id = ct.user_id
        WHERE u.referral_code_id = v_code.id
          AND ct.revoked_at IS NULL
          AND ct.institution_id = v_code.institution_id
      ),
      'first_visit_at', (SELECT min(created_at) FROM public.referral_visits WHERE referral_code_id = v_code.id)
    )
  ) INTO v_result;

  RETURN v_result;
END;
$function$;

-- Anon may call it (the token IS the credential); nothing else is granted.
REVOKE ALL ON FUNCTION public.get_referral_report(text, date, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_referral_report(text, date, date) TO anon, authenticated;
