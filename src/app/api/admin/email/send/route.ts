import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { getEmailTemplateById } from '@/lib/db/email-templates';
import { getGroupMemberUserIds } from '@/lib/db/course-assignments';
import { authorizeTenantAdmin } from '@/lib/email/admin-auth';
import { isEmailConfigured } from '@/lib/email/mailer';
import { MAX_BULK_RECIPIENTS, MAX_EXTERNAL_RECIPIENTS, sendBulkEmails, type EmailRecipient } from '@/lib/email/bulk-send';
import { isValidNotifyEmail } from '@/lib/referral/completion-notices';

/**
 * POST {
 *   templateId,
 *   userIds?: string[],
 *   groupIds?: string[],
 *   emails?: string[],          // people without an account (e.g. failed signups)
 *   customMessage?,
 *   sampleVariables?,
 *   testMode?: boolean
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await authorizeTenantAdmin();
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

    if (!isEmailConfigured()) {
      return NextResponse.json({ sent: 0, reason: 'smtp_not_configured' });
    }

    const body = await req.json();
    const templateId = body.templateId as string;
    if (!templateId) {
      return NextResponse.json({ error: 'templateId required' }, { status: 400 });
    }

    const userIds = Array.isArray(body.userIds) ? (body.userIds as string[]) : [];
    const groupIds = Array.isArray(body.groupIds) ? (body.groupIds as string[]) : [];

    // Plain addresses for people who have no account yet. Validated and
    // capped server-side; never merged into account-holder lookups.
    const rawEmails = Array.isArray(body.emails) ? (body.emails as unknown[]) : [];
    const externalEmails = [
      ...new Set(
        rawEmails
          .filter((e): e is string => typeof e === 'string')
          .map((e) => e.trim().toLowerCase())
          .filter(Boolean),
      ),
    ];
    const invalidEmails = externalEmails.filter((e) => !isValidNotifyEmail(e));
    if (invalidEmails.length > 0) {
      return NextResponse.json(
        { error: `Invalid email address: ${invalidEmails.slice(0, 3).join(', ')}` },
        { status: 400 },
      );
    }
    if (externalEmails.length > MAX_EXTERNAL_RECIPIENTS) {
      return NextResponse.json(
        { error: `Too many email addresses (max ${MAX_EXTERNAL_RECIPIENTS})` },
        { status: 400 },
      );
    }

    if (userIds.length === 0 && groupIds.length === 0 && externalEmails.length === 0) {
      return NextResponse.json({ error: 'Select at least one recipient or group' }, { status: 400 });
    }

    const service = createServiceClient();
    const template = await getEmailTemplateById(service, templateId);
    if (!template || template.institution_id !== auth.institutionId) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    const groupMemberIds = groupIds.length > 0 ? await getGroupMemberUserIds(service, groupIds) : [];
    const allUserIds = [...new Set([...userIds, ...groupMemberIds])];

    if (allUserIds.length + externalEmails.length > MAX_BULK_RECIPIENTS) {
      return NextResponse.json(
        { error: `Too many recipients (max ${MAX_BULK_RECIPIENTS})` },
        { status: 400 },
      );
    }

    let users: EmailRecipient[] = [];
    if (allUserIds.length > 0) {
      const { data, error: usersError } = await service
        .from('users')
        .select('id, email, full_name')
        .in('id', allUserIds)
        .eq('institution_id', auth.institutionId)
        .eq('is_active', true);
      if (usersError) throw usersError;
      users = (data ?? []) as EmailRecipient[];
    }

    // An address that is also a selected account gets one email, not two.
    const userEmails = new Set(users.map((u) => u.email?.toLowerCase()));
    const external: EmailRecipient[] = externalEmails
      .filter((e) => !userEmails.has(e))
      .map((email) => ({ id: `external:${email}`, email, full_name: null }));

    const recipients = [...users, ...external];
    const subjectPrefix = body.testMode ? '[TEST] ' : '';

    const result = await sendBulkEmails({
      supabase: service,
      template,
      institutionId: auth.institutionId,
      institutionSlug: auth.institutionSlug,
      origin: req.nextUrl.origin,
      recipients,
      customMessage: typeof body.customMessage === 'string' ? body.customMessage : undefined,
      sampleVariables:
        body.sampleVariables && typeof body.sampleVariables === 'object'
          ? body.sampleVariables
          : undefined,
      subjectPrefix,
    });

    console.info('[admin/email/send]', {
      institution: auth.institutionSlug,
      template: template.name,
      by: auth.caller.email,
      test: Boolean(body.testMode),
      sent: result.sent,
      failed: result.failed,
      skipped: result.skipped,
      errors: result.errors,
    });
    return NextResponse.json(result);
  } catch (err) {
    console.error('[admin/email/send]', err);
    return NextResponse.json({ error: 'Failed to send emails' }, { status: 500 });
  }
}
