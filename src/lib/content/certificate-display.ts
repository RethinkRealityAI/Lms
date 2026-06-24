import type { SupabaseClient } from '@supabase/supabase-js';
import type { CertificateWithDetails, CertificateData, CertificateTemplate } from '@/types';
import { getCertificateById } from '@/lib/db/certificates';

/**
 * Builds the flat {@link CertificateData} the renderer overlays on a template
 * from a joined certificate row. Mirrors the logic used on the student
 * certificates page so the celebration, the certificates list, and the PDF all
 * show the same fields.
 */
export function buildCertificateData(
  cert: CertificateWithDetails,
  institutionName: string,
): CertificateData {
  return {
    student_name: cert.user?.full_name ?? cert.user?.email ?? 'Student',
    course_title: cert.course?.title ?? cert.program?.title,
    completion_date: new Date(cert.issued_at).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    }),
    certificate_number: cert.certificate_number ?? '',
    institution_name: institutionName || 'Unknown Institution',
  };
}

export interface CertificateDisplay {
  certificateId: string;
  /** null when no template resolves — the celebration falls back to a medallion. */
  template: CertificateTemplate | null;
  data: CertificateData;
  courseTitle: string;
}

/**
 * Fetches everything needed to render an earned certificate in the celebration
 * overlay: the full template, the overlay data, and a display title. Returns
 * null if the certificate can't be read (e.g. RLS) so callers can degrade
 * gracefully instead of throwing.
 */
export async function fetchCertificateDisplay(
  supabase: SupabaseClient,
  certificateId: string,
): Promise<CertificateDisplay | null> {
  let cert: CertificateWithDetails | null;
  try {
    cert = await getCertificateById(supabase, certificateId);
  } catch {
    return null;
  }
  if (!cert) return null;

  let institutionName = '';
  if (cert.institution_id) {
    const { data: inst } = await supabase
      .from('institutions')
      .select('name, description')
      .eq('id', cert.institution_id)
      .maybeSingle();
    if (inst) institutionName = inst.description || inst.name;
  }

  return {
    certificateId,
    template: (cert.template as CertificateTemplate | null) ?? null,
    data: buildCertificateData(cert, institutionName),
    courseTitle: cert.course?.title ?? cert.program?.title ?? 'this course',
  };
}
