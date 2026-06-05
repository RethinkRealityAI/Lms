/**
 * Course-level theme settings — global defaults an admin sets once for the whole course
 * (via the editor's "Course Settings" modal) and which every slide inherits unless the
 * slide overrides them. Stored in `courses.theme_settings` (jsonb).
 */

export type BlockStyle = 'glass-dark' | 'glass' | 'classic' | 'none';

export interface CourseThemeSettings {
  // ── Header group ──────────────────────────────────────────────
  /** Lesson title (small eyebrow / kicker) colour */
  lesson_title_color?: string;
  /** Slide title (prominent headline) colour */
  slide_title_color?: string;
  /** "3 / 10" slide counter colour */
  number_color?: string;
  /** Progress bar fill colour */
  progress_color?: string;
  /** Progress bar track (unfilled) colour */
  progress_track_color?: string;

  // ── Slide group ───────────────────────────────────────────────
  /** Default block container "skin" for slides that don't set their own */
  default_block_style?: BlockStyle;
  /** Default slide background — a hex colour or the literal 'gradient' */
  default_background?: string;
  /** Default slide background image URL (overrides default_background when set) */
  default_background_image?: string;

  // ── Title slide ───────────────────────────────────────────────────────────
  /** Title slide gradient start colour. Falls back to institution → branding.primaryColor. */
  title_gradient_from?: string;
  /** Title slide gradient end colour. Falls back to institution → branding.secondaryColor. */
  title_gradient_to?: string;
  /** Default title slide background image URL. Overrides gradient when set. */
  default_title_background_url?: string;

  // ── Course-level overrides of the institution theme (undefined = inherit) ──
  /** Primary accent override (slider, primary actions). */
  accent_color?: string;
  /** Slider track/thumb colour override. */
  slider_accent?: string;
  /** Lesson-menu chrome tint override (unset = neutral glass). */
  chrome_accent?: string;
  /** Default title-slide logo override for this course. */
  title_logo_url?: string;
}

export const DEFAULT_COURSE_THEME: Required<
  Pick<
    CourseThemeSettings,
    | 'lesson_title_color'
    | 'slide_title_color'
    | 'number_color'
    | 'progress_color'
    | 'progress_track_color'
    | 'default_block_style'
  >
> = {
  lesson_title_color: '#64748b',
  slide_title_color: '#0F172A',
  number_color: '#64748b',
  progress_color: '#1E3A5F',
  progress_track_color: '#f1f5f9',
  default_block_style: 'glass',
};

/** Coerce an unknown jsonb value into a safe CourseThemeSettings object. */
export function asCourseTheme(value: unknown): CourseThemeSettings {
  return (value && typeof value === 'object' ? value : {}) as CourseThemeSettings;
}
