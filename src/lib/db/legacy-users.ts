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
