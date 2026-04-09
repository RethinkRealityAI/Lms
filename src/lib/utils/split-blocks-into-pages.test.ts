import { describe, it, expect } from 'vitest';
import { splitBlocksIntoPages } from './split-blocks-into-pages';
import type { LessonBlock } from '@/types';

function makeBlock(id: string, type = 'rich_text'): LessonBlock {
  return {
    id,
    institution_id: 'inst',
    lesson_id: 'lesson',
    block_type: type,
    data: {},
    order_index: 0,
    is_visible: true,
    settings: {},
    version: 1,
    title: undefined,
    created_at: '',
    updated_at: '',
  };
}

describe('splitBlocksIntoPages', () => {
  it('returns all blocks as a single page when no page_break exists', () => {
    const blocks = [makeBlock('a'), makeBlock('b'), makeBlock('c')];
    const pages = splitBlocksIntoPages(blocks);
    expect(pages).toHaveLength(1);
    expect(pages[0]).toHaveLength(3);
    expect(pages[0].map(b => b.id)).toEqual(['a', 'b', 'c']);
  });

  it('splits blocks at page_break boundaries', () => {
    const blocks = [
      makeBlock('a'),
      makeBlock('b'),
      makeBlock('pb1', 'page_break'),
      makeBlock('c'),
      makeBlock('d'),
    ];
    const pages = splitBlocksIntoPages(blocks);
    expect(pages).toHaveLength(2);
    expect(pages[0].map(b => b.id)).toEqual(['a', 'b']);
    expect(pages[1].map(b => b.id)).toEqual(['c', 'd']);
  });

  it('handles multiple page breaks', () => {
    const blocks = [
      makeBlock('a'),
      makeBlock('pb1', 'page_break'),
      makeBlock('b'),
      makeBlock('pb2', 'page_break'),
      makeBlock('c'),
    ];
    const pages = splitBlocksIntoPages(blocks);
    expect(pages).toHaveLength(3);
    expect(pages[0].map(b => b.id)).toEqual(['a']);
    expect(pages[1].map(b => b.id)).toEqual(['b']);
    expect(pages[2].map(b => b.id)).toEqual(['c']);
  });

  it('filters out empty pages from consecutive page breaks', () => {
    const blocks = [
      makeBlock('a'),
      makeBlock('pb1', 'page_break'),
      makeBlock('pb2', 'page_break'),
      makeBlock('b'),
    ];
    const pages = splitBlocksIntoPages(blocks);
    expect(pages).toHaveLength(2);
    expect(pages[0].map(b => b.id)).toEqual(['a']);
    expect(pages[1].map(b => b.id)).toEqual(['b']);
  });

  it('handles page_break at the start', () => {
    const blocks = [
      makeBlock('pb1', 'page_break'),
      makeBlock('a'),
      makeBlock('b'),
    ];
    const pages = splitBlocksIntoPages(blocks);
    expect(pages).toHaveLength(1);
    expect(pages[0].map(b => b.id)).toEqual(['a', 'b']);
  });

  it('handles page_break at the end', () => {
    const blocks = [
      makeBlock('a'),
      makeBlock('b'),
      makeBlock('pb1', 'page_break'),
    ];
    const pages = splitBlocksIntoPages(blocks);
    expect(pages).toHaveLength(1);
    expect(pages[0].map(b => b.id)).toEqual(['a', 'b']);
  });

  it('returns empty array for empty input', () => {
    const pages = splitBlocksIntoPages([]);
    expect(pages).toHaveLength(0);
  });

  it('returns empty array for only page_break blocks', () => {
    const blocks = [makeBlock('pb1', 'page_break'), makeBlock('pb2', 'page_break')];
    const pages = splitBlocksIntoPages(blocks);
    expect(pages).toHaveLength(0);
  });

  it('does not include page_break blocks in the output pages', () => {
    const blocks = [
      makeBlock('a'),
      makeBlock('pb1', 'page_break'),
      makeBlock('b'),
    ];
    const pages = splitBlocksIntoPages(blocks);
    const allBlockTypes = pages.flat().map(b => b.block_type);
    expect(allBlockTypes).not.toContain('page_break');
  });
});
