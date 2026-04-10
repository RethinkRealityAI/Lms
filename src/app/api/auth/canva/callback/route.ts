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

  if (!code || !state || !storedState || !codeVerifier || state !== storedState) {
    return new NextResponse(
      '<html><body><script>window.opener?.postMessage({type:"canva-auth-error",error:"Invalid state"},"*");window.close();</script></body></html>',
      { headers: { 'Content-Type': 'text/html' } }
    );
  }

  try {
    const redirectUri = `${new URL(request.url).origin}/api/auth/canva/callback`;
    const tokens = await exchangeCodeForTokens(code, codeVerifier, redirectUri);

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('Not authenticated');
    }

    await storeCanvaTokens(supabase, user.id, tokens);

    return new NextResponse(
      '<html><body><script>window.opener?.postMessage({type:"canva-auth-success"},"*");window.close();</script></body></html>',
      { headers: { 'Content-Type': 'text/html' } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return new NextResponse(
      `<html><body><script>window.opener?.postMessage({type:"canva-auth-error",error:${JSON.stringify(message)}},"*");window.close();</script></body></html>`,
      { headers: { 'Content-Type': 'text/html' } }
    );
  }
}
