import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { getEmailTemplateById } from '@/lib/db/email-templates';
import { getGroupMemberUserIds } from '@/lib/db/course-assignments';
import { authorizeTenantAdmin } from '@/lib/email/admin-auth';
import { isEmailConfigured } from '@/lib/email/mailer';
import { MAX_BULK_RECIPIENTS, sendBulkEmails, type EmailRecipient } from '@/lib/email/bulk-send';

/**
 * POST {
 *   templateId,
 *   userIds?: string[],
 *   groupIds?: string[],
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

    if (userIds.length === 0 && groupIds.length === 0) {
      return NextResponse.json({ error: 'Select at least one recipient or group' }, { status: 400 });
    }

    const service = createServiceClient();
    const template = await getEmailTemplateById(service, templateId);
    if (!template || template.institution_id !== auth.institutionId) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    const groupMemberIds = groupIds.length > 0 ? await getGroupMemberUserIds(service, groupIds) : [];
    const allUserIds = [...new Set([...userIds, ...groupMemberIds])];

    if (allUserIds.length > MAX_BULK_RECIPIENTS) {
      return NextResponse.json(
        { error: `Too many recipients (max ${MAX_BULK_RECIPIENTS})` },
        { status: 400 },
      );
    }

    const { data: users, error: usersError } = await service
      .from('users')
      .select('id, email, full_name')
      .in('id', allUserIds)
      .eq('institution_id', auth.institutionId)
      .eq('is_active', true);

    if (usersError) throw usersError;

    const recipients = (users ?? []) as EmailRecipient[];
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

    return NextResponse.json(result);
  } catch (err) {
    console.error('[admin/email/send]', err);
    return NextResponse.json({ error: 'Failed to send emails' }, { status: 500 });
  }
}
