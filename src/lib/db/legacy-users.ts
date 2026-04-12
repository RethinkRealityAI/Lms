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
