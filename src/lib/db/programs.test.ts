import { describe, it, expect, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { isCourseCertificateSuppressed, getNextProgramCourse } from './programs';

// isCourseCertificateSuppressed queries:
//   from('program_courses').select('program:programs!inner(program_certificate_only)').eq('course_id', id)
function makeSuppressedSupabase(data: unknown[], error: unknown = null): SupabaseClient {
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
    expect(await isCourseCertificateSuppressed(makeSuppressedSupabase([]), 'c1')).toBe(false);
  });

  it('returns false when every containing program keeps per-course certs', async () => {
    const sb = makeSuppressedSupabase([
      { program: { program_certificate_only: false } },
      { program: { program_certificate_only: false } },
    ]);
    expect(await isCourseCertificateSuppressed(sb, 'c1')).toBe(false);
  });

  it('returns true when any containing program is certificate-only', async () => {
    const sb = makeSuppressedSupabase([
      { program: { program_certificate_only: false } },
      { program: { program_certificate_only: true } },
    ]);
    expect(await isCourseCertificateSuppressed(sb, 'c1')).toBe(true);
  });

  it('handles PostgREST returning the joined relation as an array', async () => {
    const sb = makeSuppressedSupabase([{ program: [{ program_certificate_only: true }] }]);
    expect(await isCourseCertificateSuppressed(sb, 'c1')).toBe(true);
  });

  it('treats a missing flag as not suppressed', async () => {
    const sb = makeSuppressedSupabase([{ program: {} }, { program: { program_certificate_only: null } }]);
    expect(await isCourseCertificateSuppressed(sb, 'c1')).toBe(false);
  });

  it('throws when the query errors (caller decides the fallback)', async () => {
    const sb = makeSuppressedSupabase([], new Error('rls'));
    await expect(isCourseCertificateSuppressed(sb, 'c1')).rejects.toThrow('rls');
  });
});

// program_courses is queried twice with different chains:
//   1) .select(...).eq('course_id', id)                 → the memberships of THIS course
//   2) .select(...).in('program_id', ids).order(...)    → the full ordered sequences
// certificates is queried once: .select(...).eq('user_id', id).is('revoked_at', null)
function makeNextCourseSupabase(opts: {
  pcs: unknown[];
  allPcs: unknown[];
  certs: { course_id: string }[];
  pcsError?: unknown;
  allPcsError?: unknown;
  certsError?: unknown;
}): SupabaseClient {
  const from = vi.fn((table: string) => {
    if (table === 'program_courses') {
      return {
        select: vi.fn(() => ({
          // path 1 — .eq('course_id', ...) is awaited directly
          eq: vi.fn(() => Promise.resolve({ data: opts.pcs, error: opts.pcsError ?? null })),
          // path 2 — .in(...).order(...)
          in: vi.fn(() => ({
            order: vi.fn(() => Promise.resolve({ data: opts.allPcs, error: opts.allPcsError ?? null })),
          })),
        })),
      };
    }
    if (table === 'certificates') {
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            is: vi.fn(() => Promise.resolve({ data: opts.certs, error: opts.certsError ?? null })),
          })),
        })),
      };
    }
    throw new Error(`unexpected table ${table}`);
  });
  return { from } as unknown as SupabaseClient;
}

const liveCourse = (id: string, title: string) => ({ id, title, is_published: true, deleted_at: null });

