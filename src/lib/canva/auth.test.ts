import { describe, it, expect } from 'vitest';
import { generatePKCE, generateState, buildAuthorizeUrl } from './auth';

describe('generatePKCE', () => {
  it('returns a code verifier and code challenge', () => {
    const { codeVerifier, codeChallenge } = generatePKCE();
    expect(codeVerifier).toBeTruthy();
    expect(codeChallenge).toBeTruthy();
    expect(codeVerifier).not.toBe(codeChallenge);
  });

  it('generates unique values each call', () => {
    const a = generatePKCE();
    const b = generatePKCE();
    expect(a.codeVerifier).not.toBe(b.codeVerifier);
    expect(a.codeChallenge).not.toBe(b.codeChallenge);
  });

  it('produces base64url-safe characters only', () => {
    const { codeVerifier, codeChallenge } = generatePKCE();
    const base64urlPattern = /^[A-Za-z0-9_-]+$/;
    expect(codeVerifier).toMatch(base64urlPattern);
    expect(codeChallenge).toMatch(base64urlPattern);
  });
});

describe('generateState', () => {
  it('returns a hex string', () => {
    const state = generateState();
    expect(state).toMatch(/^[0-9a-f]+$/);
    expect(state.length).toBe(32); // 16 bytes = 32 hex chars
  });

  it('generates unique values each call', () => {
    const a = generateState();
    const b = generateState();
    expect(a).not.toBe(b);
  });
});

describe('buildAuthorizeUrl', () => {
  it('builds a valid Canva authorization URL with all parameters', () => {
    const url = buildAuthorizeUrl({
      clientId: 'test-client-id',
      redirectUri: 'http://localhost:3001/api/auth/canva/callback',
      codeChallenge: 'test-challenge',
      state: 'test-state',
      scopes: ['design:meta:read', 'design:content:write'],
    });

    const parsed = new URL(url);
    expect(parsed.origin).toBe('https://www.canva.com');
    expect(parsed.pathname).toBe('/api/oauth/authorize');
    expect(parsed.searchParams.get('client_id')).toBe('test-client-id');
    expect(parsed.searchParams.get('redirect_uri')).toBe('http://localhost:3001/api/auth/canva/callback');
    expect(parsed.searchParams.get('response_type')).toBe('code');
    expect(parsed.searchParams.get('code_challenge')).toBe('test-challenge');
    expect(parsed.searchParams.get('code_challenge_method')).toBe('S256');
    expect(parsed.searchParams.get('scope')).toBe('design:meta:read design:content:write');
    expect(parsed.searchParams.get('state')).toBe('test-state');
  });

  it('joins multiple scopes with spaces', () => {
    const url = buildAuthorizeUrl({
      clientId: 'id',
      redirectUri: 'http://example.com',
      codeChallenge: 'ch',
      state: 'st',
      scopes: ['a', 'b', 'c'],
    });

    const parsed = new URL(url);
    expect(parsed.searchParams.get('scope')).toBe('a b c');
  });
});
