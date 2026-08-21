-- Migration 071: traffic sources, honest open counts, and a real denominator
--
-- Three changes to the referral reporting, found together while building the
-- first one. Sections 1-6 add traffic sources; section 7 fixes a counting bug
-- that made "link opens" grow with the length of the window; section 1 also
-- adds an ambassador-entered denominator.
--
-- WHY: the outreach report can say how many people opened an ambassador's link
-- and what they did afterwards, but not WHICH CHANNEL delivered them. An
-- ambassador who posts the link in a newsletter, on LinkedIn and on a hospital
-- intranet page has no way to learn which of the three was worth the effort —
-- which is the first question anyone asks when planning the next campaign.
--
-- WHAT IS STORED, AND WHAT IS DELIBERATELY NOT:
--   * `referral_visits.referrer_host`  — the HOST only, e.g. `linkedin.com` or
--     `intranet.hospital.ca`. Never the path, never the query string. The path
--     is where identifying detail lives (a profile page, a message id, a token
--     in a query param) and it answers no question we are asking.
--   * `referral_visits.source_category` — the coarse channel bucket.
--   * `referral_visits.campaign` — a tag the AMBASSADOR puts on their own link
--     (`/r/<code>?s=newsletter`). Needed because desktop email clients, most
--     messaging apps and QR scans send no referrer at all, so the header alone
--     systematically under-reports exactly the channels this audience uses.
--   * `users` gets only the coarse CATEGORY and the campaign tag — never the
--     host. The anonymous visits table can carry a host because nothing there
--     identifies a person; the identified user row stays deliberately coarse.
--
-- SANITISATION IS DONE HERE, NOT ONLY IN THE APP: `record_referral_visit` is
-- anon-callable by design (the tracked link must work without a service-role
-- key), so anything it accepts can be posted by anyone. Every new value is
-- clamped to a known shape in SQL before it is stored, because it ends up
-- rendered on a public page.
--
-- The public report applies a k-anonymity floor to the host list: a host with
-- fewer than MIN_HOST_OPENS opens is rolled into an unnamed remainder. A single
-- open from `intranet.smallclinic.ca` is close to naming one workplace, and the
-- report token is a bearer credential handed to people outside the
-- organisation. The floor also blunts pollution — spraying one made-up host at
-- the open endpoint no longer puts it on somebody's dashboard.

/* ------------------------------------------------------------------ */
/* 1. Columns                                                          */
/* ------------------------------------------------------------------ */

ALTER TABLE public.referral_visits
  ADD COLUMN IF NOT EXISTS source_category text,
  ADD COLUMN IF NOT EXISTS referrer_host text,
  ADD COLUMN IF NOT EXISTS campaign text;

-- NULL stays legal: rows written before this migration have no source, and the
-- report reads a missing category as 'direct' rather than inventing one.
ALTER TABLE public.referral_visits
  DROP CONSTRAINT IF EXISTS referral_visits_source_category_check;
ALTER TABLE public.referral_visits
  ADD CONSTRAINT referral_visits_source_category_check
  CHECK (source_category IS NULL OR source_category IN
    ('email', 'social', 'messaging', 'search', 'website', 'direct'));

ALTER TABLE public.referral_visits
  DROP CONSTRAINT IF EXISTS referral_visits_referrer_host_check;
ALTER TABLE public.referral_visits
  ADD CONSTRAINT referral_visits_referrer_host_check
  CHECK (referrer_host IS NULL OR referrer_host ~ '^[a-z0-9]([a-z0-9.-]{0,251}[a-z0-9])?$');

ALTER TABLE public.referral_visits
  DROP CONSTRAINT IF EXISTS referral_visits_campaign_check;
ALTER TABLE public.referral_visits
  ADD CONSTRAINT referral_visits_campaign_check
  CHECK (campaign IS NULL OR campaign ~ '^[a-z0-9][a-z0-9-]{0,31}$');

