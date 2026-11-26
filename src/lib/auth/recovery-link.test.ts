import { describe, expect, it } from 'vitest';
import { parseRecoveryLink } from './recovery-link';

describe('parseRecoveryLink', () => {
  it('reads a PKCE code', () => {
    expect(parseRecoveryLink('?code=abc', '')).toEqual({ kind: 'code', code: 'abc' });
  });

  it('reads a token hash (scanner-safe template)', () => {
    expect(parseRecoveryLink('?token_hash=th1&type=recovery', '')).toEqual({
      kind: 'token_hash',
      tokenHash: 'th1',
      type: 'recovery',
    });
  });

  it('ignores a token hash for another link type', () => {
    expect(parseRecoveryLink('?token_hash=th1&type=signup', '')).toEqual({ kind: 'none' });
  });

  it('reads implicit-flow tokens from the hash (admin-sent resets)', () => {
    expect(
      parseRecoveryLink('', '#access_token=at&refresh_token=rt&type=recovery&expires_in=3600'),
    ).toEqual({ kind: 'tokens', accessToken: 'at', refreshToken: 'rt' });
  });

  it('reports an expired link from the query or the hash', () => {
    expect(
      parseRecoveryLink('?error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid', ''),
    ).toEqual({ kind: 'error', code: 'otp_expired', description: 'Email link is invalid' });
    expect(parseRecoveryLink('', '#error=access_denied&error_code=otp_expired')).toMatchObject({
      kind: 'error',
      code: 'otp_expired',
    });
  });

  it('returns none for a bare visit', () => {
    expect(parseRecoveryLink('', '')).toEqual({ kind: 'none' });
  });
});
