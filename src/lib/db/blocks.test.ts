import { describe, it, expect, vi } from 'vitest';
import { updateBlock, deleteBlock, duplicateBlock } from './blocks';

function makeSupabase(overrides?: Record<string, unknown>) {
  const chain = {
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    ...overrides,
  };
  return {
    from: vi.fn(() => chain),
    _chain: chain,
  };
}

describe('updateBlock', () => {
  it('calls update on lesson_blocks with the given data', async () => {
    const mockEq = vi.fn().mockResolvedValue({ error: null });
    const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });
    const mockFrom = vi.fn().mockReturnValue({ update: mockUpdate });
    const supabase = { from: mockFrom };

    await updateBlock(supabase as never, 'block-1', { data: { html: '<p>Hello</p>' } }, 'inst-1');

    expect(mockFrom).toHaveBeenCalledWith('lesson_blocks');
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: { html: '<p>Hello</p>' } }),
    );
    expect(mockEq).toHaveBeenCalledWith('id', 'block-1');
  });

  it('throws when Supabase returns an error', async () => {
    const chain = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ error: { message: 'DB error' } }),
    };
    const supabase = { from: vi.fn(() => chain) };

    await expect(
      updateBlock(supabase as never, 'block-1', { data: {} }, 'inst-1'),
    ).rejects.toMatchObject({ message: 'DB error' });
  });

  it('only includes defined fields in the update payload', async () => {
    const chain = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ error: null }),
    };
    const supabase = { from: vi.fn(() => chain) };

    await updateBlock(supabase as never, 'block-1', { title: 'New Title' }, 'inst-1');

    expect(chain.update).toHaveBeenCalledWith(
      expect.not.objectContaining({ data: expect.anything() }),
    );
    expect(chain.update).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'New Title' }),
    );
  });
});

describe('deleteBlock', () => {
  it('calls delete on lesson_blocks with the block id', async () => {
    const chain = {
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ error: null }),
    };
    const supabase = { from: vi.fn(() => chain) };

    await deleteBlock(supabase as never, 'block-1');

    expect(supabase.from).toHaveBeenCalledWith('lesson_blocks');
    expect(chain.delete).toHaveBeenCalled();
    expect(chain.eq).toHaveBeenCalledWith('id', 'block-1');
  });

  it('throws when Supabase returns an error', async () => {
    const chain = {
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ error: { message: 'Delete failed' } }),
    };
    const supabase = { from: vi.fn(() => chain) };

    await expect(deleteBlock(supabase as never, 'block-1')).rejects.toMatchObject({
      message: 'Delete failed',
    });
  });
});

describe('duplicateBlock', () => {
  it('deep clones data and calls createBlock', async () => {
    const insertedBlock = {
      id: 'new-block',
      slide_id: 'slide-1',
      block_type: 'rich_text',
      data: { html: '<p>Clone</p>', gridY: 2 },
      order_index: 1,
      is_visible: true,
    };
    const chain = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: insertedBlock, error: null }),
    };
    const supabase = { from: vi.fn(() => chain) };

    const result = await duplicateBlock(
      supabase as never,
      { id: 'b1', slide_id: 'slide-1', block_type: 'rich_text', data: { html: '<p>Clone</p>', gridY: 0, gridH: 2 }, order_index: 0 },
      'lesson-1',
      'inst-1',
    );

    expect(supabase.from).toHaveBeenCalledWith('lesson_blocks');
    expect(chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        block_type: 'rich_text',
        slide_id: 'slide-1',
        order_index: 1,
      }),
    );
    expect(result.id).toBe('new-block');
  });

  it('resets grid position when copying to different slide', async () => {
    const insertedBlock = {
      id: 'new-block',
      slide_id: 'slide-2',
      block_type: 'rich_text',
      data: { html: '<p>Clone</p>', gridX: 0, gridY: 0, gridW: 12, gridH: 3 },
      order_index: 999,
      is_visible: true,
    };
    const chain = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: insertedBlock, error: null }),
    };
    const supabase = { from: vi.fn(() => chain) };

    await duplicateBlock(
      supabase as never,
      { id: 'b1', slide_id: 'slide-1', block_type: 'rich_text', data: { html: '<p>Test</p>', gridX: 3, gridY: 5, gridW: 6, gridH: 3 }, order_index: 2 },
      'lesson-1',
      'inst-1',
      'slide-2',
      'lesson-2',
    );

    // The inserted data should have reset grid to defaults
    const insertCall = chain.insert.mock.calls[0][0];
    expect(insertCall.data.gridX).toBe(0);
    expect(insertCall.data.gridY).toBe(0);
    expect(insertCall.data.gridW).toBe(12);
    expect(insertCall.data.gridH).toBe(3);
    expect(insertCall.slide_id).toBe('slide-2');
    expect(insertCall.lesson_id).toBe('lesson-2');
  });
});
