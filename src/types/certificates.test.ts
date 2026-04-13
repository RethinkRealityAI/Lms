import { describe, it, expect } from 'vitest';
import type {
  CertificateFieldConfig,
  CertificateLayoutConfig,
  CertificateBackgroundConfig,
  CertificateTemplate,
  CertificateData,
  CertificateWithDetails,
  CourseCertificateTemplate,
} from './certificates';

describe('certificate types', () => {
  it('CertificateLayoutConfig has required fields structure', () => {
    const config: CertificateLayoutConfig = {
      width: 1056,
      height: 816,
      orientation: 'landscape',
      fields: {
        student_name: { x: 528, y: 340, fontSize: 36, fontWeight: 'bold', color: '#FFFFFF', align: 'center' },
        course_title: { x: 528, y: 400, fontSize: 22, color: '#E2E8F0', align: 'center' },
        completion_date: { x: 528, y: 460, fontSize: 16, color: '#94A3B8', align: 'center' },
        certificate_number: { x: 940, y: 770, fontSize: 11, color: '#64748B', align: 'right' },
        institution_name: { x: 528, y: 520, fontSize: 13, color: '#94A3B8', align: 'center' },
      },
    };
    expect(config.width).toBe(1056);
    expect(config.height).toBe(816);
    expect(config.fields.student_name.align).toBe('center');
    expect(config.fields.certificate_number.align).toBe('right');
  });

  it('CertificateTemplate allows null canva fields', () => {
    const template: CertificateTemplate = {
      id: 'test-id',
      institution_id: 'inst-1',
      name: 'Test',
      description: null,
      canva_design_id: null,
      canva_design_url: null,
      layout_config: {
        width: 1056,
        height: 816,
        orientation: 'landscape',
        fields: {
          student_name: { x: 0, y: 0, fontSize: 36, color: '#000', align: 'center' },
          course_title: { x: 0, y: 0, fontSize: 24, color: '#000', align: 'center' },
          completion_date: { x: 0, y: 0, fontSize: 18, color: '#000', align: 'center' },
          certificate_number: { x: 0, y: 0, fontSize: 12, color: '#000', align: 'right' },
          institution_name: { x: 0, y: 0, fontSize: 14, color: '#000', align: 'center' },
        },
      },
      is_default: true,
      created_by: null,
      created_at: '2026-01-01',
      updated_at: '2026-01-01',
    };
    expect(template.canva_design_id).toBeNull();
    expect(template.canva_design_url).toBeNull();
    expect(template.is_default).toBe(true);
  });

  it('CertificateData has required student fields', () => {
    const data: CertificateData = {
      student_name: 'Jane Doe',
      course_title: 'Test Course',
      completion_date: 'April 9, 2026',
      certificate_number: 'GANSID-2026-00001',
      institution_name: 'GANSID',
    };
    expect(data.student_name).toBe('Jane Doe');
    expect(data.certificate_number).toMatch(/^GANSID-/);
  });

  it('CertificateLayoutConfig supports background config', () => {
    const config: CertificateLayoutConfig = {
      width: 1056,
      height: 816,
      orientation: 'landscape',
      background: {
        type: 'gradient',
        gradientFrom: '#1A3C6E',
        gradientTo: '#0F172A',
        gradientDirection: '135deg',
      },
      fields: {
        student_name: { x: 528, y: 340, fontSize: 36, fontWeight: 'bold', color: '#FFFFFF', align: 'center' },
        course_title: { x: 528, y: 400, fontSize: 22, color: '#E2E8F0', align: 'center' },
        completion_date: { x: 528, y: 460, fontSize: 16, color: '#94A3B8', align: 'center' },
        certificate_number: { x: 940, y: 770, fontSize: 11, color: '#64748B', align: 'right' },
        institution_name: { x: 528, y: 520, fontSize: 13, color: '#94A3B8', align: 'center' },
      },
    };
    expect(config.background?.type).toBe('gradient');
    expect(config.background?.gradientFrom).toBe('#1A3C6E');
    expect(config.background?.gradientTo).toBe('#0F172A');
    expect(config.background?.gradientDirection).toBe('135deg');
  });

  it('CertificateLayoutConfig background is optional for backward compatibility', () => {
    const config: CertificateLayoutConfig = {
      width: 1056,
      height: 816,
      orientation: 'landscape',
      fields: {
        student_name: { x: 0, y: 0, fontSize: 36, color: '#000', align: 'center' },
        course_title: { x: 0, y: 0, fontSize: 24, color: '#000', align: 'center' },
        completion_date: { x: 0, y: 0, fontSize: 18, color: '#000', align: 'center' },
        certificate_number: { x: 0, y: 0, fontSize: 12, color: '#000', align: 'right' },
        institution_name: { x: 0, y: 0, fontSize: 14, color: '#000', align: 'center' },
      },
    };
    expect(config.background).toBeUndefined();
  });

  it('CertificateBackgroundConfig supports all background types', () => {
    const solid: CertificateBackgroundConfig = { type: 'solid', color: '#DC2626' };
    const gradient: CertificateBackgroundConfig = { type: 'gradient', gradientFrom: '#1A3C6E', gradientTo: '#0F172A', gradientDirection: '90deg' };
    const image: CertificateBackgroundConfig = { type: 'image', imageUrl: 'https://example.com/bg.jpg' };
    const defaultBg: CertificateBackgroundConfig = { type: 'default' };

    expect(solid.type).toBe('solid');
    expect(gradient.gradientDirection).toBe('90deg');
    expect(image.imageUrl).toBe('https://example.com/bg.jpg');
    expect(defaultBg.type).toBe('default');
  });

  it('CertificateData allows optional course_title', () => {
    const data: CertificateData = {
      student_name: 'John',
      completion_date: 'Jan 1, 2026',
      certificate_number: 'CERT-001',
      institution_name: 'Test',
    };
    expect(data.course_title).toBeUndefined();
  });

  it('CertificateWithDetails allows null relations', () => {
    const cert: CertificateWithDetails = {
      id: 'cert-1',
      user_id: 'user-1',
      course_id: null,
      institution_id: 'inst-1',
      template_id: null,
      issued_at: '2026-01-01',
      certificate_number: null,
      pdf_url: null,
      awarded_by: null,
      award_reason: null,
    };
    expect(cert.course_id).toBeNull();
    expect(cert.template).toBeUndefined();
    expect(cert.user).toBeUndefined();
  });
});
