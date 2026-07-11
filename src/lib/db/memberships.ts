import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Institution membership helpers (migration 055 — shared login, dual access).
 *
 * A single auth account can belong to multiple institutions. `institution_memberships`
 * is the access set; `users.institution_id` remains the user's PRIMARY/home institution.
 * All three helpers call SECURITY DEFINER RPCs so the membership table itself is never
 * read/written directly by the client.
 */

export type SignupPrecheckStatus = 'available' | 'member' | 'other_institution';

export interface SignupPrecheck {
  status: SignupPrecheckStatus;
  /** Display name of the account's primary institution (only for member/other_institution). */
  primary_name?: string;
}

/**
 * Slugs of every institution the CURRENT (authenticated) user may enter — their active
 * memberships plus their primary institution. Returns [] when unauthenticated or on error.
 */
export async function getMyInstitutionSlugs(supabase: SupabaseClient): Promise<string[]> {
  const { data, error } = await supabase.rpc('get_my_institution_slugs');
  if (error || !Array.isArray(data)) return [];
  return (data as unknown[]).filter((s): s is string => typeof s === 'string');
}

/**
 * Idempotently add the current user as a student member of `slug`. Used by the
 * "sign in to access the other program too" flow. Safe to call every sign-in.
 */
export async function joinInstitution(supabase: SupabaseClient, slug: string): Promise<void> {
  const { error } = await supabase.rpc('join_institution', { p_slug: slug });
  if (error) throw error;
}

/**
 * Pre-auth check for the signup form. Tells us whether an email already has an account
 * and, if so, whether it can already access this portal — so we can show a friendly
 * "just sign in" message instead of a dead-end block. Never returns password data.
 * Falls back to 'available' on any error (the normal signup attempt is still authoritative).
 */
export async function signupPrecheck(
  supabase: SupabaseClient,
  email: string,
  slug: string,
): Promise<SignupPrecheck> {
  const { data, error } = await supabase.rpc('signup_precheck', {
    p_email: email,
    p_slug: slug,
  });
  if (error || !data || typeof data !== 'object') return { status: 'available' };
  const obj = data as { status?: string; primary_name?: string };
  const status: SignupPrecheckStatus =
    obj.status === 'member' || obj.status === 'other_institution' ? obj.status : 'available';
  return { status, primary_name: obj.primary_name };
}
