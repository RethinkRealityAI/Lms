/**
 * The origin the browser actually used for this request.
 *
 * On Netlify, `request.url` inside a Next.js route handler carries the site's
 * PRIMARY domain (learn.sicklecellanemia.ca) even when the browser called
 * org-lms.netlify.app. Redirecting with it moved GANSID learners onto the SCAGO
 * domain — leaving the session cookie just set on the Netlify domain behind, so
 * they arrived signed out. The forwarded/Host headers hold the real host.
 */
export function getRequestOrigin(request: { url: string; headers: Headers }): string {
  const url = new URL(request.url);
  const host = (request.headers.get('x-forwarded-host') ?? request.headers.get('host') ?? '')
    .split(',')[0]
    .trim();
  if (!host || !/^[a-z0-9.-]+(:\d+)?$/i.test(host)) return url.origin;
  const proto = (request.headers.get('x-forwarded-proto') ?? '').split(',')[0].trim();
  const scheme = proto === 'http' || proto === 'https' ? proto : url.protocol.replace(':', '');
  return `${scheme}://${host}`;
}
