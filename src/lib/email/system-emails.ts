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
