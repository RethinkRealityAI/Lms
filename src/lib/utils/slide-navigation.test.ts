import { describe, it, expect } from 'vitest';
import {
  computeNavState,
  getPrimaryButton,
  isNextBlocked,
  findNextLesson,
  resolveInitialLesson,
  type SlideInfo,
} from './slide-navigation';

// ── Helper builders ──────────────────────────────────────────

function buildSlides(count: number, overrides?: Record<number, Partial<SlideInfo>>): SlideInfo[] {
  // Standard lesson: title + N content slides + completion
  const slides: SlideInfo[] = [
    { kind: 'title' },
    ...Array.from({ length: count }, (_, i) => ({
      kind: 'page' as const,
      settings: overrides?.[i + 1]?.settings ?? {},
    })),
    { kind: 'completion' },
  ];
  return slides;
}

// ── computeNavState ──────────────────────────────────────────

describe('computeNavState', () => {
  const slides = buildSlides(3); // title, page, page, page, completion = 5 slides

  it('identifies the first slide', () => {
    const nav = computeNavState(slides, 0);
    expect(nav.isFirstSlide).toBe(true);
    expect(nav.isLastSlide).toBe(false);
    expect(nav.isCompletionSlide).toBe(false);
    expect(nav.isLastContentSlide).toBe(false);
  });

  it('identifies a middle content slide', () => {
    const nav = computeNavState(slides, 2); // second page slide
    expect(nav.isFirstSlide).toBe(false);
    expect(nav.isLastSlide).toBe(false);
    expect(nav.isCompletionSlide).toBe(false);
    expect(nav.isLastContentSlide).toBe(false);
  });

  it('identifies the last content slide (one before completion)', () => {
    const nav = computeNavState(slides, 3); // third page slide, index 3 of 5
    expect(nav.isFirstSlide).toBe(false);
    expect(nav.isLastSlide).toBe(false);
    expect(nav.isCompletionSlide).toBe(false);
    expect(nav.isLastContentSlide).toBe(true);
  });

  it('identifies the completion slide', () => {
    const nav = computeNavState(slides, 4); // completion
    expect(nav.isFirstSlide).toBe(false);
    expect(nav.isLastSlide).toBe(true);
    expect(nav.isCompletionSlide).toBe(true);
    expect(nav.isLastContentSlide).toBe(false);
  });

  it('reads nav_label from page slide settings', () => {
    const custom = buildSlides(1, { 1: { settings: { nav_label: 'Continue Reading' } } });
    const nav = computeNavState(custom, 1);
    expect(nav.navLabel).toBe('Continue Reading');
  });

  it('reads nav_url from page slide settings', () => {
    const custom = buildSlides(1, { 1: { settings: { nav_url: 'https://example.com' } } });
    const nav = computeNavState(custom, 1);
    expect(nav.navUrl).toBe('https://example.com');
  });

  it('returns undefined nav_label for title slides', () => {
    const nav = computeNavState(slides, 0);
    expect(nav.navLabel).toBeUndefined();
  });

  it('returns undefined nav_label for completion slides', () => {
    const nav = computeNavState(slides, 4);
    expect(nav.navLabel).toBeUndefined();
  });

  it('returns undefined nav_label when settings has empty string', () => {
    const custom = buildSlides(1, { 1: { settings: { nav_label: '' } } });
    const nav = computeNavState(custom, 1);
    expect(nav.navLabel).toBeUndefined();
  });

  it('returns undefined nav_url when settings has empty string', () => {
    const custom = buildSlides(1, { 1: { settings: { nav_url: '' } } });
    const nav = computeNavState(custom, 1);
    expect(nav.navUrl).toBeUndefined();
  });

  it('handles single content slide lesson (title + 1 page + completion)', () => {
    const short = buildSlides(1); // title, page, completion = 3 slides
    // The page slide (index 1) should be the last content slide
    const nav = computeNavState(short, 1);
    expect(nav.isLastContentSlide).toBe(true);
    expect(nav.isCompletionSlide).toBe(false);
  });

  it('handles out-of-bounds index gracefully', () => {
    const nav = computeNavState(slides, 99);
    expect(nav.isFirstSlide).toBe(false);
    expect(nav.isLastSlide).toBe(false);
    // current is null, so completion/lastContent checks fail safely
    expect(nav.isCompletionSlide).toBe(false);
  });

  it('handles empty slides array', () => {
    const nav = computeNavState([], 0);
    expect(nav.isFirstSlide).toBe(true);
    expect(nav.isLastSlide).toBe(false); // 0 === -1 is false
    expect(nav.isCompletionSlide).toBe(false);
  });
});

// ── getPrimaryButton ─────────────────────────────────────────

