/**
 * POST /api/admin/referrals/notices — send any queued referral completion
 * notices (migration 076), after re-queueing completions the trigger missed.
 *
 * Two callers:
 *   - the hourly Netlify scheduled function (netlify/functions/
 *     referral-notices-sweep.mts) with `Authorization: Bearer $CRON_SECRET` —
 *     sweeps every institution;
 *   - an admin's "Send now" button — sweeps only the admin's tenant
 *     (platform_admin: the tenant in the URL).
 */
import { timingSafeEqual } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { authorizeTenantAdmin } from '@/lib/email/admin-auth';
import { createServiceClient } from '@/lib/supabase/service';
import { flushReferralCompletionNotices } from '@/lib/referral/completion-notices.server';

function isCronCall(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  const header = req.headers.get('authorization') ?? '';
  if (!secret || !header.startsWith('Bearer ')) return false;
  const given = Buffer.from(header.slice('Bearer '.length));
  const expected = Buffer.from(secret);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

export async function POST(req: NextRequest) {
  try {
    if (isCronCall(req)) {
      const result = await flushReferralCompletionNotices(createServiceClient(), { sweep: true });
      return NextResponse.json(result);
    }

    const auth = await authorizeTenantAdmin();
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const result = await flushReferralCompletionNotices(createServiceClient(), {
      sweep: true,
      institutionId: auth.institutionId,
    });
    return NextResponse.json(result);
  } catch (err) {
    console.error('[admin/referrals/notices]', err);
    return NextResponse.json({ error: 'Failed to send referral notices' }, { status: 500 });
  }
}
