import { describe, it, expect, afterEach } from 'vitest';
import {
  getInstitutionSlugFromPath,
  isInstitutionSlug,
  withInstitutionPath,
  resolveInstitutionSlug,
  getInstitutionSlugFromCookie,
  DEFAULT_INSTITUTION_SLUG,
} from './path';

describe('DEFAULT_INSTITUTION_SLUG', () => {
  it('is gansid', () => {
    expect(DEFAULT_INSTITUTION_SLUG).toBe('gansid');
  });
});

describe('isInstitutionSlug', () => {
  it('recognizes gansid', () => {
    expect(isInstitutionSlug('gansid')).toBe(true);
  });

  it('recognizes scago', () => {
    expect(isInstitutionSlug('scago')).toBe(true);
  });

  it('rejects unknown slugs', () => {
    expect(isInstitutionSlug('unknown')).toBe(false);
  });

  it('rejects empty string', () => {
    expect(isInstitutionSlug('')).toBe(false);
  });

  it('is case insensitive', () => {
    expect(isInstitutionSlug('SCAGO')).toBe(true);
    expect(isInstitutionSlug('Gansid')).toBe(true);
    expect(isInstitutionSlug('GANSID')).toBe(true);
  });
});

describe('getInstitutionSlugFromPath', () => {
  it('extracts gansid from /gansid/admin', () => {
    expect(getInstitutionSlugFromPath('/gansid/admin')).toBe('gansid');
  });

  it('extracts scago from /scago/student', () => {
    expect(getInstitutionSlugFromPath('/scago/student')).toBe('scago');
  });

  it('extracts slug from a deeply nested path', () => {
    expect(getInstitutionSlugFromPath('/gansid/admin/courses/123/editor')).toBe('gansid');
  });

  it('returns null for /admin (no slug)', () => {
    expect(getInstitutionSlugFromPath('/admin')).toBeNull();
  });

  it('returns null for root path', () => {
    expect(getInstitutionSlugFromPath('/')).toBeNull();
  });

  it('returns null for null pathname', () => {
    expect(getInstitutionSlugFromPath(null)).toBeNull();
  });

  it('returns null for undefined pathname', () => {
    expect(getInstitutionSlugFromPath(undefined)).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(getInstitutionSlugFromPath('')).toBeNull();
  });

  it('normalizes slug to lowercase', () => {
    expect(getInstitutionSlugFromPath('/GANSID/admin')).toBe('gansid');
  });
});

describe('getInstitutionSlugFromCookie', () => {
  const originalDocument = globalThis.document;

  afterEach(() => {
    Object.defineProperty(globalThis, 'document', {
      value: originalDocument,
      writable: true,
      configurable: true,
    });
  });

  it('returns null in SSR (no document)', () => {
    Object.defineProperty(globalThis, 'document', {
      value: undefined,
      writable: true,
      configurable: true,
    });
    expect(getInstitutionSlugFromCookie()).toBeNull();
  });

  it('reads scago from cookie', () => {
    Object.defineProperty(globalThis, 'document', {
      value: { cookie: 'institution_slug=scago; other=value' },
      writable: true,
      configurable: true,
    });
    expect(getInstitutionSlugFromCookie()).toBe('scago');
  });

  it('reads gansid from cookie', () => {
    Object.defineProperty(globalThis, 'document', {
      value: { cookie: 'institution_slug=gansid' },
      writable: true,
      configurable: true,
    });
    expect(getInstitutionSlugFromCookie()).toBe('gansid');
  });

  it('returns null for invalid slug in cookie', () => {
    Object.defineProperty(globalThis, 'document', {
      value: { cookie: 'institution_slug=fakeinst' },
      writable: true,
      configurable: true,
    });
    expect(getInstitutionSlugFromCookie()).toBeNull();
  });

  it('returns null when cookie is missing', () => {
    Object.defineProperty(globalThis, 'document', {
      value: { cookie: 'other=value; session=abc' },
      writable: true,
      configurable: true,
    });
    expect(getInstitutionSlugFromCookie()).toBeNull();
  });

  it('returns null for empty cookie string', () => {
    Object.defineProperty(globalThis, 'document', {
      value: { cookie: '' },
      writable: true,
      configurable: true,
    });
    expect(getInstitutionSlugFromCookie()).toBeNull();
  });
});