describe('getPrimaryButton', () => {
  const slides3 = buildSlides(3); // title, page, page, page, completion

  it('shows "Next" on a regular content slide', () => {
    const nav = computeNavState(slides3, 1);
    const btn = getPrimaryButton(nav, { hasNextLesson: true, allQuizzesComplete: true });
    expect(btn.kind).toBe('next');
    expect(btn.label).toBe('Next');
    expect(btn.disabled).toBe(false);
  });

  it('shows "Next" on the title slide', () => {
    const nav = computeNavState(slides3, 0);
    const btn = getPrimaryButton(nav, { hasNextLesson: true, allQuizzesComplete: true });
    expect(btn.kind).toBe('next');
    expect(btn.label).toBe('Next');
  });

  it('shows "Complete Lesson" on the last content slide', () => {
    const nav = computeNavState(slides3, 3); // last page before completion
    const btn = getPrimaryButton(nav, { hasNextLesson: true, allQuizzesComplete: true });
    expect(btn.kind).toBe('complete');
    expect(btn.label).toBe('Complete Lesson');
    expect(btn.disabled).toBe(false);
  });

  it('disables "Complete Lesson" when quizzes incomplete', () => {
    const nav = computeNavState(slides3, 3);
    const btn = getPrimaryButton(nav, { hasNextLesson: true, allQuizzesComplete: false });
    expect(btn.kind).toBe('complete');
    expect(btn.disabled).toBe(true);
  });

  it('uses custom nav_label for "Complete Lesson"', () => {
    const custom = buildSlides(1, { 1: { settings: { nav_label: 'Finish Up' } } });
    const nav = computeNavState(custom, 1);
    const btn = getPrimaryButton(nav, { hasNextLesson: true, allQuizzesComplete: true });
    expect(btn.kind).toBe('complete');
    expect(btn.label).toBe('Finish Up');
  });

  it('uses custom nav_label for "Next"', () => {
    const custom = buildSlides(3, { 1: { settings: { nav_label: 'Continue' } } });
    const nav = computeNavState(custom, 1);
    const btn = getPrimaryButton(nav, { hasNextLesson: true, allQuizzesComplete: true });
    expect(btn.kind).toBe('next');
    expect(btn.label).toBe('Continue');
  });

  it('shows "Next Lesson" on completion slide when more lessons exist', () => {
    const nav = computeNavState(slides3, 4);
    const btn = getPrimaryButton(nav, { hasNextLesson: true, allQuizzesComplete: true });
    expect(btn.kind).toBe('next-lesson');
    expect(btn.label).toBe('Next Lesson');
    expect(btn.disabled).toBe(false);
  });

  it('disables "Next Lesson" when quizzes incomplete', () => {
    const nav = computeNavState(slides3, 4);
    const btn = getPrimaryButton(nav, { hasNextLesson: true, allQuizzesComplete: false });
    expect(btn.kind).toBe('next-lesson');
    expect(btn.disabled).toBe(true);
  });

  it('shows "Back to Dashboard" on completion slide when no more lessons', () => {
    const nav = computeNavState(slides3, 4);
    const btn = getPrimaryButton(nav, { hasNextLesson: false, allQuizzesComplete: true });
    expect(btn.kind).toBe('dashboard');
    expect(btn.label).toBe('Back to Dashboard');
    expect(btn.disabled).toBe(false);
  });

  it('shows "Back to Dashboard" even when quizzes incomplete (last lesson)', () => {
    const nav = computeNavState(slides3, 4);
    const btn = getPrimaryButton(nav, { hasNextLesson: false, allQuizzesComplete: false });
    expect(btn.kind).toBe('dashboard');
    expect(btn.disabled).toBe(false);
  });

  it('shows "external" when nav_url is set on a content slide', () => {
    const custom = buildSlides(3, { 2: { settings: { nav_url: 'https://example.com', nav_label: 'Visit Site' } } });
    const nav = computeNavState(custom, 2);
    const btn = getPrimaryButton(nav, { hasNextLesson: true, allQuizzesComplete: true });
    expect(btn.kind).toBe('external');
    expect(btn.label).toBe('Visit Site');
    expect(btn.disabled).toBe(false);
  });

  it('uses default label for external button when no nav_label', () => {
    const custom = buildSlides(3, { 2: { settings: { nav_url: 'https://example.com' } } });
    const nav = computeNavState(custom, 2);
    const btn = getPrimaryButton(nav, { hasNextLesson: true, allQuizzesComplete: true });
    expect(btn.kind).toBe('external');
    expect(btn.label).toBe('Next');
  });

  it('uses "Complete Lesson" as default external label on last content slide', () => {
    const custom = buildSlides(1, { 1: { settings: { nav_url: 'https://example.com' } } });
    const nav = computeNavState(custom, 1);
    const btn = getPrimaryButton(nav, { hasNextLesson: true, allQuizzesComplete: true });
    expect(btn.kind).toBe('external');
    expect(btn.label).toBe('Complete Lesson');
  });

  it('ignores nav_url on completion slide', () => {
    // Completion slides don't have settings, but even if they did, nav_url shouldn't apply
    const nav = computeNavState(slides3, 4);
    // navUrl is undefined for completion slides (computeNavState handles this)
    const btn = getPrimaryButton(nav, { hasNextLesson: true, allQuizzesComplete: true });
    expect(btn.kind).toBe('next-lesson');
  });
});

