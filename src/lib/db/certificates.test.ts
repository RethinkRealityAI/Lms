import { describe, it, expect, vi } from 'vitest';
import { awardCertificates, revokeCertificates, restoreCertificates } from './certificates';
import type { SupabaseClient } from '@supabase/supabase-js';

function mockAwardChain(
  existingByCall: (string | null)[],
  insertId: string | null,
  insertError: Error | null,
) {
  let selectCall = 0;
  const maybeSingle = vi.fn().mockImplementation(() => {
    const existingId = existingByCall[selectCall] ?? null;
    selectCall += 1;
    return Promise.resolve({ data: existingId ? { id: existingId } : null });
  });
  const eqCourse = vi.fn().mockReturnValue({ maybeSingle });
  const eqUser = vi.fn().mockReturnValue({ eq: eqCourse, is: vi.fn(), maybeSingle });
  const select = vi.fn().mockReturnValue({ eq: eqUser });

  const single = vi.fn().mockResolvedValue({
    data: insertId ? { id: insertId } : null,
    error: insertError,
  });
  const selectInsert = vi.fn().mockReturnValue({ single });
  const insert = vi.fn().mockReturnValue({ select: selectInsert });

  const from = vi.fn((table: string) => {
    if (table !== 'certificates') throw new Error(`unexpected table ${table}`);
    return { select, insert };
  });

  return { sb: { from } as unknown as SupabaseClient, insert, maybeSingle };
}

function mockUpdateChain(error: Error | null) {
  const isMock = vi.fn().mockResolvedValue({ error });
  const inMock = vi.fn().mockReturnValue({ is: isMock });
  const updateMock = vi.fn().mockReturnValue({ in: inMock });
  const sb = { from: vi.fn().mockReturnValue({ update: updateMock }) } as unknown as SupabaseClient;
  return { sb, updateMock, inMock, isMock };
}

describe('revokeCertificates', () => {
  it('marks certificates revoked (status change, not delete)', async () => {
    const { sb, updateMock, inMock, isMock } = mockUpdateChain(null);

    await revokeCertificates(sb, ['cert-1', 'cert-2'], 'admin-1', 'Issued in error');

    expect(sb.from).toHaveBeenCalledWith('certificates');
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        revoked_by: 'admin-1',
        revoke_reason: 'Issued in error',
        revoked_at: expect.any(String),
      })
    );
    expect(inMock).toHaveBeenCalledWith('id', ['cert-1', 'cert-2']);
    // only certificates that are not already revoked are touched
    expect(isMock).toHaveBeenCalledWith('revoked_at', null);
  });

  it('throws on error', async () => {
    const { sb } = mockUpdateChain(new Error('RLS denied'));
    await expect(revokeCertificates(sb, ['cert-1'], 'admin-1')).rejects.toThrow('RLS denied');
  });
});

describe('restoreCertificates', () => {
  it('clears revocation fields and the cached pdf', async () => {
    const inMock = vi.fn().mockResolvedValue({ error: null });
    const updateMock = vi.fn().mockReturnValue({ in: inMock });
    const sb = { from: vi.fn().mockReturnValue({ update: updateMock }) } as unknown as SupabaseClient;

    await restoreCertificates(sb, ['cert-1']);

    expect(updateMock).toHaveBeenCalledWith({
      revoked_at: null,
      revoked_by: null,
      revoke_reason: null,
      pdf_url: null,
    });
    expect(inMock).toHaveBeenCalledWith('id', ['cert-1']);
  });
});

describe('awardCertificates', () => {
  it('returns insertedIds for newly created certificates', async () => {
    const { sb } = mockAwardChain([null], 'cert-new', null);

    const result = await awardCertificates(sb, {
      user_ids: ['user-1'],
      institution_id: 'inst-1',
      template_id: 'tpl-1',
      course_id: 'course-1',
      awarded_by: 'admin-1',
      award_reason: 'Manual award',
    });

    expect(result).toEqual({ inserted: 1, skipped: 0, insertedIds: ['cert-new'] });
  });

  it('skips users who already hold the certificate', async () => {
    const { sb, insert } = mockAwardChain(['cert-existing', null], 'cert-new', null);

    const result = await awardCertificates(sb, {
      user_ids: ['user-1', 'user-2'],
      institution_id: 'inst-1',
      template_id: 'tpl-1',
      course_id: 'course-1',
      awarded_by: 'admin-1',
      award_reason: 'Manual award',
    });

    expect(result.inserted).toBe(1);
    expect(result.skipped).toBe(1);
    expect(result.insertedIds).toEqual(['cert-new']);
    expect(insert).toHaveBeenCalledTimes(1);
  });
});
