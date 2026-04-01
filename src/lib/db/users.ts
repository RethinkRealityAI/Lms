import type { SupabaseClient } from '@supabase/supabase-js';

export async function getUserInstitutionId(supabase: SupabaseClient, userId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('users')
    .select('institution_id')
    .eq('id', userId)
    .single();
  if (error) return null;
  return data?.institution_id ?? null;
}

export interface ActiveUser {
  id: string;
  email: string;
  role: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
  enrollment_count: number;
  last_activity: string | null;
}

export async function getActiveUsers(
  supabase: SupabaseClient,
  institutionId: string,
): Promise<ActiveUser[]> {
  const { data, error } = await supabase
    .from('users')
    .select('id, email, role, full_name, avatar_url, created_at, updated_at')
    .eq('institution_id', institutionId)
    .order('created_at', { ascending: false });
  if (error || !data) return [];

  const userIds = data.map((u) => u.id);
  if (userIds.length === 0) return data.map((u) => ({ ...u, enrollment_count: 0, last_activity: null }));

  const { data: enrollments } = await supabase
    .from('course_enrollments')
    .select('user_id')
    .in('user_id', userIds);

  const enrollmentCounts: Record<string, number> = {};
  for (const e of enrollments ?? []) {
    enrollmentCounts[e.user_id] = (enrollmentCounts[e.user_id] || 0) + 1;
  }

  const { data: progress } = await supabase
    .from('progress')
    .select('user_id, completed_at')
    .in('user_id', userIds)
    .order('completed_at', { ascending: false });

  const lastActivity: Record<string, string> = {};
  for (const p of progress ?? []) {
    if (p.completed_at && !lastActivity[p.user_id]) {
      lastActivity[p.user_id] = p.completed_at;
    }
  }

  return data.map((u) => ({
    ...u,
    enrollment_count: enrollmentCounts[u.id] || 0,
    last_activity: lastActivity[u.id] || null,
  }));
}

export async function updateUserDetails(
  supabase: SupabaseClient,
  userId: string,
  changes: { full_name?: string; role?: string; bio?: string },
): Promise<void> {
  const { error } = await supabase
    .from('users')
    .update({ ...changes, updated_at: new Date().toISOString() })
    .eq('id', userId);
  if (error) throw error;
}

export async function removeUserFromCourse(
  supabase: SupabaseClient,
  userId: string,
  courseId: string,
): Promise<void> {
  await supabase
    .from('course_enrollments')
    .delete()
    .eq('user_id', userId)
    .eq('course_id', courseId);
  const { data: lessons } = await supabase
    .from('lessons')
    .select('id')
    .eq('course_id', courseId);
  if (lessons && lessons.length > 0) {
    await supabase
      .from('progress')
      .delete()
      .eq('user_id', userId)
      .in('lesson_id', lessons.map((l) => l.id));
  }
}
