import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Announcements / notification modal system (migration 045).
 * Institution-scoped, schedulable, audience-targeted messages rendered on
 * the student dashboard as a banner or a modal.
 */

export type AnnouncementStyle = 'banner' | 'modal';
export type AnnouncementAudience = 'all' | 'first_time' | 'legacy_claimed';
export type AnnouncementDisplayMode = 'once' | 'until_dismissed' | 'always';

export interface Announcement {
  id: string;
  institution_id: string;
  title: string;
  body: string;
  style: AnnouncementStyle;
  audience: AnnouncementAudience;
  display_mode: AnnouncementDisplayMode;
  accent_color: string | null;
  show_logo: boolean;
  cta_label: string | null;
  cta_url: string | null;
  show_report_issue: boolean;
  starts_at: string;
  ends_at: string | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type AnnouncementInput = Pick<
  Announcement,
  'title' | 'body' | 'style' | 'audience' | 'display_mode' | 'accent_color'
  | 'show_logo' | 'cta_label' | 'cta_url' | 'show_report_issue'
  | 'starts_at' | 'ends_at' | 'is_active'
>;

/** Admin: every announcement for the institution, newest first. */
export async function getAnnouncements(
  supabase: SupabaseClient,
  institutionId: string,
): Promise<Announcement[]> {
  const { data, error } = await supabase
    .from('announcements')
    .select('*')
    .eq('institution_id', institutionId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Announcement[];
}

export async function createAnnouncement(
  supabase: SupabaseClient,
  institutionId: string,
  input: AnnouncementInput,
  createdBy?: string,
): Promise<Announcement> {
  const { data, error } = await supabase
    .from('announcements')
    .insert({ ...input, institution_id: institutionId, created_by: createdBy ?? null })
    .select('*')
    .single();
  if (error) throw error;
  return data as Announcement;
}

export async function updateAnnouncement(
  supabase: SupabaseClient,
  institutionId: string,
  id: string,
  changes: Partial<AnnouncementInput>,
): Promise<Announcement> {
  const { data, error } = await supabase
    .from('announcements')
    .update({ ...changes, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('institution_id', institutionId)
    .select('*')
    .single();
  if (error) throw error;
  return data as Announcement;
}

export async function deleteAnnouncement(
  supabase: SupabaseClient,
  institutionId: string,
  id: string,
): Promise<void> {
  const { error } = await supabase
    .from('announcements')
    .delete()
    .eq('id', id)
    .eq('institution_id', institutionId);
  if (error) throw error;
}

export interface VisibleAnnouncementContext {
  userId: string;
  /** users.created_at — used for the first_time audience */
  userCreatedAt: string | null;
  /** user has a linked legacy_users row */
  isLegacyClaimed: boolean;
}

/**
 * Student: announcements the user should see right now. RLS already limits
 * to live (active, in-window) rows of the user's institution; this filters
 * audience and removes seen/dismissed ones.
 */
export async function getVisibleAnnouncements(
  supabase: SupabaseClient,
  ctx: VisibleAnnouncementContext,
): Promise<Announcement[]> {
  const [{ data: rows, error }, { data: dismissals, error: dErr }] = await Promise.all([
    supabase.from('announcements').select('*').order('created_at', { ascending: false }),
    supabase.from('announcement_dismissals').select('announcement_id').eq('user_id', ctx.userId),
  ]);
  if (error) throw error;
  if (dErr) throw dErr;

  const seen = new Set((dismissals ?? []).map((d: any) => d.announcement_id as string));

  return ((rows ?? []) as Announcement[]).filter((a) => {
    if (a.display_mode !== 'always' && seen.has(a.id)) return false;
    if (a.audience === 'legacy_claimed' && !ctx.isLegacyClaimed) return false;
    if (a.audience === 'first_time') {
      if (!ctx.userCreatedAt) return false;
      if (new Date(ctx.userCreatedAt) < new Date(a.starts_at)) return false;
    }
    return true;
  });
}

/** Marks an announcement seen/dismissed for the current user (idempotent). */
export async function recordAnnouncementDismissal(
  supabase: SupabaseClient,
  announcementId: string,
  userId: string,
): Promise<void> {
  const { error } = await supabase
    .from('announcement_dismissals')
    .upsert(
      { announcement_id: announcementId, user_id: userId },
      { onConflict: 'announcement_id,user_id' },
    );
  if (error) throw error;
}
