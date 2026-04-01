import type { SupabaseClient } from '@supabase/supabase-js';
import type { UserInvitation } from '@/types';

export async function getInvitations(
  supabase: SupabaseClient,
  institutionId: string,
): Promise<UserInvitation[]> {
  const { data, error } = await supabase
    .from('user_invitations')
    .select('*, users!invited_by(full_name, email)')
    .eq('institution_id', institutionId)
    .order('sent_at', { ascending: false });
  if (error) return [];
  return (data ?? []).map((row: any) => ({
    ...row,
    inviter_name: row.users?.full_name,
    inviter_email: row.users?.email,
    users: undefined,
  })) as UserInvitation[];
}

export async function createInvitation(
  supabase: SupabaseClient,
  invitation: {
    institution_id: string;
    email: string;
    role: string;
    invited_by: string;
    custom_message?: string;
    legacy_user_id?: string;
  },
): Promise<UserInvitation | null> {
  const { data, error } = await supabase
    .from('user_invitations')
    .insert(invitation)
    .select()
    .single();
  if (error) return null;
  return data as UserInvitation;
}

export async function cancelInvitation(
  supabase: SupabaseClient,
  invitationId: string,
): Promise<void> {
  await supabase
    .from('user_invitations')
    .update({ status: 'cancelled' })
    .eq('id', invitationId);
}
