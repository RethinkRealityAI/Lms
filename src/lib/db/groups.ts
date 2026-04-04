import type { SupabaseClient } from '@supabase/supabase-js';
import type { UserGroup, UserGroupWithCounts, UserGroupMember } from '@/types';

export async function getGroups(
  supabase: SupabaseClient,
  institutionId: string
): Promise<UserGroupWithCounts[]> {
  const { data, error } = await supabase
    .from('user_groups')
    .select('*, user_group_members(count), course_group_assignments(count)')
    .eq('institution_id', institutionId)
    .order('name');

  if (error || !data) return [];

  return data.map((g: any) => ({
    ...g,
    member_count: g.user_group_members?.[0]?.count ?? 0,
    course_count: g.course_group_assignments?.[0]?.count ?? 0,
  }));
}

export async function getGroup(
  supabase: SupabaseClient,
  groupId: string
): Promise<UserGroup | null> {
  const { data, error } = await supabase
    .from('user_groups')
    .select('*')
    .eq('id', groupId)
    .single();

  if (error) return null;
  return data;
}

export async function createGroup(
  supabase: SupabaseClient,
  input: { name: string; institution_id: string; description?: string }
): Promise<UserGroup | null> {
  const { data, error } = await supabase
    .from('user_groups')
    .insert([{ name: input.name, institution_id: input.institution_id, description: input.description }])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateGroup(
  supabase: SupabaseClient,
  groupId: string,
  changes: { name?: string; description?: string }
): Promise<void> {
  const { error } = await supabase
    .from('user_groups')
    .update({ ...changes, updated_at: new Date().toISOString() })
    .eq('id', groupId);

  if (error) throw error;
}

export async function deleteGroup(
  supabase: SupabaseClient,
  groupId: string
): Promise<void> {
  const { error } = await supabase
    .from('user_groups')
    .delete()
    .eq('id', groupId);

  if (error) throw error;
}

export async function getGroupMembers(
  supabase: SupabaseClient,
  groupId: string
): Promise<UserGroupMember[]> {
  const { data, error } = await supabase
    .from('user_group_members')
    .select('*, users:user_id(email, full_name, role), legacy_users:legacy_user_id(email, full_name)')
    .eq('group_id', groupId)
    .order('added_at', { ascending: false });

  if (error || !data) return [];

  return data.map((m: any) => {
    const isLegacy = m.legacy_user_id != null;
    const source = isLegacy ? 'legacy' as const : 'active' as const;
    const joined = isLegacy ? m.legacy_users : m.users;
    return {
      id: m.id,
      group_id: m.group_id,
      user_id: m.user_id,
      legacy_user_id: m.legacy_user_id,
      added_at: m.added_at,
      email: joined?.email,
      full_name: joined?.full_name,
      role: isLegacy ? undefined : joined?.role,
      source,
    };
  });
}

export async function addGroupMembers(
  supabase: SupabaseClient,
  groupId: string,
  userIds: string[]
): Promise<void> {
  if (userIds.length === 0) return;
  const rows = userIds.map((user_id) => ({ group_id: groupId, user_id }));
  const { error } = await supabase.from('user_group_members').insert(rows);
  if (error) throw error;
}

export async function addLegacyGroupMembers(
  supabase: SupabaseClient,
  groupId: string,
  legacyUserIds: string[]
): Promise<void> {
  if (legacyUserIds.length === 0) return;
  const rows = legacyUserIds.map((legacy_user_id) => ({ group_id: groupId, legacy_user_id }));
  const { error } = await supabase.from('user_group_members').insert(rows);
  if (error) throw error;
}

export async function removeGroupMember(
  supabase: SupabaseClient,
  groupId: string,
  memberId: string,
  source: 'active' | 'legacy'
): Promise<void> {
  const column = source === 'legacy' ? 'legacy_user_id' : 'user_id';
  const { error } = await supabase
    .from('user_group_members')
    .delete()
    .eq('group_id', groupId)
    .eq(column, memberId);

  if (error) throw error;
}

export async function getUserGroupIds(
  supabase: SupabaseClient,
  userId: string
): Promise<string[]> {
  const { data, error } = await supabase
    .from('user_group_members')
    .select('group_id')
    .eq('user_id', userId);

  if (error || !data) return [];
  return data.map((r: any) => r.group_id);
}
