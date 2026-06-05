import { describe, it, expect } from 'vitest';
import { SLIDE_TEMPLATES, getTemplateByType, getTemplateById } from './slide-templates';
import type { SlideType } from '@/types';

describe('SLIDE_TEMPLATES', () => {
  it('has 9 templates including learning objectives and references', () => {
    expect(SLIDE_TEMPLATES).toHaveLength(9);
  });

  it('covers all slide types (content may appear more than once)', () => {
    const types = SLIDE_TEMPLATES.map((t) => t.type);
    const expected: SlideType[] = ['title', 'content', 'media', 'quiz', 'disclaimer', 'interactive', 'canvas'];
    expect(types).toEqual(expect.arrayContaining(expected));
  });

  it('each template has a unique id', () => {
    const ids = SLIDE_TEMPLATES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('each non-canvas template has at least one default block', () => {
    SLIDE_TEMPLATES.filter((t) => t.type !== 'canvas').forEach((t) => {
      expect(t.defaultBlocks.length).toBeGreaterThan(0);
    });
  });

  it('canvas template has no default blocks', () => {
    const canvas = getTemplateByType('canvas');
    expect(canvas).toBeDefined();
    expect(canvas!.defaultBlocks).toHaveLength(0);
  });

  it('getTemplateByType returns first matching template for a type', () => {
    const t = getTemplateByType('quiz');
    expect(t?.name).toBe('Quiz');
    expect(t?.defaultBlocks[0].block_type).toBe('quiz_inline');
  });

  it('getTemplateByType resolves generic content template by id, not learning objectives', () => {
    const t = getTemplateByType('content');
    expect(t?.id).toBe('content');
    expect(t?.name).toBe('Content');
  });

  it('getTemplateById returns learning objectives and references templates', () => {
    const objectives = getTemplateById('learning_objectives');
    const references = getTemplateById('references');
    expect(objectives?.defaultBlocks).toHaveLength(1);
    expect(objectives?.defaultBlocks[0].block_type).toBe('content_list');
    expect(references?.defaultBlocks).toHaveLength(1);
    expect(references?.defaultBlocks[0].block_type).toBe('content_list');
    expect(objectives?.defaultBlocks[0].data.enable_animations).toBe(true);
    expect(references?.defaultBlocks[0].data.enable_animations).toBe(false);
  });

  it('getTemplateByType returns undefined for unknown type', () => {
    expect(getTemplateByType('unknown' as SlideType)).toBeUndefined();
  });
});