describe('resolveInstitutionSlug', () => {
  const originalDocument = globalThis.document;

  afterEach(() => {
    Object.defineProperty(globalThis, 'document', {
      value: originalDocument,
      writable: true,
      configurable: true,
    });
  });

  it('prefers pathname when slug is present', () => {
    expect(resolveInstitutionSlug('/scago/admin')).toBe('scago');
  });

  it('returns gansid from pathname', () => {
    expect(resolveInstitutionSlug('/gansid/student')).toBe('gansid');
  });

  it('falls back to cookie when pathname has no slug', () => {
    Object.defineProperty(globalThis, 'document', {
      value: { cookie: 'institution_slug=scago' },
      writable: true,
      configurable: true,
    });
    expect(resolveInstitutionSlug('/admin')).toBe('scago');
  });

  it('falls back to default when no pathname and no cookie', () => {
    Object.defineProperty(globalThis, 'document', {
      value: { cookie: '' },
      writable: true,
      configurable: true,
    });
    expect(resolveInstitutionSlug('/admin')).toBe('gansid');
  });

  it('falls back to default when pathname is null', () => {
    Object.defineProperty(globalThis, 'document', {
      value: { cookie: '' },
      writable: true,
      configurable: true,
    });
    expect(resolveInstitutionSlug(null)).toBe('gansid');
  });

  it('falls back to default when no arguments', () => {
    Object.defineProperty(globalThis, 'document', {
      value: { cookie: '' },
      writable: true,
      configurable: true,
    });
    expect(resolveInstitutionSlug()).toBe('gansid');
  });
});

describe('withInstitutionPath', () => {
  const originalDocument = globalThis.document;

  afterEach(() => {
    Object.defineProperty(globalThis, 'document', {
      value: originalDocument,
      writable: true,
      configurable: true,
    });
  });

  it('prepends slug from pathname', () => {
    expect(withInstitutionPath('/admin/courses', '/scago/admin')).toBe('/scago/admin/courses');
  });

  it('prepends gansid slug from pathname', () => {
    expect(withInstitutionPath('/student/courses', '/gansid/student')).toBe('/gansid/student/courses');
  });

  it('falls back to cookie when pathname has no slug', () => {
    Object.defineProperty(globalThis, 'document', {
      value: { cookie: 'institution_slug=scago' },
      writable: true,
      configurable: true,
    });
    expect(withInstitutionPath('/admin/courses', '/admin')).toBe('/scago/admin/courses');
  });

  it('does not double-prepend if path already has slug', () => {
    expect(withInstitutionPath('/scago/admin/courses', '/scago/admin')).toBe('/scago/admin/courses');
  });

  it('handles root path', () => {
    expect(withInstitutionPath('/', '/scago/admin')).toBe('/scago');
  });

  it('uses fallbackSlug when pathname and cookie are absent', () => {
    Object.defineProperty(globalThis, 'document', {
      value: { cookie: '' },
      writable: true,
      configurable: true,
    });
    expect(withInstitutionPath('/admin/courses', '/admin')).toBe('/gansid/admin/courses');
  });

  it('accepts explicit fallbackSlug parameter', () => {
    Object.defineProperty(globalThis, 'document', {
      value: { cookie: '' },
      writable: true,
      configurable: true,
    });
    expect(withInstitutionPath('/admin/courses', '/admin', 'scago')).toBe('/scago/admin/courses');
  });

  it('normalizes path without leading slash', () => {
    expect(withInstitutionPath('admin/courses', '/gansid/student')).toBe('/gansid/admin/courses');
  });
});
