import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { sendEmail, isEmailConfigured, resolveEmailFrom } from '@/lib/email/mailer';
import { certificateIssuedEmail, courseAssignedEmail } from '@/lib/email/templates';
import { getTenantContext } from '@/lib/tenant/server';

export type AutomatedEmailType = 'certificate' | 'assignment';

/**
 * GET — SMTP status for the current tenant (admin only).
 * POST { type: 'certificate' | 'assignment', to? } — send a sample automated email.
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const service = createServiceClient();
    const { data: caller } = await service
      .from('users')
      .select('role, email')
      .eq('id', user.id)
      .maybeSingle();
    const isAdmin = caller && ['admin', 'platform_admin', 'institution_admin'].includes(caller.role);
    if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { institutionSlug } = await getTenantContext();
    const slug = institutionSlug ?? 'gansid';

    return NextResponse.json({
      configured: isEmailConfigured(),
      institutionSlug: slug,
      from: resolveEmailFrom(slug) ?? null,
      templates: ['certificate', 'assignment'] as AutomatedEmailType[],
    });
  } catch (err) {
    console.error('[notify/test GET]', err);
    return NextResponse.json({ error: 'Failed to read email status' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const type = body.type as AutomatedEmailType;
    if (type !== 'certificate' && type !== 'assignment') {
      return NextResponse.json({ error: 'type must be certificate or assignment' }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const service = createServiceClient();
    const { data: caller } = await service
      .from('users')
      .select('role, email, full_name, institution_id')
      .eq('id', user.id)
      .maybeSingle();
    const isAdmin = caller && ['admin', 'platform_admin', 'institution_admin'].includes(caller.role);
    if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    if (!isEmailConfigured()) {
      return NextResponse.json({ sent: false, reason: 'smtp_not_configured' });
    }

    const { institutionSlug } = await getTenantContext();
    const slug = institutionSlug ?? 'gansid';
    const to = typeof body.to === 'string' && body.to.trim() ? body.to.trim() : caller?.email;
    if (!to) {
      return NextResponse.json({ error: 'No recipient — add to or ensure your account has an email' }, { status: 422 });
    }

    const origin = req.nextUrl.origin;
    const from = resolveEmailFrom(slug);

    let subject: string;
    let html: string;

    if (type === 'certificate') {
      const sample = certificateIssuedEmail({
        institutionSlug: slug,
        recipientName: caller?.full_name ?? 'Test Recipient',
        title: 'Sample Course Title',
        isProgram: false,
        certificateNumber: `${slug.toUpperCase()}-TEST-00001`,
        verifyUrl: `${origin}/verify/${slug.toUpperCase()}-TEST-00001`,
        certificatesUrl: `${origin}/${slug}/student/certificates`,
      });
      subject = `[TEST] ${sample.subject}`;
      html = sample.html;
    } else {
      const sample = courseAssignedEmail({
        institutionSlug: slug,
        recipientName: caller?.full_name ?? 'Test Recipient',
        courseTitle: 'Sample Course Title',
        courseUrl: `${origin}/${slug}/student`,
        dueDate: new Date(Date.now() + 14 * 86400000).toISOString(),
      });
      subject = `[TEST] ${sample.subject}`;
      html = sample.html;
    }

    const result = await sendEmail({ to, subject, html, institutionSlug: slug });
    return NextResponse.json({ ...result, to, from, type, subject });
  } catch (err) {
    console.error('[notify/test POST]', err);
    return NextResponse.json({ error: 'Failed to send test email' }, { status: 500 });
  }
}
