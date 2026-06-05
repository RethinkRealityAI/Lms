import { describe, it, expect } from 'vitest';
import { contentListDataSchema, contentListItemSchema } from './schema';

describe('contentListItemSchema', () => {
  it('accepts html and optional animation', () => {
    const result = contentListItemSchema.safeParse({
      html: '<p>Item one</p>',
      animation: 'left',
    });
    expect(result.success).toBe(true);
    expect(result.data?.html).toBe('<p>Item one</p>');
    expect(result.data?.animation).toBe('left');
  });

  it('defaults html to empty string', () => {
    const result = contentListItemSchema.safeParse({});
    expect(result.success).toBe(true);
    expect(result.data?.html).toBe('');
  });

  it('rejects invalid animation', () => {
    const result = contentListItemSchema.safeParse({ html: '', animation: 'spin' });
    expect(result.success).toBe(false);
  });
});

describe('contentListDataSchema', () => {
  it('accepts a full list definition', () => {
    const result = contentListDataSchema.safeParse({
      heading: 'Key points',
      items: [{ html: '<strong>One</strong>' }, { html: 'Two', animation: 'up' }],
      bullet_style: 'square',
      bullet_color: '#DC2626',
      text_color: '#0F172A',
      font_size: 'lg',
      enable_animations: true,
      animation_stagger_ms: 200,
    });
    expect(result.success).toBe(true);
    expect(result.data?.heading).toBe('Key points');
    expect(result.data?.items).toHaveLength(2);
    expect(result.data?.bullet_style).toBe('square');
    expect(result.data?.enable_animations).toBe(true);
    expect(result.data?.animation_stagger_ms).toBe(200);
  });

  it('applies defaults for empty payload', () => {
    const result = contentListDataSchema.safeParse({});
    expect(result.success).toBe(true);
    expect(result.data?.items).toEqual([]);
    expect(result.data?.bullet_style).toBe('disc');
    expect(result.data?.font_size).toBe('auto');
    expect(result.data?.enable_animations).toBe(false);
    expect(result.data?.animation_stagger_ms).toBe(120);
  });

  it('rejects invalid bullet_style', () => {
    const result = contentListDataSchema.safeParse({ bullet_style: 'arrow' });
    expect(result.success).toBe(false);
  });

  it('defaults display_mode to list and accordion options to sensible values', () => {
    const result = contentListDataSchema.safeParse({});
    expect(result.success).toBe(true);
    expect(result.data?.display_mode).toBe('list');
    expect(result.data?.accordion_icon).toBe('caret');
    expect(result.data?.accordion_icon_position).toBe('right');
    expect(result.data?.accordion_multiple).toBe(false);
    expect(result.data?.accordion_default_open).toBe('none');
  });

  it('accepts an accordion definition with per-item titles', () => {
    const result = contentListDataSchema.safeParse({
      display_mode: 'accordion',
      accordion_icon: 'plus',
      accordion_icon_position: 'left',
      accordion_multiple: true,
      accordion_default_open: 'first',
      accordion_accent_color: '#C8262A',
      items: [
        { title: 'What is it?', html: '<p>An explanation.</p>' },
        { title: 'Why?', html: '<p>Because.</p>' },
      ],
    });
    expect(result.success).toBe(true);
    expect(result.data?.display_mode).toBe('accordion');
    expect(result.data?.accordion_multiple).toBe(true);
    expect(result.data?.items[0].title).toBe('What is it?');
  });

  it('rejects an invalid display_mode', () => {
    const result = contentListDataSchema.safeParse({ display_mode: 'grid' });
    expect(result.success).toBe(false);
  });

  it('rejects an invalid accordion_icon', () => {
    const result = contentListDataSchema.safeParse({ accordion_icon: 'star' });
    expect(result.success).toBe(false);
  });
});
