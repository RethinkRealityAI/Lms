import type { SupabaseClient } from '@supabase/supabase-js';
import type { EmailTemplate } from '@/lib/db/email-templates';
import { sendEmail } from './mailer';
import { renderStoredEmailTemplate, greetingForName, escapeHtml } from './render';
import {
  renderSystemEmail,
  certificateEmailVariables,
  assignmentEmailVariables,
  legacyClaimInviteEmailVariables,
} from './system-emails';
import type { EmailSystemType } from '@/lib/db/email-templates';

export const MAX_BULK_RECIPIENTS = 500;

export interface EmailRecipient {
  id: string;
  email: string;
  full_name: string | null;
}

export interface BulkSendOptions {
  supabase: SupabaseClient;
  template: EmailTemplate;
  institutionId: string;
  institutionSlug: string;
  origin: string;
  recipients: EmailRecipient[];
  customMessage?: string;
  sampleVariables?: Record<string, string>;
  subjectPrefix?: string;
}

export interface BulkSendResult {
  sent: number;
  failed: number;
  skipped: number;
  total: number;
  errors: string[];
}

function defaultSampleVariables(
  type: EmailSystemType,
  institutionSlug: string,
  origin: string,
): Record<string, string> {
  const slug = institutionSlug.toUpperCase();
  if (type === 'certificate') {
    return certificateEmailVariables({
      recipientName: 'Sample Learner',
      title: 'Sample Course Title',
      isProgram: false,
      certificateNumber: `${slug}-SAMPLE-00001`,
      verifyUrl: `${origin}/verify/${slug}-SAMPLE-00001`,
      certificatesUrl: `${origin}/${institutionSlug}/student/certificates`,
    });
  }
  if (type === 'legacy_claim_invite') {
    return legacyClaimInviteEmailVariables({
      recipientName: 'Sample Learner',
      recipientEmail: 'sample@example.com',
      loginUrl: `${origin}/${institutionSlug}/login`,
      completedCourseTitles: ['Sample Module 1', 'Sample Module 2'],
      cmeRequestWaiting: false,
    });
  }
  return assignmentEmailVariables({
    recipientName: 'Sample Learner',
    courseTitle: 'Sample Course Title',
    courseUrl: `${origin}/${institutionSlug}/student`,
    dueDate: new Date(Date.now() + 14 * 86400000).toISOString(),
  });
}

export async function renderEmailForRecipient(
  input: Omit<BulkSendOptions, 'recipients'> & { recipient: EmailRecipient },
): Promise<{ subject: string; html: string }> {
  const { template, recipient, institutionId, institutionSlug, origin, customMessage, sampleVariables } =
    input;

  if (template.category === 'system' && template.system_type) {
    const defaults = defaultSampleVariables(template.system_type, institutionSlug, origin);
    const merged = { ...defaults, ...sampleVariables };

    const variables =
      template.system_type === 'certificate'
        ? certificateEmailVariables({
            recipientName: recipient.full_name,
            title: merged.title || 'Sample Course Title',
            isProgram: merged.kind === 'program',
            certificateNumber: merged.certificateNumber || 'SAMPLE-00001',
            verifyUrl: merged.verifyUrl || `${origin}/verify/SAMPLE`,
            certificatesUrl: merged.certificatesUrl || `${origin}/${institutionSlug}/student/certificates`,
          })
        : assignmentEmailVariables({
            recipientName: recipient.full_name,
            courseTitle: merged.courseTitle || 'Sample Course Title',
            courseUrl: merged.courseUrl || `${origin}/${institutionSlug}/student`,
            dueDate: sampleVariables?.dueDate ?? null,
          });

    return renderSystemEmail({
      supabase: input.supabase,
      institutionId,
      institutionSlug,
      type: template.system_type,
      variables,
    });
  }

  const safeMessage = customMessage?.trim()
    ? escapeHtml(customMessage.trim()).replace(/\n/g, '<br/>')
    : '';

  return renderStoredEmailTemplate({
    institutionSlug,
    subjectTemplate: template.subject_template,
    bodyHtmlTemplate: template.body_html_template,
    variables: {
      recipientName: recipient.full_name ? escapeHtml(recipient.full_name) : '',
      greeting: greetingForName(recipient.full_name),
      recipientEmail: escapeHtml(recipient.email),
      customMessage: safeMessage,
    },
  });
}

export async function sendBulkEmails(options: BulkSendOptions): Promise<BulkSendResult> {
  const result: BulkSendResult = {
    sent: 0,
    failed: 0,
    skipped: 0,
    total: options.recipients.length,
    errors: [],
  };

  for (const recipient of options.recipients) {
    if (!recipient.email?.trim()) {
      result.skipped += 1;
      continue;
    }

    try {
      const { subject, html } = await renderEmailForRecipient({
        ...options,
        recipient,
      });
      const finalSubject = options.subjectPrefix ? `${options.subjectPrefix}${subject}` : subject;
      const sendResult = await sendEmail({
        to: recipient.email,
        subject: finalSubject,
        html,
        institutionSlug: options.institutionSlug,
      });
      if (sendResult.sent) {
        result.sent += 1;
      } else {
        result.skipped += 1;
      }
    } catch (err) {
      result.failed += 1;
      const msg = err instanceof Error ? err.message : 'Send failed';
      if (result.errors.length < 5) {
        result.errors.push(`${recipient.email}: ${msg}`);
      }
    }
  }

  return result;
}
