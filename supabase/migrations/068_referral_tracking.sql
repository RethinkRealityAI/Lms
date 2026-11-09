-- Migration 068: Ambassador referral tracking
--
-- WHY: regional ambassadors run awareness outreach (e.g. SCAGO's Northwestern
-- Ontario program) and need to evaluate it. Web analytics can only answer "how
-- many clicked"; the question they actually ask is "how many of the providers I
-- reached created an account and COMPLETED the modules". That join only exists
-- in this database, so attribution is stamped onto the user row at signup and
-- every downstream number is derived from real progress/certificate data.
--
-- Shape:
--   referral_codes   — one row per ambassador/region link (institution-scoped)
--   referral_visits  — anonymous link-open counter (no IP, no user agent, no PII)
--   users.referral_code_id — the attribution, written once at signup
--
-- The public report is reached by an unguessable per-code token, NOT by login;
-- it returns AGGREGATES ONLY (counts and course titles) — never a name, email,
-- or per-person row. That is what makes it safe to hand to an external partner.

-- ---------------------------------------------------------------------------
-- 1. referral_codes
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.referral_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  -- URL segment: /r/<code>. Lowercase, url-safe, short enough to say out loud.
  code text NOT NULL CHECK (code ~ '^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$'),
  label text NOT NULL CHECK (length(btrim(label)) > 0),
  description text,
  owner_name text,
  owner_email text,
  -- Where /r/<code> drops the visitor. NULL = the institution landing page.
  landing_path text,
  -- Credential for the public report page. Rotatable without breaking /r/<code>.
  public_token text NOT NULL UNIQUE DEFAULT replace(gen_random_uuid()::text, '-', ''),
  is_active boolean NOT NULL DEFAULT true,
  archived_at timestamptz,
  created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Codes are namespaced per institution so /gansid and /scago can both own "nwo".
CREATE UNIQUE INDEX IF NOT EXISTS referral_codes_institution_code_key
  ON public.referral_codes (institution_id, code);
CREATE INDEX IF NOT EXISTS idx_referral_codes_institution
  ON public.referral_codes (institution_id) WHERE archived_at IS NULL;

-- ---------------------------------------------------------------------------
-- 2. referral_visits — anonymous top-of-funnel counter
-- ---------------------------------------------------------------------------
-- Deliberately minimal. visitor_key is a random opaque id from a first-party
-- cookie; it exists ONLY to collapse one person's repeat opens on the same day
-- into a single visit. No IP, no user agent, no referer, no fingerprint.
CREATE TABLE IF NOT EXISTS public.referral_visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_code_id uuid NOT NULL REFERENCES public.referral_codes(id) ON DELETE CASCADE,
  institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  visitor_key text NOT NULL,
  landing_path text,
  visit_day date NOT NULL DEFAULT (now() AT TIME ZONE 'utc')::date,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- One visit per browser per code per day — makes the count "people who opened
-- the link", not "page loads", and blunts naive refresh-spam.
CREATE UNIQUE INDEX IF NOT EXISTS referral_visits_unique_daily
  ON public.referral_visits (referral_code_id, visitor_key, visit_day);
CREATE INDEX IF NOT EXISTS idx_referral_visits_code_day
  ON public.referral_visits (referral_code_id, visit_day);

-- ---------------------------------------------------------------------------
-- 3. Attribution on the user row
-- ---------------------------------------------------------------------------
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS referral_code_id uuid REFERENCES public.referral_codes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS referral_attributed_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_users_referral_code
  ON public.users (referral_code_id) WHERE referral_code_id IS NOT NULL;

-- Attribution is write-once and never client-writable: the `users` table has a
-- self-update policy, so without this guard any learner could POST themselves
-- into (or out of) an ambassador's numbers and the report would be fiction.
CREATE OR REPLACE FUNCTION public.guard_referral_attribution()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.referral_code_id IS DISTINCT FROM OLD.referral_code_id THEN
    -- SECURITY DEFINER functions and the service role run with no auth.uid();
    -- an actual end user always has one. Admins may correct attribution.
    IF auth.uid() IS NOT NULL AND NOT public.is_admin() THEN
      NEW.referral_code_id := OLD.referral_code_id;
      NEW.referral_attributed_at := OLD.referral_attributed_at;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_referral_attribution ON public.users;
CREATE TRIGGER trg_guard_referral_attribution
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.guard_referral_attribution();

-- ---------------------------------------------------------------------------
-- 4. handle_new_user v4 — capture the referral code from signup metadata
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_institution_id uuid;
  v_slug text;
  v_referral_code text;
  v_referral_id uuid;
