import { describe, it, expect } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  sanitizeTemplateData,
  extractLayout,
  applyBlockTemplate,
  createBlockTemplate,
  getBlockTemplates,
  deleteBlockTemplate,
  LAYOUT_KEYS,
  type BlockTemplate,
} from './block-templates';

const CONTENT = { question_type: 'multiple_choice', question: 'Q?', options: ['A', 'B'], correct_answer: 'A' };
const LAYOUT = { gridX: 2, gridY: 6, gridW: 6, gridH: 4, block_min_h: 24, contentAlign: 'center' };
const FULL = { ...CONTENT, ...LAYOUT };

/** Minimal chainable Supabase mock — every method returns the (thenable) builder. */
function mockSupabase(result: { data: unknown; error: unknown }) {
  const calls: {
    from?: string; select?: unknown; insert?: Record<string, unknown>;
    delete?: boolean; eq: [string, unknown][]; order?: [string, unknown]; single?: boolean;
  } = { eq: [] };
  const builder: Record<string, unknown> = {
    from: (t: string) => { calls.from = t; return builder; },
    select: (a?: unknown) => { calls.select = a; return builder; },
    insert: (p: Record<string, unknown>) => { calls.insert = p; return builder; },
    delete: () => { calls.delete = true; return builder; },
    eq: (c: string, v: unknown) => { calls.eq.push([c, v]); return builder; },
    order: (c: string, o: unknown) => { calls.order = [c, o]; return builder; },
    single: () => { calls.single = true; return builder; },
    then: (resolve: (r: unknown) => void) => resolve(result),
  };
  return { supabase: builder as unknown as SupabaseClient, calls };
}

describe('block-templates pure helpers', () => {
  it('LAYOUT_KEYS covers every grid/position field', () => {
    expect([...LAYOUT_KEYS].sort()).toEqual(
      ['block_min_h', 'contentAlign', 'gridH', 'gridW', 'gridX', 'gridY'].sort(),
    );
  });

  it('sanitizeTemplateData strips layout keys but keeps content', () => {
    const out = sanitizeTemplateData(FULL);
    expect(out).toEqual(CONTENT);
    for (const k of LAYOUT_KEYS) expect(out).not.toHaveProperty(k);
  });

  it('sanitizeTemplateData tolerates empty / nullish input', () => {
    expect(sanitizeTemplateData({})).toEqual({});
    // @ts-expect-error — defensive: guards against undefined at runtime
    expect(sanitizeTemplateData(undefined)).toEqual({});
  });

  it('extractLayout returns only the present layout keys', () => {
    expect(extractLayout(FULL)).toEqual(LAYOUT);
    expect(extractLayout(CONTENT)).toEqual({}); // no layout keys present
    expect(extractLayout({ gridX: 0, gridW: 12 })).toEqual({ gridX: 0, gridW: 12 });
  });

  it('sanitize + extract are complementary (no key lost, none duplicated)', () => {
    const content = sanitizeTemplateData(FULL);
    const layout = extractLayout(FULL);
    expect({ ...content, ...layout }).toEqual(FULL);
    expect(Object.keys(content).some((k) => k in layout)).toBe(false);
  });

  it('applyBlockTemplate deep-clones and strips layout (original untouched)', () => {
    const template: BlockTemplate = {
      id: 't1', institution_id: 'i1', block_type: 'quiz_inline',
      name: 'n', description: null,
      data: { question: 'Q', nested: { items: ['x'] }, gridX: 9 },
      created_by: null, created_at: '', updated_at: '',
    };
    const applied = applyBlockTemplate(template);
    expect(applied).not.toHaveProperty('gridX');
    expect(applied.question).toBe('Q');

    // Mutating the applied copy must not affect the stored template.
    (applied.nested as { items: string[] }).items.push('y');
    expect((template.data.nested as { items: string[] }).items).toEqual(['x']);
  });
});

describe('createBlockTemplate', () => {
  it('inserts SANITIZED data (no layout), trims name, nulls blank description', async () => {
    const row = { id: 'new', block_type: 'quiz_inline', name: 'My quiz' };
    const { supabase, calls } = mockSupabase({ data: row, error: null });
    const { template, error } = await createBlockTemplate(supabase, {
      institutionId: 'inst-1', blockType: 'quiz_inline', name: '  My quiz  ',
      description: '   ', data: FULL, createdBy: 'user-1',
    });
    expect(error).toBeNull();
    expect(template).toEqual(row);
    expect(calls.from).toBe('block_templates');
    expect(calls.insert?.institution_id).toBe('inst-1');
    expect(calls.insert?.block_type).toBe('quiz_inline');
    expect(calls.insert?.name).toBe('My quiz'); // trimmed
    expect(calls.insert?.description).toBeNull(); // blank → null
    expect(calls.insert?.created_by).toBe('user-1');
    // The persisted data must be stripped of layout keys.
    expect(calls.insert?.data).toEqual(CONTENT);
    for (const k of LAYOUT_KEYS) expect(calls.insert?.data).not.toHaveProperty(k);
  });

  it('returns the error message on failure', async () => {
    const { supabase } = mockSupabase({ data: null, error: { message: 'boom' } });
    const { template, error } = await createBlockTemplate(supabase, {
      institutionId: 'i', blockType: 'cta', name: 'x', data: {},
    });
    expect(template).toBeNull();
    expect(error).toBe('boom');
  });
});

describe('getBlockTemplates', () => {
  it('filters by institution + block_type, newest first', async () => {
    const rows = [{ id: 'a' }, { id: 'b' }];
    const { supabase, calls } = mockSupabase({ data: rows, error: null });
    const result = await getBlockTemplates(supabase, 'inst-9', 'table');
    expect(result).toEqual(rows);
    expect(calls.from).toBe('block_templates');
    expect(calls.eq).toEqual([['institution_id', 'inst-9'], ['block_type', 'table']]);
    expect(calls.order).toEqual(['updated_at', { ascending: false }]);
  });

  it('returns an empty array on error', async () => {
    const { supabase } = mockSupabase({ data: null, error: { message: 'nope' } });
    expect(await getBlockTemplates(supabase, 'i', 'cta')).toEqual([]);
  });
});

describe('deleteBlockTemplate', () => {
  it('deletes by id and surfaces errors', async () => {
    const ok = mockSupabase({ data: null, error: null });
    expect(await deleteBlockTemplate(ok.supabase, 'id-1')).toEqual({ error: null });
    expect(ok.calls.delete).toBe(true);
    expect(ok.calls.eq).toEqual([['id', 'id-1']]);

    const fail = mockSupabase({ data: null, error: { message: 'denied' } });
    expect(await deleteBlockTemplate(fail.supabase, 'id-2')).toEqual({ error: 'denied' });
  });
});
