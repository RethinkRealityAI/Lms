import type { SupabaseClient } from '@supabase/supabase-js';
import type { LegacyUser } from '@/types';

export async function getLegacyUsers(
  supabase: SupabaseClient,
  institutionId: string,
): Promise<LegacyUser[]> {
  // Supabase defaults to 1,000 rows max. Fetch all with pagination.
  const PAGE_SIZE = 1000;
  const allUsers: LegacyUser[] = [];
  let from = 0;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from('legacy_users')
      .select('*')
      .eq('institution_id', institutionId)
      .order('full_name', { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (error) return allUsers;
    allUsers.push(...((data ?? []) as LegacyUser[]));
    hasMore = (data?.length ?? 0) === PAGE_SIZE;
    from += PAGE_SIZE;
  }

  return allUsers;
}

export async function updateLegacyUserInviteStatus(
  supabase: SupabaseClient,
  legacyUserId: string,
  invitedAt: string,
): Promise<void> {
  await supabase
    .from('legacy_users')
    .update({ invited_at: invitedAt })
    .eq('id', legacyUserId);
}

/** The current user's prior-platform stats from their linked legacy record, if any. */
export interface LegacyHistory {
  full_name: string | null;
  avg_progress: number | null;
  avg_score: number | null;
  completions: number | null;
  completed_percent: number | null;
  date_registered: string | null;
}

export async function getMyLegacyHistory(
  supabase: SupabaseClient,
  userId: string,
): Promise<LegacyHistory | null> {
  const { data } = await supabase
    .from('legacy_users')
    .select('full_name, avg_progress, avg_score, completions, completed_percent, date_registered')
    .eq('linked_user_id', userId)
    .maybeSingle();
  return (data as LegacyHistory) ?? null;
}

/** Retroactively claim the caller's OWN legacy profile (matched on their verified email). */
export async function claimMyLegacyProfile(
  supabase: SupabaseClient,
): Promise<{ claimed: boolean; reason?: string; error: string | null }> {
  const { data, error } = await supabase.rpc('claim_my_legacy_profile');
  if (error) return { claimed: false, error: error.message };
  const res = (data ?? {}) as { claimed?: boolean; reason?: string };
  return { claimed: !!res.claimed, reason: res.reason, error: null };
}

/** Admin: manually link an unclaimed legacy record to an existing account (same institution). */
export async function adminLinkLegacyProfile(
  supabase: SupabaseClient,
  legacyUserId: string,
  userId: string,
): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('admin_link_legacy_profile', {
    p_legacy_user_id: legacyUserId,
    p_user_id: userId,
  });
  return { error: error?.message ?? null };
}

/** One legacy user's imported EdApp per-course history (legacy_course_completions). */
export interface LegacyCourseCompletion {
  legacy_user_id: string;
  course_id: string | null;
  course_title: string | null;
  completed_at: string | null;
  progress_percent: number | null;
  lessons_completed: number | null;
  lessons_total: number | null;
  time_spent_minutes: number | null;
}

/** Aggregate of what a claim would materialize for one legacy user. */
export interface LegacyCompletionSummary {
  /** courses with any imported progress (mapped to a real course) */
  coursesTouched: number;
  /** completed courses → one backdated certificate each on claim (matches materialize: completed_at set OR >= 95%) */
  certificatesWaiting: number;
  /** completed the EdApp "Module 14" CME-request module → pending CME request on claim */
  cmeRequestWaiting: boolean;
  lastCompletedAt: string | null;
  totalTimeSpentMinutes: number;
}

const isCompletedRow = (r: LegacyCourseCompletion) =>
  r.completed_at != null || (r.progress_percent ?? 0) >= 95;

/**
 * Admin: per-legacy-user completion summaries for an institution, keyed by
 * legacy_user_id. Powers the "certificates waiting" column + claim-invite
 * targeting in the legacy users tab. Paginated (rows can exceed 1,000).
 */
export async function getLegacyCompletionSummaries(
  supabase: SupabaseClient,
  institutionId: string,
): Promise<Record<string, LegacyCompletionSummary>> {
  const PAGE_SIZE = 1000;
  const rows: LegacyCourseCompletion[] = [];
  let from = 0;
  let hasMore = true;
  while (hasMore) {
    const { data, error } = await supabase
      .from('legacy_course_completions')
      .select('legacy_user_id, course_id, course_title, completed_at, progress_percent, lessons_completed, lessons_total, time_spent_minutes')
      .eq('institution_id', institutionId)
      .range(from, from + PAGE_SIZE - 1);
    if (error) break;
    rows.push(...((data ?? []) as LegacyCourseCompletion[]));
    hasMore = (data?.length ?? 0) === PAGE_SIZE;
    from += PAGE_SIZE;
  }

  const byUser: Record<string, LegacyCompletionSummary> = {};
  for (const row of rows) {
    const summary = (byUser[row.legacy_user_id] ??= {
      coursesTouched: 0,
      certificatesWaiting: 0,
      cmeRequestWaiting: false,
      lastCompletedAt: null,
      totalTimeSpentMinutes: 0,
    });
    summary.totalTimeSpentMinutes += row.time_spent_minutes ?? 0;
    if (row.course_id) {
      summary.coursesTouched += 1;
      if (isCompletedRow(row)) summary.certificatesWaiting += 1;
    } else if (isCompletedRow(row)) {
      // course_id null = the EdApp "Module 14" CME-request row
      summary.cmeRequestWaiting = true;
    }
    if (row.completed_at && (!summary.lastCompletedAt || row.completed_at > summary.lastCompletedAt)) {
      summary.lastCompletedAt = row.completed_at;
    }
  }
  return byUser;
}

/** Admin: a linked user's imported EdApp history rows (for the user-detail dialog). */
export async function getLegacyCompletionsForUser(
  supabase: SupabaseClient,
  userId: string,
): Promise<LegacyCourseCompletion[]> {
  const { data: legacy } = await supabase
    .from('legacy_users')
    .select('id')
    .eq('linked_user_id', userId)
    .maybeSingle();
  if (!legacy) return [];
  const { data } = await supabase
    .from('legacy_course_completions')
    .select('legacy_user_id, course_id, course_title, completed_at, progress_percent, lessons_completed, lessons_total, time_spent_minutes')
    .eq('legacy_user_id', legacy.id)
    .order('course_title', { ascending: true });
  return (data ?? []) as LegacyCourseCompletion[];
}

/** Admin: unclaimed legacy users for an institution (for the manual-link picker). Paginated (can exceed 1,000). */
export async function getUnclaimedLegacyUsers(
  supabase: SupabaseClient,
  institutionId: string,
): Promise<LegacyUser[]> {
  const PAGE_SIZE = 1000;
  const all: LegacyUser[] = [];
  let from = 0;
  let hasMore = true;
  while (hasMore) {
    const { data, error } = await supabase
      .from('legacy_users')
      .select('*')
      .eq('institution_id', institutionId)
      .is('linked_user_id', null)
      .order('full_name', { ascending: true })
      .range(from, from + PAGE_SIZE - 1);
    if (error) return all;
    all.push(...((data ?? []) as LegacyUser[]));
    hasMore = (data?.length ?? 0) === PAGE_SIZE;
    from += PAGE_SIZE;
  }
  return all;
}
