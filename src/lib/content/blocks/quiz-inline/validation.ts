import type { QuizInlineData } from './schema';

/**
 * Interactive quiz types that gate lesson completion in the student viewer.
 * A quiz of one of these types must be answered correctly before the learner
 * can complete the lesson — UNLESS it is misconfigured (see isQuizSatisfiable),
 * in which case it must NOT gate, or it would permanently brick the lesson.
 */
export const GATED_QUIZ_TYPES = new Set([
  'multiple_choice',
  'true_false',
  'categorize',
  'select_all',
]);

export function isGatedQuizType(type: string | null | undefined): boolean {
  return !!type && GATED_QUIZ_TYPES.has(type);
}

/** Parse a select_all correct_answer into trimmed tokens (array or '; ' string form). */
function parseSelectAllCorrect(ca: unknown): string[] {
  const parts = Array.isArray(ca) ? ca.map((v) => String(v)) : String(ca ?? '').split('; ');
  return parts.map((s) => s.trim()).filter(Boolean);
}

/**
 * Returns a human-readable reason the quiz can never be answered correctly,
 * or null if it is satisfiable. This MIRRORS the viewer's correctness logic
 * exactly (see quiz-inline/viewer.tsx) so the completion gate and the admin
 * editor warning always agree on what "broken" means.
 *
 * A quiz whose correct answer matches no option (or is empty) can never fire
 * onCorrect, so the viewer must treat it as non-gating and the editor should
 * warn the author.
 */
export function getQuizConfigError(data: Partial<QuizInlineData> | undefined | null): string | null {
  if (!data) return null;
  const type = data.question_type;
  const options = (data.options ?? []).map((o) => String(o).trim());

  if (type === 'multiple_choice' || type === 'true_false') {
    const ca = typeof data.correct_answer === 'string' ? data.correct_answer.trim() : '';
    if (!ca) return 'No correct answer is selected.';
    if (!options.includes(ca)) return 'The correct answer does not match any of the options.';
    return null;
  }

  if (type === 'select_all') {
    const tokens = parseSelectAllCorrect(data.correct_answer);
    if (tokens.length === 0) return 'No correct options are selected.';
    if (tokens.some((t) => !options.includes(t))) {
      return 'One or more correct answers do not match any option.';
    }
    return null;
  }

  if (type === 'categorize') {
    const cats = data.categories ?? [];
    const hasItems = cats.some((c) => (c.items ?? []).length > 0);
    if (cats.length === 0 || !hasItems) return 'No categories or items are configured.';
    return null;
  }

  if (type === 'swipe') {
    // Swipe decks don't gate completion; a card-less deck just shows an empty state.
    return null;
  }

  // A quiz_inline block with no recognized question type renders a broken
  // placeholder for students — flag it so an admin can fix it.
  return 'No question type is set, so this block renders as a broken placeholder.';
}

/**
 * True when a gated quiz can actually be answered correctly. Misconfigured
 * gated quizzes return false so the viewer can safely exclude them from the
 * completion gate instead of locking the learner out.
 */
export function isQuizSatisfiable(data: Partial<QuizInlineData> | undefined | null): boolean {
  return getQuizConfigError(data) === null;
}

export interface GateSlideLike {
  kind: string;
  blocks?: Array<{ id: string; block_type: string; data?: Record<string, unknown> | null }>;
}

/**
 * Gating quiz block ids for a lesson, derived from the RENDERED slide set
 * (course-viewer's currentSlides): only what the student can actually see may
 * gate. required !== false (editor "Required to continue"), gated question
 * type, and satisfiable config. See course-viewer.tsx currentLessonQuizBlockIds.
 *
 * Why the rendered slide set and NOT the raw block list: blocks survive slide
 * deletion and RLS hides non-published slides, so a quiz on a soft-deleted or
 * draft-hidden slide never renders — gating on it would permanently brick the
 * lesson. Quizzes shown via the no-slide fallback pages (kind 'page' with a
 * synthesized slideId) still count because they DO render.
 *
 * Gating criteria per block:
 * - `block_type === 'quiz_inline'` with an interactive (gated) question type —
 *   blocks with null/unknown types render a non-interactive placeholder and can
 *   never fire onComplete, so including them would block lesson completion.
 * - `data.required !== false` — only REQUIRED quizzes gate (editor toggle
 *   "Required to continue"; default true preserves historical behavior;
 *   explicit false = practice quiz).
 * - satisfiable config — misconfigured quizzes (correct answer matches no
 *   option, empty, etc.) can never fire onCorrect, so gating on them would
 *   brick the lesson. The editor surfaces these to admins (getQuizConfigError).
 */
export function getGatingQuizBlockIds(slides: GateSlideLike[]): string[] {
  return slides
    .flatMap((s) => (s.kind === 'page' ? s.blocks ?? [] : []))
    .filter(
      (b) =>
        b.block_type === 'quiz_inline' &&
        b.data?.required !== false &&
        isGatedQuizType(b.data?.question_type as string | null | undefined) &&
        isQuizSatisfiable(b.data as Partial<QuizInlineData>),
    )
    .map((b) => b.id);
}
