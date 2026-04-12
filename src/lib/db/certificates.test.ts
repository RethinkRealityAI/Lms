import { describe, it, expect, vi } from 'vitest';
import { revokeCertificates } from './certificates';
import type { SupabaseClient } from '@supabase/supabase-js';

describe('revokeCertificates', () => {
  it('deletes certificates by IDs', async () => {
    const inMock = vi.fn().mockResolvedValue({ error: null });
    const deleteMock = vi.fn().mockReturnValue({ in: inMock });
    const sb = {
      from: vi.fn().mockReturnValue({ delete: deleteMock }),
    } as unknown as SupabaseClient;

    await revokeCertificates(sb, ['cert-1', 'cert-2']);

    expect(sb.from).toHaveBeenCalledWith('certificates');
    expect(inMock).toHaveBeenCalledWith('id', ['cert-1', 'cert-2']);
  });

  it('throws on error', async () => {
    const inMock = vi.fn().mockResolvedValue({ error: new Error('RLS denied') });
    const deleteMock = vi.fn().mockReturnValue({ in: inMock });
    const sb = {
      from: vi.fn().mockReturnValue({ delete: deleteMock }),
    } as unknown as SupabaseClient;

    await expect(revokeCertificates(sb, ['cert-1'])).rejects.toThrow('RLS denied');
  });
});
