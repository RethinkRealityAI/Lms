import type { SupabaseClient } from '@supabase/supabase-js';
import type { CertificateWithDetails } from '@/types';

export async function getIssuedCertificates(
  supabase: SupabaseClient,
  institutionId: string
): Promise<CertificateWithDetails[]> {
  const { data, error } = await supabase
    .from('certificates')
    .select(`
      *,
      user:users!certificates_user_id_fkey(full_name, email),
      course:courses!certificates_course_id_fkey(title, description),
      program:programs!certificates_program_id_fkey(title, description),
      template:certificate_templates!certificates_template_id_fkey(name, canva_design_url, layout_config, is_default),
      awarder:users!certificates_awarded_by_fkey(full_name)
    `)
    .eq('institution_id', institutionId)
    .order('issued_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as CertificateWithDetails[];
}

export async function getCertificateById(
  supabase: SupabaseClient,
  certificateId: string
): Promise<CertificateWithDetails | null> {
  const { data, error } = await supabase
    .from('certificates')
    .select(`
      *,
      user:users!certificates_user_id_fkey(full_name, email),
      course:courses!certificates_course_id_fkey(title, description),
      program:programs!certificates_program_id_fkey(title, description),
      template:certificate_templates!certificates_template_id_fkey(*)
    `)
    .eq('id', certificateId)
    .maybeSingle();

  if (error) throw error;
  return data as CertificateWithDetails | null;
}

export async function getCertificateByNumber(
  supabase: SupabaseClient,
  certificateNumber: string
): Promise<CertificateWithDetails | null> {
  const { data, error } = await supabase
    .from('certificates')
    .select(`
      *,
      user:users!certificates_user_id_fkey(full_name, email),
      course:courses!certificates_course_id_fkey(title, description),
      program:programs!certificates_program_id_fkey(title, description),
      template:certificate_templates!certificates_template_id_fkey(name)
    `)
    .eq('certificate_number', certificateNumber)
    .maybeSingle();

  if (error) throw error;
  return data as CertificateWithDetails | null;
}

export async function awardCertificates(
  supabase: SupabaseClient,
  input: {
    user_ids: string[];
    institution_id: string;
    template_id: string;
    course_id?: string;
    program_id?: string;
    awarded_by: string;
    award_reason: string;
  }
): Promise<{ inserted: number; skipped: number; insertedIds: string[] }> {
  let inserted = 0;
  let skipped = 0;
  const insertedIds: string[] = [];

  for (const userId of input.user_ids) {
    const query = supabase
      .from('certificates')
      .select('id')
      .eq('user_id', userId);

    if (input.course_id) {
      query.eq('course_id', input.course_id);
    } else if (input.program_id) {
      query.eq('program_id', input.program_id);
    } else {
      query.eq('template_id', input.template_id).is('course_id', null).is('program_id', null);
    }

    const { data: existing } = await query.maybeSingle();

    if (existing) {
      skipped++;
      continue;
    }

    const { data: created, error } = await supabase.from('certificates').insert({
      user_id: userId,
      course_id: input.course_id ?? null,
      program_id: input.program_id ?? null,
      institution_id: input.institution_id,
      template_id: input.template_id,
      awarded_by: input.awarded_by,
      award_reason: input.award_reason,
      issued_at: new Date().toISOString(),
    }).select('id').single();

    if (!error && created?.id) {
      inserted++;
      insertedIds.push(created.id as string);
    } else {
      skipped++;
    }
  }

  return { inserted, skipped, insertedIds };
}

/**
 * Revocation is a status change (migration 037), not a DELETE — the row,
 * number, and audit trail are preserved and the verify page shows "revoked".
 */
export async function revokeCertificates(
  supabase: SupabaseClient,
  certificateIds: string[],
  revokedBy: string,
  reason?: string,
  institutionId?: string
): Promise<void> {
  let query = supabase
    .from('certificates')
    .update({
      revoked_at: new Date().toISOString(),
      revoked_by: revokedBy,
      revoke_reason: reason ?? null,
    })
    .in('id', certificateIds)
    .is('revoked_at', null);
  if (institutionId) query = query.eq('institution_id', institutionId);
  const { error } = await query;

  if (error) throw error;
}

/** Clears revocation on a certificate (admin "restore"). */
export async function restoreCertificates(
  supabase: SupabaseClient,
  certificateIds: string[],
  institutionId?: string
): Promise<void> {
  let query = supabase
    .from('certificates')
    .update({ revoked_at: null, revoked_by: null, revoke_reason: null, pdf_url: null })
    .in('id', certificateIds);
  if (institutionId) query = query.eq('institution_id', institutionId);
  const { error } = await query;

  if (error) throw error;
}

export async function getUserCertificates(
  supabase: SupabaseClient,
  userId: string
): Promise<CertificateWithDetails[]> {
  const { data, error } = await supabase
    .from('certificates')
    .select(`
      *,
      course:courses!certificates_course_id_fkey(title, description),
      program:programs!certificates_program_id_fkey(title, description),
      template:certificate_templates!certificates_template_id_fkey(*)
    `)
    .eq('user_id', userId)
    .is('revoked_at', null)
    .order('issued_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as CertificateWithDetails[];
}
