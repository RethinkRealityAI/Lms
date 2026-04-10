import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { exchangeCodeForTokens, storeCanvaTokens } from '@/lib/canva/auth';

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  const state = request.nextUrl.searchParams.get('state');

  const cookieStore = await cookies();
  const storedState = cookieStore.get('canva_state')?.value;
  const codeVerifier = cookieStore.get('canva_code_verifier')?.value;

  cookieStore.delete('canva_state');
  cookieStore.delete('canva_code_verifier');

  // Debug: log what we have
  console.log('[Canva callback] code:', !!code, 'state:', state, 'storedState:', storedState, 'codeVerifier:', !!codeVerifier);

  if (!code || !state || !storedState || !codeVerifier || state !== storedState) {
    const detail = !code ? 'missing code' : !storedState ? 'missing stored state (cookie lost)' : !codeVerifier ? 'missing code verifier (cookie lost)' : 'state mismatch';
    console.error('[Canva callback] Validation failed:', detail);
    return new NextResponse(
      `<html><body><h3>Canva Auth Error</h3><p>${detail}</p><p>This usually means cookies were lost between the auth request and callback. Make sure you access the app via <code>127.0.0.1:3001</code> (not localhost).</p><script>window.opener?.postMessage({type:"canva-auth-error",error:"${detail}"},"*");</script></body></html>`,
      { headers: { 'Content-Type': 'text/html' } }
    );
  }

  try {
    const redirectUri = process.env.NEXT_PUBLIC_CANVA_REDIRECT_URI ?? 'http://127.0.0.1:3001/api/auth/canva/callback';
    console.log('[Canva callback] Exchanging code for tokens, redirectUri:', redirectUri);
    const tokens = await exchangeCodeForTokens(code, codeVerifier, redirectUri);
    console.log('[Canva callback] Token exchange successful, expires_in:', tokens.expires_in);

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('Not authenticated — Supabase session not found in callback');
    }

    await storeCanvaTokens(supabase, user.id, tokens);
    console.log('[Canva callback] Tokens stored for user:', user.id);

    return new NextResponse(
      '<html><body><h3>Connected to Canva!</h3><p>You can close this window.</p><script>window.opener?.postMessage({type:"canva-auth-success"},"*");setTimeout(()=>window.close(),1500);</script></body></html>',
      { headers: { 'Content-Type': 'text/html' } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[Canva callback] Error:', message);
    return new NextResponse(
      `<html><body><h3>Canva Auth Error</h3><p>${message}</p><script>window.opener?.postMessage({type:"canva-auth-error",error:${JSON.stringify(message)}},"*");</script></body></html>`,
      { headers: { 'Content-Type': 'text/html' } }
    );
  }
}
