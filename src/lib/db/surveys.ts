import type { SupabaseClient } from '@supabase/supabase-js';

export interface SurveyResponse {
  id: string;
  block_id: string;
  user_id: string;
  responses: Record<string, string>;
  submitted_at: string;
}

export async function getSurveyResponse(
  supabase: SupabaseClient,
  blockId: string,
  userId: string,
): Promise<SurveyResponse | null> {
  const { data, error } = await supabase
    .from('survey_responses')
    .select('*')
    .eq('block_id', blockId)
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return data as SurveyResponse | null;
}

export async function upsertSurveyResponse(
  supabase: SupabaseClient,
  blockId: string,
  userId: string,
  responses: Record<string, string>,
): Promise<void> {
  const { error } = await supabase.from('survey_responses').upsert(
    {
      block_id: blockId,
      user_id: userId,
      responses,
      submitted_at: new Date().toISOString(),
    },
    { onConflict: 'block_id,user_id' },
  );
  if (error) throw error;
}
