import { describe, it, expect, vi } from 'vitest';
import { createLesson, deleteLesson } from './lessons';

// Helper to build a mock Supabase client for lesson operations
function makeMockSupabase(opts: {
  existingData?: unknown;
  insertedData?: unknown;
  updateError?: unknown;
} = {}) {
  const { existingData = [], insertedData = null, updateError = null } = opts;

  // Chain for the "get max order_index" select query
  const orderChain = {
    eq: vi.fn(),
    is: vi.fn(),
    order: vi.fn(),
    limit: vi.fn(),
  };
  orderChain.eq.mockReturnValue(orderChain);
  orderChain.is.mockReturnValue(orderChain);
  orderChain.order.mockReturnValue(orderChain);
  orderChain.limit.mockResolvedValue({ data: existingData, error: null });

  // Chain for the insert query
  const singleFn = vi.fn().mockResolvedValue({ data: insertedData, error: null });
  const selectAfterInsert = vi.fn().mockReturnValue({ single: singleFn });
  const insertFn = vi.fn().mockReturnValue({ select: selectAfterInsert });

  // Chain for the update (soft-delete) query
  const eqForUpdate = vi.fn().mockResolvedValue({ error: updateError });
  const updateFn = vi.fn().mockReturnValue({ eq: eqForUpdate });

  let callCount = 0;
  const from = vi.fn().mockImplementation(() => {
    callCount++;
    if (callCount === 1) {
      return { select: vi.fn().mockReturnValue(orderChain) };
    }
    return { insert: insertFn, update: updateFn };
  });

  return { from, _singleFn: singleFn, _insertFn: insertFn, _updateFn: updateFn, _eqForUpdate: eqForUpdate };
}

describe('createLesson', () => {
  it('queries existing lessons to determine next order_index', async () => {
    const insertedLesson = { id: 'les-real-id', title: 'New Lesson', module_id: 'mod-1', order_index: 0 };
    const mock = makeMockSupabase({ existingData: [], insertedData: insertedLesson });

    await createLesson(mock as any, { moduleId: 'mod-1', title: 'New Lesson', institutionId: 'inst-1' });

    expect(mock.from).toHaveBeenCalledWith('lessons');
  });

  it('sets order_index to 0 when no existing lessons', async () => {
    const insertedLesson = { id: 'les-real-id', title: 'New Lesson', module_id: 'mod-1', order_index: 0 };
    const mock = makeMockSupabase({ existingData: [], insertedData: insertedLesson });

    const result = await createLesson(mock as any, { moduleId: 'mod-1', title: 'New Lesson', institutionId: 'inst-1' });

    expect(mock._insertFn).toHaveBeenCalledWith(
      expect.objectContaining({ order_index: 0, content_type: 'blocks' })
    );
    expect(result.id).toBe('les-real-id');
  });

  it('sets order_index to existing max + 1', async () => {
    const insertedLesson = { id: 'les-real-id', title: 'New Lesson', module_id: 'mod-1', order_index: 2 };
    const mock = makeMockSupabase({ existingData: [{ order_index: 1 }], insertedData: insertedLesson });

    await createLesson(mock as any, { moduleId: 'mod-1', title: 'New Lesson', institutionId: 'inst-1' });

    expect(mock._insertFn).toHaveBeenCalledWith(
      expect.objectContaining({ order_index: 2 })
    );
  });

  it('includes content_type: blocks in the insert payload', async () => {
    const insertedLesson = { id: 'les-real-id', title: 'Lesson A', module_id: 'mod-1', order_index: 0 };
    const mock = makeMockSupabase({ existingData: [], insertedData: insertedLesson });

    await createLesson(mock as any, { moduleId: 'mod-1', title: 'Lesson A', institutionId: 'inst-1' });

    expect(mock._insertFn).toHaveBeenCalledWith(
      expect.objectContaining({ content_type: 'blocks' })
    );
  });

  it('throws when insert returns an error', async () => {
    const singleFn = vi.fn().mockResolvedValue({ data: null, error: { message: 'insert failed' } });
    const selectAfterInsert = vi.fn().mockReturnValue({ single: singleFn });
    const insertFn = vi.fn().mockReturnValue({ select: selectAfterInsert });

    const orderChain = { eq: vi.fn(), is: vi.fn(), order: vi.fn(), limit: vi.fn() };
    orderChain.eq.mockReturnValue(orderChain);
    orderChain.is.mockReturnValue(orderChain);
    orderChain.order.mockReturnValue(orderChain);
    orderChain.limit.mockResolvedValue({ data: [], error: null });

    let callCount = 0;
    const from = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) return { select: vi.fn().mockReturnValue(orderChain) };
      return { insert: insertFn };
    });

    await expect(
      createLesson({ from } as any, { moduleId: 'm1', title: 'x', institutionId: 'i1' })
    ).rejects.toEqual({ message: 'insert failed' });
  });
});

describe('deleteLesson', () => {
  it('soft-deletes by setting deleted_at on the lesson row', async () => {
    const eqFn = vi.fn().mockResolvedValue({ error: null });
    const updateFn = vi.fn().mockReturnValue({ eq: eqFn });
    const from = vi.fn().mockReturnValue({ update: updateFn });

    await deleteLesson({ from } as any, 'les-1');

    expect(from).toHaveBeenCalledWith('lessons');
    expect(updateFn).toHaveBeenCalledWith(
      expect.objectContaining({ deleted_at: expect.any(String) })
    );
    expect(eqFn).toHaveBeenCalledWith('id', 'les-1');
  });

  it('throws when the update returns an error', async () => {
    const eqFn = vi.fn().mockResolvedValue({ error: { message: 'delete failed' } });
    const updateFn = vi.fn().mockReturnValue({ eq: eqFn });
    const from = vi.fn().mockReturnValue({ update: updateFn });

    await expect(
      deleteLesson({ from } as any, 'les-1')
    ).rejects.toEqual({ message: 'delete failed' });
  });
});
