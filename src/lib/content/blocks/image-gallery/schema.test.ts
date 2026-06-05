import { describe, it, expect } from 'vitest';
import { imageGalleryDataSchema } from './schema';

describe('imageGalleryDataSchema', () => {
  it('defaults objectFit to contain and displaySize to md', () => {
    const parsed = imageGalleryDataSchema.parse({ images: [{ url: 'https://example.com/a.jpg' }] });
    expect(parsed.objectFit).toBe('contain');
    expect(parsed.displaySize).toBe('md');
  });

  it('parses click-for-more options', () => {
    const parsed = imageGalleryDataSchema.parse({
      images: [{ url: 'https://example.com/a.jpg', caption: 'Info' }],
      clickForMore: true,
      captionInGrid: false,
      requireAllClicked: true,
      displaySize: 'lg',
      captionColor: '#ff0000',
    });
    expect(parsed.clickForMore).toBe(true);
    expect(parsed.requireAllClicked).toBe(true);
    expect(parsed.displaySize).toBe('lg');
    expect(parsed.captionColor).toBe('#ff0000');
  });
});
