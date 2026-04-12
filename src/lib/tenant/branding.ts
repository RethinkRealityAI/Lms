/**
 * Institution-specific branding configuration.
 * Used by login pages, public pages, and anywhere institution-aware UI is rendered.
 */

export interface InstitutionBranding {
  /** Display name of the institution */
  name: string;
  /** Short acronym / slug-label (e.g. "GANSID", "SCAGO") */
  acronym: string;
  /** Full legal / formal name */
  fullName: string;
  /** URL of the institution logo */
  logoUrl: string;
  /** Logo dimensions hint for layout (width x height in px) */
  logoDimensions: { width: number; height: number };
  /** Program title shown on login pages */
  programTitle: string;
  /** Brief description for login page hero */
  description: string;
  /** Feature highlights shown as badges / chips */
  highlights: string[];
  /** Feature bullet points for the login sidebar */
  features: { icon: 'check' | 'globe' | 'award' | 'clock' | 'book'; label: string }[];
  /** Contact email */
  contactEmail: string;
  /** Contact phone (optional) */
  contactPhone?: string;
  /** Contact address (optional) */
  contactAddress?: string;
  /** Copyright line */
  copyright: string;
  /** Primary brand color (gradient start or solid) */
  primaryColor: string;
  /** Secondary brand color (gradient end) */
  secondaryColor: string;
  /** Accent color for interactive elements */
  accentColor: string;
  /** Email placeholder for login forms */
  emailPlaceholder: string;
  /** Admin email placeholder */
  adminEmailPlaceholder: string;
  /** Admin portal description */
  adminDescription: string;
}

const GANSID_BRANDING: InstitutionBranding = {
  name: 'GANSID',
  acronym: 'GANSID',
  fullName: 'Global Action Network for Sickle Cell & Other Inherited Blood Disorders',
  logoUrl: 'https://ylmnbbrpaeiogdeqezlo.supabase.co/storage/v1/object/public/canva-exports/logos/gansid-logo.png',
  logoDimensions: { width: 410, height: 110 },
  programTitle: 'Learning Portal',
  description: 'Empowering healthcare providers through modular, evidence-based education in inherited blood disorders.',
  highlights: [
    '10 Modules',
    'Self-paced learning',
    'Certificate on completion',
  ],
  features: [
    { icon: 'check', label: 'Expert-led clinical courses' },
    { icon: 'globe', label: 'Global community network' },
  ],
  contactEmail: 'info@gansid.org',
  copyright: '\u00A9 2026 Global Action Network for Sickle Cell and Other Inherited Blood Disorders',
  primaryColor: '#991B1B',
  secondaryColor: '#DC2626',
  accentColor: '#2563EB',
  emailPlaceholder: 'doctor@hospital.org',
  adminEmailPlaceholder: 'admin@gansid.org',
  adminDescription: 'Secure faculty access for GANSID administrators.',
};

const SCAGO_BRANDING: InstitutionBranding = {
  name: 'SCAGO',
  acronym: 'SCAGO',
  fullName: 'Sickle Cell Awareness Group of Ontario',
  logoUrl: 'https://ylmnbbrpaeiogdeqezlo.supabase.co/storage/v1/object/public/scago-assets/logos/scago-logo.png',
  logoDimensions: { width: 714, height: 202 },
  programTitle: 'Sickle Cell Disease Education Program for Healthcare Providers',
  description: 'Improve knowledge, skills, and actions of healthcare providers who care for people with sickle cell disease to reduce health inequities and improve access to safe, equitable care.',
  highlights: [
    '13 Modules',
    'Micro-lessons under 10 min',
    'Up to 13 Mainpro+ Credits',
  ],
  features: [
    { icon: 'check', label: 'Certified Mainpro+ continuing education' },
    { icon: 'clock', label: 'Micro-lessons designed for busy clinicians' },
    { icon: 'book', label: 'Evidence-based SCD care training' },
    { icon: 'award', label: 'Certificate for healthcare providers' },
  ],
  contactEmail: 'hcp@sicklecellanemia.ca',
  contactPhone: '416-745-4267',
  contactAddress: '330-5109 Steeles Ave W., North York, ON M9L 2Y8',
  copyright: '\u00A9 2026 Sickle Cell Awareness Group of Ontario',
  primaryColor: '#1E3A5F',
  secondaryColor: '#0099CA',
  accentColor: '#0099CA',
  emailPlaceholder: 'clinician@hospital.ca',
  adminEmailPlaceholder: 'admin@sicklecellanemia.ca',
  adminDescription: 'Secure faculty access for SCAGO administrators.',
};

const BRANDING_MAP: Record<string, InstitutionBranding> = {
  gansid: GANSID_BRANDING,
  scago: SCAGO_BRANDING,
};

/**
 * Get institution branding for the given slug.
 * Falls back to GANSID if slug is unknown.
 */
export function getInstitutionBranding(slug: string | null | undefined): InstitutionBranding {
  if (!slug) return GANSID_BRANDING;
  return BRANDING_MAP[slug.toLowerCase()] ?? GANSID_BRANDING;
}

/**
 * Client-side helper: read institution slug from document.cookie.
 * Must only be called in browser context.
 */
export function getInstitutionSlugFromCookie(): string {
  if (typeof document === 'undefined') return 'gansid';
  const match = document.cookie.split('; ').find(c => c.startsWith('institution_slug='));
  return match?.split('=')[1]?.toLowerCase() || 'gansid';
}