BEGIN
  v_slug := COALESCE(NEW.raw_user_meta_data->>'institution_slug', 'gansid');

  SELECT id INTO v_institution_id FROM public.institutions WHERE slug = v_slug;

  IF v_institution_id IS NULL THEN
    SELECT id INTO v_institution_id FROM public.institutions WHERE slug = 'gansid';
  END IF;

  -- Referral attribution. Resolved WITHIN the signup institution and only for
  -- live codes, so a stale or cross-tenant code silently attributes to nobody
  -- rather than failing the signup.
  v_referral_code := lower(btrim(COALESCE(NEW.raw_user_meta_data->>'referral_code', '')));
  IF v_referral_code <> '' THEN
    SELECT id INTO v_referral_id
    FROM public.referral_codes
    WHERE institution_id = v_institution_id
      AND code = v_referral_code
      AND is_active
      AND archived_at IS NULL;
  END IF;

  INSERT INTO public.users (
    id, email, role, full_name, institution_id,
    referral_code_id, referral_attributed_at, created_at, updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'student'),
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    v_institution_id,
    v_referral_id,
    CASE WHEN v_referral_id IS NOT NULL THEN NOW() END,
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

-- ---------------------------------------------------------------------------
-- 5. RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_visits ENABLE ROW LEVEL SECURITY;

-- No public SELECT on referral_codes: the public report reaches its row through
-- the SECURITY DEFINER token RPC below, so the token stays the only credential.
DROP POLICY IF EXISTS "Admins manage referral codes" ON public.referral_codes;
CREATE POLICY "Admins manage referral codes" ON public.referral_codes
  FOR ALL USING (
    public.is_admin() AND (
      institution_id IN (SELECT institution_id FROM public.users WHERE id = auth.uid())
      OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'platform_admin')
    )
  )
  WITH CHECK (
    public.is_admin() AND (
      institution_id IN (SELECT institution_id FROM public.users WHERE id = auth.uid())
      OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'platform_admin')
    )
  );

DROP POLICY IF EXISTS "Admins read referral visits" ON public.referral_visits;
CREATE POLICY "Admins read referral visits" ON public.referral_visits
  FOR SELECT USING (
    public.is_admin() AND (
      institution_id IN (SELECT institution_id FROM public.users WHERE id = auth.uid())
      OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'platform_admin')
    )
  );
-- Visits are written ONLY through record_referral_visit() (SECURITY DEFINER).

