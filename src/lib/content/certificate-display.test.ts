import { describe, it, expect, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { buildCertificateData, fetchCertificateDisplay } from './certificate-display';
import type { CertificateWithDetails, CertificateTemplate } from '@/types';

function makeTemplate(overrides: Partial<CertificateTemplate> = {}): CertificateTemplate {
  return {
    id: 'tpl-1',
    institution_id: 'inst-1',
    name: 'Default',
    description: null,
    canva_design_id: null,
    canva_design_url: null,
    layout_config: {
      width: 1056,
      height: 816,
      orientation: 'landscape',
      fields: {
        student_name: { x: 0, y: 300, fontSize: 36, color: '#000', align: 'center' },
        course_title: { x: 0, y: 360, fontSize: 24, color: '#000', align: 'center' },
        completion_date: { x: 0, y: 400, fontSize: 18, color: '#000', align: 'center' },
        certificate_number: { x: 0, y: 500, fontSize: 12, color: '#000', align: 'right' },
        institution_name: { x: 0, y: 440, fontSize: 14, color: '#000', align: 'center' },
      },
    },
    is_default: true,
    created_by: null,
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
    ...overrides,
  };
}

function makeCert(overrides: Partial<CertificateWithDetails> = {}): CertificateWithDetails {
  return {
    id: 'cert-1',
    user_id: 'user-1',
    course_id: 'course-1',
    institution_id: 'inst-1',
    template_id: 'tpl-1',
    issued_at: '2026-06-23T12:00:00Z',
    certificate_number: 'SCAGO-2026-00042',
    pdf_url: null,
    awarded_by: null,
    award_reason: null,
    user: { full_name: 'Jordan Rivers', email: 'jordan@example.com' },
    course: { title: 'Sickle Cell 101', description: '' },
    program: null,
    template: makeTemplate(),
    ...overrides,
  };
}

describe('buildCertificateData', () => {
  it('uses the student full name when present', () => {
    const data = buildCertificateData(makeCert(), 'SCAGO');
    expect(data.student_name).toBe('Jordan Rivers');
  });

  it('falls back to email, then to "Student"', () => {
    expect(
      buildCertificateData(makeCert({ user: { full_name: null, email: 'a@b.co' } }), 'SCAGO').student_name,
    ).toBe('a@b.co');
    expect(buildCertificateData(makeCert({ user: undefined }), 'SCAGO').student_name).toBe('Student');
  });

  it('prefers the course title, then the program title', () => {
    expect(buildCertificateData(makeCert(), 'SCAGO').course_title).toBe('Sickle Cell 101');
    const programCert = makeCert({
      course: null,
      program: { title: 'Advocacy Program', description: null },
    });
    expect(buildCertificateData(programCert, 'SCAGO').course_title).toBe('Advocacy Program');
  });

  it('formats the completion date and carries the certificate number', () => {
    const data = buildCertificateData(makeCert(), 'SCAGO');
    expect(data.completion_date).toMatch(/2026/);
    expect(data.completion_date).toMatch(/January|February|March|April|May|June|July|August|September|October|November|December/);
    expect(data.certificate_number).toBe('SCAGO-2026-00042');
  });

  it('falls back to "Unknown Institution" when no name is given', () => {
    expect(buildCertificateData(makeCert(), '').institution_name).toBe('Unknown Institution');
  });
});

// ---------------------------------------------------------------------------
// fetchCertificateDisplay — mocks the certificates + institutions reads.
// ---------------------------------------------------------------------------
function makeSupabase(
  certResult: { data: unknown; error: unknown },
  instResult: { data: unknown } = { data: { name: 'SCAGO', description: 'Sickle Cell Awareness Group of Ontario' } },
): SupabaseClient {
  const certMaybeSingle = vi.fn().mockResolvedValue(certResult);
  const instMaybeSingle = vi.fn().mockResolvedValue(instResult);
  const from = vi.fn((table: string) => {
    if (table === 'certificates') {
      return { select: () => ({ eq: () => ({ maybeSingle: certMaybeSingle }) }) };
    }
    if (table === 'institutions') {
      return { select: () => ({ eq: () => ({ maybeSingle: instMaybeSingle }) }) };
    }
    throw new Error(`unexpected table ${table}`);
  });
  return { from } as unknown as SupabaseClient;
}

describe('fetchCertificateDisplay', () => {
  it('returns a full display when the certificate is readable', async () => {
    const sb = makeSupabase({ data: makeCert(), error: null });
    const display = await fetchCertificateDisplay(sb, 'cert-1');
    expect(display).not.toBeNull();
    expect(display!.certificateId).toBe('cert-1');
    expect(display!.template?.id).toBe('tpl-1');
    expect(display!.data.student_name).toBe('Jordan Rivers');
    expect(display!.courseTitle).toBe('Sickle Cell 101');
    // institution description is preferred over name for display
    expect(display!.data.institution_name).toBe('Sickle Cell Awareness Group of Ontario');
  });

  it('falls back to the institution name when no description', async () => {
    const sb = makeSupabase({ data: makeCert(), error: null }, { data: { name: 'SCAGO', description: null } });
    const display = await fetchCertificateDisplay(sb, 'cert-1');
    expect(display!.data.institution_name).toBe('SCAGO');
  });

  it('returns null when the certificate is not found', async () => {
    const sb = makeSupabase({ data: null, error: null });
    expect(await fetchCertificateDisplay(sb, 'missing')).toBeNull();
  });

  it('returns null (no throw) when the read errors, e.g. RLS', async () => {
    const sb = makeSupabase({ data: null, error: new Error('permission denied') });
    expect(await fetchCertificateDisplay(sb, 'cert-1')).toBeNull();
  });

  it('still resolves a display when no template is attached (medallion fallback)', async () => {
    const sb = makeSupabase({ data: makeCert({ template: null, template_id: null }), error: null });
    const display = await fetchCertificateDisplay(sb, 'cert-1');
    expect(display).not.toBeNull();
    expect(display!.template).toBeNull();
    expect(display!.courseTitle).toBe('Sickle Cell 101');
  });
});