// ── isNextBlocked ────────────────────────────────────────────

describe('isNextBlocked', () => {
  const slides = buildSlides(3); // title(0), page(1), page(2), page(3), completion(4)

  it('blocks when next slide is completion and quizzes incomplete', () => {
    expect(isNextBlocked(slides, 3, false)).toBe(true);
  });

  it('does not block when next slide is completion and quizzes complete', () => {
    expect(isNextBlocked(slides, 3, true)).toBe(false);
  });

  it('does not block on regular content slides even with incomplete quizzes', () => {
    expect(isNextBlocked(slides, 1, false)).toBe(false);
  });

  it('does not block on title slide', () => {
    expect(isNextBlocked(slides, 0, false)).toBe(false);
  });

  it('does not block on completion slide (no next slide)', () => {
    expect(isNextBlocked(slides, 4, false)).toBe(false);
  });

  it('does not block when there are no quizzes (allQuizzesComplete = true)', () => {
    expect(isNextBlocked(slides, 3, true)).toBe(false);
  });
});

// ── findNextLesson ───────────────────────────────────────────

describe('findNextLesson', () => {
  const lessons = [
    { id: 'lesson-1', title: 'Intro' },
    { id: 'lesson-2', title: 'Advanced' },
    { id: 'lesson-3', title: 'Summary' },
  ];

  it('finds the next lesson', () => {
    expect(findNextLesson(lessons, 'lesson-1')).toEqual({ id: 'lesson-2', title: 'Advanced' });
  });

  it('returns null for the last lesson', () => {
    expect(findNextLesson(lessons, 'lesson-3')).toBeNull();
  });

  it('returns null for unknown lesson id', () => {
    expect(findNextLesson(lessons, 'nonexistent')).toBeNull();
  });

  it('returns null for empty lessons array', () => {
    expect(findNextLesson([], 'lesson-1')).toBeNull();
  });

  it('finds next in a two-lesson sequence', () => {
    const two = [{ id: 'a' }, { id: 'b' }];
    expect(findNextLesson(two, 'a')).toEqual({ id: 'b' });
    expect(findNextLesson(two, 'b')).toBeNull();
  });
});

// ── resolveInitialLesson ─────────────────────────────────────

describe('resolveInitialLesson', () => {
  const lessons = [
    { id: 'lesson-1', title: 'Intro' },
    { id: 'lesson-2', title: 'Advanced' },
    { id: 'lesson-3', title: 'Summary' },
  ];
  const completedSet = (ids: string[]) => (id: string) => ids.includes(id);

  it('returns null lesson for an empty course', () => {
    const res = resolveInitialLesson([], () => false, null);
    expect(res.lesson).toBeNull();
    expect(res.landOnCompletion).toBe(false);
  });

  it('resumes at the first incomplete lesson', () => {
    const res = resolveInitialLesson(lessons, completedSet(['lesson-1']), null);
    expect(res.lesson).toEqual({ id: 'lesson-2', title: 'Advanced' });
    expect(res.landOnCompletion).toBe(false);
  });

  it('opens the first lesson when nothing is complete yet', () => {
    const res = resolveInitialLesson(lessons, completedSet([]), null);
    expect(res.lesson).toEqual({ id: 'lesson-1', title: 'Intro' });
    expect(res.landOnCompletion).toBe(false);
  });

  it('skips a mid-course completed lesson to the first still-incomplete one', () => {
    // lesson-1 complete, lesson-2 incomplete, lesson-3 complete → resume lesson-2
    const res = resolveInitialLesson(lessons, completedSet(['lesson-1', 'lesson-3']), null);
    expect(res.lesson?.id).toBe('lesson-2');
    expect(res.landOnCompletion).toBe(false);
  });

  // The regression this PR fixes: a fully-complete course must NOT fall back to
  // lesson 1 — it lands on the LAST lesson's completion slide instead.
  it('lands on the LAST lesson (completion) when every lesson is complete', () => {
    const res = resolveInitialLesson(lessons, completedSet(['lesson-1', 'lesson-2', 'lesson-3']), null);
    expect(res.lesson).toEqual({ id: 'lesson-3', title: 'Summary' });
    expect(res.landOnCompletion).toBe(true);
  });

  it('honours an explicit initialLessonId even when that lesson is complete', () => {
    const res = resolveInitialLesson(lessons, completedSet(['lesson-1', 'lesson-2', 'lesson-3']), 'lesson-2');
    expect(res.lesson?.id).toBe('lesson-2');
    // Explicit deep-link never triggers the land-on-completion resume behaviour.
    expect(res.landOnCompletion).toBe(false);
  });

  it('falls back to the first lesson (never completion) when initialLessonId is missing', () => {
    const res = resolveInitialLesson(lessons, completedSet(['lesson-1', 'lesson-2', 'lesson-3']), 'deleted-lesson');
    expect(res.lesson?.id).toBe('lesson-1');
    expect(res.landOnCompletion).toBe(false);
  });

  it('single-lesson complete course lands on that lesson with landOnCompletion', () => {
    const one = [{ id: 'only' }];
    const res = resolveInitialLesson(one, completedSet(['only']), null);
    expect(res.lesson?.id).toBe('only');
    expect(res.landOnCompletion).toBe(true);
  });
});

