import { describe, it, expect } from 'vitest';

describe('isAdminRole', () => {
  it('returns true for platform_admin', async () => {
    const { isAdminRole } = await import('./guards');
    expect(isAdminRole('platform_admin')).toBe(true);
  });

  it('returns true for institution_admin', async () => {
    const { isAdminRole } = await import('./guards');
    expect(isAdminRole('institution_admin')).toBe(true);
  });

  it('returns true for instructor', async () => {
    const { isAdminRole } = await import('./guards');
    expect(isAdminRole('instructor')).toBe(true);
  });

  it('returns true for legacy admin', async () => {
    const { isAdminRole } = await import('./guards');
    expect(isAdminRole('admin')).toBe(true);
  });

  it('returns false for student', async () => {
    const { isAdminRole } = await import('./guards');
    expect(isAdminRole('student')).toBe(false);
  });

  it('returns false for unknown role', async () => {
    const { isAdminRole } = await import('./guards');
    expect(isAdminRole('unknown')).toBe(false);
  });
});
