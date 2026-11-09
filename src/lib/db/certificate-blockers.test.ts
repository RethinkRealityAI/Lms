import { describe, it, expect } from 'vitest';
import { computeMissingQuizzes, type CertificateBlockerInput } from './certificate-blockers';

const mc = (correct = 'A') => ({ question_type: 'multiple_choice', options: ['A', 'B'], correct_answer: correct });

function base(overrides: Partial<CertificateBlockerInput> = {}): CertificateBlockerInput {
  return {
    lessons: [
      { id: 'L2', title: 'Lesson 2', order_index: 1 },
      { id: 'L1', title: 'Lesson 1', order_index: 0 },
    ],
    slides: [
      { id: 's1', lesson_id: 'L1', title: 'Quiz one', order_index: 3, status: 'published', deleted_at: null },
      { id: 's2', lesson_id: 'L2', title: 'Knowledge Check', order_index: 5, status: 'published', deleted_at: null },
      { id: 'sDraft', lesson_id: 'L2', title: 'Draft', order_index: 6, status: 'draft', deleted_at: null },
      { id: 'sTrash', lesson_id: 'L2', title: 'Trash', order_index: 7, status: 'published', deleted_at: '2026-08-01T00:00:00Z' },
    ],
    blocks: [
      { id: 'q1', lesson_id: 'L1', slide_id: 's1', block_type: 'quiz_inline', data: mc() },
      { id: 'q2', lesson_id: 'L2', slide_id: 's2', block_type: 'quiz_inline', data: mc() },
    ],
    correctBlockIds: new Set(),
    progress: [],
    ...overrides,
  };
}

describe('computeMissingQuizzes (mirrors issue_course_certificate gating)', () => {
  it('lists unanswered required quizzes in course order with lesson + slide', () => {
    const out = computeMissingQuizzes(base());
    expect(out.map((m) => m.blockId)).toEqual(['q1', 'q2']);
    expect(out[1]).toMatchObject({ lessonTitle: 'Lesson 2', lessonPosition: 1, slideId: 's2', slideTitle: 'Knowledge Check' });
  });

  it('drops quizzes answered correctly (a stored wrong answer still counts as missing)', () => {
    expect(computeMissingQuizzes(base({ correctBlockIds: new Set(['q1']) })).map((m) => m.blockId)).toEqual(['q2']);
  });

  it('ignores practice, non-gated, and misconfigured quizzes', () => {
    const out = computeMissingQuizzes(base({
      blocks: [
        { id: 'practice', lesson_id: 'L1', slide_id: 's1', block_type: 'quiz_inline', data: { ...mc(), required: false } },
        { id: 'swipe', lesson_id: 'L1', slide_id: 's1', block_type: 'quiz_inline', data: { question_type: 'swipe' } },
        { id: 'broken', lesson_id: 'L1', slide_id: 's1', block_type: 'quiz_inline', data: mc('Z') },
        { id: 'text', lesson_id: 'L1', slide_id: 's1', block_type: 'rich_text', data: {} },
      ],
    }));
    expect(out).toEqual([]);
  });

  it('ignores quizzes on draft or trashed slides, and trashed blocks; keeps slide-less legacy quizzes', () => {
    const out = computeMissingQuizzes(base({
      blocks: [
        { id: 'onDraft', lesson_id: 'L2', slide_id: 'sDraft', block_type: 'quiz_inline', data: mc() },
        { id: 'onTrash', lesson_id: 'L2', slide_id: 'sTrash', block_type: 'quiz_inline', data: mc() },
        { id: 'trashed', lesson_id: 'L2', slide_id: 's2', block_type: 'quiz_inline', deleted_at: '2026-08-01T00:00:00Z', data: mc() },
        { id: 'legacy', lesson_id: 'L2', slide_id: null, block_type: 'quiz_inline', data: mc() },
      ],
    }));
    expect(out.map((m) => m.blockId)).toEqual(['legacy']);
    expect(out[0].slideId).toBeNull();
  });

  it('ignores quizzes in lessons that are not part of the course (deleted lessons)', () => {
    const out = computeMissingQuizzes(base({
      blocks: [{ id: 'gone', lesson_id: 'L-deleted', slide_id: null, block_type: 'quiz_inline', data: mc() }],
    }));
    expect(out).toEqual([]);
  });

  it('grandfathers lessons completed before the enforcement cutoff only', () => {
    const out = computeMissingQuizzes(base({
      progress: [
        { lesson_id: 'L1', completed: true, completed_at: '2026-07-10T00:00:00Z' },
        { lesson_id: 'L2', completed: true, completed_at: '2026-09-28T20:09:34Z' },
      ],
    }));
    expect(out.map((m) => m.blockId)).toEqual(['q2']);
  });
});
