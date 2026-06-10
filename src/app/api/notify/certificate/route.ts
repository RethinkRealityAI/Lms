import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { sendEmail, isEmailConfigured } from '@/lib/email/mailer';
import { renderSystemEmail, certificateEmailVariables } from '@/lib/email/system-emails';

/**
 * POST { certificateId } — emails the certificate owner.
 * Allowed callers: the certificate owner, or an admin.
 * No-op (200, sent:false) when SMTP is not configured.
 */
export async function POST(req: NextRequest) {
  try {
    const { certificateId } = await req.json();
    if (!certificateId) {
      return NextResponse.json({ error: 'certificateId required' }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    if (!isEmailConfigured()) return NextResponse.json({ sent: false, reason: 'smtp_not_configured' });

    const service = createServiceClient();
    const { data: cert } = await service
      .from('certificates')
      .select(`
        id, user_id, certificate_number, revoked_at, institution_id,
        course:courses!certificates_course_id_fkey(title),
        program:programs!certificates_program_id_fkey(title),
        owner:users!certificates_user_id_fkey(email, full_name, institution_id),
        institution:institutions!certificates_institution_id_fkey(slug)
      `)
      .eq('id', certificateId)
      .maybeSingle();

    if (!cert) return NextResponse.json({ error: 'Certificate not found' }, { status: 404 });
    if (cert.revoked_at) return NextResponse.json({ error: 'Certificate is revoked' }, { status: 409 });

    // owner, or an admin of the certificate's institution (platform_admin exempt)
    if (cert.user_id !== user.id) {
      const { data: caller } = await service
        .from('users').select('role, institution_id').eq('id', user.id).maybeSingle();
      const isAdmin = caller && ['admin', 'platform_admin', 'institution_admin'].includes(caller.role);
      if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      if (caller.role !== 'platform_admin' && caller.institution_id !== cert.institution_id) {
        return NextResponse.json({ error: 'Certificate belongs to another institution' }, { status: 403 });
      }
    }

    const owner = cert.owner as unknown as { email: string; full_name: string | null } | null;
    const institution = cert.institution as unknown as { slug: string } | null;
    const course = cert.course as unknown as { title: string } | null;
    const program = cert.program as unknown as { title: string } | null;
    if (!owner?.email) return NextResponse.json({ error: 'Recipient has no email' }, { status: 422 });

    const slug = institution?.slug ?? 'gansid';
    const origin = req.nextUrl.origin;
    const { subject, html } = await renderSystemEmail({
      supabase: service,
      institutionId: cert.institution_id,
      institutionSlug: slug,
      type: 'certificate',
      variables: certificateEmailVariables({
        recipientName: owner.full_name,
        title: course?.title ?? program?.title ?? 'Certificate of Achievement',
        isProgram: Boolean(program && !course),
        certificateNumber: cert.certificate_number ?? '',
        verifyUrl: `${origin}/verify/${cert.certificate_number}`,
        certificatesUrl: `${origin}/${slug}/student/certificates`,
      }),
    });

    const result = await sendEmail({
      to: owner.email,
      subject,
      html,
      institutionSlug: slug,
    });
    return NextResponse.json(result);
  } catch (err) {
    console.error('[notify/certificate]', err);
    return NextResponse.json({ error: 'Failed to send certificate email' }, { status: 500 });
  }
}
