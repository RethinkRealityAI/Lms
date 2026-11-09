import { describe, it, expect } from 'vitest';
import { resolveRichTextHtml } from './viewer';
import type { RichTextData } from '@/lib/content/blocks/rich-text/schema';

const rt = (d: Record<string, unknown>) => d as unknown as RichTextData;

describe('resolveRichTextHtml', () => {
  it('renders html when it has content', () => {
    expect(resolveRichTextHtml(rt({ html: '<p>Body</p>', bubble_text: '<p>Quote</p>' }))).toBe('<p>Body</p>');
  });

  it('falls back to bubble_text when html is blank (callout mis-typed as rich_text)', () => {
    expect(resolveRichTextHtml(rt({ html: '<p></p>', bubble_text: "<p>I'm still in pain</p>" }))).toBe("<p>I'm still in pain</p>");
  });

  it('keeps blank html when there is no usable bubble_text', () => {
    expect(resolveRichTextHtml(rt({ html: '<p></p>' }))).toBe('<p></p>');
    expect(resolveRichTextHtml(rt({ html: '', bubble_text: '<p> </p>' }))).toBe('');
  });
});
