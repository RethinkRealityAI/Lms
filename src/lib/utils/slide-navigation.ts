/**
 * Pure utility functions for slide navigation logic.
 * Extracted from course-viewer.tsx for testability.
 */

export type SlideKind = 'title' | 'page' | 'completion';

export interface SlideInfo {
  kind: SlideKind;
  settings?: Record<string, unknown>;
}

export interface NavState {
  /** Current slide is the first in the sequence */
  isFirstSlide: boolean;
  /** Current slide is the last in the sequence (the completion slide) */
  isLastSlide: boolean;
  /** Current slide is the completion slide */
  isCompletionSlide: boolean;
  /** Current slide is the last content slide before completion */
  isLastContentSlide: boolean;
  /** Custom button label from slide settings, or undefined for auto */
  navLabel: string | undefined;
  /** External URL from slide settings, or undefined */
  navUrl: string | undefined;
}

/**
 * Compute the navigation state for the current slide.
 */
export function computeNavState(
  slides: SlideInfo[],
  currentIndex: number,
): NavState {
  const total = slides.length;
  const current = slides[currentIndex] ?? null;

  const isFirstSlide = currentIndex === 0;
  const isLastSlide = currentIndex === total - 1;
  const isCompletionSlide = current?.kind === 'completion';
  // Last content slide = one before the completion slide (which is always last)
  const isLastContentSlide = !isCompletionSlide && currentIndex === total - 2;

  const navLabel = current?.kind === 'page'
    ? (current.settings?.nav_label as string | undefined) || undefined
    : undefined;

  const navUrl = current?.kind === 'page'
    ? (current.settings?.nav_url as string | undefined) || undefined
    : undefined;

  return {
    isFirstSlide,
    isLastSlide,
    isCompletionSlide,
    isLastContentSlide,
    navLabel,
    navUrl,
  };
}

export type ButtonKind =
  | 'next'              // Regular "Next" button (navy)
  | 'complete'          // "Complete Lesson" button (red)
  | 'next-lesson'       // "Next Lesson" on completion slide (navy)
  | 'dashboard'         // "Back to Dashboard" on last lesson's completion slide
  | 'external'          // Opens an external URL
  | 'none';             // No primary button (shouldn't happen in normal flow)

/**
 * Determine which primary button to show in the navigation footer.
 */
export function getPrimaryButton(
  nav: NavState,
  options: {
    hasNextLesson: boolean;
    allQuizzesComplete: boolean;
  },
): { kind: ButtonKind; label: string; disabled: boolean } {
  // External URL override — applies to content slides only
  if (nav.navUrl && !nav.isCompletionSlide) {
    return {
      kind: 'external',
      label: nav.navLabel || (nav.isLastContentSlide ? 'Complete Lesson' : 'Next'),
      disabled: false,
    };
  }

  if (nav.isCompletionSlide) {
    if (options.hasNextLesson) {
      return {
        kind: 'next-lesson',
        label: 'Next Lesson',
        disabled: !options.allQuizzesComplete,
      };
    }
    return {
      kind: 'dashboard',
      label: 'Back to Dashboard',
      disabled: false,
    };
  }

  if (nav.isLastContentSlide) {
    return {
      kind: 'complete',
      label: nav.navLabel || 'Complete Lesson',
      disabled: !options.allQuizzesComplete,
    };
  }

  if (!nav.isLastSlide) {
    // Check if next slide is completion and quizzes aren't done
    const nextBlocked = nav.isLastContentSlide === false
      && !options.allQuizzesComplete
      // Only block if we're one before completion — but isLastContentSlide already handles that
      // Regular slides are never blocked
      ? false
      : false;

    return {
      kind: 'next',
      label: nav.navLabel || 'Next',
      disabled: false, // Regular Next is never disabled (only Complete Lesson gates quizzes)
    };
  }

  return { kind: 'none', label: '', disabled: true };
}

/**
 * Determine if the "Next" action should be blocked.
 * This happens when the next slide is the completion slide and quizzes aren't done.
 */
export function isNextBlocked(
  slides: SlideInfo[],
  currentIndex: number,
  allQuizzesComplete: boolean,
): boolean {
  const nextSlide = slides[currentIndex + 1];
  return nextSlide?.kind === 'completion' && !allQuizzesComplete;
}

/**
 * Find the index of the next lesson in the lessons array.
 * Returns null if there's no next lesson.
 */
export function findNextLesson<T extends { id: string }>(
  lessons: T[],
  currentLessonId: string,
): T | null {
  const idx = lessons.findIndex(l => l.id === currentLessonId);
  if (idx === -1) return null;
  return lessons[idx + 1] ?? null;
}
