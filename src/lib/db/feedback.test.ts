import { describe, it, expect, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { listFeedback, updateFeedbackStatus, deleteFeedback } from './feedback';

/** A chainable, awaitable Supabase mock: every builder method returns the same chain,
 *  and awaiting the chain resolves to `result`. */
function makeSb(result: { data?: unknown; error?: unknown }) {
  const chain: Record<string, unknown> = {};
  for (const m of ['select', 'eq', 'order', 'in', 'update', 'delete']) {
    chain[m] = vi.fn(() => chain);
  }
  (chain as { then: unknown }).then = (resolve: (v: unknown) => unknown) => resolve(result);
  const from = vi.fn(() => chain);
  return { sb: { from } as unknown as SupabaseClient, from, chain };
}

describe('listFeedback', () => {
  it('queries feedback_submissions scoped to the institution, newest first', async () => {
    const rows = [{ id: 'f1', type: 'issue' }];
    const { sb, from, chain } = makeSb({ data: rows, error: null });
    const result = await listFeedback(sb, 'inst-1');
    expect(from).toHaveBeenCalledWith('feedback_submissions');
    expect(chain.eq).toHaveBeenCalledWith('institution_id', 'inst-1');
    expect(chain.order).toHaveBeenCalledWith('created_at', { ascending: false });
    expect(result).toEqual(rows);
  });

  it('applies type + status filters when provided', async () => {
    const { sb, chain } = makeSb({ data: [], error: null });
    await listFeedback(sb, 'inst-1', { types: ['issue', 'bug'], status: 'new' });
    expect(chain.in).toHaveBeenCalledWith('type', ['issue', 'bug']);
    expect(chain.eq).toHaveBeenCalledWith('status', 'new');
  });

  it('does not add filters when none are given', async () => {
    const { sb, chain } = makeSb({ data: [], error: null });
    await listFeedback(sb, 'inst-1', {});
    expect(chain.in).not.toHaveBeenCalled();
    // Only the institution_id eq — no status eq.
    expect((chain.eq as ReturnType<typeof vi.fn>).mock.calls).toEqual([['institution_id', 'inst-1']]);
  });

  it('throws when the query errors', async () => {
    const { sb } = makeSb({ data: null, error: { message: 'boom' } });
    await expect(listFeedback(sb, 'inst-1')).rejects.toBeTruthy();
  });
});

describe('updateFeedbackStatus', () => {
  it('updates and succeeds when a row is returned', async () => {
    const { sb, chain } = makeSb({ data: [{ id: 'f1' }], error: null });
    await expect(updateFeedbackStatus(sb, 'f1', 'resolved')).resolves.toBeUndefined();
    expect(chain.update).toHaveBeenCalledWith({ status: 'resolved' });
    expect(chain.select).toHaveBeenCalledWith('id');
  });

  it('throws on a 0-row result (RLS mismatch must not fail silently — Rule 25)', async () => {
    const { sb } = makeSb({ data: [], error: null });
    await expect(updateFeedbackStatus(sb, 'f1', 'resolved')).rejects.toThrow(/0 rows/);
  });

  it('throws on a DB error', async () => {
    const { sb } = makeSb({ data: null, error: { message: 'nope' } });
    await expect(updateFeedbackStatus(sb, 'f1', 'resolved')).rejects.toBeTruthy();
  });
});

describe('deleteFeedback', () => {
  it('deletes by id', async () => {
    const { sb, from, chain } = makeSb({ error: null });
    await expect(deleteFeedback(sb, 'f1')).resolves.toBeUndefined();
    expect(from).toHaveBeenCalledWith('feedback_submissions');
    expect(chain.delete).toHaveBeenCalled();
    expect(chain.eq).toHaveBeenCalledWith('id', 'f1');
  });

  it('throws on a DB error', async () => {
    const { sb } = makeSb({ error: { message: 'fail' } });
    await expect(deleteFeedback(sb, 'f1')).rejects.toBeTruthy();
  });
});
