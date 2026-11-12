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
  /** Short label for the program-progress stat tile (e.g. "HCP Program", "Patient Education Program") */
  programStatLabel: string;
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
  /** Highlight/secondary accent color (backgrounds, badges) */
  highlightColor?: string;
  /** Optional tertiary accent (e.g. GANSID orange) */
  orangeAccent?: string;
  /** Email placeholder for login forms */
  emailPlaceholder: string;
  /** Admin email placeholder */
  adminEmailPlaceholder: string;
  /** Admin portal description */
  adminDescription: string;
  /**
   * The production host this institution's learners use (no scheme). Used to
   * infer the portal from the domain when no institution cookie is present —
   * e.g. a learner opening an email link in a different browser.
   */
  primaryHost: string;
  /** Title shown beside the logo in platform emails. */
  emailHeaderTitle: string;
  /** Brand stripe across the top of platform emails: [hex colour, width %]. */
  emailBrandBar: Array<[string, number]>;
}

const GANSID_BRANDING: InstitutionBranding = {
  name: 'GANSID',
  acronym: 'GANSID',
  fullName: 'Global Action Network for Sickle Cell & Other Inherited Blood Disorders',
  logoUrl: 'https://ylmnbbrpaeiogdeqezlo.supabase.co/storage/v1/object/public/canva-exports/logos/gansid-logo.png',
  logoDimensions: { width: 410, height: 110 },
  programTitle: 'Learning Portal',
  programStatLabel: 'Patient Education Program',
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
  contactEmail: 'admin@inheritedblooddisorders.world',
  copyright: '\u00A9 2026 Global Action Network for Sickle Cell and Other Inherited Blood Disorders',
  primaryColor: '#1A3C6E',
  secondaryColor: '#DC2626',
  accentColor: '#0099CA',
  highlightColor: '#0099CA',
  orangeAccent: '#E87722',
  emailPlaceholder: 'doctor@hospital.org',
  adminEmailPlaceholder: 'admin@inheritedblooddisorders.world',
  adminDescription: 'Secure faculty access for GANSID administrators.',
  primaryHost: 'org-lms.netlify.app',
  emailHeaderTitle: 'GANSID Learning Portal',
  emailBrandBar: [['#1A3C6E', 52], ['#0099CA', 22], ['#E87722', 14], ['#DC2626', 12]],
};

const SCAGO_BRANDING: InstitutionBranding = {
  name: 'SCAGO',
  acronym: 'SCAGO',
  fullName: 'Sickle Cell Awareness Group of Ontario',
  logoUrl: 'https://ylmnbbrpaeiogdeqezlo.supabase.co/storage/v1/object/public/scago-assets/logos/scago-logo.png',
  logoDimensions: { width: 714, height: 202 },
  programTitle: 'Sickle Cell Disease Education Program for Healthcare Providers',
  programStatLabel: 'HCP Program',
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
  primaryColor: '#C8262A',
  secondaryColor: '#1A1A1A',
  accentColor: '#C8262A',
  highlightColor: '#F0E7CC',
  emailPlaceholder: 'clinician@hospital.ca',
  adminEmailPlaceholder: 'admin@sicklecellanemia.ca',
  adminDescription: 'Secure faculty access for SCAGO administrators.',
  primaryHost: 'learn.sicklecellanemia.ca',
  emailHeaderTitle: 'HCP Education Program',
  emailBrandBar: [['#C8262A', 72], ['#1A1A1A', 18], ['#F0E7CC', 10]],
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
 * The institution whose production domain this is, or null for any other host
 * (localhost, deploy previews).
 */
export function getInstitutionSlugForHost(host: string | null | undefined): string | null {
  if (!host) return null;
  const h = host.toLowerCase().split(':')[0];
  for (const [slug, b] of Object.entries(BRANDING_MAP)) {
    if (b.primaryHost === h) return slug;
  }
  return null;
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