-- ---------------------------------------------------------------------------
-- 6. record_referral_visit — anon-callable, used by the /r/<code> route
-- ---------------------------------------------------------------------------
-- Anon-callable on purpose: the tracked link is the ambassador's primary
-- deliverable and must keep working even if the service-role key is absent from
-- an environment. Abuse surface is bounded — it can only ever increment a
-- counter for an already-existing code, and the daily unique index collapses
-- repeats from one visitor_key.
CREATE OR REPLACE FUNCTION public.record_referral_visit(
  p_code text,
  p_institution_slug text DEFAULT NULL,
  p_visitor_key text DEFAULT NULL,
  p_landing_path text DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_code public.referral_codes%ROWTYPE;
  v_slug text;
  v_institution RECORD;
  v_matches int;
  v_key text;
BEGIN
  v_slug := lower(btrim(COALESCE(p_institution_slug, '')));
  v_key := NULLIF(btrim(COALESCE(p_visitor_key, '')), '');

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
      referral_code_id, institution_id, visitor_key, landing_path
    )
    VALUES (
      v_code.id,
      v_code.institution_id,
      left(v_key, 64),
      left(NULLIF(btrim(p_landing_path), ''), 200)
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
    'institution_name', v_institution.name
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- 7. get_referral_report — the public, token-gated, aggregates-only report
-- ---------------------------------------------------------------------------
-- Cohort framing: "learners who joined through this link inside the window,
-- and everything they have done since". That is the question a program
-- evaluation asks; a pure events-in-window count would drop a learner who
-- signed up in March and finished in May from BOTH months.
CREATE OR REPLACE FUNCTION public.get_referral_report(
  p_token text,
  p_from date DEFAULT NULL,
  p_to date DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public AS $$
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

  -- Half-open [from, to) so the final day is included whole.
  v_from := COALESCE(p_from, '1970-01-01'::date)::timestamptz;
  v_to := (COALESCE(p_to, (now() AT TIME ZONE 'utc')::date) + 1)::timestamptz;

  -- The day axis must cover exactly the window the totals describe, or the
  -- chart and the KPI tiles quietly disagree. On "all time" (p_from NULL) that
  -- means starting at the first real activity rather than 1970 — and never
  -- before the code existed.
  IF p_from IS NOT NULL THEN
    v_axis_start := p_from;
  ELSE
    SELECT LEAST(
      COALESCE((SELECT min(visit_day) FROM public.referral_visits WHERE referral_code_id = v_code.id), v_code.created_at::date),
      COALESCE((SELECT min(created_at)::date FROM public.users WHERE referral_code_id = v_code.id), v_code.created_at::date),
      v_code.created_at::date
    ) INTO v_axis_start;
  END IF;
  -- Guard against a pathological span (a code created years ago) producing a
  -- multi-thousand-point series the page then has to render.
  v_axis_start := GREATEST(v_axis_start, (v_to - interval '731 days')::date);

  WITH
  -- The attributed cohort for this window.
  cohort AS (
    SELECT u.id, u.created_at, u.occupation, u.country
    FROM public.users u
    WHERE u.referral_code_id = v_code.id
      AND u.created_at >= v_from AND u.created_at < v_to
  ),
  -- Live lessons per live course, for the completion denominator.
  course_lessons AS (
    SELECT c.id AS course_id, c.title, count(l.id) AS total_lessons
    FROM public.courses c
    LEFT JOIN public.lessons l ON l.course_id = c.id AND l.deleted_at IS NULL
    WHERE c.institution_id = v_code.institution_id AND c.deleted_at IS NULL
    GROUP BY c.id, c.title
  ),
  -- One row per (cohort learner, course they enrolled in) with their progress.
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
  -- Daily series. Visits are activity-in-window (top of funnel); signups are
  -- the cohort by join date. Both are plotted on the same day axis.
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
      -- Institution-scoped: since migration 055 one login can belong to
      -- several institutions, so without this a SCAGO-referred learner's
      -- GANSID certificates would be counted in the SCAGO ambassador's report.
      'certificates', (
        SELECT count(*) FROM public.certificates ct
        JOIN cohort ON cohort.id = ct.user_id
        WHERE ct.revoked_at IS NULL
          AND ct.institution_id = v_code.institution_id
      )
    ),
    -- How many of the cohort have actually stated a role/country, so the UI can
    -- caption the breakdown instead of implying everyone is "Not specified".
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
    -- Breakdowns contain STATED values only. Occupation is a profile field,
    -- not a signup field, and is rarely filled in — a "Not specified" bucket
    -- would dominate the chart and read as a finding rather than missing data.
    -- Group on the LABEL, then wrap: grouping on the built object would put an
    -- aggregate in the GROUP BY clause, which Postgres rejects outright.
    'occupations', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('label', lbl, 'count', n) ORDER BY n DESC, lbl)
      FROM (
        SELECT btrim(occupation) AS lbl, count(*) AS n
        FROM cohort
        WHERE NULLIF(btrim(COALESCE(occupation,'')), '') IS NOT NULL
        GROUP BY 1
        ORDER BY n DESC
        LIMIT 12
      ) t
    ), '[]'::jsonb),
    'countries', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('label', lbl, 'count', n) ORDER BY n DESC, lbl)
      FROM (
        SELECT btrim(country) AS lbl, count(*) AS n
        FROM cohort
        WHERE NULLIF(btrim(COALESCE(country,'')), '') IS NOT NULL
        GROUP BY 1
        ORDER BY n DESC
        LIMIT 12
      ) t
    ), '[]'::jsonb),
    -- All-time figures, so the header can show lifetime impact regardless of filter.
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
$$;

-- ---------------------------------------------------------------------------
-- 8. admin_referral_overview — one row per code for the admin portal
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_referral_overview(p_institution_id uuid)
RETURNS TABLE (
  referral_code_id uuid,
  visits bigint,
  signups bigint,
  learners_started bigint,
  courses_completed bigint,
  certificates bigint,
  last_signup_at timestamptz
)
LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public AS $$
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
    SELECT u.id AS user_id, u.referral_code_id, u.created_at
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
      a.referral_code_id,
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
    (SELECT count(*) FROM public.referral_visits rv WHERE rv.referral_code_id = rc.id),
    (SELECT count(*) FROM attributed a WHERE a.referral_code_id = rc.id),
    (SELECT count(DISTINCT lc.user_id) FROM learner_courses lc WHERE lc.referral_code_id = rc.id),
    (SELECT count(*) FROM learner_courses lc
      WHERE lc.referral_code_id = rc.id AND lc.total_lessons > 0
        AND lc.completed_lessons >= lc.total_lessons),
    (SELECT count(*) FROM public.certificates ct
      JOIN attributed a ON a.user_id = ct.user_id
      WHERE a.referral_code_id = rc.id AND ct.revoked_at IS NULL),
    (SELECT max(a.created_at) FROM attributed a WHERE a.referral_code_id = rc.id)
  FROM public.referral_codes rc
  WHERE rc.institution_id = p_institution_id AND rc.archived_at IS NULL;