CREATE INDEX IF NOT EXISTS idx_referral_visits_code_source
  ON public.referral_visits (referral_code_id, source_category);

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS referral_source_category text,
  ADD COLUMN IF NOT EXISTS referral_campaign text;

ALTER TABLE public.users
  DROP CONSTRAINT IF EXISTS users_referral_source_category_check;
ALTER TABLE public.users
  ADD CONSTRAINT users_referral_source_category_check
  CHECK (referral_source_category IS NULL OR referral_source_category IN
    ('email', 'social', 'messaging', 'search', 'website', 'direct'));

ALTER TABLE public.users
  DROP CONSTRAINT IF EXISTS users_referral_campaign_check;
ALTER TABLE public.users
  ADD CONSTRAINT users_referral_campaign_check
  CHECK (referral_campaign IS NULL OR referral_campaign ~ '^[a-z0-9][a-z0-9-]{0,31}$');

-- The denominator no log can ever recover.
--
-- An ambassador who presents to 40 people at grand rounds KNOWS they addressed
-- 40 people; no amount of instrumentation can tell us that, because 28 of them
-- never opened the link. "12 of the ~40 people I reached created an account" is
-- the number a funder is actually trying to extract from the funnel, and it can
-- only come from the person who did the outreach. Optional, admin-entered, and
-- always labelled as ambassador-reported on the report so it is never confused
-- with a measured figure.
ALTER TABLE public.referral_codes
  ADD COLUMN IF NOT EXISTS outreach_reached integer,
  ADD COLUMN IF NOT EXISTS outreach_note text;

ALTER TABLE public.referral_codes
  DROP CONSTRAINT IF EXISTS referral_codes_outreach_reached_check;
ALTER TABLE public.referral_codes
  ADD CONSTRAINT referral_codes_outreach_reached_check
  CHECK (outreach_reached IS NULL OR (outreach_reached >= 0 AND outreach_reached <= 1000000));

ALTER TABLE public.referral_codes
  DROP CONSTRAINT IF EXISTS referral_codes_outreach_note_check;
ALTER TABLE public.referral_codes
  ADD CONSTRAINT referral_codes_outreach_note_check
  CHECK (outreach_note IS NULL OR length(outreach_note) <= 200);

COMMENT ON COLUMN public.referral_codes.outreach_reached IS
  'Ambassador-reported size of the audience addressed. Not measured — always labelled as such.';
COMMENT ON COLUMN public.referral_visits.referrer_host IS
  'Host only, never path or query. Set from the Referer header by record_referral_visit.';
COMMENT ON COLUMN public.users.referral_source_category IS
  'Coarse channel bucket carried from the signup cookie. Deliberately no host — see migration 071.';

/* ------------------------------------------------------------------ */
/* 2. Shared normalisers                                               */
/* ------------------------------------------------------------------ */

