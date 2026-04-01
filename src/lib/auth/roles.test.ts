import { describe, it, expect } from 'vitest';
import { isAdminRole, normalizeRole, ADMIN_ROLES } from './roles';

describe('ADMIN_ROLES', () => {
  it('contains the expected admin role values', () => {
    expect(ADMIN_ROLES.has('platform_admin')).toBe(true);
    expect(ADMIN_ROLES.has('institution_admin')).toBe(true);
    expect(ADMIN_ROLES.has('instructor')).toBe(true);
    expect(ADMIN_ROLES.has('admin')).toBe(true);
    expect(ADMIN_ROLES.has('student')).toBe(false);
  });
});

describe('isAdminRole', () => {
  it('returns true for platform_admin', () => {
    expect(isAdminRole('platform_admin')).toBe(true);
  });

  it('returns true for institution_admin', () => {
    expect(isAdminRole('institution_admin')).toBe(true);
  });

  it('returns true for instructor', () => {
    expect(isAdminRole('instructor')).toBe(true);
  });

  it('returns true for legacy admin', () => {
    expect(isAdminRole('admin')).toBe(true);
  });

  it('returns false for student', () => {
    expect(isAdminRole('student')).toBe(false);
  });

  it('returns false for an unknown role', () => {
    expect(isAdminRole('moderator')).toBe(false);
  });

  it('returns false for null', () => {
    expect(isAdminRole(null)).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(isAdminRole(undefined)).toBe(false);
  });

  it('returns false for an empty string', () => {
    expect(isAdminRole('')).toBe(false);
  });

  it('is case-insensitive', () => {
    expect(isAdminRole('ADMIN')).toBe(true);
    expect(isAdminRole('Platform_Admin')).toBe(true);
    expect(isAdminRole('STUDENT')).toBe(false);
  });

  it('trims whitespace before checking', () => {
    expect(isAdminRole('  admin  ')).toBe(true);
    expect(isAdminRole('  student  ')).toBe(false);
  });
});

describe('normalizeRole', () => {
  it('lowercases and trims the role', () => {
    expect(normalizeRole('  ADMIN  ')).toBe('admin');
    expect(normalizeRole('Institution_Admin')).toBe('institution_admin');
  });

  it('returns null for null input', () => {
    expect(normalizeRole(null)).toBeNull();
  });

  it('returns null for undefined input', () => {
    expect(normalizeRole(undefined)).toBeNull();
  });

  it('returns an empty string as-is (after trim)', () => {
    expect(normalizeRole('')).toBeNull();
  });

  it('passes through already-normalized roles unchanged', () => {
    expect(normalizeRole('student')).toBe('student');
    expect(normalizeRole('admin')).toBe('admin');
  });
});
