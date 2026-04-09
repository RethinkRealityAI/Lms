import { describe, it, expect } from 'vitest';
import { BLOCK_PRESETS } from './block-presets';

describe('BLOCK_PRESETS', () => {
  it('has at least 5 presets', () => {
    expect(BLOCK_PRESETS.length).toBeGreaterThanOrEqual(5);
  });

  it('each preset has required fields', () => {
    for (const preset of BLOCK_PRESETS) {
      expect(preset.id).toBeTruthy();
      expect(preset.label).toBeTruthy();
      expect(preset.description).toBeTruthy();
      expect(preset.blockType).toBeTruthy();
      expect(preset.icon).toBeDefined();
      expect(preset.color).toBeTruthy();
      expect(typeof preset.data).toBe('object');
    }
  });

  it('each preset has a unique id', () => {
    const ids = BLOCK_PRESETS.map(p => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('all preset blockTypes are valid registered types', () => {
    const validTypes = ['rich_text', 'image_gallery', 'video', 'cta', 'quiz_inline', 'callout', 'pdf', 'iframe'];
    for (const preset of BLOCK_PRESETS) {
      expect(validTypes).toContain(preset.blockType);
    }
  });

  it('quiz presets include question and options', () => {
    const quizPresets = BLOCK_PRESETS.filter(p => p.blockType === 'quiz_inline');
    expect(quizPresets.length).toBeGreaterThan(0);
    for (const preset of quizPresets) {
      expect(preset.data.question).toBeTruthy();
      expect(Array.isArray(preset.data.options)).toBe(true);
    }
  });

  it('callout presets include variant and title', () => {
    const calloutPresets = BLOCK_PRESETS.filter(p => p.blockType === 'callout');
    expect(calloutPresets.length).toBeGreaterThan(0);
    for (const preset of calloutPresets) {
      expect(preset.data.variant).toBeTruthy();
      expect(preset.data.title).toBeTruthy();
    }
  });
});