-- One definition, used by the visit RPC and the signup trigger alike, so the
-- anonymous side and the identified side can never drift apart in what they
-- consider a valid value.
CREATE OR REPLACE FUNCTION public.normalize_referral_source(p_value text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE
    WHEN lower(btrim(COALESCE(p_value, ''))) IN
      ('email', 'social', 'messaging', 'search', 'website', 'direct')
    THEN lower(btrim(p_value))
    ELSE NULL
  END;
$$;

CREATE OR REPLACE FUNCTION public.normalize_referral_campaign(p_value text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  -- Mirrors normalizeCampaign() in src/lib/referral/sources.ts.
  SELECT NULLIF(
    regexp_replace(
      left(
        regexp_replace(
          regexp_replace(lower(btrim(COALESCE(p_value, ''))), '[^a-z0-9-]+', '-', 'g'),
          '-{2,}', '-', 'g'
        ),
        32
      ),
      '^-+|-+$', '', 'g'
    ),
    ''
  );
$$;

CREATE OR REPLACE FUNCTION public.normalize_referrer_host(p_value text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE
    WHEN left(lower(btrim(COALESCE(p_value, ''))), 253) ~ '^[a-z0-9]([a-z0-9.-]{0,251}[a-z0-9])?$'
    THEN left(lower(btrim(p_value)), 253)
    ELSE NULL
  END;
$$;

REVOKE ALL ON FUNCTION public.normalize_referral_source(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.normalize_referral_campaign(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.normalize_referrer_host(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.normalize_referral_source(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.normalize_referral_campaign(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.normalize_referrer_host(text) TO anon, authenticated;

/* ------------------------------------------------------------------ */
/* 3. record_referral_visit — three more inputs                        */
/* ------------------------------------------------------------------ */

-- DROP then CREATE rather than CREATE OR REPLACE: adding parameters changes the
-- signature, so a replace would leave the old 4-argument function in place as
-- an overload and PostgREST would have to guess between them.
DROP FUNCTION IF EXISTS public.record_referral_visit(text, text, text, text);

CREATE OR REPLACE FUNCTION public.record_referral_visit(
  p_code text,
  p_institution_slug text DEFAULT NULL,
  p_visitor_key text DEFAULT NULL,
  p_landing_path text DEFAULT NULL,
  p_source_category text DEFAULT NULL,
  p_referrer_host text DEFAULT NULL,
  p_campaign text DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_code public.referral_codes%ROWTYPE;
  v_slug text;
  v_institution RECORD;
  v_matches int;
  v_key text;
  v_source text;
  v_host text;
  v_campaign text;
BEGIN
  v_slug := lower(btrim(COALESCE(p_institution_slug, '')));
  v_key := NULLIF(btrim(COALESCE(p_visitor_key, '')), '');

  -- Anon-callable: never trust the caller's shapes.
  v_source := public.normalize_referral_source(p_source_category);
  v_host := public.normalize_referrer_host(p_referrer_host);
  v_campaign := public.normalize_referral_campaign(p_campaign);

  -- A host without a channel, or a channel of 'direct' carrying a host, are
  -- both incoherent; resolve rather than store a contradiction.
  IF v_host IS NOT NULL AND v_source IS NULL THEN
    v_source := 'website';
  END IF;
  IF v_source = 'direct' THEN
    v_host := NULL;
  END IF;

  IF v_slug <> '' THEN
    SELECT rc.* INTO v_code
    FROM public.referral_codes rc
    JOIN public.institutions i ON i.id = rc.institution_id
    WHERE i.slug = v_slug
      AND rc.code = lower(btrim(p_code))
      AND rc.archived_at IS NULL;
  ELSE
    -- No tenant named: accept the code only if it is unambiguous platform-wide.
    -- Ambiguity is reported rather than guessed, so a visit can never be
    -- credited to the wrong institution's ambassador.
    SELECT count(*) INTO v_matches
    FROM public.referral_codes
    WHERE code = lower(btrim(p_code)) AND archived_at IS NULL;

    IF v_matches > 1 THEN
      RETURN jsonb_build_object('ok', false, 'reason', 'ambiguous_code');
    END IF;

    SELECT * INTO v_code
    FROM public.referral_codes
    WHERE code = lower(btrim(p_code)) AND archived_at IS NULL;
  END IF;

  IF v_code.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'unknown_code');
  END IF;

  SELECT id, name, slug INTO v_institution
  FROM public.institutions WHERE id = v_code.institution_id;

  -- Count only when we have a real browser key AND the code is still active.
  -- A NULL key means "resolve but do not count" — that is how the route handler
  -- keeps link-preview crawlers (Slack, Teams, Outlook, WhatsApp, LinkedIn),
  -- which fetch the URL the moment it is pasted, out of the visit numbers.
  -- An inactive code still RESOLVES, so an already-printed flyer is never a
  -- dead link, but it stops accruing numbers.
  IF v_code.is_active AND v_key IS NOT NULL THEN
    INSERT INTO public.referral_visits (
      referral_code_id, institution_id, visitor_key, landing_path,
      source_category, referrer_host, campaign
    )
    VALUES (
      v_code.id,
      v_code.institution_id,
      left(v_key, 64),
      left(NULLIF(btrim(p_landing_path), ''), 200),
      COALESCE(v_source, 'direct'),
      v_host,
      v_campaign
    )
    ON CONFLICT (referral_code_id, visitor_key, visit_day) DO NOTHING;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'code', v_code.code,
    'label', v_code.label,
    'is_active', v_code.is_active,
    'counted', (v_code.is_active AND v_key IS NOT NULL),
    'landing_path', v_code.landing_path,
    'institution_slug', v_institution.slug,
    'institution_name', v_institution.name,
    'source_category', COALESCE(v_source, 'direct'),
    'campaign', v_campaign
  );
END;
$$;

REVOKE ALL ON FUNCTION public.record_referral_visit(text, text, text, text, text, text, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_referral_visit(text, text, text, text, text, text, text)
  TO anon, authenticated;

/* ------------------------------------------------------------------ */
/* 4. handle_new_user v6 — carry the channel onto the account          */
/* ------------------------------------------------------------------ */

-- Same shape as v5 (migration 069) plus the two source fields. They are written
-- ONLY when a referral code actually resolved: a channel with nothing to
-- attribute it to is noise, and would let any signup write a value that the
-- report then aggregates.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_institution_id uuid;
  v_slug text;
  v_referral_code text;
  v_referral_id uuid;
  v_profession text;
  v_source text;
  v_campaign text;
BEGIN
  v_slug := COALESCE(NEW.raw_user_meta_data->>'institution_slug', 'gansid');

  SELECT id INTO v_institution_id FROM public.institutions WHERE slug = v_slug;

  IF v_institution_id IS NULL THEN
    SELECT id INTO v_institution_id FROM public.institutions WHERE slug = 'gansid';
  END IF;

  -- Referral attribution (068). Resolved WITHIN the signup institution and
  -- only for live codes, so a stale or cross-tenant code silently attributes
  -- to nobody rather than failing the signup.
  v_referral_code := lower(btrim(COALESCE(NEW.raw_user_meta_data->>'referral_code', '')));
  IF v_referral_code <> '' THEN
    SELECT id INTO v_referral_id
    FROM public.referral_codes
    WHERE institution_id = v_institution_id
      AND code = v_referral_code
      AND is_active
      AND archived_at IS NULL;
  END IF;

  -- Traffic source (071). Only meaningful alongside a resolved code.
  IF v_referral_id IS NOT NULL THEN
    v_source := public.normalize_referral_source(NEW.raw_user_meta_data->>'referral_source');
    v_campaign := public.normalize_referral_campaign(NEW.raw_user_meta_data->>'referral_campaign');
  END IF;

  -- Profession. Trimmed and length-capped here as well as in the form: this
  -- trigger is the last gate before the value reaches a public report.
  v_profession := NULLIF(left(btrim(COALESCE(NEW.raw_user_meta_data->>'profession', '')), 80), '');

  INSERT INTO public.users (
    id, email, role, full_name, institution_id, occupation,
    referral_code_id, referral_attributed_at,
    referral_source_category, referral_campaign,
    created_at, updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'student'),
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    v_institution_id,
    v_profession,
    v_referral_id,
    CASE WHEN v_referral_id IS NOT NULL THEN NOW() END,
    v_source,
    v_campaign,
    NOW(),
    NOW()
  );

  PERFORM public.claim_legacy_profile(NEW.id, NEW.email);

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error creating user profile: %', SQLERRM;
    RETURN NEW;
END;
$$;

/* ------------------------------------------------------------------ */
/* 5. guard_referral_attribution v2 — protect the new fields too       */
/* ------------------------------------------------------------------ */

-- The `users` table has a self-update policy, so without this a learner could
-- write themselves a different channel and reshape an ambassador's breakdown.
-- Same rule as referral_code_id: server-owned, admin-editable, never
-- client-writable.
CREATE OR REPLACE FUNCTION public.guard_referral_attribution()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.is_admin() THEN
    IF NEW.referral_code_id IS DISTINCT FROM OLD.referral_code_id THEN
      NEW.referral_code_id := OLD.referral_code_id;
      NEW.referral_attributed_at := OLD.referral_attributed_at;
    END IF;
    IF NEW.referral_source_category IS DISTINCT FROM OLD.referral_source_category THEN
      NEW.referral_source_category := OLD.referral_source_category;
    END IF;
    IF NEW.referral_campaign IS DISTINCT FROM OLD.referral_campaign THEN
      NEW.referral_campaign := OLD.referral_campaign;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

/* ------------------------------------------------------------------ */
/* 6. get_referral_report v4 — sources, named sites, campaign tags     */
/* ------------------------------------------------------------------ */

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

/* ------------------------------------------------------------------ */
/* 7. admin_referral_overview — same counting fix                      */
/* ------------------------------------------------------------------ */

-- The admin management table read `count(*) FROM referral_visits`, which is the
-- same browser-days figure as the public report's old total. Two dashboards
-- showing different definitions of the same word is worse than either being
-- wrong on its own, so both now count DISTINCT browsers. Everything else in
-- this function is unchanged.
CREATE OR REPLACE FUNCTION public.admin_referral_overview(p_institution_id uuid)
RETURNS TABLE(
  referral_code_id uuid,
  visits bigint,
  signups bigint,
  learners_started bigint,
  courses_completed bigint,
  certificates bigint,
  last_signup_at timestamptz
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Not authorised';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
      AND (role = 'platform_admin' OR institution_id = p_institution_id)
  ) THEN
    RAISE EXCEPTION 'Not authorised for this institution';
  END IF;

  RETURN QUERY
  WITH attributed AS (
    SELECT u.id AS user_id, u.referral_code_id AS code_id, u.created_at
    FROM public.users u
    JOIN public.referral_codes rc ON rc.id = u.referral_code_id
    WHERE rc.institution_id = p_institution_id
  ),
  course_lessons AS (
    SELECT c.id AS course_id, count(l.id) AS total_lessons
    FROM public.courses c
    LEFT JOIN public.lessons l ON l.course_id = c.id AND l.deleted_at IS NULL
    WHERE c.institution_id = p_institution_id AND c.deleted_at IS NULL
    GROUP BY c.id
  ),
  learner_courses AS (
    SELECT
      a.code_id,
      a.user_id,
      cl.total_lessons,
      (
        SELECT count(*)
        FROM public.progress p
        JOIN public.lessons l ON l.id = p.lesson_id
        WHERE p.user_id = a.user_id AND p.completed
          AND l.course_id = e.course_id AND l.deleted_at IS NULL
      ) AS completed_lessons
    FROM public.course_enrollments e
    JOIN attributed a ON a.user_id = e.user_id
    JOIN course_lessons cl ON cl.course_id = e.course_id
  )
  SELECT
    rc.id,
    (SELECT count(DISTINCT rv.visitor_key) FROM public.referral_visits rv
      WHERE rv.referral_code_id = rc.id),
    (SELECT count(*) FROM attributed a WHERE a.code_id = rc.id),
    (SELECT count(DISTINCT lc.user_id) FROM learner_courses lc WHERE lc.code_id = rc.id),
    (SELECT count(*) FROM learner_courses lc
      WHERE lc.code_id = rc.id AND lc.total_lessons > 0
        AND lc.completed_lessons >= lc.total_lessons),
    (SELECT count(*) FROM public.certificates ct
      JOIN attributed a ON a.user_id = ct.user_id
      WHERE a.code_id = rc.id AND ct.revoked_at IS NULL
        AND ct.institution_id = p_institution_id),
    (SELECT max(a.created_at) FROM attributed a WHERE a.code_id = rc.id)
  FROM public.referral_codes rc
  WHERE rc.institution_id = p_institution_id AND rc.archived_at IS NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_referral_overview(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_referral_overview(uuid) TO authenticated;
