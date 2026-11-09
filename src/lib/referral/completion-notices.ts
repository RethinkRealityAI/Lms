/**
 * Referral completion notices (migration 076) — shared, client-safe helpers.
 *
 * When a learner who signed up through a referral link earns the PROGRAM
 * certificate, the contacts listed on that link (referral_codes.
 * completion_notify_emails) are emailed the learner's details so the partner
 * can send a thank-you gift. Identifiable details travel ONLY by this email and
 * the admin-only learner list — never through the public /report/<token> page
 * (rule 28).
 *
 * Pure functions only: the sender lives in completion-notices.server.ts.
 */

/** Mirrors the DB CHECK on referral_codes.completion_notify_emails. */
export const REFERRAL_NOTIFY_MAX = 10;

// Same shape the DB's emails_are_valid() accepts: no spaces, separators or
// angle brackets, exactly one @, a dot in the domain.
const EMAIL_RE = /^[^@\s<>,;]+@[^@\s<>,;]+\.[^@\s<>,;]+$/;

export function isValidNotifyEmail(email: string): boolean {
  return EMAIL_RE.test(email);
}

/**
 * Split an admin-typed recipient list (commas, semicolons, spaces or new lines)
 * into lowercased, de-duplicated addresses, reporting anything invalid instead
 * of silently dropping it.
 */
export function parseNotifyEmails(input: string): { emails: string[]; invalid: string[] } {
  const parts = input
    .split(/[\s,;]+/)
    .map((p) => p.trim().toLowerCase())
    .filter(Boolean);
  const emails: string[] = [];
  const invalid: string[] = [];
  for (const p of parts) {
    if (!isValidNotifyEmail(p)) invalid.push(p);
    else if (!emails.includes(p)) emails.push(p);
  }
  return { emails, invalid };
}

export type NoticeStatus = 'sent' | 'pending' | 'failed' | 'not_queued' | 'not_eligible';

export const NOTICE_STATUS_LABEL: Record<NoticeStatus, string> = {
  sent: 'Emailed',
  pending: 'Email queued',
  failed: 'Email failed — will retry',
  not_queued: 'Not emailed yet',
  not_eligible: 'In progress',
};

export interface ReferralLearnerRow {
  user_id: string;
  full_name: string | null;
  email: string | null;
  profession: string | null;
  campaign: string | null;
  joined_at: string;
  modules_completed: number;
  modules_total: number;
  program_completed_at: string | null;
  certificate_number: string | null;
  notice_status: NoticeStatus;
  notice_sent_at: string | null;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'America/Toronto' });
}

export interface CompletionNoticeInput {
  partnerLabel: string;
  referralCode: string;
  institutionName: string;
  programTitle: string;
  learnerName: string | null;
  learnerEmail: string;
  profession: string | null;
  campaign: string | null;
  joinedAt: string | null;
  completedAt: string;
  certificateNumber: string | null;
}

/** The email sent to a referral link's contacts when one of its learners completes. */
export function buildCompletionNoticeEmail(n: CompletionNoticeInput): {
  subject: string;
  html: string;
  text: string;
} {
  const name = n.learnerName?.trim() || n.learnerEmail;
  const subject = `Program completed: ${name} (${n.partnerLabel} referral)`;
  const rows: Array<[string, string]> = [
    ['Name', n.learnerName?.trim() || '—'],
    ['Email', n.learnerEmail],
    ['Profession', n.profession?.trim() || '—'],
    ['Completed', formatDate(n.completedAt)],
    ['Certificate number', n.certificateNumber || '—'],
    ['Signed up', formatDate(n.joinedAt)],
    ['Link tag', n.campaign ? `?s=${n.campaign}` : 'none (untagged link)'],
  ];

  const intro =
    `A learner who signed up through your referral link (${n.referralCode}) has completed ` +
    `the full ${n.programTitle} on ${n.institutionName} Learning.`;
  const privacy =
    'This email contains personal information shared for the referral thank-you program. ' +
    'Please use it only for that purpose and do not forward it further.';

  const html = `<!doctype html><html><body style="margin:0;padding:24px;background:#f8fafc;font-family:Arial,Helvetica,sans-serif;color:#0f172a">
<div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;padding:24px">
<p style="margin:0 0 4px;font-size:12px;font-weight:bold;letter-spacing:.08em;text-transform:uppercase;color:#64748b">${escapeHtml(n.partnerLabel)} referral</p>
<h1 style="margin:0 0 12px;font-size:20px">Program completed: ${escapeHtml(name)}</h1>
<p style="margin:0 0 16px;line-height:1.5">${escapeHtml(intro)}</p>
<table style="width:100%;border-collapse:collapse;font-size:14px">${rows
    .map(
      ([k, v]) =>
        `<tr><td style="padding:8px 12px 8px 0;border-top:1px solid #f1f5f9;color:#64748b;white-space:nowrap;vertical-align:top">${escapeHtml(k)}</td><td style="padding:8px 0;border-top:1px solid #f1f5f9;font-weight:bold">${escapeHtml(v)}</td></tr>`,
    )
    .join('')}</table>
<p style="margin:16px 0 0;font-size:12px;line-height:1.5;color:#64748b">${escapeHtml(privacy)}</p>
</div></body></html>`;

  const text = [
    `${n.partnerLabel} referral — program completed`,
    '',
    intro,
    '',
    ...rows.map(([k, v]) => `${k}: ${v}`),
    '',
    privacy,
  ].join('\n');

  return { subject, html, text };
}

function csvCell(v: string | number | null | undefined): string {
  const s = v == null ? '' : String(v);
  // Neutralise spreadsheet formula injection (a learner controls their own name).
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

/** CSV of a referral link's learners for the admin "Download CSV" button. */
export function referralLearnersCsv(rows: ReferralLearnerRow[]): string {
  const header = [
    'Name',
    'Email',
    'Profession',
    'Link tag',
    'Signed up',
    'Modules completed',
    'Modules total',
    'Program completed',
    'Certificate number',
    'Notification',
    'Notification sent',
  ];
  const lines = rows.map((r) =>
    [
      r.full_name,
      r.email,
      r.profession,
      r.campaign,
      r.joined_at ? r.joined_at.slice(0, 10) : '',
      r.modules_completed,
      r.modules_total,
      r.program_completed_at ? r.program_completed_at.slice(0, 10) : '',
      r.certificate_number,
      NOTICE_STATUS_LABEL[r.notice_status] ?? r.notice_status,
      r.notice_sent_at ? r.notice_sent_at.slice(0, 10) : '',
    ]
      .map(csvCell)
      .join(','),
  );
  return [header.join(','), ...lines].join('\r\n');
}
