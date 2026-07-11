import { describe, it, expect } from 'vitest';
import { buildLessonPages, type VisibleSlideMeta } from './lesson-pages';
import { getGatingQuizBlockIds } from './blocks/quiz-inline/validation';
import type { LessonBlock } from '@/types';

// Minimal block factory — buildLessonPages only reads id/slide_id/block_type/data/order_index.
function mkBlock(partial: Partial<LessonBlock> & { id: string }): LessonBlock {
  return {
    institution_id: 'inst',
    lesson_id: 'l1',
    block_type: 'rich_text',
    data: {},
    order_index: 0,
    created_at: '',
    updated_at: '',
    is_visible: true,
    settings: {},
    version: 1,
    ...partial,
  } as LessonBlock;
}

function slide(id: string, order_index: number, extra: Partial<VisibleSlideMeta> = {}): VisibleSlideMeta {
  return { id, order_index, ...extra };
}

// A required, satisfiable multiple-choice quiz (gates completion when visible).
const REQUIRED_QUIZ_DATA = {
  question_type: 'multiple_choice',
  question: 'Q',
  options: ['A', 'B'],
  correct_answer: 'A',
  required: true,
};

describe('buildLessonPages', () => {
  it('renders blocks per visible slide, in slide order', () => {
    const slides = [slide('s2', 1), slide('s1', 0)];
    const blocks = [
      mkBlock({ id: 'b1', slide_id: 's1', order_index: 0 }),
      mkBlock({ id: 'b2', slide_id: 's2', order_index: 0 }),
    ];
    const pages = buildLessonPages(slides, blocks);
    expect(pages.map((p) => p.slideId)).toEqual(['s1', 's2']);
    expect(pages[0].blocks.map((b) => b.id)).toEqual(['b1']);
  });

  it('DROPS blocks whose slide is hidden (not in the visible slide set)', () => {
    // s2 is a hidden (draft/deleted) slide — absent from visibleSlides.
    const slides = [slide('s1', 0)];
    const blocks = [
      mkBlock({ id: 'b1', slide_id: 's1' }),
      mkBlock({ id: 'bHidden', slide_id: 's2', block_type: 'quiz_inline', data: REQUIRED_QUIZ_DATA }),
    ];
    const pages = buildLessonPages(slides, blocks);
    expect(pages.map((p) => p.slideId)).toEqual(['s1']);
    // The hidden-slide quiz never appears...
    const allRenderedBlockIds = pages.flatMap((p) => p.blocks.map((b) => b.id));
    expect(allRenderedBlockIds).not.toContain('bHidden');
  });

  it('returns NO content pages when EVERY slide is hidden (the leak fix)', () => {
    // Blocks reference slides, but none of those slides are visible.
    const blocks = [
      mkBlock({ id: 'b1', slide_id: 'sDraft1', block_type: 'quiz_inline', data: REQUIRED_QUIZ_DATA }),
      mkBlock({ id: 'b2', slide_id: 'sDraft2' }),
    ];
    const pages = buildLessonPages([], blocks);
    expect(pages).toEqual([]); // was: [{ all blocks dumped on one page }] — the leak
  });

  it('a fully-hidden lesson contributes NO gating quizzes (consistency with cert RPC)', () => {
    // This is the safety property: a required quiz on a hidden slide must not gate,
    // matching the issue_course_certificate RPC which no longer requires it.
    const blocks = [mkBlock({ id: 'q', slide_id: 'sDraft', block_type: 'quiz_inline', data: REQUIRED_QUIZ_DATA })];
    const pages = buildLessonPages([], blocks);
    const gating = getGatingQuizBlockIds(pages.map((p) => ({ kind: 'page' as const, blocks: p.blocks })));
    expect(gating).toEqual([]);
  });

  it('renders slide-less legacy blocks (null slide_id) as a trailing page', () => {
    const slides = [slide('s1', 0)];
    const blocks = [
      mkBlock({ id: 'b1', slide_id: 's1' }),
      mkBlock({ id: 'bLegacy' }), // no slide_id
    ];
    const pages = buildLessonPages(slides, blocks);
    expect(pages.map((p) => p.slideId)).toEqual(['s1', '']);
    expect(pages[1].blocks.map((b) => b.id)).toEqual(['bLegacy']);
  });

  it('treats a pure-legacy lesson (no block has a slide_id) as one page', () => {
    const blocks = [mkBlock({ id: 'b1' }), mkBlock({ id: 'b2', order_index: 1 })];
    const pages = buildLessonPages([], blocks);
    expect(pages).toHaveLength(1);
    expect(pages[0].slideId).toBe('');
    expect(pages[0].blocks.map((b) => b.id)).toEqual(['b1', 'b2']);
  });

  it('includes a visible canvas slide even with no blocks', () => {
    // Canvas slides carry content in canvas_data; they render as long as the
    // lesson uses the slide model (some block somewhere has a slide_id).
    const slides = [slide('sCanvas', 0, { slide_type: 'canvas' }), slide('s1', 1)];
    const blocks = [mkBlock({ id: 'b1', slide_id: 's1' })];
    const pages = buildLessonPages(slides, blocks);
    expect(pages.map((p) => p.slideId)).toEqual(['sCanvas', 's1']);
  });

  it('returns [] when the lesson has no blocks at all', () => {
    expect(buildLessonPages([slide('s1', 0)], [])).toEqual([]);
  });
});
