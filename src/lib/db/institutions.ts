import type { SupabaseClient } from '@supabase/supabase-js';

export interface Institution {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  is_active: boolean;
}

/**
 * Fetch an institution by its primary key.
 * Returns null when the id is unknown.
 */
export async function getInstitutionById(
  supabase: SupabaseClient,
  institutionId: string,
): Promise<Institution | null> {
  const { data, error } = await supabase
    .from('institutions')
    .select('id, name, slug, description, is_active')
    .eq('id', institutionId)
    .maybeSingle();
  if (error) return null;
  return data as Institution | null;
}

/**
 * Fetch an institution by its URL slug (e.g. "gansid", "scago").
 */
export async function getInstitutionBySlug(
  supabase: SupabaseClient,
  slug: string,
): Promise<Institution | null> {
  const { data, error } = await supabase
    .from('institutions')
    .select('id, name, slug, description, is_active')
    .eq('slug', slug.toLowerCase())
    .maybeSingle();
  if (error) return null;
  return data as Institution | null;
}

/**
 * Resolve a human-readable institution name from its ID.
 * Uses the branding system (fullName) when available, otherwise falls back
 * to the institution's description or name column.
 */
export async function getInstitutionName(
  supabase: SupabaseClient,
  institutionId: string,
): Promise<string> {
  const inst = await getInstitutionById(supabase, institutionId);
  if (!inst) return 'Unknown Institution';
  // description typically stores the full legal name; name is the short acronym
  return inst.description || inst.name;
}
