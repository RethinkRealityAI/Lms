import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { generatePKCE, generateState, buildAuthorizeUrl } from '@/lib/canva/auth';

const CANVA_SCOPES = [
  'design:content:write',
  'design:meta:read',
  'design:content:read',
  'asset:write',
  'asset:read',
  'profile:read',
  'folder:read',
];

export async function GET() {
  const clientId = process.env.CANVA_CLIENT_ID;
  const redirectUri = process.env.NEXT_PUBLIC_CANVA_REDIRECT_URI ?? 'http://127.0.0.1:3001/api/auth/canva/callback';

  if (!clientId) {
    return NextResponse.json({ error: 'Canva not configured' }, { status: 500 });
  }

  const { codeVerifier, codeChallenge } = generatePKCE();
  const state = generateState();

  const cookieStore = await cookies();
  cookieStore.set('canva_code_verifier', codeVerifier, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600,
    path: '/',
  });
  cookieStore.set('canva_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600,
    path: '/',
  });

  const authorizeUrl = buildAuthorizeUrl({
    clientId,
    redirectUri,
    codeChallenge,
    state,
    scopes: CANVA_SCOPES,
  });

  console.log('[Canva OAuth] Redirecting to Canva with redirect_uri:', redirectUri);
  console.log('[Canva OAuth] Full authorize URL:', authorizeUrl);

  return NextResponse.redirect(authorizeUrl);
}
