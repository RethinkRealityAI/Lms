import type { SupabaseClient } from '@supabase/supabase-js';
import type { CmeCertificateRequest, CmeCertificateRequestWithUser, CmeRequestStatus } from '@/types/cme-requests';

/**
 * CME Certificate Requests.
 *
 * Physicians who have completed every catalog course request their official
 * (Mainpro+) certificate of completion. Requests are resolved by admins
 * ("certificate issued" / "declined") — the official certificate itself is
 * issued through SCAGO's external accreditation process.
 *
 * Inserts go through the `request_cme_certificate` SECURITY DEFINER RPC, which
 * enforces eligibility; the table has no client INSERT policy.
 */

/** Has this user completed every catalog course for their institution? */
export async function isEligibleForCme(
  supabase: SupabaseClient,
  userId: string,
  institutionId: string,
): Promise<boolean> {
  const { data, error } = await supabase.rpc('has_completed_all_courses', {
    p_user_id: userId,
    p_institution_id: institutionId,
  });
  if (error) return false;
  return data === true;
}

/** The user's most recent request (pending/issued/declined), if any. */
export async function getMyCmeRequest(
  supabase: SupabaseClient,
  userId: string,
): Promise<CmeCertificateRequest | null> {
  const { data } = await supabase
    .from('cme_certificate_requests')
    .select('*')
    .eq('user_id', userId)
    .order('requested_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as CmeCertificateRequest) ?? null;
}

/** Create a CME request via the eligibility-enforcing RPC. Idempotent (returns existing open/issued). */
export async function requestCmeCertificate(
  supabase: SupabaseClient,
  programLabel: string | null,
): Promise<{ status: CmeRequestStatus | null; created: boolean; error: string | null }> {
  const { data, error } = await supabase.rpc('request_cme_certificate', { p_program_label: programLabel });
  if (error) {
    const reason = /not_eligible/.test(error.message)
      ? 'You must complete all courses before requesting your certificate.'
      : error.message;
    return { status: null, created: false, error: reason };
  }
  const res = (data ?? {}) as { status?: CmeRequestStatus; created?: boolean };
  return { status: res.status ?? 'pending', created: !!res.created, error: null };
}

/** User cancels their own still-pending request. (RLS also enforces ownership; user_id filter is defense-in-depth.) */
export async function cancelMyCmeRequest(
  supabase: SupabaseClient,
  requestId: string,
  userId: string,
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('cme_certificate_requests')
    .delete()
    .eq('id', requestId)
    .eq('user_id', userId)
    .eq('status', 'pending');
  return { error: error?.message ?? null };
}

/** Admin: all requests for an institution (optionally filtered by status), newest first, with requester identity. */
export async function getCmeRequests(
  supabase: SupabaseClient,
  institutionId: string,
  status?: CmeRequestStatus,
): Promise<CmeCertificateRequestWithUser[]> {
  let query = supabase
    .from('cme_certificate_requests')
    .select('*, user:users!cme_certificate_requests_user_id_fkey(full_name, email)')
    .eq('institution_id', institutionId)
    .order('requested_at', { ascending: false });
  if (status) query = query.eq('status', status);
  const { data, error } = await query;
  if (error) return [];
  return (data ?? []) as unknown as CmeCertificateRequestWithUser[];
}

/** Admin: count of pending requests for an institution (for the nav badge). */
export async function getPendingCmeCount(
  supabase: SupabaseClient,
  institutionId: string,
): Promise<number> {
  const { count } = await supabase
    .from('cme_certificate_requests')
    .select('id', { count: 'exact', head: true })
    .eq('institution_id', institutionId)
    .eq('status', 'pending');
  return count ?? 0;
}

/** Admin: map of user_id -> pending request id (for the "CME requested" pill in the Users table). */
export async function getPendingCmeRequestByUser(
  supabase: SupabaseClient,
  institutionId: string,
): Promise<Record<string, string>> {
  const { data } = await supabase
    .from('cme_certificate_requests')
    .select('id, user_id')
    .eq('institution_id', institutionId)
    .eq('status', 'pending');
  const map: Record<string, string> = {};
  for (const row of (data ?? []) as Array<{ id: string; user_id: string }>) {
    map[row.user_id] = row.id;
  }
  return map;
}

/** Admin: resolve a request (mark issued or declined). institutionId scopes the write (defense-in-depth vs RLS). */
export async function resolveCmeRequest(
  supabase: SupabaseClient,
  requestId: string,
  resolverId: string,
  status: 'issued' | 'declined',
  institutionId: string,
  notes?: string | null,
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('cme_certificate_requests')
    .update({
      status,
      resolved_by: resolverId,
      resolved_at: new Date().toISOString(),
      notes: notes ?? null,
    })
    .eq('id', requestId)
    .eq('institution_id', institutionId);
  return { error: error?.message ?? null };
}
