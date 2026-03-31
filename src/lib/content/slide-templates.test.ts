import { describe, it, expect } from 'vitest';
import { SLIDE_TEMPLATES, getTemplateByType } from './slide-templates';
import type { SlideType } from '@/types';

describe('SLIDE_TEMPLATES', () => {
  it('has 7 templates', () => {
    expect(SLIDE_TEMPLATES).toHaveLength(7);
  });

  it('covers all 7 slide types', () => {
    const types = SLIDE_TEMPLATES.map((t) => t.type);
    const expected: SlideType[] = ['title', 'content', 'media', 'quiz', 'disclaimer', 'interactive', 'cta'];
    expect(types).toEqual(expect.arrayContaining(expected));
    expect(types).toHaveLength(expected.length);
  });

  it('each template has at least one default block', () => {
    SLIDE_TEMPLATES.forEach((t) => {
      expect(t.defaultBlocks.length).toBeGreaterThan(0);
    });
  });

  it('getTemplateByType returns correct template', () => {
    const t = getTemplateByType('quiz');
    expect(t?.name).toBe('Quiz');
    expect(t?.defaultBlocks[0].block_type).toBe('quiz_inline');
  });

  it('getTemplateByType returns undefined for unknown type', () => {
    expect(getTemplateByType('unknown' as SlideType)).toBeUndefined();
  });
});
