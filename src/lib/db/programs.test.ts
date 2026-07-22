import { describe, it, expect, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { isCourseCertificateSuppressed } from './programs';

// isCourseCertificateSuppressed queries:
//   from('program_courses').select('program:programs!inner(program_certificate_only)').eq('course_id', id)
function makeSupabase(data: unknown[], error: unknown = null): SupabaseClient {
  const eq = vi.fn(() => Promise.resolve({ data, error }));
  const select = vi.fn(() => ({ eq }));
  const from = vi.fn((table: string) => {
    if (table === 'program_courses') return { select };
    throw new Error(`unexpected table ${table}`);
  });
  return { from } as unknown as SupabaseClient;
}

describe('isCourseCertificateSuppressed', () => {
  it('returns false when the course is in no program', async () => {
    expect(await isCourseCertificateSuppressed(makeSupabase([]), 'c1')).toBe(false);
  });

  it('returns false when every containing program keeps per-course certs', async () => {
    const sb = makeSupabase([
      { program: { program_certificate_only: false } },
      { program: { program_certificate_only: false } },
    ]);
    expect(await isCourseCertificateSuppressed(sb, 'c1')).toBe(false);
  });

  it('returns true when any containing program is certificate-only', async () => {
    const sb = makeSupabase([
      { program: { program_certificate_only: false } },
      { program: { program_certificate_only: true } },
    ]);
    expect(await isCourseCertificateSuppressed(sb, 'c1')).toBe(true);
  });

  it('handles PostgREST returning the joined relation as an array', async () => {
    const sb = makeSupabase([{ program: [{ program_certificate_only: true }] }]);
    expect(await isCourseCertificateSuppressed(sb, 'c1')).toBe(true);
  });

  it('treats a missing flag as not suppressed', async () => {
    const sb = makeSupabase([{ program: {} }, { program: { program_certificate_only: null } }]);
    expect(await isCourseCertificateSuppressed(sb, 'c1')).toBe(false);
  });

  it('throws when the query errors (caller decides the fallback)', async () => {
    const sb = makeSupabase([], new Error('rls'));
    await expect(isCourseCertificateSuppressed(sb, 'c1')).rejects.toThrow('rls');
  });
});
