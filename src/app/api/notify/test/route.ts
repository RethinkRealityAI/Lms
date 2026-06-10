import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { sendEmail, isEmailConfigured, resolveEmailFrom } from '@/lib/email/mailer';
import { renderSystemEmail, certificateEmailVariables, assignmentEmailVariables } from '@/lib/email/system-emails';
import { getTenantContext } from '@/lib/tenant/server';

export type AutomatedEmailType = 'certificate' | 'assignment';

interface Caller {
  role: string;
  email: string | null;
  full_name: string | null;
  institution_id: string | null;
}

/**
 * Resolves + authorizes the caller for the current tenant.
 * Non-platform admins must belong to the tenant in the URL — prevents a
 * cross-tenant admin from exercising another institution's email identity.
 */
async function authorizeTenantAdmin(): Promise<
  | { ok: true; caller: Caller; institutionSlug: string; institutionId: string | null }
  | { ok: false; status: number; error: string }
> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, status: 401, error: 'Not authenticated' };

  const service = createServiceClient();
  const { data: caller } = await service
    .from('users')
    .select('role, email, full_name, institution_id')
    .eq('id', user.id)
    .maybeSingle();
  const isAdmin = caller && ['admin', 'platform_admin', 'institution_admin'].includes(caller.role);
  if (!isAdmin) return { ok: false, status: 403, error: 'Forbidden' };

  const { institutionSlug, institutionId } = await getTenantContext();
  const slug = institutionSlug ?? 'gansid';
  if (caller.role !== 'platform_admin' && institutionId && caller.institution_id !== institutionId) {
    return { ok: false, status: 403, error: 'You can only test emails for your own institution' };
  }
  return { ok: true, caller: caller as Caller, institutionSlug: slug, institutionId: institutionId ?? caller.institution_id };
}

/** GET — SMTP status for the current tenant (tenant admin only). */
export async function GET() {
  try {
    const auth = await authorizeTenantAdmin();
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

    return NextResponse.json({
      configured: isEmailConfigured(),
      institutionSlug: auth.institutionSlug,
      from: resolveEmailFrom(auth.institutionSlug) ?? null,
      templates: ['certificate', 'assignment'] as AutomatedEmailType[],
    });
  } catch (err) {
    console.error('[notify/test GET]', err);
    return NextResponse.json({ error: 'Failed to read email status' }, { status: 500 });
  }
}

/**
 * POST { type: 'certificate' | 'assignment', to? } — send a sample email.
 * Recipient is locked to the caller's own account email; only platform_admin
 * may direct the test to a different address. This is deliberately NOT an
 * email relay.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const type = body.type as AutomatedEmailType;
    if (type !== 'certificate' && type !== 'assignment') {
      return NextResponse.json({ error: 'type must be certificate or assignment' }, { status: 400 });
    }

    const auth = await authorizeTenantAdmin();
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
    const { caller, institutionSlug: slug, institutionId } = auth;

    if (!isEmailConfigured()) {
      return NextResponse.json({ sent: false, reason: 'smtp_not_configured' });
    }

    const requestedTo = typeof body.to === 'string' ? body.to.trim() : '';
    const to = caller.role === 'platform_admin' && requestedTo ? requestedTo : caller.email;
    if (!to) {
      return NextResponse.json({ error: 'Your account has no email address' }, { status: 422 });
    }
    if (requestedTo && to !== requestedTo) {
      // non-platform admin asked for a custom recipient — honour the safe one, tell them
      console.warn(`[notify/test] recipient override ignored for ${caller.email}`);
    }

    const origin = req.nextUrl.origin;
    const service = createServiceClient();

    const variables =
      type === 'certificate'
        ? certificateEmailVariables({
            recipientName: caller.full_name ?? 'Test Recipient',
            title: 'Sample Course Title',
            isProgram: false,
            certificateNumber: `${slug.toUpperCase()}-TEST-00001`,
            verifyUrl: `${origin}/verify/${slug.toUpperCase()}-TEST-00001`,
            certificatesUrl: `${origin}/${slug}/student/certificates`,
          })
        : assignmentEmailVariables({
            recipientName: caller.full_name ?? 'Test Recipient',
            courseTitle: 'Sample Course Title',
            courseUrl: `${origin}/${slug}/student`,
            dueDate: new Date(Date.now() + 14 * 86400000).toISOString(),
          });

    const rendered = institutionId
      ? await renderSystemEmail({ supabase: service, institutionId, institutionSlug: slug, type, variables })
      : await renderSystemEmail({ supabase: service, institutionId: '', institutionSlug: slug, type, variables });

    const subject = `[TEST] ${rendered.subject}`;
    const result = await sendEmail({ to, subject, html: rendered.html, institutionSlug: slug });
    return NextResponse.json({ ...result, to, from: resolveEmailFrom(slug) ?? null, type, subject });
  } catch (err) {
    console.error('[notify/test POST]', err);
    return NextResponse.json({ error: 'Failed to send test email' }, { status: 500 });
  }
}
