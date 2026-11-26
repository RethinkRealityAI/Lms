/**
 * What a password-reset email link carried when it landed on /reset-password.
 *
 * Supabase can deliver a recovery session in three shapes, depending on who
 * sent the email and how the email template builds the link:
 *  - `?code=`                PKCE flow (resets requested from the browser). Only
 *                            the browser that asked for the email holds the code
 *                            verifier, so another browser/device cannot use it.
 *  - `?token_hash=&type=`    token-hash template (works in any browser, and an
 *                            email scanner opening the link does not use it up,
 *                            because we only verify on a button click).
 *  - `#access_token=`        implicit flow (resets sent by an admin from the
 *                            server's service-role client).
 * Or an error from Supabase's /verify endpoint (expired or already-used link).
 */
export type RecoveryLink =
  | { kind: 'code'; code: string }
  | { kind: 'token_hash'; tokenHash: string; type: 'recovery' }
  | { kind: 'tokens'; accessToken: string; refreshToken: string }
  | { kind: 'error'; code: string | null; description: string | null }
  | { kind: 'none' };

export function parseRecoveryLink(search: string, hash: string): RecoveryLink {
  const q = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  const h = new URLSearchParams(hash.startsWith('#') ? hash.slice(1) : hash);

  const error = q.get('error') ?? h.get('error');
  if (error) {
    return {
      kind: 'error',
      code: q.get('error_code') ?? h.get('error_code'),
      description: q.get('error_description') ?? h.get('error_description'),
    };
  }

  const tokenHash = q.get('token_hash');
  if (tokenHash && (q.get('type') ?? 'recovery') === 'recovery') {
    return { kind: 'token_hash', tokenHash, type: 'recovery' };
  }

  const accessToken = h.get('access_token');
  const refreshToken = h.get('refresh_token');
  if (accessToken && refreshToken) {
    return { kind: 'tokens', accessToken, refreshToken };
  }

  const code = q.get('code');
  if (code) return { kind: 'code', code };

  return { kind: 'none' };
}

/** Query/hash keys that carry credentials and must be stripped from the address bar. */
export const RECOVERY_URL_KEYS = [
  'code',
  'token_hash',
  'type',
  'error',
  'error_code',
  'error_description',
] as const;
