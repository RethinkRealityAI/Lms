import { describe, it, expect, vi } from 'vitest';
import { updateBlock, deleteBlock } from './blocks';

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
