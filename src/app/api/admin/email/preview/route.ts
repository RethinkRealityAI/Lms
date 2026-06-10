import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { getEmailTemplateById } from '@/lib/db/email-templates';
import { authorizeTenantAdmin } from '@/lib/email/admin-auth';
import { renderEmailForRecipient } from '@/lib/email/bulk-send';

/** POST { templateId, previewName?, customMessage?, sampleVariables? } */
export async function POST(req: NextRequest) {
  try {
    const auth = await authorizeTenantAdmin();
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const body = await req.json();
    const templateId = body.templateId as string;
    if (!templateId) {
      return NextResponse.json({ error: 'templateId required' }, { status: 400 });
    }

    const service = createServiceClient();
    const template = await getEmailTemplateById(service, templateId);
    if (!template || template.institution_id !== auth.institutionId) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    const previewName = typeof body.previewName === 'string' ? body.previewName : 'Preview User';
    const previewEmail = auth.caller.email ?? 'preview@example.com';

    const { subject, html } = await renderEmailForRecipient({
      supabase: service,
      template,
      institutionId: auth.institutionId,
      institutionSlug: auth.institutionSlug,
      origin: req.nextUrl.origin,
      recipient: { id: auth.caller.id, email: previewEmail, full_name: previewName },
      customMessage: typeof body.customMessage === 'string' ? body.customMessage : undefined,
      sampleVariables:
        body.sampleVariables && typeof body.sampleVariables === 'object'
          ? body.sampleVariables
          : undefined,
    });

    return NextResponse.json({ subject, html });
  } catch (err) {
    console.error('[admin/email/preview]', err);
    return NextResponse.json({ error: 'Failed to render preview' }, { status: 500 });
  }
}
