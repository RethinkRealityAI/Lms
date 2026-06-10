import { createClient } from '@/lib/supabase/server';
import { logSignInEvent } from '@/lib/db/events';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const ADMIN_ROLES = new Set(['platform_admin', 'institution_admin', 'instructor', 'admin']);
const DEFAULT_INSTITUTION = 'gansid';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const error = requestUrl.searchParams.get('error');
  const error_description = requestUrl.searchParams.get('error_description');
  const next = requestUrl.searchParams.get('next');

  // Derive the institution slug from the referrer cookie or default
  const institutionSlug =
    request.cookies.get('institution_slug')?.value || DEFAULT_INSTITUTION;

  const loginUrl = `/${institutionSlug}/login`;

  // Handle error cases
  if (error) {
    console.error('Auth callback error:', error, error_description);
    return NextResponse.redirect(
      new URL(
        `${loginUrl}?error=${encodeURIComponent(error_description || error)}`,
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
            `${loginUrl}?error=${encodeURIComponent('Verification failed. The link may have expired — please request a new one.')}`,
            requestUrl.origin
          )
        );
      }

      if (data.user) {
        // Look up profile to route to the right dashboard
        const { data: userData } = await supabase
          .from('users')
          .select('role, institution_id, is_active')
          .eq('id', data.user.id)
          .single();

        // Suspension gate (migration 038)
        if (userData && userData.is_active === false) {
          await supabase.auth.signOut();
          return NextResponse.redirect(
            new URL(
              `${loginUrl}?error=${encodeURIComponent('Your account has been deactivated. Please contact your administrator.')}`,
              requestUrl.origin
            )
          );
        }

        // Sign-in analytics (migration 037) — best-effort
        if (userData?.institution_id) {
          await logSignInEvent(supabase, data.user.id, userData.institution_id);
        }

        // If an explicit next param was provided, honour it
        if (next && next !== loginUrl) {
          return NextResponse.redirect(new URL(next, requestUrl.origin));
        }

        const role = userData?.role || 'student';
        const destination = ADMIN_ROLES.has(role)
          ? `/${institutionSlug}/admin`
          : `/${institutionSlug}/student`;

        return NextResponse.redirect(new URL(destination, requestUrl.origin));
      }
    } catch (err) {
      console.error('Auth callback error:', err);
      return NextResponse.redirect(
        new URL(
          `${loginUrl}?error=${encodeURIComponent('An error occurred during verification. Please try again.')}`,
          requestUrl.origin
        )
      );
    }
  }

  // No code provided — redirect to login
  return NextResponse.redirect(new URL(loginUrl, requestUrl.origin));
}
