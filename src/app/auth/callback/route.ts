import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const error = requestUrl.searchParams.get('error');
  const error_description = requestUrl.searchParams.get('error_description');
  const next = requestUrl.searchParams.get('next') || '/login';

  // Handle error cases
  if (error) {
    console.error('Auth callback error:', error, error_description);
    return NextResponse.redirect(
      new URL(
        `/login?error=${encodeURIComponent(error_description || error)}`,
        requestUrl.origin
      )
    );
  }

  // Exchange code for session
  if (code) {
    const supabase = await createClient();
    
    try {
      const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
      
      if (exchangeError) {
        console.error('Code exchange error:', exchangeError);
        return NextResponse.redirect(
          new URL(
            `/login?error=${encodeURIComponent('Email verification failed. Please try again.')}`,
            requestUrl.origin
          )
        );
      }

      if (data.user) {
        // Verify user profile exists
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('role, full_name')
          .eq('id', data.user.id)
          .single();

        if (userError || !userData) {
          console.error('User profile not found:', userError);
          // Redirect to login with a message to contact support
          return NextResponse.redirect(
            new URL(
              `/login?error=${encodeURIComponent('Profile not found. Please contact support.')}`,
              requestUrl.origin
            )
          );
        }

        // Successful verification - redirect to appropriate dashboard or login with success message
        const redirectPath = next === '/login' 
          ? `/login?verified=true&role=${userData.role}` 
          : next;
        
        return NextResponse.redirect(new URL(redirectPath, requestUrl.origin));
      }
    } catch (error) {
      console.error('Auth callback error:', error);
      return NextResponse.redirect(
        new URL(
          `/login?error=${encodeURIComponent('An error occurred during verification. Please try again.')}`,
          requestUrl.origin
        )
      );
    }
  }

  // No code provided, redirect to login
  return NextResponse.redirect(new URL('/login', requestUrl.origin));
}
