/**
 * Shared referral constants — safe to import from client AND server.
 *
 * Single source of truth for: the code format (must mirror the CHECK constraint
 * in migration 068), the cookie names used by the tracked link, the funnel
 * definition rendered by both dashboards, and the validated chart palette.
 */

/**
 * Attribution cookie: which ambassador sent this visitor.
 *
 * LAST-TOUCH — the most recent tracked link opened within the cookie window
 * wins. Chosen over first-touch so a stale link from a finished campaign cannot
 * outrank the one that actually drove the signup, and because it is the rule
 * that can be stated to ambassadors in one sentence.
 */
export const REFERRAL_COOKIE = 'lms_ref';
/**
 * Opaque per-browser id. Exists ONLY to collapse one person's repeat opens into
 * a single daily visit — never joined to a user, never sent anywhere else.
 */
export const REFERRAL_VISITOR_COOKIE = 'lms_rv';

/** 90 days: long enough that a conference talk in March still credits an April signup. */
export const REFERRAL_COOKIE_MAX_AGE_SECONDS = 90 * 24 * 60 * 60;
export const REFERRAL_VISITOR_COOKIE_MAX_AGE_SECONDS = 400 * 24 * 60 * 60;

/** Query param an ambassador can append to any existing URL. */
export const REFERRAL_QUERY_PARAM = 'ref';

/**
 * Where the visitor came from, carried from the tracked-link open to the
 * signup so the account can be tagged with the CHANNEL that produced it.
 * Value shape: `<category>` or `<category>|<campaign>` — both halves already
 * normalised by the /r route. Readable by JS for the same reason as lms_ref.
 */
export const REFERRAL_SOURCE_COOKIE = 'lms_ref_src';

/**
 * Mirrors `referral_codes.code`'s CHECK constraint exactly. Lowercase, url-safe,
 * 3–40 chars, no leading/trailing hyphen — short enough to read aloud at a
 * conference and to sit under a QR code on a printed flyer.
 */
export const REFERRAL_CODE_PATTERN = /^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/;

export function normalizeReferralCode(raw: string | null | undefined): string {
  return (raw ?? '').trim().toLowerCase();
}

export function isValidReferralCode(raw: string | null | undefined): boolean {
  const code = normalizeReferralCode(raw);
  return REFERRAL_CODE_PATTERN.test(code);
}

/**
 * Turn a free-text label ("Northwestern Ontario") into a candidate code
 * ("northwestern-ontario"). Used by the admin create form to suggest a code.
 */
export function suggestReferralCode(label: string): string {
  const slug = label
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
    .replace(/-+$/g, '');
  // The pattern needs >= 3 chars and no trailing hyphen.
  return slug.length >= 3 ? slug : '';
}

/**
 * Read the attribution cookie in a client component. The cookie is set
 * non-httpOnly precisely so the signup form can read it here and attach the
 * code to the Supabase signup metadata, where `handle_new_user` picks it up.
 * Returns null on the server or when nothing valid is stored.
 */
export function getReferralCodeFromCookie(): string | null {
  if (typeof document === 'undefined') return null;
  const entry = document.cookie
    .split('; ')
    .find((c) => c.startsWith(`${REFERRAL_COOKIE}=`));
  if (!entry) return null;
  const raw = entry.slice(REFERRAL_COOKIE.length + 1);
  let decoded = raw;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    // A malformed cookie value must not throw inside the signup handler.
    decoded = raw;
  }
  const code = normalizeReferralCode(decoded);
  return isValidReferralCode(code) ? code : null;
}

/**
 * Read the source cookie set by the tracked link. Returns nulls rather than
 * throwing for anything malformed — this runs inside the signup handler.
 * The values are re-validated by `handle_new_user` before storage, so this
 * parse only needs to be safe, not authoritative.
 */
export function getReferralSourceFromCookie(): {
  category: string | null;
  campaign: string | null;
} {
  const none = { category: null, campaign: null };
  if (typeof document === 'undefined') return none;
  const entry = document.cookie
    .split('; ')
    .find((c) => c.startsWith(`${REFERRAL_SOURCE_COOKIE}=`));
  if (!entry) return none;
  let raw = entry.slice(REFERRAL_SOURCE_COOKIE.length + 1);
  try {
    raw = decodeURIComponent(raw);
  } catch {
    // keep raw as-is
  }
  const [category, campaign] = raw.split('|');
  return {
    category: /^[a-z]{3,16}$/.test(category ?? '') ? category : null,
    campaign: /^[a-z0-9][a-z0-9-]{1,31}$/.test(campaign ?? '') ? campaign : null,
  };
}

/**
 * Only same-origin, non-protocol-relative paths may be used as a landing
 * destination — `//evil.com` and `https://evil.com` are both open redirects
 * that would let a referral link launder a phishing destination through our
 * domain, which is exactly the trust we are asking people to extend to it.
 */
export function isSafeLandingPath(path: string | null | undefined): boolean {
  if (!path) return false;
  if (!path.startsWith('/')) return false;
  if (path.startsWith('//')) return false;
  if (path.includes('\\')) return false;
  return true;
}

