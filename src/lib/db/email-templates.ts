import type { SupabaseClient } from '@supabase/supabase-js';

export type EmailTemplateCategory = 'system' | 'custom';
export type EmailSystemType = 'certificate' | 'assignment';

export interface EmailTemplate {
  id: string;
  institution_id: string;
  slug: string;
  name: string;
  description: string | null;
  category: EmailTemplateCategory;
  system_type: EmailSystemType | null;
  subject_template: string;
  body_html_template: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export async function getEmailTemplates(
  supabase: SupabaseClient,
  institutionId: string,
): Promise<EmailTemplate[]> {
  const { data, error } = await supabase
    .from('email_templates')
    .select('*')
    .eq('institution_id', institutionId)
    .order('category', { ascending: true })
    .order('name', { ascending: true });

  if (error) throw error;
  return (data ?? []) as EmailTemplate[];
}

export async function getEmailTemplateById(
  supabase: SupabaseClient,
  templateId: string,
): Promise<EmailTemplate | null> {
  const { data, error } = await supabase
    .from('email_templates')
    .select('*')
    .eq('id', templateId)
    .maybeSingle();

  if (error) throw error;
  return data as EmailTemplate | null;
}

export async function getEmailTemplateBySystemType(
  supabase: SupabaseClient,
  institutionId: string,
  systemType: EmailSystemType,
): Promise<EmailTemplate | null> {
  const { data, error } = await supabase
    .from('email_templates')
    .select('*')
    .eq('institution_id', institutionId)
    .eq('system_type', systemType)
    .maybeSingle();

  if (error) throw error;
  return data as EmailTemplate | null;
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48) || 'template';
}

export async function createEmailTemplate(
  supabase: SupabaseClient,
  input: {
    institutionId: string;
    name: string;
    description?: string;
    subjectTemplate: string;
    bodyHtmlTemplate: string;
    slug?: string;
    createdBy?: string;
  },
): Promise<EmailTemplate> {
  const slug = input.slug?.trim() || slugify(input.name);
  const { data, error } = await supabase
    .from('email_templates')
    .insert({
      institution_id: input.institutionId,
      slug,
      name: input.name.trim(),
      description: input.description?.trim() || null,
      category: 'custom',
      system_type: null,
      subject_template: input.subjectTemplate,
      body_html_template: input.bodyHtmlTemplate,
      created_by: input.createdBy ?? null,
    })
    .select()
    .single();

  if (error) throw error;
  return data as EmailTemplate;
}

export async function updateEmailTemplate(
  supabase: SupabaseClient,
  templateId: string,
  changes: {
    name?: string;
    description?: string;
    subjectTemplate?: string;
    bodyHtmlTemplate?: string;
  },
): Promise<void> {
  const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (changes.name !== undefined) payload.name = changes.name.trim();
  if (changes.description !== undefined) payload.description = changes.description?.trim() || null;
  if (changes.subjectTemplate !== undefined) payload.subject_template = changes.subjectTemplate;
  if (changes.bodyHtmlTemplate !== undefined) payload.body_html_template = changes.bodyHtmlTemplate;

  const { error } = await supabase.from('email_templates').update(payload).eq('id', templateId);
  if (error) throw error;
}

export async function deleteEmailTemplate(
  supabase: SupabaseClient,
  templateId: string,
): Promise<void> {
  const { data: row } = await supabase
    .from('email_templates')
    .select('category')
    .eq('id', templateId)
    .maybeSingle();

  if (row?.category === 'system') {
    throw new Error('System templates cannot be deleted — edit them instead');
  }

  const { error } = await supabase.from('email_templates').delete().eq('id', templateId);
  if (error) throw error;
}
