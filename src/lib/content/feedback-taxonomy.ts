// Shared taxonomy for the unified feedback system — the single source of truth for
// feedback types, their category pills, and their display styling. Consumed by the
// in-viewer Report-issue dialog, the dashboard support widget, the /api/feedback
// route (validation), and the admin support hub (filters + card rendering).

export type FeedbackType = 'contact' | 'issue' | 'suggestion' | 'bug';
export type FeedbackStatus = 'new' | 'in_progress' | 'resolved';

export interface FeedbackCategory {
  slug: string;
  label: string;
}

export interface FeedbackTypeConfig {
  type: FeedbackType;
  /** Singular label, e.g. "Issue". */
  label: string;
  /** Plural label for the admin hub filter, e.g. "Issues". */
  pluralLabel: string;
  /** Tailwind classes for the type pill (badge). */
  pillClass: string;
  categories: FeedbackCategory[];
}

export const FEEDBACK_TYPES: Record<FeedbackType, FeedbackTypeConfig> = {
  contact: {
    type: 'contact',
    label: 'Contact',
    pluralLabel: 'Contact',
    pillClass: 'bg-slate-100 text-slate-700 border-slate-200',
    categories: [],
  },
  issue: {
    type: 'issue',
    label: 'Issue',
    pluralLabel: 'Issues',
    pillClass: 'bg-red-50 text-red-700 border-red-200',
    categories: [
      { slug: 'cant_progress', label: "Can't progress / complete" },
      { slug: 'content_incomplete', label: 'Content seems incomplete' },
      { slug: 'content_broken', label: "Something isn't working" },
      { slug: 'content_wrong', label: 'Incorrect or confusing info' },
      { slug: 'media_broken', label: "Video / image won't load" },
      { slug: 'other', label: 'Other' },
    ],
  },
  suggestion: {
    type: 'suggestion',
    label: 'Suggestion',
    pluralLabel: 'Suggestions',
    pillClass: 'bg-violet-50 text-violet-700 border-violet-200',
    categories: [
      { slug: 'new_feature', label: 'New feature idea' },
      { slug: 'content_improvement', label: 'Course / content improvement' },
      { slug: 'ux_improvement', label: 'Easier to use (UX)' },
      { slug: 'accessibility', label: 'Accessibility' },
      { slug: 'other', label: 'Other' },
    ],
  },
  bug: {
    type: 'bug',
    label: 'Bug',
    pluralLabel: 'Bug reports',
    pillClass: 'bg-orange-50 text-orange-700 border-orange-200',
    categories: [
      { slug: 'login_account', label: 'Login / account' },
      { slug: 'certificate', label: 'Certificate' },
      { slug: 'progress_completion', label: 'Progress / completion' },
      { slug: 'performance', label: "Slow / won't load" },
      { slug: 'display', label: 'Display / layout' },
      { slug: 'other', label: 'Other' },
    ],
  },
};

export const FEEDBACK_STATUSES: Record<FeedbackStatus, { label: string; pillClass: string }> = {
  new: { label: 'New', pillClass: 'bg-blue-50 text-blue-700 border-blue-200' },
  in_progress: { label: 'In progress', pillClass: 'bg-amber-50 text-amber-700 border-amber-200' },
  resolved: { label: 'Resolved', pillClass: 'bg-green-50 text-green-700 border-green-200' },
};

export function isFeedbackType(v: unknown): v is FeedbackType {
  return typeof v === 'string' && v in FEEDBACK_TYPES;
}

export function isFeedbackStatus(v: unknown): v is FeedbackStatus {
  return typeof v === 'string' && v in FEEDBACK_STATUSES;
}

/** The category label for a (type, slug), or null when the slug isn't in the taxonomy. */
export function categoryLabel(type: FeedbackType, slug: string | null | undefined): string | null {
  if (!slug) return null;
  return FEEDBACK_TYPES[type]?.categories.find((c) => c.slug === slug)?.label ?? null;
}

/** True when `slug` is a valid category for `type` (empty-category types accept null only). */
export function isValidCategory(type: FeedbackType, slug: string | null | undefined): boolean {
  const cats = FEEDBACK_TYPES[type]?.categories ?? [];
  if (!slug) return true; // category is always optional
  return cats.some((c) => c.slug === slug);
}

/** Structured context captured with a submission (all optional). */
export interface FeedbackContext {
  page_url?: string;
  course_id?: string;
  course_title?: string;
  module_title?: string;
  lesson_id?: string;
  lesson_title?: string;
  slide_index?: number;
  user_agent?: string;
}
