/**
 * System email rendering — SERVER ONLY (API routes).
 * Loads the institution's editable template from email_templates
 * (migration 041) and falls back to the built-in defaults when the row is
 * missing or unreadable. Branding variables (colors, institution name) are
 * injected automatically by renderStoredEmailTemplate.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { getEmailTemplateBySystemType, type EmailSystemType } from '@/lib/db/email-templates';
import {
  renderStoredEmailTemplate,
  DEFAULT_SYSTEM_TEMPLATES,
  greetingForName,
  escapeHtml,
} from './render';

export interface RenderSystemEmailInput {
  /** Service-role (or admin) client used to read the stored template. */
  supabase: SupabaseClient;
  institutionId: string;
  institutionSlug: string;
  type: EmailSystemType;
  /** Merge-tag values; HTML-escape user-derived strings before passing. */
  variables: Record<string, string>;
}

export async function renderSystemEmail(
  input: RenderSystemEmailInput,
): Promise<{ subject: string; html: string }> {
  let subjectTemplate: string = DEFAULT_SYSTEM_TEMPLATES[input.type].subject_template;
  let bodyHtmlTemplate: string = DEFAULT_SYSTEM_TEMPLATES[input.type].body_html_template;

  try {
    const stored = await getEmailTemplateBySystemType(input.supabase, input.institutionId, input.type);
    if (stored) {
      subjectTemplate = stored.subject_template;
      bodyHtmlTemplate = stored.body_html_template;
    }
  } catch (err) {
    console.warn(`[email] falling back to default ${input.type} template:`, err);
  }

  return renderStoredEmailTemplate({
    institutionSlug: input.institutionSlug,
    subjectTemplate,
    bodyHtmlTemplate,
    variables: input.variables,
  });
}

/** Standard variable set for the certificate template. */
export function certificateEmailVariables(input: {
  recipientName: string | null;
  title: string;
  isProgram: boolean;
  certificateNumber: string;
  verifyUrl: string;
  certificatesUrl: string;
}): Record<string, string> {
  return {
    recipientName: input.recipientName ? escapeHtml(input.recipientName) : '',
    greeting: greetingForName(input.recipientName),
    title: escapeHtml(input.title),
    kind: input.isProgram ? 'program' : 'course',
    certificateNumber: escapeHtml(input.certificateNumber),
    verifyUrl: input.verifyUrl,
    certificatesUrl: input.certificatesUrl,
  };
}

/** Standard variable set for the legacy claim-invite template. */
export function legacyClaimInviteEmailVariables(input: {
  recipientName: string | null;
  recipientEmail: string;
  loginUrl: string;
  /** completed course titles → each becomes a backdated certificate on claim */
  completedCourseTitles: string[];
  cmeRequestWaiting: boolean;
}): Record<string, string> {
  const certCount = input.completedCourseTitles.length;
  let completionSummaryBlock = '';
  if (certCount > 0) {
    const MAX_LISTED = 15;
    const listed = input.completedCourseTitles.slice(0, MAX_LISTED);
    const items = listed
      .map((t) => `<li style="margin:0 0 6px;color:#334155;font-size:14px;line-height:20px;">${escapeHtml(t)}</li>`)
      .join('\n');
    const more = certCount > MAX_LISTED
      ? `<p style="margin:8px 0 0;color:#64748B;font-size:13px;">…and ${certCount - MAX_LISTED} more.</p>`
      : '';
    const cmeNote = input.cmeRequestWaiting
      ? `<p style="margin:12px 0 0;color:#B45309;font-size:13px;line-height:20px;">Your CME certificate request will also be restored and sent to our team for review.</p>`
      : '';
    completionSummaryBlock = `<div style="margin:16px 0;padding:16px 20px;background-color:#F8FAFC;border:1px solid #E2E8F0;border-radius:8px;">
  <p style="margin:0 0 10px;color:#0F172A;font-size:14px;font-weight:bold;">${certCount} certificate${certCount === 1 ? '' : 's'} waiting for you:</p>
  <ul style="margin:0;padding-left:20px;">${items}</ul>${more}${cmeNote}
</div>`;
  }
  return {
    recipientName: input.recipientName ? escapeHtml(input.recipientName) : '',
    greeting: greetingForName(input.recipientName),
    recipientEmail: escapeHtml(input.recipientEmail),
    loginUrl: input.loginUrl,
    completionSummaryBlock,
  };
}

/** Standard variable set for the assignment template. */
export function assignmentEmailVariables(input: {
  recipientName: string | null;
  courseTitle: string;
  courseUrl: string;
  dueDate?: string | null;
}): Record<string, string> {
  const dueDateBlock = input.dueDate
    ? `<p style="margin:0 0 12px;color:#B45309;font-size:14px;line-height:22px;"><strong>Due by:</strong> ${new Date(input.dueDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>`
    : '';
  return {
    recipientName: input.recipientName ? escapeHtml(input.recipientName) : '',
    greeting: greetingForName(input.recipientName),
    courseTitle: escapeHtml(input.courseTitle),
    courseUrl: input.courseUrl,
    dueDateBlock,
  };
}
