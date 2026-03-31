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
