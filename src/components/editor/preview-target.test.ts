import { describe, it, expect } from 'vitest';
import { resolvePreviewTarget } from './preview-target';
import type { Slide, EntitySelection } from '@/types';
import type { BlockData } from '@/lib/stores/editor-store';

// Minimal slide/block fixtures — resolvePreviewTarget only reads `id`
const slide = (id: string): Slide => ({ id } as Slide);
const block = (id: string): BlockData => ({ id } as BlockData);

const slides = new Map<string, Slide[]>([
  ['lesson-1', [slide('slide-1a'), slide('slide-1b')]],
  ['lesson-2', [slide('slide-2a')]],
]);
const blocks = new Map<string, BlockData[]>([
  ['slide-1a', [block('block-x'), block('block-y')]],
  ['slide-2a', [block('block-z')]],
]);

describe('resolvePreviewTarget', () => {
  it('returns nulls when nothing is selected', () => {
    expect(resolvePreviewTarget(null, slides, blocks)).toEqual({ lessonId: null, slideId: null });
  });

  it('maps a lesson selection to its title slide (no slideId)', () => {
    const sel: EntitySelection = { type: 'lesson', id: 'lesson-2' };
    expect(resolvePreviewTarget(sel, slides, blocks)).toEqual({ lessonId: 'lesson-2', slideId: null });
  });

  it('maps a slide selection to its owning lesson + slide', () => {
    const sel: EntitySelection = { type: 'slide', id: 'slide-1b' };
    expect(resolvePreviewTarget(sel, slides, blocks)).toEqual({ lessonId: 'lesson-1', slideId: 'slide-1b' });
  });

  it('maps a block selection to the slide containing it + that slide’s lesson', () => {
    const sel: EntitySelection = { type: 'block', id: 'block-y' };
    expect(resolvePreviewTarget(sel, slides, blocks)).toEqual({ lessonId: 'lesson-1', slideId: 'slide-1a' });
  });

  it('resolves a block in a different lesson correctly', () => {
    const sel: EntitySelection = { type: 'block', id: 'block-z' };
    expect(resolvePreviewTarget(sel, slides, blocks)).toEqual({ lessonId: 'lesson-2', slideId: 'slide-2a' });
  });

  it('returns the slideId even if the slide is not found in any lesson', () => {
    const sel: EntitySelection = { type: 'slide', id: 'orphan-slide' };
    expect(resolvePreviewTarget(sel, slides, blocks)).toEqual({ lessonId: null, slideId: 'orphan-slide' });
  });

  it('falls back to nulls for a course/module selection', () => {
    expect(resolvePreviewTarget({ type: 'course', id: 'c1' }, slides, blocks)).toEqual({ lessonId: null, slideId: null });
    expect(resolvePreviewTarget({ type: 'module', id: 'm1' }, slides, blocks)).toEqual({ lessonId: null, slideId: null });
  });
});
