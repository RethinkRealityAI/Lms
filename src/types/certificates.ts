export interface CertificateFieldConfig {
  x: number;
  y: number;
  fontSize: number;
  fontWeight?: string;
  color: string;
  align: 'left' | 'center' | 'right';
}

export interface CertificateBackgroundConfig {
  type: 'default' | 'solid' | 'gradient' | 'image';
  color?: string;
  gradientFrom?: string;
  gradientTo?: string;
  gradientDirection?: string;
  imageUrl?: string;
}

export type LogoPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

export interface CertificateLogoConfig {
  url: string;
  position: LogoPosition;
  width?: number;
  height?: number;
  opacity?: number;
}

export interface CertificateLayoutConfig {
  width: number;
  height: number;
  orientation: 'landscape' | 'portrait';
  background?: CertificateBackgroundConfig;
  logo?: CertificateLogoConfig;
  fields: {
    student_name: CertificateFieldConfig;
    course_title: CertificateFieldConfig;
    completion_date: CertificateFieldConfig;
    certificate_number: CertificateFieldConfig;
    institution_name: CertificateFieldConfig;
  };
}

export interface CertificateTemplate {
  id: string;
  institution_id: string;
  name: string;
  description: string | null;
  canva_design_id: string | null;
  canva_design_url: string | null;
  layout_config: CertificateLayoutConfig;
  is_default: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CertificateTemplateWithCourseCount extends CertificateTemplate {
  course_count: number;
}

export interface CourseCertificateTemplate {
  id: string;
  course_id: string;
  template_id: string;
  assigned_by: string | null;
  assigned_at: string;
}

export interface CertificateData {
  student_name: string;
  course_title?: string;
  completion_date: string;
  certificate_number: string;
  institution_name: string;
  institution_logo?: string;
}

export interface CertificateWithDetails {
  id: string;
  user_id: string;
  course_id: string | null;
  institution_id: string;
  template_id: string | null;
  issued_at: string;
  certificate_number: string | null;
  pdf_url: string | null;
  awarded_by: string | null;
  award_reason: string | null;
  user?: { full_name: string | null; email: string };
  course?: { title: string; description: string } | null;
  template?: CertificateTemplate | null;
  awarder?: { full_name: string | null } | null;
}
