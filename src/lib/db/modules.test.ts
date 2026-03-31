import { describe, it, expect, vi } from 'vitest';
import { createModule, deleteModule } from './modules';

// Helper to build a mock Supabase client for modules operations
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
  const insertChain = { select: selectAfterInsert };
  const insertFn = vi.fn().mockReturnValue(insertChain);

  // Chain for the update (delete) query
  const eqForUpdate = vi.fn().mockResolvedValue({ error: updateError });
  const updateFn = vi.fn().mockReturnValue({ eq: eqForUpdate });

  // from() returns different objects depending on call index
  // We need: first call → select chain, second call → insert chain (or update chain)
  let callCount = 0;
  const from = vi.fn().mockImplementation(() => {
    callCount++;
    if (callCount === 1) {
      // first call: select for max order_index
      return { select: vi.fn().mockReturnValue(orderChain) };
    }
    // second call: insert or update
    return { insert: insertFn, update: updateFn };
  });

  return { from, _singleFn: singleFn, _insertFn: insertFn, _updateFn: updateFn, _eqForUpdate: eqForUpdate };
}

describe('createModule', () => {
  it('queries existing modules to determine next order_index', async () => {
    const insertedModule = { id: 'mod-real-id', title: 'New Module', course_id: 'course-1', order_index: 0 };
    const mock = makeMockSupabase({ existingData: [], insertedData: insertedModule });

    await createModule(mock as any, { courseId: 'course-1', title: 'New Module', institutionId: 'inst-1' });

    expect(mock.from).toHaveBeenCalledWith('modules');
  });

  it('sets order_index to 0 when no existing modules', async () => {
    const insertedModule = { id: 'mod-real-id', title: 'New Module', course_id: 'course-1', order_index: 0 };
    const mock = makeMockSupabase({ existingData: [], insertedData: insertedModule });

    const result = await createModule(mock as any, { courseId: 'course-1', title: 'New Module', institutionId: 'inst-1' });

    expect(mock._insertFn).toHaveBeenCalledWith(
      expect.objectContaining({ order_index: 0 })
    );
    expect(result.id).toBe('mod-real-id');
  });

  it('sets order_index to existing max + 1', async () => {
    const insertedModule = { id: 'mod-real-id', title: 'New Module', course_id: 'course-1', order_index: 3 };
    const mock = makeMockSupabase({ existingData: [{ order_index: 2 }], insertedData: insertedModule });

    await createModule(mock as any, { courseId: 'course-1', title: 'New Module', institutionId: 'inst-1' });

    expect(mock._insertFn).toHaveBeenCalledWith(
      expect.objectContaining({ order_index: 3 })
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
      createModule({ from } as any, { courseId: 'c1', title: 'x', institutionId: 'i1' })
    ).rejects.toEqual({ message: 'insert failed' });
  });
});

describe('deleteModule', () => {
  it('soft-deletes by setting deleted_at on the module row', async () => {
    const eqFn = vi.fn().mockResolvedValue({ error: null });
    const updateFn = vi.fn().mockReturnValue({ eq: eqFn });
    const from = vi.fn().mockReturnValue({ update: updateFn });

    await deleteModule({ from } as any, 'mod-1', 'inst-1');

    expect(from).toHaveBeenCalledWith('modules');
    expect(updateFn).toHaveBeenCalledWith(
      expect.objectContaining({ deleted_at: expect.any(String) })
    );
    expect(eqFn).toHaveBeenCalledWith('id', 'mod-1');
  });

  it('throws when the update returns an error', async () => {
    const eqFn = vi.fn().mockResolvedValue({ error: { message: 'delete failed' } });
    const updateFn = vi.fn().mockReturnValue({ eq: eqFn });
    const from = vi.fn().mockReturnValue({ update: updateFn });

    await expect(
      deleteModule({ from } as any, 'mod-1', 'inst-1')
    ).rejects.toEqual({ message: 'delete failed' });
  });
});
