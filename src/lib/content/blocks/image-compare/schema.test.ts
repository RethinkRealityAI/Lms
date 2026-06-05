import { describe, it, expect } from 'vitest';
import { imageCompareDataSchema } from './schema';

describe('imageCompareDataSchema', () => {
  it('accepts a full comparison definition', () => {
    const result = imageCompareDataSchema.safeParse({
      before: { url: 'https://example.com/before.jpg', alt: 'Before treatment' },
      after: { url: 'https://example.com/after.jpg', alt: 'After treatment' },
      initial_position: 35,
      direction: 'vertical',
      aspect: '4/3',
      fit: 'contain',
      handle_style: 'arrows',
      handle_color: '#DC2626',
      divider_color: '#1A3C6E',
      before_label: 'Before',
      after_label: 'After',
      show_labels: 'hover',
      prompt: 'Drag to compare',
      caption: 'Clinical improvement at 6 months',
      require_interaction: true,
    });
    expect(result.success).toBe(true);
    expect(result.data?.initial_position).toBe(35);
    expect(result.data?.direction).toBe('vertical');
    expect(result.data?.require_interaction).toBe(true);
  });

  it('applies defaults for empty payload', () => {
    const result = imageCompareDataSchema.safeParse({});
    expect(result.success).toBe(true);
    expect(result.data?.before.url).toBe('');
    expect(result.data?.after.url).toBe('');
    expect(result.data?.initial_position).toBe(50);
    expect(result.data?.direction).toBe('horizontal');
    expect(result.data?.aspect).toBe('16/9');
    expect(result.data?.fit).toBe('cover');
    expect(result.data?.handle_style).toBe('circle');
    expect(result.data?.show_labels).toBe('always');
    expect(result.data?.require_interaction).toBe(false);
  });

  it('rejects initial_position outside 0–100', () => {
    expect(imageCompareDataSchema.safeParse({ initial_position: 101 }).success).toBe(false);
    expect(imageCompareDataSchema.safeParse({ initial_position: -1 }).success).toBe(false);
  });
});
