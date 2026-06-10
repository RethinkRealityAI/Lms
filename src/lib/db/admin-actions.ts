import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Admin operations backed by the SECURITY DEFINER RPCs from migration 038.
 * All RPCs are institution-scoped server-side (platform_admin exempt) and
 * log analytics events — keep using these instead of direct table writes.
 * Auth-level ban/unban + password reset live in /api/admin/users/actions
 * (they need the service-role auth API).
 */

export type AppRole = 'student' | 'admin' | 'institution_admin' | 'platform_admin';

export async function setUserRole(
  supabase: SupabaseClient,
  userId: string,
  role: AppRole,
): Promise<void> {
  const { error } = await supabase.rpc('admin_set_user_role', { p_user_id: userId, p_role: role });
  if (error) throw error;
}

export async function setUserActive(
  supabase: SupabaseClient,
  userId: string,
  active: boolean,
): Promise<void> {
  const { error } = await supabase.rpc('admin_set_user_active', { p_user_id: userId, p_active: active });
  if (error) throw error;
}

export interface AdminProfileUpdate {
  full_name?: string | null;
  occupation?: string | null;
  affiliation?: string | null;
  country?: string | null;
}

/** Institution-scoped profile edit (admin RPC, migration 040). */
export async function adminUpdateUserProfile(
  supabase: SupabaseClient,
  userId: string,
  profile: AdminProfileUpdate,
): Promise<void> {
  const { error } = await supabase.rpc('admin_update_user_profile', {
    p_user_id: userId,
    p_full_name: profile.full_name ?? null,
    p_occupation: profile.occupation ?? null,
    p_affiliation: profile.affiliation ?? null,
    p_country: profile.country ?? null,
  });
  if (error) throw error;
}

export interface ProgressResetResult {
  lessons_cleared: number;
  certificate_revoked: boolean;
}

/** Undo a user's course completion; optionally revokes the certificate. */
export async function resetCourseProgress(
  supabase: SupabaseClient,
  userId: string,
  courseId: string,
  revokeCertificate = true,
): Promise<ProgressResetResult> {
  const { data, error } = await supabase.rpc('admin_reset_course_progress', {
    p_user_id: userId,
    p_course_id: courseId,
    p_revoke_certificate: revokeCertificate,
  });
  if (error) throw error;
  return data as ProgressResetResult;
}

/** Enroll users into a course; returns how many were newly enrolled. */
export async function enrollUsers(
  supabase: SupabaseClient,
  courseId: string,
  userIds: string[],
): Promise<number> {
  const { data, error } = await supabase.rpc('admin_enroll_users', {
    p_course_id: courseId,
    p_user_ids: userIds,
  });
  if (error) throw error;
  return (data as number) ?? 0;
}

export async function unenrollUser(
  supabase: SupabaseClient,
  courseId: string,
  userId: string,
): Promise<void> {
  const { error } = await supabase.rpc('admin_unenroll_user', {
    p_course_id: courseId,
    p_user_id: userId,
  });
  if (error) throw error;
}

/** Prune content_activity_log rows older than keepDays (admin only). */
export async function pruneContentActivityLog(
  supabase: SupabaseClient,
  keepDays = 90,
): Promise<number> {
  const { data, error } = await supabase.rpc('prune_content_activity_log', { p_keep_days: keepDays });
  if (error) throw error;
  return (data as number) ?? 0;
}
