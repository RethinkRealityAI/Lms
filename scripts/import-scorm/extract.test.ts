import { describe, it, expect } from 'vitest';
import { parseEdAppConfig, extractMediaPaths } from './extract';

const mockConfig = {
  id: 'abc123',
  title: 'Test Lesson',
  index: 0,
  slides: [
    {
      id: 'slide-1',
      type: 'scrolling-media' as const,
      name: 0,
      displayIndex: 1,
      data: {
        content: [
          { content: '<p>Hello world</p>', contentType: 'text' as const },
          { content: 'fit_content_assets/image.png', contentType: 'image' as const },
        ],
        title: '<p>Title</p>',
      },
    },
  ],
  config: { language: 'en' },
};

describe('parseEdAppConfig', () => {
  it('returns the lesson title', () => {
    const result = parseEdAppConfig(mockConfig);
    expect(result.title).toBe('Test Lesson');
  });

  it('returns the edapp id', () => {
    const result = parseEdAppConfig(mockConfig);
    expect(result.edappId).toBe('abc123');
  });

  it('returns slides', () => {
    const result = parseEdAppConfig(mockConfig);
    expect(result.slides).toHaveLength(1);
  });
});

describe('extractMediaPaths', () => {
  it('extracts image paths from scrolling-media content', () => {
    const paths = extractMediaPaths(mockConfig.slides);
    expect(paths).toContain('fit_content_assets/image.png');
  });

  it('returns unique paths only', () => {
    const slidesWithDupe = [
      ...mockConfig.slides,
      { ...mockConfig.slides[0], id: 'slide-2' },
    ];
    const paths = extractMediaPaths(slidesWithDupe);
    const unique = [...new Set(paths)];
    expect(paths.length).toBe(unique.length);
  });
});
