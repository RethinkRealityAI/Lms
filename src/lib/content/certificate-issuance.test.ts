import { describe, it, expect } from 'vitest';
import { celebrationCertId } from './certificate-issuance';

describe('celebrationCertId', () => {
  it('returns null for null/undefined results', () => {
    expect(celebrationCertId(null)).toBeNull();
    expect(celebrationCertId(undefined)).toBeNull();
  });

  it('returns the course certificate id for a normal (non-suppressed) program', () => {
    expect(celebrationCertId({ certificate_id: 'course-1', suppressed: false })).toBe('course-1');
  });

  it('treats a missing suppressed flag as non-suppressed', () => {
    expect(celebrationCertId({ certificate_id: 'course-1' })).toBe('course-1');
  });

  it('surfaces the PROGRAM certificate (not the course one) when suppressed', () => {
    expect(
      celebrationCertId({ certificate_id: 'course-1', suppressed: true, program_certificate_id: 'program-9' }),
    ).toBe('program-9');
  });

  it('returns null when suppressed and the program is not complete yet', () => {
    // Suppressed course, but no program cert exists → nothing to celebrate.
    expect(celebrationCertId({ certificate_id: 'course-1', suppressed: true, program_certificate_id: null })).toBeNull();
    expect(celebrationCertId({ certificate_id: 'course-1', suppressed: true })).toBeNull();
  });

  it('never leaks a course cert id when suppressed', () => {
    const r = { certificate_id: 'course-1', suppressed: true, program_certificate_id: 'program-9' };
    expect(celebrationCertId(r)).not.toBe('course-1');
  });

  it('returns null when a non-suppressed result has no course certificate id', () => {
    expect(celebrationCertId({ suppressed: false })).toBeNull();
  });
});
