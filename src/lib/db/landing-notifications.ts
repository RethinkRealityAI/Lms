import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Landing-page notification system (migration 065).
 *
 * The landing-page sibling of the announcements system (045). Unlike announcements
 * (which target signed-in students on the dashboard), these render on the PUBLIC
 * marketing/landing pages for unauthenticated visitors — so there is no per-user
 * dismissal table (dismissal is client-side localStorage) and no audience targeting.
 *
 * Admins control both content and look (accent color, icon, logo, CTA button +
 * secondary link, schedule) from /admin/landing-notification.
 */

export type LandingNotificationIcon =
  | 'megaphone' | 'info' | 'sparkles' | 'heart' | 'bell' | 'party' | 'none';

export interface LandingNotification {
  id: string;
  institution_id: string;
  title: string;
  body: string;
  icon: LandingNotificationIcon;
  /** null = fall back to institution primary color */
  accent_color: string | null;
  show_logo: boolean;
  /** Primary CTA button. url may be an on-page anchor ('#support'), http(s), or an app path. */
  cta_label: string | null;
  cta_url: string | null;
  /** Secondary text link — same url conventions. */
  secondary_cta_label: string | null;
  secondary_cta_url: string | null;
  dismissible: boolean;
  starts_at: string;
  ends_at: string | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

/** The subset of columns the RPC exposes to the public landing page (no admin-only fields). */
export type PublicLandingNotification = Pick<
  LandingNotification,
  'id' | 'institution_id' | 'title' | 'body' | 'icon' | 'accent_color' | 'show_logo'
  | 'cta_label' | 'cta_url' | 'secondary_cta_label' | 'secondary_cta_url'
  | 'dismissible' | 'starts_at' | 'ends_at' | 'updated_at'
>;

export type LandingNotificationInput = Pick<
  LandingNotification,
  'title' | 'body' | 'icon' | 'accent_color' | 'show_logo'
  | 'cta_label' | 'cta_url' | 'secondary_cta_label' | 'secondary_cta_url'
  | 'dismissible' | 'starts_at' | 'ends_at' | 'is_active'
>;

/** Admin: every landing notification for the institution, newest first. */
export async function getLandingNotifications(
  supabase: SupabaseClient,
  institutionId: string,
): Promise<LandingNotification[]> {
  const { data, error } = await supabase
    .from('landing_notifications')
    .select('*')
    .eq('institution_id', institutionId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as LandingNotification[];
}

export async function createLandingNotification(
  supabase: SupabaseClient,
  institutionId: string,
  input: LandingNotificationInput,
  createdBy?: string,
): Promise<LandingNotification> {
  const { data, error } = await supabase
    .from('landing_notifications')
    .insert({ ...input, institution_id: institutionId, created_by: createdBy ?? null })
    .select('*')
    .single();
  if (error) throw error;
  return data as LandingNotification;
}

export async function updateLandingNotification(
  supabase: SupabaseClient,
  institutionId: string,
  id: string,
  changes: Partial<LandingNotificationInput>,
): Promise<LandingNotification> {
  const { data, error } = await supabase
    .from('landing_notifications')
    .update({ ...changes, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('institution_id', institutionId)
    .select('*')
    .single();
  if (error) throw error;
  return data as LandingNotification;
}

export async function deleteLandingNotification(
  supabase: SupabaseClient,
  institutionId: string,
  id: string,
): Promise<void> {
  const { error } = await supabase
    .from('landing_notifications')
    .delete()
    .eq('id', id)
    .eq('institution_id', institutionId);
  if (error) throw error;
}

/**
 * Public landing page: the live, in-window notifications for an institution slug.
 * Goes through the SECURITY DEFINER `get_active_landing_notifications` RPC so an
 * anonymous visitor can read active rows without any table-level SELECT grant
 * (the RPC never returns inactive/scheduled/expired rows). Newest first.
 */
export async function getActiveLandingNotifications(
  supabase: SupabaseClient,
  slug: string,
): Promise<PublicLandingNotification[]> {
  const { data, error } = await supabase.rpc('get_active_landing_notifications', { p_slug: slug });
  if (error) throw error;
  return (data ?? []) as PublicLandingNotification[];
}
