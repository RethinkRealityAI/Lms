import type { SupabaseClient } from '@supabase/supabase-js';
import type { LegacyUser } from '@/types';

export async function getLegacyUsers(
  supabase: SupabaseClient,
  institutionId: string,
): Promise<LegacyUser[]> {
  const { data, error } = await supabase
    .from('legacy_users')
    .select('*')
    .eq('institution_id', institutionId)
    .order('full_name', { ascending: true });
  if (error) return [];
  return (data ?? []) as LegacyUser[];
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
