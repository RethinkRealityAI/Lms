import type { SupabaseClient } from '@supabase/supabase-js';
import type { CertificateTemplate, CourseCertificateTemplate } from '@/types';

export async function getCertificateTemplates(
  supabase: SupabaseClient,
  institutionId: string
): Promise<CertificateTemplate[]> {
  const { data, error } = await supabase
    .from('certificate_templates')
    .select('*')
    .eq('institution_id', institutionId)
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function getCertificateTemplate(
  supabase: SupabaseClient,
  templateId: string
): Promise<CertificateTemplate | null> {
  const { data, error } = await supabase
    .from('certificate_templates')
    .select('*')
    .eq('id', templateId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function getDefaultCertificateTemplate(
  supabase: SupabaseClient,
  institutionId: string
): Promise<CertificateTemplate | null> {
  const { data, error } = await supabase
    .from('certificate_templates')
    .select('*')
    .eq('institution_id', institutionId)
    .eq('is_default', true)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function createCertificateTemplate(
  supabase: SupabaseClient,
  input: {
    institution_id: string;
    name: string;
    description?: string;
    layout_config?: Record<string, unknown>;
    is_default?: boolean;
    created_by: string;
  }
): Promise<CertificateTemplate> {
  if (input.is_default) {
    await supabase
      .from('certificate_templates')
      .update({ is_default: false })
      .eq('institution_id', input.institution_id)
      .eq('is_default', true);
  }

  const { data, error } = await supabase
    .from('certificate_templates')
    .insert(input)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateCertificateTemplate(
  supabase: SupabaseClient,
  templateId: string,
  changes: Partial<Pick<CertificateTemplate, 'name' | 'description' | 'canva_design_id' | 'canva_design_url' | 'layout_config' | 'is_default'>>
): Promise<CertificateTemplate> {
  if (changes.is_default) {
    const { data: existing } = await supabase
      .from('certificate_templates')
      .select('institution_id')
      .eq('id', templateId)
      .single();

    if (existing) {
      await supabase
        .from('certificate_templates')
        .update({ is_default: false })
        .eq('institution_id', existing.institution_id)
        .eq('is_default', true);
    }
  }

  const { data, error } = await supabase
    .from('certificate_templates')
    .update({ ...changes, updated_at: new Date().toISOString() })
    .eq('id', templateId)
    .select()
    .single();

  if (error) throw error;

  if (changes.canva_design_url || changes.layout_config) {
    await supabase
      .from('certificates')
      .update({ pdf_url: null })
      .eq('template_id', templateId);
  }

  return data;
}

export async function deleteCertificateTemplate(
  supabase: SupabaseClient,
  templateId: string
): Promise<void> {
  const { error } = await supabase
    .from('certificate_templates')
    .delete()
    .eq('id', templateId);

  if (error) throw error;
}

export async function getCourseCertificateAssignments(
  supabase: SupabaseClient,
  institutionId: string
): Promise<(CourseCertificateTemplate & { course_title: string; template_name: string })[]> {
  const { data, error } = await supabase
    .from('course_certificate_templates')
    .select('*, courses:course_id(title, institution_id), certificate_templates:template_id(name)')
    .order('assigned_at', { ascending: false });

  if (error) throw error;

  return (data ?? [])
    .filter((row: any) => row.courses?.institution_id === institutionId)
    .map((row: any) => ({
      id: row.id,
      course_id: row.course_id,
      template_id: row.template_id,
      assigned_by: row.assigned_by,
      assigned_at: row.assigned_at,
      course_title: row.courses?.title ?? '',
      template_name: row.certificate_templates?.name ?? '',
    }));
}

export async function getCourseTemplateId(
  supabase: SupabaseClient,
  courseId: string
): Promise<string | null> {
  const { data } = await supabase
    .from('course_certificate_templates')
    .select('template_id')
    .eq('course_id', courseId)
    .maybeSingle();

  return data?.template_id ?? null;
}

export async function assignCourseTemplate(
  supabase: SupabaseClient,
  courseId: string,
  templateId: string,
  assignedBy: string
): Promise<void> {
  const { error } = await supabase
    .from('course_certificate_templates')
    .upsert(
      { course_id: courseId, template_id: templateId, assigned_by: assignedBy },
      { onConflict: 'course_id' }
    );

  if (error) throw error;
}

export async function removeCourseTemplate(
  supabase: SupabaseClient,
  courseId: string
): Promise<void> {
  const { error } = await supabase
    .from('course_certificate_templates')
    .delete()
    .eq('course_id', courseId);

  if (error) throw error;
}
