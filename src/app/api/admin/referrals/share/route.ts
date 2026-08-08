import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { authorizeTenantAdmin } from '@/lib/email/admin-auth';
import { isEmailConfigured, sendEmail } from '@/lib/email/mailer';
import { renderSystemEmail, referralLinkEmailVariables } from '@/lib/email/system-emails';
import { referralShareUrl, referralReportUrl } from '@/lib/db/referrals';

/**
 * POST /api/admin/referrals/share
 * { codeId: string, emails: string[], includeReport?: boolean }
 *
 * Emails an ambassador their tracked link and (by default) their private
 * dashboard link.
 */

const MAX_RECIPIENTS = 25;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  try {
    const auth = await authorizeTenantAdmin();
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

    if (!isEmailConfigured()) {
      return NextResponse.json({ sent: 0, reason: 'smtp_not_configured' });
    }

    const body = await req.json();
    const codeId = typeof body.codeId === 'string' ? body.codeId : '';
    if (!codeId) return NextResponse.json({ error: 'codeId required' }, { status: 400 });

    const rawEmails: unknown = body.emails;
    const emails = (Array.isArray(rawEmails) ? rawEmails : [])
      .filter((e): e is string => typeof e === 'string')
      .map((e) => e.trim().toLowerCase())
      .filter((e) => EMAIL_RE.test(e));

    if (emails.length === 0) {
      return NextResponse.json({ error: 'At least one valid email is required' }, { status: 400 });
    }
    if (emails.length > MAX_RECIPIENTS) {
      return NextResponse.json(
        { error: `Too many recipients (max ${MAX_RECIPIENTS})` },
        { status: 400 },
      );
    }

    const service = createServiceClient();
    const { data: code, error } = await service
      .from('referral_codes')
      .select('id, institution_id, code, label, public_token, owner_name, owner_email')
      .eq('id', codeId)
      .maybeSingle();

    if (error) throw error;
    // Institution check is the actual authorisation boundary here — the
    // service client bypasses RLS, so without this an admin of one tenant
    // could mail out another tenant's dashboard token.
    if (!code || code.institution_id !== auth.institutionId) {
      return NextResponse.json({ error: 'Referral code not found' }, { status: 404 });
    }

    const origin = req.nextUrl.origin;
    const shareUrl = referralShareUrl(origin, code.code);
    const reportUrl = referralReportUrl(origin, code.public_token);

    let sent = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const to of emails) {
      try {
        const { subject, html } = await renderSystemEmail({
          supabase: service,
          institutionId: auth.institutionId,
          institutionSlug: auth.institutionSlug,
          type: 'referral_link',
          variables: referralLinkEmailVariables({
            // Personalise only when mailing the code's registered owner —
            // for anyone else the greeting stays neutral rather than
            // addressing them by someone else's name.
            recipientName:
              code.owner_email && to === code.owner_email.toLowerCase()
                ? code.owner_name
                : null,
            referralLabel: code.label,
            referralUrl: shareUrl,
            reportUrl,
          }),
        });

        const result = await sendEmail({
          to,
          subject,
          html,
          institutionSlug: auth.institutionSlug,
        });
        if (result.sent) sent += 1;
      } catch (err) {
        failed += 1;
        if (errors.length < 5) {
          errors.push(`${to}: ${err instanceof Error ? err.message : 'Send failed'}`);
        }
      }
    }

    return NextResponse.json({ sent, failed, total: emails.length, errors });
  } catch (err) {
    console.error('[referrals/share] failed:', err);
    return NextResponse.json({ error: 'Failed to send' }, { status: 500 });
  }
}