export function sanitizeLandingPath(
  path: string | null | undefined,
  fallback: string,
): string {
  return isSafeLandingPath(path) ? (path as string) : fallback;
}

/* ------------------------------------------------------------------ */
/* Report date range                                                   */
/* ------------------------------------------------------------------ */

/**
 * Lives HERE, not in the dashboard component, because the server page needs it
 * to parse `?range=` before rendering. A server component that imports a value
 * from a `'use client'` module gets a client-reference proxy rather than the
 * value, so `RANGE_PRESETS.map(...)` throws at build time
 * ("RANGE_PRESETS.map is not a function" — a real production build failure).
 */
export const RANGE_PRESETS = [
  { key: '30', label: 'Last 30 days' },
  { key: '90', label: 'Last 90 days' },
  { key: '365', label: 'Last 12 months' },
  { key: 'all', label: 'All time' },
] as const;

export type RangeKey = (typeof RANGE_PRESETS)[number]['key'];

/* ------------------------------------------------------------------ */
/* Funnel                                                              */
/* ------------------------------------------------------------------ */

export interface FunnelStep {
  key: 'visits' | 'signups' | 'learners_started' | 'learners_completed' | 'learners_certificated';
  label: string;
  /** Plain-language definition shown on the public report, so an external
   *  reader never has to guess what a number counts. */
  help: string;
}

/**
 * Ordered stages, all counting PEOPLE. `courses_completed` is deliberately NOT
 * a step: it counts course-completions rather than people, so one learner
 * finishing three modules would make the funnel widen.
 *
 * Caveat that the UI must respect: steps 2–5 are a strict subset chain (all
 * derived from the same signup cohort), but step 1 is NOT their superset in a
 * windowed view — link opens are counted inside the window, while a signup in
 * the window may trace back to an open before it. So signups CAN exceed opens
 * for a short range, and the UI must not claim otherwise or print a >100%
 * conversion. See `hasMeaningfulConversion` below.
 */
export const FUNNEL_STEPS: readonly FunnelStep[] = [
  {
    key: 'visits',
    label: 'Link opens',
    help: 'Browsers that opened the tracked link, each counted once for the whole period. Approximate: one person using two devices or browsers counts twice. Every stage below counts real accounts and is exact.',
  },
  {
    key: 'signups',
    label: 'Accounts created',
    help: 'People who created an account after arriving through this link.',
  },
  {
    key: 'learners_started',
    label: 'Started a module',
    help: 'Of those accounts, how many enrolled in at least one module.',
  },
  {
    key: 'learners_completed',
    label: 'Finished a module',
    help: 'Of those accounts, how many completed every lesson in at least one module.',
  },
  {
    // PEOPLE holding a certificate, not the number of certificates: a learner
    // who finishes three modules holds three, which would widen the funnel and
    // print a conversion above 100%. The certificate TOTAL is shown as a stat
    // tile and in the table, where that is the question being asked.
    key: 'learners_certificated',
    label: 'Earned a certificate',
    help: 'Of those accounts, how many now hold at least one certificate. Revoked certificates are not counted.',
  },
] as const;

/**
 * Whether a "X% of previous" figure is meaningful for the step at `index`.
 *
 * Only false for the visits → signups transition, where the two numbers count
 * populations selected on different dates (see FUNNEL_STEPS). Printing "150% of
 * previous" there would look like a bug and undermine trust in every other
 * number on the page.
 */
export function hasMeaningfulConversion(index: number, value: number, previous: number): boolean {
  if (index <= 0) return false;
  if (previous <= 0) return false;
  // The opens → accounts step is the only one whose populations can disagree.
  if (index === 1 && value > previous) return false;
  return true;
}

/* ------------------------------------------------------------------ */
/* Chart palette                                                       */
/* ------------------------------------------------------------------ */

/**
 * Categorical slots 1 and 2. Validated against a #ffffff surface:
 * lightness band PASS, chroma floor PASS, CVD separation ΔE 24.7 (protan),
 * normal-vision ΔE 33.6, contrast >= 3:1 — all PASS.
 * Do not substitute by eye; re-run the validator if these ever change.
 */
export const SERIES_COLORS = {
  /** Slot 1 — accounts created (the series the report is actually about). */
  signups: '#2a78d6',
  /** Slot 2 — link opens (context). */
  visits: '#eb6834',
} as const;

/**
 * Ordinal blue ramp for the funnel — one hue, monotone light→dark, validated
 * with `--ordinal` (light end 2.11:1 vs white, all adjacent ΔL gaps >= 0.06).
 * Ordered stages get an ordered ramp; they are not distinct identities.
 */
export const FUNNEL_RAMP = ['#86b6ef', '#5598e7', '#2a78d6', '#1c5cab', '#104281'] as const;

/** Chart chrome. Recessive by design — the data is the only loud thing. */
export const CHART_INK = {
  gridline: '#e1e0d9',
  axis: '#c3c2b7',
  muted: '#898781',
  textSecondary: '#52514e',
  textPrimary: '#0b0b0b',
  surface: '#ffffff',
} as const;
