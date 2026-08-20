import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Referral tracking (migration 068).
 *
 * Attribution is stamped onto `users.referral_code_id` at signup by the
 * `handle_new_user` trigger, so every figure below is derived from real
 * progress/certificate rows rather than from web-analytics sessions.
 *
 * Per engineering rule 9, every function takes a SupabaseClient — nothing here
 * imports the server-only client, so the admin client components can use it.
 */

export interface ReferralCode {
  id: string;
  institution_id: string;
  code: string;
  label: string;
  description: string | null;
  owner_name: string | null;
  owner_email: string | null;
  landing_path: string | null;
  public_token: string;
  is_active: boolean;
  archived_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReferralCodeStats {
  referral_code_id: string;
  visits: number;
  signups: number;
  learners_started: number;
  courses_completed: number;
  certificates: number;
  last_signup_at: string | null;
}

export type ReferralCodeWithStats = ReferralCode & { stats: ReferralCodeStats };

/* ------------------------------------------------------------------ */
/* Public report shape (mirrors get_referral_report's jsonb)           */
/* ------------------------------------------------------------------ */

export interface ReferralReportTotals {
  visits: number;
  signups: number;
  learners_started: number;
  course_enrollments: number;
  lessons_completed: number;
  courses_completed: number;
  learners_completed: number;
  /** PEOPLE holding at least one live certificate — the funnel's last step. */
  learners_certificated: number;
  /** CERTIFICATES issued; one learner can hold several. */
  certificates: number;
}

export interface ReferralReportDay {
  day: string;
  visits: number;
  signups: number;
}

export interface ReferralReportCourse {
  title: string;
  enrolled: number;
  completed: number;
}

export interface ReferralReportBreakdown {
  label: string;
  count: number;
}

export interface ReferralReport {
  code: {
    code: string;
    label: string;
    description: string | null;
    owner_name: string | null;
    is_active: boolean;
    created_at: string;
  };
  institution: { name: string; slug: string };
  range: { from: string; to: string; is_all_time: boolean };
  generated_at: string;
  totals: ReferralReportTotals;
  /**
   * How many of the cohort actually stated a role/country. Occupation is a
   * profile field rather than a signup field, so it is usually blank — the UI
   * uses this to caption the gap instead of charting a "Not specified" bar.
   */
  profile_stated: { occupation: number; country: number; total: number };
  daily: ReferralReportDay[];
  courses: ReferralReportCourse[];
  occupations: ReferralReportBreakdown[];
  countries: ReferralReportBreakdown[];
  lifetime: {
    visits: number;
    signups: number;
    certificates: number;
    first_visit_at: string | null;
  };
}

/* ------------------------------------------------------------------ */
/* Public report                                                       */
/* ------------------------------------------------------------------ */

/**
 * Fetch the token-gated public report. Returns null for an unknown/rotated
 * token — the caller renders a neutral "not found" rather than leaking whether
 * the token ever existed.
 */
export async function getReferralReport(
  supabase: SupabaseClient,
  token: string,
  from?: string | null,
  to?: string | null,
): Promise<ReferralReport | null> {
  const { data, error } = await supabase.rpc('get_referral_report', {
    p_token: token,
    p_from: from ?? null,
    p_to: to ?? null,
  });
  if (error) throw error;
  return (data as ReferralReport | null) ?? null;
}

/* ------------------------------------------------------------------ */
/* Admin CRUD                                                          */
/* ------------------------------------------------------------------ */

export async function listReferralCodes(
  supabase: SupabaseClient,
  institutionId: string,
): Promise<ReferralCode[]> {
  const { data, error } = await supabase
    .from('referral_codes')
    .select('*')
    .eq('institution_id', institutionId)
    .is('archived_at', null)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as ReferralCode[];
}

export async function getReferralOverview(
  supabase: SupabaseClient,
  institutionId: string,
): Promise<Record<string, ReferralCodeStats>> {
  const { data, error } = await supabase.rpc('admin_referral_overview', {
    p_institution_id: institutionId,
  });
  if (error) throw error;
  const map: Record<string, ReferralCodeStats> = {};
  for (const row of (data ?? []) as ReferralCodeStats[]) {
    map[row.referral_code_id] = row;
  }
  return map;
}

/** Codes plus their stats. Stats failing must not blank the management table,
 *  so a stats error degrades to zeroes rather than throwing. */
export async function listReferralCodesWithStats(
  supabase: SupabaseClient,
  institutionId: string,
): Promise<ReferralCodeWithStats[]> {
  const codes = await listReferralCodes(supabase, institutionId);
  let stats: Record<string, ReferralCodeStats> = {};
  try {
    stats = await getReferralOverview(supabase, institutionId);
  } catch {
    stats = {};
  }
  return codes.map((c) => ({
    ...c,
    stats:
      stats[c.id] ??
      {
        referral_code_id: c.id,
        visits: 0,
        signups: 0,
        learners_started: 0,
        courses_completed: 0,
        certificates: 0,
        last_signup_at: null,
      },
  }));
}

export interface ReferralCodeInput {
  code: string;
  label: string;
  description?: string | null;
  owner_name?: string | null;
  owner_email?: string | null;
  landing_path?: string | null;
  is_active?: boolean;
}

export async function createReferralCode(
  supabase: SupabaseClient,
  institutionId: string,
  input: ReferralCodeInput,
  createdBy?: string | null,
): Promise<ReferralCode> {
  const { data, error } = await supabase
    .from('referral_codes')
    .insert({
      institution_id: institutionId,
      code: input.code.trim().toLowerCase(),
      label: input.label.trim(),
      description: input.description?.trim() || null,
      owner_name: input.owner_name?.trim() || null,
      owner_email: input.owner_email?.trim().toLowerCase() || null,
      landing_path: input.landing_path?.trim() || null,
      is_active: input.is_active ?? true,
      created_by: createdBy ?? null,
    })
    .select('*')
    .single();
  if (error) throw error;
  return data as ReferralCode;
}

export async function updateReferralCode(
  supabase: SupabaseClient,
  id: string,
  input: Partial<ReferralCodeInput>,
): Promise<ReferralCode> {
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (input.code !== undefined) patch.code = input.code.trim().toLowerCase();
  if (input.label !== undefined) patch.label = input.label.trim();
  if (input.description !== undefined) patch.description = input.description?.trim() || null;
  if (input.owner_name !== undefined) patch.owner_name = input.owner_name?.trim() || null;
  if (input.owner_email !== undefined) {
    patch.owner_email = input.owner_email?.trim().toLowerCase() || null;
  }
  if (input.landing_path !== undefined) patch.landing_path = input.landing_path?.trim() || null;
  if (input.is_active !== undefined) patch.is_active = input.is_active;

  // Rule 25: select back, so an RLS-filtered 0-row update can't report success.
  const { data, error } = await supabase
    .from('referral_codes')
    .update(patch)
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return data as ReferralCode;
}

/**
 * Archive rather than delete: the attributed users keep pointing at the row, so
 * a hard delete would silently null out historical attribution (ON DELETE SET
 * NULL) and rewrite past reports.
 */
export async function archiveReferralCode(
  supabase: SupabaseClient,
  id: string,
): Promise<void> {
  const { data, error } = await supabase
    .from('referral_codes')
    .update({ archived_at: new Date().toISOString(), is_active: false })
    .eq('id', id)
    .select('id');
  if (error) throw error;
  if (!data || data.length === 0) {
    throw new Error('Archive failed — the code was not found or you lack permission.');
  }
}

/** Invalidates the old public report URL and returns the new token. */
export async function rotateReferralToken(
  supabase: SupabaseClient,
  id: string,
): Promise<string> {
  const { data, error } = await supabase.rpc('admin_rotate_referral_token', {
    p_code_id: id,
  });
  if (error) throw error;
  return data as string;
}

/* ------------------------------------------------------------------ */
/* URL helpers                                                         */
/* ------------------------------------------------------------------ */

/** The link an ambassador shares. Short on purpose — it goes on flyers. */
export function referralShareUrl(origin: string, code: string): string {
  return `${origin.replace(/\/$/, '')}/r/${code}`;
}

/** The private, unguessable dashboard URL. */
export function referralReportUrl(origin: string, token: string): string {
  return `${origin.replace(/\/$/, '')}/report/${token}`;
}
