import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  REFERRAL_COOKIE,
  REFERRAL_VISITOR_COOKIE,
  REFERRAL_COOKIE_MAX_AGE_SECONDS,
  REFERRAL_VISITOR_COOKIE_MAX_AGE_SECONDS,
  isValidReferralCode,
  normalizeReferralCode,
  isSafeLandingPath,
} from '@/lib/referral/constants';

/**
 * The tracked link an ambassador shares: /r/<code>
 *
 * Records ONE anonymous visit, remembers the code for 90 days, and forwards the
 * visitor to the right page. Deliberately NOT in the middleware matcher — this
 * route resolves its own tenant from the code, and running tenant enforcement
 * on it would fight that.
 *
 * Attribution is LAST-TOUCH: the most recent tracked link a person opened
 * within the cookie window gets the credit. That keeps a stale link from an old
 * campaign from silently outranking the one that actually drove the signup, and
 * it is the rule that is easiest to state honestly to ambassadors.
 */

/**
 * Link-preview crawlers hit this URL the moment the link is pasted into email,
 * Slack, Teams or a tweet. Counting them would inflate "link opens" with robots
 * — the single most likely way for these numbers to become quietly wrong.
 */
const BOT_UA = /bot|crawler|spider|crawling|slurp|facebookexternalhit|whatsapp|telegram|slackbot|discordbot|twitterbot|linkedinbot|embedly|quora link preview|pinterest|redditbot|applebot|bingpreview|vkshare|preview|scrapy|headlesschrome|python-requests|curl|wget|okhttp|axios|go-http-client|java\/|libwww-perl/i;

function isLikelyBot(userAgent: string | null): boolean {
  if (!userAgent || userAgent.trim() === '') return true; // no UA at all — not a browser
  return BOT_UA.test(userAgent);
}

/** 128-bit opaque id. Not derived from anything about the person. */
function newVisitorKey(): string {
  return crypto.randomUUID().replace(/-/g, '');
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code: rawCode } = await params;
  const code = normalizeReferralCode(rawCode);
  const origin = request.nextUrl.origin;

  // An invalid code is a mistyped/mangled link, not an attack — send them to
  // the site rather than showing a 404 to someone we are trying to recruit.
  if (!isValidReferralCode(code)) {
    return NextResponse.redirect(new URL('/', origin));
  }

  const bot = isLikelyBot(request.headers.get('user-agent'));

  // Reuse the browser's existing key so repeat opens collapse; mint one only
  // when this browser has never opened a tracked link before.
  const existingVisitorKey = request.cookies.get(REFERRAL_VISITOR_COOKIE)?.value;
  const visitorKey =
    existingVisitorKey && existingVisitorKey.length <= 64
      ? existingVisitorKey
      : newVisitorKey();

  // Where the ?to= bounce from middleware wants us to land (already stripped of
  // the ref param by the middleware, so forwarding it cannot loop back here).
  const requestedTo = request.nextUrl.searchParams.get('to');

  let destination = '/';
  let resolved = false;

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc('record_referral_visit', {
      p_code: code,
      p_institution_slug: null,
      // A bot still resolves the code (so previews render the right page) but
      // passes a null key, which the RPC treats as a throwaway — see below.
      p_visitor_key: bot ? null : visitorKey,
      p_landing_path: request.nextUrl.pathname,
    });

    if (!error && data && (data as { ok?: boolean }).ok) {
      const result = data as {
        ok: boolean;
        institution_slug: string;
        landing_path: string | null;
      };
      resolved = true;
      const fallback = `/${result.institution_slug}`;
      destination = isSafeLandingPath(requestedTo)
        ? (requestedTo as string)
        : isSafeLandingPath(result.landing_path)
          ? (result.landing_path as string)
          : fallback;
    }
  } catch {
    // A tracked link must never be a dead end because analytics failed.
    resolved = false;
  }

  if (!resolved) {
    destination = isSafeLandingPath(requestedTo) ? (requestedTo as string) : '/';
  }

  const response = NextResponse.redirect(new URL(destination, origin));

  if (resolved && !bot) {
    // Readable by JS on purpose: the login page is a client component and reads
    // this to attach the code to the signup metadata.
    response.cookies.set(REFERRAL_COOKIE, code, {
      path: '/',
      maxAge: REFERRAL_COOKIE_MAX_AGE_SECONDS,
      sameSite: 'lax',
      secure: origin.startsWith('https://'),
      httpOnly: false,
    });
    // Server-only — nothing in the browser needs to read the visitor key.
    response.cookies.set(REFERRAL_VISITOR_COOKIE, visitorKey, {
      path: '/',
      maxAge: REFERRAL_VISITOR_COOKIE_MAX_AGE_SECONDS,
      sameSite: 'lax',
      secure: origin.startsWith('https://'),
      httpOnly: true,
    });
  }

  return response;
}
