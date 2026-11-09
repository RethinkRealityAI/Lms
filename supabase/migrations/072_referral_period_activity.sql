-- Migration 072: period activity — "what happened during these dates"
--
-- WHY: the report's funnel is COHORT-framed on purpose (learners who joined in
-- the window, and everything they have done since) — that is the right frame
-- for "did this outreach work". But the other question a programme team asks is
-- period-framed: "what did August produce?" — how many people opened the link
-- that month, and how much learning HAPPENED that month, including by learners
-- who joined earlier. The cohort frame cannot answer that: a learner who signed
-- up in March and finished two modules in August contributes nothing to
-- August's cohort numbers.
--
-- Adds `period_activity` to get_referral_report: active learners (completed at
-- least one lesson in the window), lessons completed, modules completed (the
-- learner's final lesson of a fully-completed module lands in the window), and
-- certificates issued (issued_at in window, non-revoked, institution-scoped) —
-- all over EVERYONE ever attributed to the code, windowed by when the activity
-- happened. Link opens for the window already exist (totals.visits).
--
-- Also the release where the ambassador-reported outreach denominator
-- (outreach_reached / outreach_note, added in 071) is retired from the UI:
-- asking ambassadors to phone in an audience size after every outreach proved
-- too much upkeep to ask of them. The columns and report fields stay (harmless,
-- and still populated if ever entered) but nothing renders or edits them.
--
-- Everything else in the function is byte-for-byte the 071 definition.

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
  -- k-anonymity floor for naming a referring site on the public page.
  v_min_host_opens constant int := 3;
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
    SELECT u.id, u.created_at, u.occupation, u.country,
           u.referral_source_category, u.referral_campaign
    FROM public.users u
    WHERE u.referral_code_id = v_code.id
      AND u.created_at >= v_from AND u.created_at < v_to
  ),
  window_visits AS (
    SELECT COALESCE(source_category, 'direct') AS source_category,
           referrer_host,
           campaign,
           visitor_key
    FROM public.referral_visits
    WHERE referral_code_id = v_code.id
      AND visit_day >= v_from::date AND visit_day < v_to::date
  ),
  -- Everyone EVER attributed to this code, not just the in-window cohort:
  -- the period-activity block answers "what happened during these dates",
  -- and a learner who signed up in March is still this ambassador's learner
  -- when she finishes a module in August.
  attributed_all AS (
    SELECT u.id FROM public.users u WHERE u.referral_code_id = v_code.id
  ),
  period_lessons AS (
    SELECT p.user_id, l.course_id, p.completed_at
    FROM public.progress p
    JOIN public.lessons l ON l.id = p.lesson_id AND l.deleted_at IS NULL
    JOIN public.courses c ON c.id = l.course_id
      AND c.institution_id = v_code.institution_id AND c.deleted_at IS NULL
    JOIN attributed_all a ON a.id = p.user_id
    WHERE p.completed
      AND p.completed_at >= v_from AND p.completed_at < v_to
  ),
  -- A module counts as completed IN the period when the learner's final lesson
  -- of that module lands inside it (and the module is fully complete overall).
  period_course_completions AS (
    SELECT t.user_id, t.course_id
    FROM (
      SELECT p.user_id, l.course_id,
             count(*) AS done_lessons,
             max(p.completed_at) AS finished_at
      FROM public.progress p
      JOIN public.lessons l ON l.id = p.lesson_id AND l.deleted_at IS NULL
      JOIN attributed_all a ON a.id = p.user_id
      WHERE p.completed
      GROUP BY p.user_id, l.course_id
    ) t
    JOIN (
      SELECT c.id AS course_id, count(l.id) AS total_lessons
      FROM public.courses c
      JOIN public.lessons l ON l.course_id = c.id AND l.deleted_at IS NULL
      WHERE c.institution_id = v_code.institution_id AND c.deleted_at IS NULL
      GROUP BY c.id
    ) cl ON cl.course_id = t.course_id
    WHERE t.done_lessons >= cl.total_lessons
      AND t.finished_at >= v_from AND t.finished_at < v_to
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
  ),
  -- Opens and accounts per channel, unioned so a channel that produced accounts
  -- but whose opens fell outside the window still appears (and vice versa).
  -- Opens are DISTINCT browsers per channel — same unit as totals.visits. A
  -- browser that arrives via two channels appears once in each, so the
  -- breakdown can sum slightly above the total; that is the honest reading.
  source_rows AS (
    SELECT category,
           COALESCE(sum(opens), 0) AS opens,
           COALESCE(sum(signups), 0) AS signups
    FROM (
      SELECT source_category AS category, count(DISTINCT visitor_key) AS opens, 0 AS signups
      FROM window_visits GROUP BY 1
      UNION ALL
      SELECT COALESCE(referral_source_category, 'direct') AS category, 0 AS opens, count(*) AS signups
      FROM cohort GROUP BY 1
    ) t
    GROUP BY category
  ),
  host_rows AS (
    SELECT referrer_host AS host, count(DISTINCT visitor_key) AS opens
    FROM window_visits
    WHERE referrer_host IS NOT NULL
    GROUP BY 1
  ),
  campaign_rows AS (
    SELECT label,
           COALESCE(sum(opens), 0) AS opens,
           COALESCE(sum(signups), 0) AS signups
    FROM (
      SELECT campaign AS label, count(DISTINCT visitor_key) AS opens, 0 AS signups
      FROM window_visits WHERE campaign IS NOT NULL GROUP BY 1
      UNION ALL
      SELECT referral_campaign AS label, 0 AS opens, count(*) AS signups
      FROM cohort WHERE referral_campaign IS NOT NULL GROUP BY 1
    ) t
    GROUP BY label
  )
  SELECT jsonb_build_object(
    'code', jsonb_build_object(
      'code', v_code.code,
      'label', v_code.label,
      'description', v_code.description,
      'owner_name', v_code.owner_name,
      'is_active', v_code.is_active,
      'created_at', v_code.created_at,
      'outreach_reached', v_code.outreach_reached,
      'outreach_note', v_code.outreach_note
    ),
    'institution', jsonb_build_object('name', v_institution.name, 'slug', v_institution.slug),
    'range', jsonb_build_object(
      'from', v_axis_start,
      'to', COALESCE(p_to, (now() AT TIME ZONE 'utc')::date),
      'is_all_time', p_from IS NULL
    ),
    'generated_at', now(),
    'totals', jsonb_build_object(
      -- DISTINCT browsers, not the sum of daily uniques.
      --
      -- The unique index is (code, visitor_key, visit_day), so summing
      -- visits_by_day counts BROWSER-DAYS: one clinician who opens the link on
      -- Monday, Wednesday and Friday was three "link opens", and an ambassador
      -- checking their own link each morning was thirty. The error grew with
      -- the length of the window — so the All-time view was the most wrong —
      -- and it deflated the opens -> accounts conversion rate on the page
      -- ambassadors show funders. The daily chart still uses visits_by_day,
      -- where per-day IS the right unit.
      'visits', (SELECT count(DISTINCT visitor_key) FROM window_visits),
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
    -- 072: what HAPPENED inside the selected dates, by anyone ever
    -- attributed — the complement of the cohort funnel above. This is the
    -- month-over-month view: pick a month, read what that month produced.
    'period_activity', jsonb_build_object(
      'active_learners', (SELECT count(DISTINCT user_id) FROM period_lessons),
      'lessons_completed', (SELECT count(*) FROM period_lessons),
      'modules_completed', (SELECT count(*) FROM period_course_completions),
      'certificates_issued', (
        SELECT count(*) FROM public.certificates ct
        JOIN attributed_all a ON a.id = ct.user_id
        WHERE ct.revoked_at IS NULL
          AND ct.institution_id = v_code.institution_id
          AND ct.issued_at >= v_from AND ct.issued_at < v_to
      )
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
    -- 071: how people arrived.
    'sources', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'category', category, 'opens', opens, 'signups', signups
      ) ORDER BY opens DESC, signups DESC, category)
      FROM source_rows
      WHERE opens > 0 OR signups > 0
    ), '[]'::jsonb),
    'referrers', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('label', host, 'count', opens)
                       ORDER BY opens DESC, host)
      FROM (
        SELECT host, opens FROM host_rows
        WHERE opens >= v_min_host_opens
        ORDER BY opens DESC, host LIMIT 12
      ) t
    ), '[]'::jsonb),
    -- Everything the k-anonymity floor (and the top-12 cut) held back, so the
    -- page can account for the difference instead of appearing to lose opens.
    'referrers_withheld', jsonb_build_object(
      'opens', COALESCE((
        SELECT sum(opens) FROM host_rows WHERE opens < v_min_host_opens
      ), 0),
      'sites', COALESCE((
        SELECT count(*) FROM host_rows WHERE opens < v_min_host_opens
      ), 0),
      'min_opens', v_min_host_opens
    ),
    'campaigns', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'label', label, 'opens', opens, 'signups', signups
      ) ORDER BY opens DESC, signups DESC, label)
      FROM (SELECT * FROM campaign_rows ORDER BY opens DESC, label LIMIT 12) t
    ), '[]'::jsonb),
    'lifetime', jsonb_build_object(
      'visits', (
        SELECT count(DISTINCT visitor_key) FROM public.referral_visits
        WHERE referral_code_id = v_code.id
      ),
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

REVOKE ALL ON FUNCTION public.get_referral_report(text, date, date) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_referral_report(text, date, date) TO anon, authenticated;