END;
$$;

-- ---------------------------------------------------------------------------
-- 9. admin_rotate_referral_token
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_rotate_referral_token(p_code_id uuid)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_token text;
  v_institution_id uuid;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Not authorised';
  END IF;

  SELECT institution_id INTO v_institution_id
  FROM public.referral_codes WHERE id = p_code_id;
  IF v_institution_id IS NULL THEN
    RAISE EXCEPTION 'Referral code not found';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
      AND (role = 'platform_admin' OR institution_id = v_institution_id)
  ) THEN
    RAISE EXCEPTION 'Not authorised for this institution';
  END IF;

  v_token := replace(gen_random_uuid()::text, '-', '');
  UPDATE public.referral_codes
  SET public_token = v_token, updated_at = now()
  WHERE id = p_code_id;

  RETURN v_token;
END;
$$;

-- ---------------------------------------------------------------------------
-- 10. Grants — strip the auto-granted PUBLIC/anon EXECUTE, then re-add what
--     each function genuinely needs (migrations 035/056 pattern).
-- ---------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.record_referral_visit(text, text, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_referral_report(text, date, date) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_referral_overview(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_rotate_referral_token(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.guard_referral_attribution() FROM PUBLIC, anon, authenticated;

-- Both public-facing RPCs are reachable pre-auth by design: the tracked link and
-- the report page are handed to people who have no account.
GRANT EXECUTE ON FUNCTION public.record_referral_visit(text, text, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_referral_report(text, date, date) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_referral_overview(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_rotate_referral_token(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- 11. Email template — "here is your tracked link" for ambassadors
-- ---------------------------------------------------------------------------
ALTER TABLE public.email_templates DROP CONSTRAINT IF EXISTS email_templates_system_type_check;
ALTER TABLE public.email_templates ADD CONSTRAINT email_templates_system_type_check
  CHECK (system_type = ANY (ARRAY['certificate','assignment','legacy_claim_invite','referral_link']));

INSERT INTO public.email_templates (
  institution_id, category, system_type, slug, name, subject_template, body_html_template
)
SELECT
  i.id, 'system', 'referral_link', 'referral_link',
  'Ambassador referral link',
  'Your {{institutionName}} outreach link for {{referralLabel}}',
  '<h1 style="margin:0 0 16px;color:#0F172A;font-size:22px;">Your outreach link is ready</h1>
<p style="margin:0 0 12px;color:#334155;font-size:15px;line-height:24px;">{{greeting}}</p>
<p style="margin:0 0 12px;color:#334155;font-size:15px;line-height:24px;">
  Here is your tracked link for <strong>{{referralLabel}}</strong>. Share it in emails, on your website, in presentations, or as a QR code on printed material.
</p>
<p style="margin:0 0 4px;color:#64748B;font-size:13px;">Your link</p>
<p style="margin:0 0 20px;"><a href="{{referralUrl}}" style="color:{{primaryColor}};font-size:16px;font-weight:bold;word-break:break-all;">{{referralUrl}}</a></p>
<p style="margin:0 0 12px;color:#334155;font-size:15px;line-height:24px;">
  Anyone who signs up after opening it is counted toward your outreach, and you can watch the results on your own live dashboard — link opens, accounts created, modules completed and certificates earned.
</p>
<p style="margin:24px 0;"><a href="{{reportUrl}}" style="display:inline-block;padding:12px 28px;background-color:{{buttonColor}};color:#FFFFFF;font-size:14px;font-weight:bold;text-decoration:none;border-radius:8px;">Open my dashboard</a></p>
<p style="margin:0;color:#94A3B8;font-size:12px;line-height:18px;">
  The dashboard shows anonymised totals only — never the names or contact details of individual learners. Keep the dashboard link private to your team.
</p>'
FROM public.institutions i
WHERE NOT EXISTS (
  SELECT 1 FROM public.email_templates et
  WHERE et.institution_id = i.id AND et.system_type = 'referral_link'
);
