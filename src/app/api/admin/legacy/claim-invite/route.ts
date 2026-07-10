/**
 * POST /api/admin/legacy/claim-invite — send "your certificates are waiting"
 * claim-invite emails to unclaimed legacy (EdApp) users.
 *
 * Unlike /api/admin/users/invite (Supabase auth invite → token signup), this
 * deliberately does NOT pre-create an auth user: the recipient signs up
 * normally with the same email address and the signup trigger auto-claims
 * their legacy profile, which materializes progress + backdated certificates
 * (migration 043/047). Pre-creating the auth user would break that flow.
 *
 * Body: { legacyUserIds: string[] } (max 200 per call)
 * Sends the institution's editable 'legacy_claim_invite' template with the
 * per-user completion summary, then stamps legacy_users.invited_at.
 */
import { NextRequest, NextResponse } from 'next/server';
import { authorizeTenantAdmin } from '@/lib/email/admin-auth';
import { createServiceClient } from '@/lib/supabase/service';
import { sendEmail, isEmailConfigured } from '@/lib/email/mailer';
import { renderSystemEmail, legacyClaimInviteEmailVariables } from '@/lib/email/system-emails';

const MAX_BATCH = 200;

interface CompletionRow {
  legacy_user_id: string;
  course_id: string | null;
  course_title: string | null;
  completed_at: string | null;
  progress_percent: number | null;
}

const isCompleted = (r: CompletionRow) =>
  r.completed_at != null || (r.progress_percent ?? 0) >= 95;

export async function POST(request: NextRequest) {
  const auth = await authorizeTenantAdmin();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  if (!isEmailConfigured()) {
    return NextResponse.json(
      { error: 'Email (SMTP) is not configured — claim invites cannot be sent.' },
      { status: 503 },
    );
  }

  let legacyUserIds: string[];
  try {
    const body = await request.json();
    legacyUserIds = Array.isArray(body?.legacyUserIds) ? body.legacyUserIds : [];
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  if (legacyUserIds.length === 0) {
    return NextResponse.json({ error: 'legacyUserIds is required' }, { status: 400 });
  }
  if (legacyUserIds.length > MAX_BATCH) {
    return NextResponse.json(
      { error: `At most ${MAX_BATCH} invites per request` },
      { status: 400 },
    );
  }

  const service = createServiceClient();

  // Only unclaimed legacy users belonging to the caller's tenant.
  const { data: legacyUsers, error: luErr } = await service
    .from('legacy_users')
    .select('id, email, full_name, first_name, linked_user_id')
    .eq('institution_id', auth.institutionId)
    .in('id', legacyUserIds)
    .is('linked_user_id', null);
  if (luErr) {
    return NextResponse.json({ error: luErr.message }, { status: 500 });
  }

  const { data: completionRows } = await service
    .from('legacy_course_completions')
    .select('legacy_user_id, course_id, course_title, completed_at, progress_percent')
    .eq('institution_id', auth.institutionId)
    .in('legacy_user_id', (legacyUsers ?? []).map((u) => u.id));

  const rowsByUser = new Map<string, CompletionRow[]>();
  for (const row of (completionRows ?? []) as CompletionRow[]) {
    const list = rowsByUser.get(row.legacy_user_id) ?? [];
    list.push(row);
    rowsByUser.set(row.legacy_user_id, list);
  }

  const origin = request.nextUrl.origin;
  const loginUrl = `${origin}/${auth.institutionSlug}/login`;

  let sent = 0;
  let failed = 0;
  const skipped = legacyUserIds.length - (legacyUsers?.length ?? 0);

  for (const user of legacyUsers ?? []) {
    const rows = rowsByUser.get(user.id) ?? [];
    const completedCourseTitles = rows
      .filter((r) => r.course_id && isCompleted(r))
      .map((r) => r.course_title ?? 'Course')
      .sort();
    const cmeRequestWaiting = rows.some((r) => !r.course_id && isCompleted(r));

    try {
      const { subject, html } = await renderSystemEmail({
        supabase: service,
        institutionId: auth.institutionId,
        institutionSlug: auth.institutionSlug,
        type: 'legacy_claim_invite',
        variables: legacyClaimInviteEmailVariables({
          recipientName: user.full_name || user.first_name || null,
          recipientEmail: user.email,
          loginUrl,
          completedCourseTitles,
          cmeRequestWaiting,
        }),
      });

      const result = await sendEmail({
        to: user.email,
        subject,
        html,
        institutionSlug: auth.institutionSlug,
      });
      if (!result.sent) {
        failed++;
        continue;
      }
      sent++;
      await service
        .from('legacy_users')
        .update({ invited_at: new Date().toISOString() })
        .eq('id', user.id);
    } catch (err) {
      console.error(`[claim-invite] failed for ${user.email}:`, err);
      failed++;
    }
  }

  return NextResponse.json({ sent, failed, skipped });
}
