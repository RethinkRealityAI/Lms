import type { SupabaseClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const CANVA_TOKEN_URL = 'https://api.canva.com/rest/v1/oauth/token';

export function generatePKCE(): { codeVerifier: string; codeChallenge: string } {
  const codeVerifier = crypto.randomBytes(32).toString('base64url');
  const codeChallenge = crypto
    .createHash('sha256')
    .update(codeVerifier)
    .digest('base64url');
  return { codeVerifier, codeChallenge };
}

export function generateState(): string {
  return crypto.randomBytes(16).toString('hex');
}

export function buildAuthorizeUrl(params: {
  clientId: string;
  redirectUri: string;
  codeChallenge: string;
  state: string;
  scopes: string[];
}): string {
  const url = new URL('https://www.canva.com/api/oauth/authorize');
  url.searchParams.set('client_id', params.clientId);
  url.searchParams.set('redirect_uri', params.redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('code_challenge', params.codeChallenge);
  url.searchParams.set('code_challenge_method', 'S256');
  url.searchParams.set('scope', params.scopes.join(' '));
  url.searchParams.set('state', params.state);
  return url.toString();
}

export async function exchangeCodeForTokens(
  code: string,
  codeVerifier: string,
  redirectUri: string
): Promise<{ access_token: string; refresh_token: string; expires_in: number }> {
  const clientId = process.env.CANVA_CLIENT_ID!;
  const clientSecret = process.env.CANVA_CLIENT_SECRET!;

  const resp = await fetch(CANVA_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      code_verifier: codeVerifier,
      redirect_uri: redirectUri,
    }),
  });

  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(`Canva token exchange failed: ${resp.status} ${body}`);
  }

  return resp.json();
}

export async function getCanvaAccessToken(
  supabase: SupabaseClient,
  userId: string
): Promise<string | null> {
  const { data: user } = await supabase
    .from('users')
    .select('canva_access_token, canva_refresh_token, canva_token_expires_at')
    .eq('id', userId)
    .single();

  if (!user?.canva_access_token) return null;

  const expiresAt = new Date(user.canva_token_expires_at);
  const fiveMinFromNow = new Date(Date.now() + 5 * 60 * 1000);

  if (expiresAt > fiveMinFromNow) {
    return user.canva_access_token;
  }

  if (!user.canva_refresh_token) return null;

  const clientId = process.env.CANVA_CLIENT_ID!;
  const clientSecret = process.env.CANVA_CLIENT_SECRET!;

  const resp = await fetch(CANVA_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: user.canva_refresh_token,
    }),
  });

  if (!resp.ok) return null;

  const tokens = await resp.json();
  const newExpiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

  await supabase
    .from('users')
    .update({
      canva_access_token: tokens.access_token,
      canva_refresh_token: tokens.refresh_token,
      canva_token_expires_at: newExpiresAt,
    })
    .eq('id', userId);

  return tokens.access_token;
}

export async function storeCanvaTokens(
  supabase: SupabaseClient,
  userId: string,
  tokens: { access_token: string; refresh_token: string; expires_in: number }
): Promise<void> {
  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

  await supabase
    .from('users')
    .update({
      canva_access_token: tokens.access_token,
      canva_refresh_token: tokens.refresh_token,
      canva_token_expires_at: expiresAt,
    })
    .eq('id', userId);
}
