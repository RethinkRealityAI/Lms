import { describe, it, expect } from 'vitest';
import { getCompatibleTypes, transformBlockData, COMPATIBLE_GROUPS } from './block-type-compat';

describe('block-type-compat', () => {
  describe('getCompatibleTypes', () => {
    it('returns callout for rich_text', () => {
      expect(getCompatibleTypes('rich_text')).toEqual(['callout']);
    });

    it('returns rich_text for callout', () => {
      expect(getCompatibleTypes('callout')).toEqual(['rich_text']);
    });

    it('returns video for image_gallery', () => {
      expect(getCompatibleTypes('image_gallery')).toEqual(['video']);
    });

    it('returns image_gallery for video', () => {
      expect(getCompatibleTypes('video')).toEqual(['image_gallery']);
    });

    it('returns empty array for standalone types', () => {
      expect(getCompatibleTypes('cta')).toEqual([]);
      expect(getCompatibleTypes('quiz_inline')).toEqual([]);
      expect(getCompatibleTypes('pdf')).toEqual([]);
      expect(getCompatibleTypes('iframe')).toEqual([]);
      expect(getCompatibleTypes('h5p')).toEqual([]);
    });

    it('returns empty for unknown types', () => {
      expect(getCompatibleTypes('nonexistent')).toEqual([]);
    });
  });

  describe('transformBlockData', () => {
    it('rich_text → callout: preserves html, adds variant and title', () => {
      const result = transformBlockData('rich_text', 'callout', { html: '<p>Hello</p>' });
      expect(result.html).toBe('<p>Hello</p>');
      expect(result.variant).toBe('info');
      expect(result.title).toBe('Note');
    });

    it('callout → rich_text: preserves html, drops variant/title', () => {
      const result = transformBlockData('callout', 'rich_text', { html: '<p>Test</p>', variant: 'warning', title: 'Alert' });
      expect(result.html).toBe('<p>Test</p>');
      expect(result).not.toHaveProperty('variant');
      expect(result).not.toHaveProperty('title');
    });

    it('image_gallery → video: maps first image URL', () => {
      const result = transformBlockData('image_gallery', 'video', {
        images: [{ url: 'https://example.com/img.jpg' }, { url: 'https://example.com/img2.jpg' }],
      });
      expect(result.url).toBe('https://example.com/img.jpg');
      expect(result.caption).toBe('');
    });

    it('image_gallery → video: handles empty images', () => {
      const result = transformBlockData('image_gallery', 'video', { images: [] });
      expect(result.url).toBe('');
    });

    it('video → image_gallery: wraps url in images array', () => {
      const result = transformBlockData('video', 'image_gallery', { url: 'https://example.com/vid.mp4' });
      expect(result.images).toEqual([{ url: 'https://example.com/vid.mp4', alt: '', caption: '' }]);
      expect(result.mode).toBe('gallery');
    });

    it('video → image_gallery: handles empty url', () => {
      const result = transformBlockData('video', 'image_gallery', { url: '' });
      expect(result.images).toEqual([]);
    });

    it('returns original data for unknown type pair', () => {
      const data = { foo: 'bar' };
      const result = transformBlockData('cta', 'pdf', data);
      expect(result).toBe(data);
    });

    it('preserves grid layout fields during transformation', () => {
      const result = transformBlockData('rich_text', 'callout', {
        html: '<p>Test</p>',
        gridX: 2,
        gridY: 3,
        gridW: 6,
        gridH: 4,
      });
      expect(result.gridX).toBe(2);
      expect(result.gridY).toBe(3);
      expect(result.gridW).toBe(6);
      expect(result.gridH).toBe(4);
      expect(result.html).toBe('<p>Test</p>');
    });

    it('does not add grid fields if source has none', () => {
      const result = transformBlockData('rich_text', 'callout', { html: '<p>No grid</p>' });
      expect(result).not.toHaveProperty('gridX');
      expect(result).not.toHaveProperty('gridY');
    });
  });
});
