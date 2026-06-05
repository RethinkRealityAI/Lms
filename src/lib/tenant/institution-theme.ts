/**
 * Institution-level theme — the GLOBAL defaults an admin sets once per institution.
 * Stored in `institutions.theme` (jsonb). Courses inherit every field unless they
 * override it; slides can override course defaults.
 *
 * Resolution cascade (highest → lowest precedence):
 *   slide settings  →  course (theme_settings)  →  institution (theme)  →  branding.ts fallback  →  system default
 */

import type { BlockStyle, CourseThemeSettings } from '@/lib/content/course-theme';
import type { InstitutionBranding } from '@/lib/tenant/branding';

// Re-export so callers can import BlockStyle from one place.
export type { BlockStyle };

export interface InstitutionTheme {
  // ── Branding ────────────────────────────────────────────────────────────────
  /** Primary brand accent — sliders, progress bars, primary action buttons. Hex. */
  accent_color?: string;
  /** Slider track/thumb colour. Falls back to `accent_color` when blank. Hex. */
  slider_accent?: string;
  /** Optional tint for the lesson-menu chrome. Unset = neutral frosted glass. Hex. */
  chrome_accent?: string;
  /** Default title-slide logo URL for every course. */
  default_title_logo_url?: string;

  // ── Slide Header defaults ────────────────────────────────────────────────────
  /** Lesson title (small eyebrow / kicker) colour. */
  lesson_title_color?: string;
  /** Slide title (prominent headline) colour. */
  slide_title_color?: string;
  /** "3 / 10" slide counter colour. */
  number_color?: string;
  /** Progress bar fill colour. */
  progress_color?: string;
  /** Progress bar track (unfilled portion) colour. */
  progress_track_color?: string;

  // ── Slide Content defaults ───────────────────────────────────────────────────
  /** Default block container "skin" for slides that don't set their own. */
  default_block_style?: BlockStyle;
  /** Default slide background — a hex colour or the literal 'gradient'. */
  default_background?: string;

  // ── Title Slide defaults ─────────────────────────────────────────────────────
  /** Gradient start colour for title slides. Falls back to branding.primaryColor. */
  title_gradient_from?: string;
  /** Gradient end colour for title slides. Falls back to branding.secondaryColor. */
  title_gradient_to?: string;
  /** Default background image for title slides (overrides gradient when set). URL. */
  default_title_background_url?: string;
}

/** Course-level fields that can OVERRIDE the institution theme (subset). */
export interface CourseThemeOverride {
  accent_color?: string;
  slider_accent?: string;
  chrome_accent?: string;
  title_logo_url?: string;
}

/**
 * The fully-resolved, concrete theme consumed by the viewer chrome and blocks.
 * Every field is concrete (never undefined) except where null is meaningful
 * (chromeAccent null = no tint; titleLogoUrl null = fall back to branding logo;
 * defaultBackground undefined = slides default to white).
 */
export interface EffectiveTheme {
  // ── Branding ──────────────────────────────────────────────────────────────
  accent: string;
  sliderAccent: string;
  chromeAccent: string | null;
  titleLogoUrl: string | null;

  // ── Slide Header ──────────────────────────────────────────────────────────
  lessonTitleColor: string;
  slideTitleColor: string;
  numberColor: string;
  progressColor: string;
  progressTrackColor: string;

  // ── Slide Content ─────────────────────────────────────────────────────────
  /** Resolved block style — always a concrete value. */
  defaultBlockStyle: string;
  /** Resolved default background — undefined means slides fall back to white. */
  defaultBackground: string | undefined;

  // ── Title Slide ───────────────────────────────────────────────────────────
  /** Resolved gradient start — always concrete (falls back to branding.primaryColor). */
  titleGradientFrom: string;
  /** Resolved gradient end — always concrete (falls back to branding.secondaryColor). */
  titleGradientTo: string;
  /** Resolved default title-slide background image — null means use gradient. */
  defaultTitleBackgroundUrl: string | null;
}

/** Coerce an unknown jsonb value into a safe InstitutionTheme. */
export function asInstitutionTheme(value: unknown): InstitutionTheme {
  return (value && typeof value === 'object' ? value : {}) as InstitutionTheme;
}

const firstDefined = (...vals: (string | undefined | null)[]): string | undefined => {
  for (const v of vals) {
    const t = (v ?? '').trim();
    if (t) return t;
  }
  return undefined;
};

/**
 * Resolve the effective theme by cascading:
 *   course override  →  institution theme  →  branding fallback  →  system default
 *
 * The result is what the viewer should actually render — concrete values with no
 * conditional fallback chains scattered across rendering code.
 */
export function resolveEffectiveTheme(opts: {
  course?: (CourseThemeSettings & CourseThemeOverride) | null;
  institution?: InstitutionTheme | null;
  branding: InstitutionBranding;
}): EffectiveTheme {
  const c = opts.course ?? {};
  const inst = opts.institution ?? {};
  const fallbackAccent = '#1E3A5F';

  // ── Branding ────────────────────────────────────────────────────────────────
  const accent = firstDefined(
    c.accent_color, inst.accent_color, opts.branding.accentColor, fallbackAccent,
  )!;
  const sliderAccent = firstDefined(
    c.slider_accent, inst.slider_accent,
    c.accent_color, inst.accent_color, fallbackAccent,
  )!;
  const chromeAccent = firstDefined(c.chrome_accent, inst.chrome_accent) ?? null;
  const titleLogoUrl = firstDefined(c.title_logo_url, inst.default_title_logo_url) ?? null;

  // ── Slide Header — cascade course → institution → system default ────────────
  const lessonTitleColor = firstDefined(c.lesson_title_color, inst.lesson_title_color) ?? '#64748b';
  const slideTitleColor  = firstDefined(c.slide_title_color,  inst.slide_title_color)  ?? '#0F172A';
  const numberColor      = firstDefined(c.number_color,       inst.number_color)       ?? '#64748b';
  const progressColor    = firstDefined(c.progress_color,     inst.progress_color)     ?? '#1E3A5F';
  const progressTrackColor = firstDefined(c.progress_track_color, inst.progress_track_color) ?? '#f1f5f9';

  // ── Slide Content — cascade course → institution → system default ───────────
  const defaultBlockStyle  = c.default_block_style  ?? inst.default_block_style  ?? 'glass';
  const defaultBackground  = c.default_background   ?? inst.default_background;

  // ── Title Slide — cascade course → institution → branding fallback ───────────
  const titleGradientFrom      = firstDefined(c.title_gradient_from,       inst.title_gradient_from)       ?? opts.branding.primaryColor;
  const titleGradientTo        = firstDefined(c.title_gradient_to,         inst.title_gradient_to)         ?? opts.branding.secondaryColor;
  const defaultTitleBackgroundUrl = firstDefined(c.default_title_background_url, inst.default_title_background_url) ?? null;

  return {
    accent, sliderAccent, chromeAccent, titleLogoUrl,
    lessonTitleColor, slideTitleColor, numberColor, progressColor, progressTrackColor,
    defaultBlockStyle, defaultBackground,
    titleGradientFrom, titleGradientTo, defaultTitleBackgroundUrl,
  };
}
