import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Analytics events (analytics_events table, migration 037).
 * Most events are captured by DB triggers (lesson_completed, enrolled,
 * unenrolled, certificate_issued/revoked/restored, role_changed,
 * user_deactivated/reactivated, progress_reset). Sign-ins are inserted
 * app-side via logSignInEvent().
 */

export interface AnalyticsEvent {
  id: string;
  institution_id: string;
  user_id: string | null;
  event_type: string;
  entity_type: string | null;
  entity_id: string | null;
  payload: Record<string, unknown>;
  created_at: string;
}

/** Records a sign-in for the CURRENT user. Safe to fire-and-forget. */
export async function logSignInEvent(
  supabase: SupabaseClient,
  userId: string,
  institutionId: string | null,
): Promise<void> {
  if (!institutionId) return;
  await supabase.from('analytics_events').insert({
    institution_id: institutionId,
    user_id: userId,
    event_type: 'sign_in',
    payload: {},
  });
}

/** Recent events for an institution (admin only — enforced by RLS). */
export async function getRecentEvents(
  supabase: SupabaseClient,
  institutionId: string,
  limit = 50,
): Promise<AnalyticsEvent[]> {
  const { data, error } = await supabase
    .from('analytics_events')
    .select('*')
    .eq('institution_id', institutionId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as AnalyticsEvent[];
}

/** All events for one user, newest first (admin only — enforced by RLS). */
export async function getUserEvents(
  supabase: SupabaseClient,
  userId: string,
  limit = 100,
): Promise<AnalyticsEvent[]> {
  const { data, error } = await supabase
    .from('analytics_events')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as AnalyticsEvent[];
}

export interface EventCounts {
  /** events per type within the window */
  byType: Record<string, number>;
  /** distinct users with a sign_in per ISO date (yyyy-mm-dd) */
  signInsByDay: Record<string, number>;
  /** distinct users with any event in the window */
  activeUsers: number;
}

/**
 * Aggregated event counts for the last N days (admin only).
 * Events tagged payload.source = 'legacy_import' are EXCLUDED: a legacy-profile
 * claim replays years of EdApp history in one transaction (migration 047 tags the
 * burst), and counting it would show phantom completion/enrollment spikes on the
 * day a heavy user happens to claim.
 */
export async function getEventCounts(
  supabase: SupabaseClient,
  institutionId: string,
  days = 30,
): Promise<EventCounts> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from('analytics_events')
    .select('event_type, user_id, created_at, source:payload->>source')
    .eq('institution_id', institutionId)
    .gte('created_at', since)
    .limit(10000);
  if (error) throw error;

  const byType: Record<string, number> = {};
  const signInUsersByDay: Record<string, Set<string>> = {};
  const activeUsers = new Set<string>();
  for (const row of (data ?? []) as Array<{ event_type: string; user_id: string | null; created_at: string; source: string | null }>) {
    if (row.source === 'legacy_import') continue;
    byType[row.event_type] = (byType[row.event_type] ?? 0) + 1;
    if (row.user_id) activeUsers.add(row.user_id);
    if (row.event_type === 'sign_in' && row.user_id) {
      const day = String(row.created_at).slice(0, 10);
      (signInUsersByDay[day] ??= new Set()).add(row.user_id);
    }
  }
  const signInsByDay: Record<string, number> = {};
  for (const [day, users] of Object.entries(signInUsersByDay)) signInsByDay[day] = users.size;
  return { byType, signInsByDay, activeUsers: activeUsers.size };
}

export interface UserAuthActivity {
  user_id: string;
  last_sign_in_at: string | null;
  email_confirmed_at: string | null;
  auth_created_at: string | null;
}

/** Last sign-in per user from auth.users (admin RPC, institution-scoped). */
export async function getUserAuthActivity(
  supabase: SupabaseClient,
): Promise<Record<string, UserAuthActivity>> {
  const { data, error } = await supabase.rpc('admin_get_user_auth_activity');
  if (error) throw error;
  const map: Record<string, UserAuthActivity> = {};
  for (const row of (data ?? []) as UserAuthActivity[]) map[row.user_id] = row;
  return map;
}
