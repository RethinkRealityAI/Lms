import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { sendEmail, isEmailConfigured } from '@/lib/email/mailer';
import { renderSystemEmail, assignmentEmailVariables } from '@/lib/email/system-emails';

/**
 * POST { courseId, userIds, dueDate? } — emails users that a course was
 * assigned to them. Admin only. No-op when SMTP is not configured.
 */
export async function POST(req: NextRequest) {
  try {
    const { courseId, userIds, dueDate } = await req.json();
    if (!courseId || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json({ error: 'courseId and userIds required' }, { status: 400 });
    }
    if (userIds.length > 200) {
      return NextResponse.json({ error: 'Too many recipients in one call (max 200)' }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const service = createServiceClient();
    const { data: caller } = await service
      .from('users').select('role, institution_id').eq('id', user.id).maybeSingle();
    const isAdmin = caller && ['admin', 'platform_admin', 'institution_admin'].includes(caller.role);
    if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { data: course } = await service
      .from('courses')
      .select('id, title, institution_id, institution:institutions!courses_institution_id_fkey(slug)')
      .eq('id', courseId)
      .maybeSingle();
    if (!course) return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    if (caller.role !== 'platform_admin' && course.institution_id !== caller.institution_id) {
      return NextResponse.json({ error: 'Course belongs to another institution' }, { status: 403 });
    }

    if (!isEmailConfigured()) return NextResponse.json({ sent: 0, reason: 'smtp_not_configured' });

    const { data: recipients } = await service
      .from('users')
      .select('id, email, full_name')
      .in('id', userIds)
      .eq('institution_id', course.institution_id);

    const institution = course.institution as unknown as { slug: string } | null;
    const slug = institution?.slug ?? 'gansid';
    const origin = req.nextUrl.origin;
    const courseUrl = `${origin}/${slug}/student/courses/${course.id}`;

    let sent = 0;
    for (const r of recipients ?? []) {
      if (!r.email) continue;
      const { subject, html } = await renderSystemEmail({
        supabase: service,
        institutionId: course.institution_id,
        institutionSlug: slug,
        type: 'assignment',
        variables: assignmentEmailVariables({
          recipientName: r.full_name,
          courseTitle: course.title,
          courseUrl,
          dueDate: dueDate ?? null,
        }),
      });
      try {
        const result = await sendEmail({
          to: r.email,
          subject,
          html,
          institutionSlug: slug,
        });
        if (result.sent) sent++;
      } catch (e) {
        console.error(`[notify/assignment] failed for ${r.email}`, e);
      }
    }
    return NextResponse.json({ sent, total: recipients?.length ?? 0 });
  } catch (err) {
    console.error('[notify/assignment]', err);
    return NextResponse.json({ error: 'Failed to send assignment emails' }, { status: 500 });
  }
}
