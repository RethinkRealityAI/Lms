import type { SupabaseClient } from '@supabase/supabase-js';
import type { SurveyData } from '@/lib/content/blocks/survey/schema';
import { cloneSurveyDataFromTemplate } from '@/lib/content/blocks/survey/schema';

export interface SurveyTemplate {
  id: string;
  institution_id: string;
  name: string;
  description: string | null;
  data: SurveyData;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export async function getSurveyTemplates(
  supabase: SupabaseClient,
  institutionId: string,
): Promise<SurveyTemplate[]> {
  const { data, error } = await supabase
    .from('survey_templates')
    .select('*')
    .eq('institution_id', institutionId)
    .order('updated_at', { ascending: false });

  if (error) return [];
  return (data ?? []).map((row) => ({
    ...row,
    data: row.data as SurveyData,
  })) as SurveyTemplate[];
}

export async function createSurveyTemplate(
  supabase: SupabaseClient,
  input: {
    institutionId: string;
    name: string;
    description?: string;
    data: SurveyData;
    createdBy?: string;
  },
): Promise<{ template: SurveyTemplate | null; error: string | null }> {
  const { data, error } = await supabase
    .from('survey_templates')
    .insert({
      institution_id: input.institutionId,
      name: input.name.trim(),
      description: input.description?.trim() || null,
      data: input.data,
      created_by: input.createdBy ?? null,
    })
    .select()
    .single();

  if (error) return { template: null, error: error.message };
  return {
    template: { ...data, data: data.data as SurveyData } as SurveyTemplate,
    error: null,
  };
}

export async function updateSurveyTemplate(
  supabase: SupabaseClient,
  templateId: string,
  changes: { name?: string; description?: string; data?: SurveyData },
): Promise<{ error: string | null }> {
  const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (changes.name !== undefined) payload.name = changes.name.trim();
  if (changes.description !== undefined) payload.description = changes.description?.trim() || null;
  if (changes.data !== undefined) payload.data = changes.data;

  const { error } = await supabase
    .from('survey_templates')
    .update(payload)
    .eq('id', templateId);

  return { error: error?.message ?? null };
}

export async function deleteSurveyTemplate(
  supabase: SupabaseClient,
  templateId: string,
): Promise<{ error: string | null }> {
  const { error } = await supabase.from('survey_templates').delete().eq('id', templateId);
  return { error: error?.message ?? null };
}

/** Apply a stored template to a live survey block (fresh question IDs). */
export function applySurveyTemplate(template: SurveyTemplate): SurveyData {
  return cloneSurveyDataFromTemplate(template.data);
}
