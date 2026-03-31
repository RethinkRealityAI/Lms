import { describe, it, expect } from 'vitest';
import { getSlideBackground } from './slide-preview';

describe('getSlideBackground', () => {
  it('returns white for empty settings', () => {
    expect(getSlideBackground({})).toEqual({ backgroundColor: '#FFFFFF' });
  });

  it('returns gradient for gradient setting', () => {
    const result = getSlideBackground({ background: 'gradient' });
    expect(result.background).toContain('linear-gradient');
  });

  it('returns hex color for hex background', () => {
    expect(getSlideBackground({ background: '#FF0000' })).toEqual({ backgroundColor: '#FF0000' });
  });

  it('ignores non-hex non-gradient strings', () => {
    expect(getSlideBackground({ background: 'red' })).toEqual({ backgroundColor: '#FFFFFF' });
  });
});
