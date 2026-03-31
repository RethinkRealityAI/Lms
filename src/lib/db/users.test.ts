import { describe, it, expect, vi } from 'vitest';
import { getUserInstitutionId } from './users';
import type { SupabaseClient } from '@supabase/supabase-js';

describe('getUserInstitutionId', () => {
  it('returns the institution_id for the given user', async () => {
    const mockSingle = vi.fn().mockResolvedValue({
      data: { institution_id: 'inst-abc' },
      error: null,
    });
    const sb = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: mockSingle,
          }),
        }),
      }),
    } as unknown as SupabaseClient;

    const result = await getUserInstitutionId(sb, 'user-1');
    expect(result).toBe('inst-abc');
  });

  it('returns null when Supabase returns an error', async () => {
    const mockSingle = vi.fn().mockResolvedValue({
      data: null,
      error: { message: 'User not found' },
    });
    const sb = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: mockSingle,
          }),
        }),
      }),
    } as unknown as SupabaseClient;

    const result = await getUserInstitutionId(sb, 'user-missing');
    expect(result).toBeNull();
  });

  it('returns null when institution_id is null', async () => {
    const mockSingle = vi.fn().mockResolvedValue({
      data: { institution_id: null },
      error: null,
    });
    const sb = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: mockSingle,
          }),
        }),
      }),
    } as unknown as SupabaseClient;

    const result = await getUserInstitutionId(sb, 'user-1');
    expect(result).toBeNull();
  });

  it('queries the users table with the provided user id', async () => {
    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: { institution_id: 'inst-1' }, error: null }),
        }),
      }),
    });
    const sb = { from: mockFrom } as unknown as SupabaseClient;

    await getUserInstitutionId(sb, 'user-xyz');
    expect(mockFrom).toHaveBeenCalledWith('users');
  });
});
