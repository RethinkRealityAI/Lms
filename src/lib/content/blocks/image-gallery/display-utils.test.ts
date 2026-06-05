import { describe, it, expect, beforeEach } from 'vitest';
import {
  resolveCaptionColor,
  captionColorUsesInherit,
  loadViewedImageIndices,
  saveViewedImageIndices,
  viewedImagesStorageKey,
} from './display-utils';

describe('resolveCaptionColor', () => {
  it('returns inherit defaults per surface style', () => {
    expect(resolveCaptionColor(undefined, 'glass-dark')).toBe('#cbd5e1');
    expect(resolveCaptionColor('inherit', 'glass')).toBe('#475569');
  });

  it('returns custom hex when set', () => {
    expect(resolveCaptionColor('#E87722', 'glass-dark')).toBe('#E87722');
  });
});

describe('captionColorUsesInherit', () => {
  it('treats undefined and inherit as inherit', () => {
    expect(captionColorUsesInherit(undefined)).toBe(true);
    expect(captionColorUsesInherit('inherit')).toBe(true);
    expect(captionColorUsesInherit('#000000')).toBe(false);
  });
});

describe('viewed image session persistence', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('round-trips viewed indices', () => {
    saveViewedImageIndices('lesson-1', 'block-1', new Set([0, 2]));
    expect(loadViewedImageIndices('lesson-1', 'block-1')).toEqual(new Set([0, 2]));
    expect(sessionStorage.getItem(viewedImagesStorageKey('lesson-1', 'block-1'))).toBe('[0,2]');
  });
});
