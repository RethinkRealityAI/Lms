import type { SupabaseClient } from '@supabase/supabase-js';
import type { LandingReturningContent } from '@/components/landing/landing-returning-view';

/**
 * "Returning from EdApp" landing section content (migration 066).
 *
 * One editable row per institution (single config, not a list). Admin-managed
 * via is_admin() RLS; the public landing page reads the active row through the
 * anon `get_landing_returning_info(slug)` SECURITY DEFINER RPC.
 */

export interface LandingReturningInfo extends LandingReturningContent {
  id: string;
  institution_id: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/** Editable fields (everything except id/institution_id/timestamps). */
export type LandingReturningInput = LandingReturningContent & { is_active: boolean };

/** Admin: the institution's returning-section row (there is at most one). */
export async function getLandingReturningInfo(
  supabase: SupabaseClient,
  institutionId: string,
): Promise<LandingReturningInfo | null> {
  const { data, error } = await supabase
    .from('landing_returning_info')
    .select('*')
    .eq('institution_id', institutionId)
    .maybeSingle();
  if (error) throw error;
  return (data as LandingReturningInfo | null) ?? null;
}

/**
 * Admin: create-or-update the institution's single returning-section row.
 * Upserts on institution_id (unique), so it works whether or not a row exists.
 */
export async function upsertLandingReturningInfo(
  supabase: SupabaseClient,
  institutionId: string,
  input: LandingReturningInput,
): Promise<LandingReturningInfo> {
  const { data, error } = await supabase
    .from('landing_returning_info')
    .upsert(
      { ...input, institution_id: institutionId, updated_at: new Date().toISOString() },
      { onConflict: 'institution_id' },
    )
    .select('*')
    .single();
  if (error) throw error;
  return data as LandingReturningInfo;
}

/**
 * Public landing page: the ACTIVE returning-section content for a slug, or null
 * when there is no row or it is toggled off (→ the section is hidden).
 */
export async function getActiveLandingReturningInfo(
  supabase: SupabaseClient,
  slug: string,
): Promise<LandingReturningContent | null> {
  const { data, error } = await supabase.rpc('get_landing_returning_info', { p_slug: slug });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  return (row as LandingReturningContent | undefined) ?? null;
}
