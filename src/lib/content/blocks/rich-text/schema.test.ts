import { describe, it, expect } from 'vitest';
import { richTextDataSchema } from './schema';

describe('richTextDataSchema', () => {
  it('accepts valid rich text data', () => {
    const result = richTextDataSchema.safeParse({ html: '<p>Hello</p>', mode: 'standard' });
    expect(result.success).toBe(true);
  });

  it('defaults html to empty string', () => {
    const result = richTextDataSchema.safeParse({});
    expect(result.success).toBe(true);
    expect(result.data?.html).toBe('');
  });

  it('rejects invalid mode', () => {
    const result = richTextDataSchema.safeParse({ html: '', mode: 'invalid' });
    expect(result.success).toBe(false);
  });
});
