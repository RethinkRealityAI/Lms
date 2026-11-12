import { describe, it, expect } from 'vitest';
import { getRequestOrigin } from './request-origin';

const req = (url: string, headers: Record<string, string>) => ({ url, headers: new Headers(headers) });

describe('getRequestOrigin', () => {
  it('prefers the forwarded host over the primary domain in request.url', () => {
    expect(getRequestOrigin(req('https://learn.sicklecellanemia.ca/auth/callback', {
      'x-forwarded-host': 'org-lms.netlify.app', 'x-forwarded-proto': 'https',
    }))).toBe('https://org-lms.netlify.app');
  });

  it('falls back to the Host header, then to request.url', () => {
    expect(getRequestOrigin(req('http://x/auth/callback', { host: 'localhost:3001' }))).toBe('http://localhost:3001');
    expect(getRequestOrigin(req('https://learn.sicklecellanemia.ca/a', {}))).toBe('https://learn.sicklecellanemia.ca');
  });

  it('ignores a malformed host', () => {
    expect(getRequestOrigin(req('https://learn.sicklecellanemia.ca/a', { host: 'evil.com/x?' })))
      .toBe('https://learn.sicklecellanemia.ca');
  });
});