// ── Integration: full lesson flow ────────────────────────────

describe('full lesson navigation flow', () => {
  it('walks through a 3-slide lesson with correct buttons at each step', () => {
    const slides = buildSlides(3); // title(0), page(1), page(2), page(3), completion(4)

    // Slide 0: Title
    const nav0 = computeNavState(slides, 0);
    const btn0 = getPrimaryButton(nav0, { hasNextLesson: true, allQuizzesComplete: true });
    expect(btn0.kind).toBe('next');
    expect(nav0.isFirstSlide).toBe(true);

    // Slide 1: First content
    const nav1 = computeNavState(slides, 1);
    const btn1 = getPrimaryButton(nav1, { hasNextLesson: true, allQuizzesComplete: true });
    expect(btn1.kind).toBe('next');
    expect(nav1.isFirstSlide).toBe(false);

    // Slide 2: Middle content
    const nav2 = computeNavState(slides, 2);
    const btn2 = getPrimaryButton(nav2, { hasNextLesson: true, allQuizzesComplete: true });
    expect(btn2.kind).toBe('next');

    // Slide 3: Last content → "Complete Lesson"
    const nav3 = computeNavState(slides, 3);
    const btn3 = getPrimaryButton(nav3, { hasNextLesson: true, allQuizzesComplete: true });
    expect(btn3.kind).toBe('complete');
    expect(btn3.label).toBe('Complete Lesson');
    expect(nav3.isLastContentSlide).toBe(true);

    // Slide 4: Completion → "Next Lesson"
    const nav4 = computeNavState(slides, 4);
    const btn4 = getPrimaryButton(nav4, { hasNextLesson: true, allQuizzesComplete: true });
    expect(btn4.kind).toBe('next-lesson');
    expect(nav4.isCompletionSlide).toBe(true);
  });

  it('shows "Back to Dashboard" on last lesson completion', () => {
    const slides = buildSlides(1);
    const nav = computeNavState(slides, 2); // completion
    const btn = getPrimaryButton(nav, { hasNextLesson: false, allQuizzesComplete: true });
    expect(btn.kind).toBe('dashboard');
    expect(btn.label).toBe('Back to Dashboard');
  });

  it('gates completion when quizzes are incomplete', () => {
    const slides = buildSlides(2); // title(0), page(1), page(2), completion(3)

    // On last content slide — button disabled
    const nav2 = computeNavState(slides, 2);
    const btn2 = getPrimaryButton(nav2, { hasNextLesson: true, allQuizzesComplete: false });
    expect(btn2.kind).toBe('complete');
    expect(btn2.disabled).toBe(true);

    // isNextBlocked also blocks advancing
    expect(isNextBlocked(slides, 2, false)).toBe(true);

    // On completion slide — Next Lesson disabled
    const nav3 = computeNavState(slides, 3);
    const btn3 = getPrimaryButton(nav3, { hasNextLesson: true, allQuizzesComplete: false });
    expect(btn3.kind).toBe('next-lesson');
    expect(btn3.disabled).toBe(true);
  });

  it('handles custom labels throughout the flow', () => {
    const slides = buildSlides(2, {
      1: { settings: { nav_label: 'Continue' } },
      2: { settings: { nav_label: 'Finish Module' } },
    });

    const nav1 = computeNavState(slides, 1);
    const btn1 = getPrimaryButton(nav1, { hasNextLesson: true, allQuizzesComplete: true });
    expect(btn1.label).toBe('Continue');

    const nav2 = computeNavState(slides, 2);
    const btn2 = getPrimaryButton(nav2, { hasNextLesson: true, allQuizzesComplete: true });
    expect(btn2.label).toBe('Finish Module');
  });
});
