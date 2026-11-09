/**
 * Hourly safety-net sweep for referral completion notices (migration 076).
 *
 * Program-certificate completions are emailed to partner contacts immediately
 * by /api/notify/certificate. This catches everything that path misses (admin
 * awards, legacy claims, a browser closed mid-request, an SMTP blip) by calling
 * the app's own sweep endpoint. Netlify scheduled functions run only on the
 * published production deploy and cannot be invoked by URL there.
 *
 * Needs CRON_SECRET set in the Netlify site's environment variables (any long
 * random string); without it this does nothing and only the immediate path and
 * the admin "Send now" button send notices.
 */
export default async () => {
  const secret = process.env.CRON_SECRET;
  const base = process.env.URL; // Netlify-provided primary site URL
  if (!secret || !base) {
    console.warn('[referral-notices-sweep] CRON_SECRET or URL not set; skipping');
    return new Response('skipped', { status: 200 });
  }
  const res = await fetch(`${base}/api/admin/referrals/notices`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${secret}` },
  });
  const body = await res.text();
  console.log('[referral-notices-sweep]', res.status, body);
  return new Response(body, { status: res.ok ? 200 : 500 });
};

export const config = { schedule: '@hourly' };