describe('getNextProgramCourse', () => {
  it('returns null when the course belongs to no program', async () => {
    const sb = makeNextCourseSupabase({ pcs: [], allPcs: [], certs: [] });
    expect(await getNextProgramCourse(sb, 'c1', 'u1')).toBeNull();
  });

  it('returns the next course in order for a program', async () => {
    const sb = makeNextCourseSupabase({
      pcs: [{ program_id: 'p1', order_index: 0, programs: { title: 'Cert Program' } }],
      allPcs: [
        { program_id: 'p1', order_index: 0, course: liveCourse('c1', 'Module 1') },
        { program_id: 'p1', order_index: 1, course: liveCourse('c2', 'Module 2') },
        { program_id: 'p1', order_index: 2, course: liveCourse('c3', 'Module 3') },
      ],
      certs: [],
    });
    const next = await getNextProgramCourse(sb, 'c1', 'u1');
    expect(next).toEqual({ courseId: 'c2', courseTitle: 'Module 2', programId: 'p1', programTitle: 'Cert Program' });
  });

  it('returns null when the course is the last in its program', async () => {
    const sb = makeNextCourseSupabase({
      pcs: [{ program_id: 'p1', order_index: 2, programs: { title: 'Cert Program' } }],
      allPcs: [
        { program_id: 'p1', order_index: 0, course: liveCourse('c1', 'Module 1') },
        { program_id: 'p1', order_index: 1, course: liveCourse('c2', 'Module 2') },
        { program_id: 'p1', order_index: 2, course: liveCourse('c3', 'Module 3') },
      ],
      certs: [],
    });
    expect(await getNextProgramCourse(sb, 'c3', 'u1')).toBeNull();
  });

  it('skips a next course the student has already certified', async () => {
    const sb = makeNextCourseSupabase({
      pcs: [{ program_id: 'p1', order_index: 0, programs: { title: 'Cert Program' } }],
      allPcs: [
        { program_id: 'p1', order_index: 0, course: liveCourse('c1', 'Module 1') },
        { program_id: 'p1', order_index: 1, course: liveCourse('c2', 'Module 2') },
        { program_id: 'p1', order_index: 2, course: liveCourse('c3', 'Module 3') },
      ],
      certs: [{ course_id: 'c2' }], // already done Module 2 → point at Module 3
    });
    const next = await getNextProgramCourse(sb, 'c1', 'u1');
    expect(next?.courseId).toBe('c3');
  });

  it('skips an unpublished or soft-deleted next course', async () => {
    const sb = makeNextCourseSupabase({
      pcs: [{ program_id: 'p1', order_index: 0, programs: { title: 'Cert Program' } }],
      allPcs: [
        { program_id: 'p1', order_index: 0, course: liveCourse('c1', 'Module 1') },
        { program_id: 'p1', order_index: 1, course: { id: 'c2', title: 'Draft', is_published: false, deleted_at: null } },
        { program_id: 'p1', order_index: 2, course: { id: 'c3', title: 'Deleted', is_published: true, deleted_at: '2026-01-01' } },
        { program_id: 'p1', order_index: 3, course: liveCourse('c4', 'Module 4') },
      ],
      certs: [],
    });
    const next = await getNextProgramCourse(sb, 'c1', 'u1');
    expect(next?.courseId).toBe('c4');
  });

  it('returns null when every later course is certified/unpublished/deleted', async () => {
    const sb = makeNextCourseSupabase({
      pcs: [{ program_id: 'p1', order_index: 0, programs: { title: 'Cert Program' } }],
      allPcs: [
        { program_id: 'p1', order_index: 0, course: liveCourse('c1', 'Module 1') },
        { program_id: 'p1', order_index: 1, course: liveCourse('c2', 'Module 2') },
      ],
      certs: [{ course_id: 'c2' }],
    });
    expect(await getNextProgramCourse(sb, 'c1', 'u1')).toBeNull();
  });

  it('handles PostgREST returning nested relations as single-element arrays', async () => {
    const sb = makeNextCourseSupabase({
      pcs: [{ program_id: 'p1', order_index: 0, programs: [{ title: 'Cert Program' }] }],
      allPcs: [
        { program_id: 'p1', order_index: 0, course: [liveCourse('c1', 'Module 1')] },
        { program_id: 'p1', order_index: 1, course: [liveCourse('c2', 'Module 2')] },
      ],
      certs: [],
    });
    const next = await getNextProgramCourse(sb, 'c1', 'u1');
    expect(next).toEqual({ courseId: 'c2', courseTitle: 'Module 2', programId: 'p1', programTitle: 'Cert Program' });
  });

  it('finds the next course across multiple program memberships', async () => {
    // c1 is last in p1 (no next) but middle of p2 → should resolve p2's next.
    const sb = makeNextCourseSupabase({
      pcs: [
        { program_id: 'p1', order_index: 1, programs: { title: 'Program One' } },
        { program_id: 'p2', order_index: 0, programs: { title: 'Program Two' } },
      ],
      allPcs: [
        { program_id: 'p1', order_index: 0, course: liveCourse('c0', 'P1 Module 1') },
        { program_id: 'p1', order_index: 1, course: liveCourse('c1', 'Shared') },
        { program_id: 'p2', order_index: 0, course: liveCourse('c1', 'Shared') },
        { program_id: 'p2', order_index: 1, course: liveCourse('c9', 'P2 Module 2') },
      ],
      certs: [],
    });
    const next = await getNextProgramCourse(sb, 'c1', 'u1');
    expect(next?.courseId).toBe('c9');
    expect(next?.programId).toBe('p2');
  });

  it('throws when the program_courses query errors', async () => {
    const sb = makeNextCourseSupabase({ pcs: [], allPcs: [], certs: [], pcsError: new Error('boom') });
    await expect(getNextProgramCourse(sb, 'c1', 'u1')).rejects.toThrow('boom');
  });
});
