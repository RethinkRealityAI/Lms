/**
 * Sender for referral completion notices (migration 076) — SERVER ONLY.
 *
 * The outbox (referral_completion_notices) is filled by a database trigger when
 * an attributed learner earns a program certificate, so capture never depends
 * on a browser staying open. This drains it:
 *   - immediately, from /api/notify/certificate after a program cert is issued
 *     (scoped to that certificate), and
 *   - on a schedule / admin "Send now" via /api/admin/referrals/notices, which
 *     first re-queues anything missed (enqueue_missing_referral_completion_notices).
 *
 * Each row is CLAIMED before sending (claimed_at, guarded so only one caller
 * wins), so the immediate path and the sweep can't double-email a partner.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { sendEmail, isEmailConfigured } from '@/lib/email/mailer';
import { buildCompletionNoticeEmail } from './completion-notices';

/** A claim older than this is assumed abandoned (crashed sender) and retaken. */
const CLAIM_TTL_MS = 10 * 60 * 1000;
/** Give up after this many failed sends; the admin list shows them as failed. */
export const MAX_NOTICE_ATTEMPTS = 5;

export interface FlushResult {
  queued: number;
  sent: number;
  failed: number;
  skipped: number;
  emailConfigured: boolean;
}

interface NoticeRow {
  id: string;
  user_id: string;
  certificate_id: string;
  attempts: number;
  referral_code: { code: string; label: string; completion_notify_emails: string[] } | null;
  institution: { slug: string; name: string } | null;
  program: { title: string } | null;
  certificate: { certificate_number: string | null; issued_at: string; revoked_at: string | null } | null;
  learner: {
    full_name: string | null;
    email: string | null;
    occupation: string | null;
    referral_campaign: string | null;
    created_at: string | null;
  } | null;
}

export async function flushReferralCompletionNotices(
  service: SupabaseClient,
  opts: { certificateId?: string; institutionId?: string; sweep?: boolean } = {},
): Promise<FlushResult> {
  const result: FlushResult = { queued: 0, sent: 0, failed: 0, skipped: 0, emailConfigured: isEmailConfigured() };
  // Without SMTP, leave rows queued (untouched) for when it is configured.
  if (!result.emailConfigured) return result;

  if (opts.sweep) {
    const { data, error } = await service.rpc('enqueue_missing_referral_completion_notices');
    if (error) console.error('[referral-notices] enqueue sweep failed', error);
    else result.queued = Number(data ?? 0);
  }

  let query = service
    .from('referral_completion_notices')
    .select(`
      id, user_id, certificate_id, attempts,
      referral_code:referral_codes!referral_completion_notices_referral_code_id_fkey(code, label, completion_notify_emails),
      institution:institutions!referral_completion_notices_institution_id_fkey(slug, name),
      program:programs!referral_completion_notices_program_id_fkey(title),
      certificate:certificates!referral_completion_notices_certificate_id_fkey(certificate_number, issued_at, revoked_at),
      learner:users!referral_completion_notices_user_id_fkey(full_name, email, occupation, referral_campaign, created_at)
    `)
    .is('sent_at', null)
    .lt('attempts', MAX_NOTICE_ATTEMPTS)
    .order('created_at', { ascending: true })
    .limit(50);
  if (opts.certificateId) query = query.eq('certificate_id', opts.certificateId);
  if (opts.institutionId) query = query.eq('institution_id', opts.institutionId);

  const { data: rows, error } = await query;
  if (error) {
    console.error('[referral-notices] load failed', error);
    return result;
  }

  for (const row of (rows ?? []) as unknown as NoticeRow[]) {
    // Claim: only proceeds if no one else holds a fresh claim on this row.
    const staleBefore = new Date(Date.now() - CLAIM_TTL_MS).toISOString();
    const { data: claimed } = await service
      .from('referral_completion_notices')
      .update({ claimed_at: new Date().toISOString() })
      .eq('id', row.id)
      .is('sent_at', null)
      .or(`claimed_at.is.null,claimed_at.lt.${staleBefore}`)
      .select('id');
    if (!claimed || claimed.length === 0) {
      result.skipped++;
      continue;
    }

    const recipients = row.referral_code?.completion_notify_emails ?? [];
    // Recipients removed, certificate revoked since queueing, or learner has no
    // email: nothing to send. Mark sent_at with an empty recipient list so the
    // row stops being retried, and record why.
    const skipReason =
      recipients.length === 0 ? 'no recipients configured'
      : row.certificate?.revoked_at ? 'certificate revoked'
      : !row.learner?.email ? 'learner has no email'
      : null;
    if (skipReason) {
      await service
        .from('referral_completion_notices')
        .update({ sent_at: new Date().toISOString(), sent_to: [], last_error: `skipped: ${skipReason}`, claimed_at: null })
        .eq('id', row.id);
      result.skipped++;
      continue;
    }

    try {
      const { subject, html, text } = buildCompletionNoticeEmail({
        partnerLabel: row.referral_code!.label,
        referralCode: row.referral_code!.code,
        institutionName: row.institution?.name ?? 'the',
        programTitle: row.program?.title ?? 'program',
        learnerName: row.learner!.full_name,
        learnerEmail: row.learner!.email!,
        profession: row.learner!.occupation,
        campaign: row.learner!.referral_campaign,
        joinedAt: row.learner!.created_at,
        completedAt: row.certificate?.issued_at ?? new Date().toISOString(),
        certificateNumber: row.certificate?.certificate_number ?? null,
      });
      const sent = await sendEmail({
        to: recipients.join(', '),
        subject,
        html,
        text,
        institutionSlug: row.institution?.slug ?? null,
      });
      if (!sent.sent) throw new Error(sent.reason ?? 'not sent');
      await service
        .from('referral_completion_notices')
        .update({ sent_at: new Date().toISOString(), sent_to: recipients, attempts: row.attempts + 1, last_error: null, claimed_at: null })
        .eq('id', row.id);
      result.sent++;
    } catch (err) {
      await service
        .from('referral_completion_notices')
        .update({
          attempts: row.attempts + 1,
          last_error: (err instanceof Error ? err.message : String(err)).slice(0, 500),
          claimed_at: null,
        })
        .eq('id', row.id);
      console.error('[referral-notices] send failed', row.id, err);
      result.failed++;
    }
  }
  return result;
}
