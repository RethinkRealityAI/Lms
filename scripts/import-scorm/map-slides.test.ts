import { describe, it, expect } from 'vitest';
import { mapSlideToBlock } from './map-slides';

describe('mapSlideToBlock', () => {
  it('maps scrolling-media to rich_text with scrolling mode', () => {
    const slide = {
      id: 'abc',
      type: 'scrolling-media' as const,
      name: 0,
      displayIndex: 1,
      data: {
        title: '<p>Title</p>',
        content: [
          { content: '<p>Hello</p>', contentType: 'text' as const },
        ],
      },
    };
    const block = mapSlideToBlock(slide, 0);
    expect(block.block_type).toBe('rich_text');
    expect(block.data.mode).toBe('scrolling');
  });

  it('maps image-slider to image_gallery with slider mode', () => {
    const slide = {
      id: 'abc',
      type: 'image-slider' as const,
      name: 1,
      displayIndex: 2,
      data: {
        items: [
          { content: 'fit_content_assets/img.png', contentType: 'image' as const, caption: 'Cap' },
        ],
      },
    };
    const block = mapSlideToBlock(slide, 1);
    expect(block.block_type).toBe('image_gallery');
    expect(block.data.mode).toBe('slider');
  });

  it('maps image-gallery to image_gallery with gallery mode', () => {
    const slide = {
      id: 'abc',
      type: 'image-gallery' as const,
      name: 1,
      displayIndex: 2,
      data: {
        items: [],
      },
    };
    const block = mapSlideToBlock(slide, 1);
    expect(block.block_type).toBe('image_gallery');
    expect(block.data.mode).toBe('gallery');
  });

  it('maps categorise to quiz_inline with categorize type', () => {
    const slide = {
      id: 'abc',
      type: 'categorise' as const,
      name: 2,
      displayIndex: 3,
      data: {
        categories: [{ name: 'Cat A', items: ['item1', 'item2'] }],
      },
    };
    const block = mapSlideToBlock(slide, 2);
    expect(block.block_type).toBe('quiz_inline');
    expect(block.data.question_type).toBe('categorize');
  });

  it('maps exit to cta with complete_lesson action', () => {
    const slide = {
      id: 'abc',
      type: 'exit' as const,
      name: 3,
      displayIndex: 4,
      data: {
        content: 'Well done!' as any, // exit slides use content as a plain string at runtime
        buttonText: 'Finish',
      },
    };
    const block = mapSlideToBlock(slide, 3);
    expect(block.block_type).toBe('cta');
    expect(block.data.action).toBe('complete_lesson');
  });

  it('returns fallback rich_text for unknown slide type', () => {
    const slide = {
      id: 'abc',
      type: 'unknown-type' as any,
      name: 0,
      displayIndex: 1,
      data: {},
    };
    const block = mapSlideToBlock(slide, 0);
    expect(block.block_type).toBe('rich_text');
    expect(block.data.mode).toBe('fallback');
  });
});
