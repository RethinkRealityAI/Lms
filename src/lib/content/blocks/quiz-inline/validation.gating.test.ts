import { describe, it, expect } from 'vitest';
import { getGatingQuizBlockIds, getQuizConfigError, type GateSlideLike } from './validation';

/**
 * Regression tests for the "bricked lesson" bug: the completion gate used to
 * count quiz blocks on soft-deleted/draft slides (blocks survive slide
 * deletion; RLS hides draft slides), making lessons unfinishable. The fix
 * derives the gate from the RENDERED slide set only.
 */

function quizBlock(
  id: string,
  data: Record<string, unknown> | null = {
    question_type: 'multiple_choice',
    options: ['A', 'B'],
    correct_answer: 'A',
  },
) {
  return { id, block_type: 'quiz_inline', data };
}

function pageSlide(
  blocks: Array<{ id: string; block_type: string; data?: Record<string, unknown> | null }>,
  slideId = 'slide-1',
): GateSlideLike & { slideId: string } {
  return { kind: 'page', slideId, blocks };
}

describe('getGatingQuizBlockIds', () => {
  it('gates a satisfiable required quiz on a rendered page slide', () => {
    const slides = [pageSlide([quizBlock('q1')])];
    expect(getGatingQuizBlockIds(slides)).toEqual(['q1']);
  });

  it('contributes nothing for slides absent from the rendered set (deleted/draft slide case)', () => {
    // The bricked-lesson scenario: the lesson has TWO quiz blocks in the DB,
    // but one lives on a soft-deleted/draft slide that RLS hides — the viewer
    // only ever passes the RENDERED slides, so the hidden quiz must not gate.
    const renderedOnly = [pageSlide([quizBlock('q-visible')], 'slide-visible')];
    // q-hidden is NOT in the input at all (its slide never renders).
    expect(getGatingQuizBlockIds(renderedOnly)).toEqual(['q-visible']);
    expect(getGatingQuizBlockIds(renderedOnly)).not.toContain('q-hidden');
  });

  it('never gates a quiz with required: false (practice quiz)', () => {
    const slides = [
      pageSlide([
        quizBlock('q-practice', {
          question_type: 'multiple_choice',
          options: ['A', 'B'],
          correct_answer: 'A',
          required: false,
        }),
        quizBlock('q-required'),
      ]),
    ];
    expect(getGatingQuizBlockIds(slides)).toEqual(['q-required']);
  });

  it('never gates an unsatisfiable quiz (correct answer matches no option)', () => {
    const slides = [
      pageSlide([
        quizBlock('q-broken', {
          question_type: 'multiple_choice',
          options: ['A', 'B'],
          correct_answer: 'C', // not among options — can never fire onCorrect
        }),
      ]),
    ];
    expect(getGatingQuizBlockIds(slides)).toEqual([]);
  });

  it('never gates non-gated question types (swipe, slider)', () => {
    const slides = [
      pageSlide([
        quizBlock('q-swipe', { question_type: 'swipe' }),
        quizBlock('q-slider', { question_type: 'slider', min: 0, max: 10 }),
      ]),
    ];
    expect(getGatingQuizBlockIds(slides)).toEqual([]);
  });

  it('never gates blocks with a null/unknown question type', () => {
    const slides = [
      pageSlide([quizBlock('q-null', {}), quizBlock('q-no-data', null)]),
    ];
    expect(getGatingQuizBlockIds(slides)).toEqual([]);
  });

  it('title and completion slides contribute nothing', () => {
    const slides: GateSlideLike[] = [
      { kind: 'title' },
      { kind: 'completion' },
      // Even a malformed non-page slide carrying blocks must not gate.
      { kind: 'title', blocks: [quizBlock('q-on-title')] },
    ];
    expect(getGatingQuizBlockIds(slides)).toEqual([]);
  });

  it('fallback pages (kind page, slideId empty) DO gate', () => {
    // Lessons with no slide rows render a synthesized fallback page — its
    // quizzes are visible to the student, so they still gate.
    const slides = [pageSlide([quizBlock('q-fallback')], '')];
    expect(getGatingQuizBlockIds(slides)).toEqual(['q-fallback']);
  });

  it('collects gating ids across multiple rendered page slides', () => {
    const slides = [
      pageSlide([quizBlock('q1')], 's1'),
      { kind: 'title' } as GateSlideLike,
      pageSlide([{ id: 'rt', block_type: 'rich_text', data: {} }, quizBlock('q2')], 's2'),
    ];
    expect(getGatingQuizBlockIds(slides)).toEqual(['q1', 'q2']);
  });
});

describe('getQuizConfigError', () => {
  it('accepts select_all with array correct_answer matching options', () => {
    expect(
      getQuizConfigError({
        question_type: 'select_all',
        options: ['A', 'B', 'C'],
        correct_answer: ['A', 'C'] as unknown as string,
      }),
    ).toBeNull();
  });

  it("accepts select_all with the '; ' string form", () => {
    expect(
      getQuizConfigError({
        question_type: 'select_all',
        options: ['A', 'B', 'C'],
        correct_answer: 'A; C',
      }),
    ).toBeNull();
  });

  it('flags select_all whose correct answers do not match any option', () => {
    expect(
      getQuizConfigError({
        question_type: 'select_all',
        options: ['A', 'B'],
        correct_answer: 'A; Z',
      }),
    ).toMatch(/do not match/i);
  });

  it('flags categorize with empty categories as unsatisfiable', () => {
    expect(
      getQuizConfigError({ question_type: 'categorize', categories: [] }),
    ).toMatch(/no categories or items/i);
    // ...and getGatingQuizBlockIds therefore excludes it from the gate.
    expect(
      getGatingQuizBlockIds([
        pageSlide([quizBlock('q-cat', { question_type: 'categorize', categories: [] })]),
      ]),
    ).toEqual([]);
  });

  it('accepts categorize with at least one category holding items', () => {
    expect(
      getQuizConfigError({
        question_type: 'categorize',
        categories: [{ name: 'Fruit', items: ['Apple'] }],
      }),
    ).toBeNull();
  });
});
