import { getInstitutionBranding } from '@/lib/tenant/branding';

/** Escape HTML for merge-tag values injected into templates. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Replace {{key}} placeholders; unknown keys become empty string. */
export function interpolateTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => vars[key] ?? '');
}

export function greetingForName(recipientName: string | null | undefined): string {
  const safe = recipientName?.trim();
  return safe ? `Hi ${escapeHtml(safe)},` : 'Hello,';
}

export function baseEmailLayout(institutionSlug: string, bodyHtml: string): string {
  const branding = getInstitutionBranding(institutionSlug);
  return `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background-color:#F1F5F9;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F1F5F9;padding:24px 0;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
        <tr>
          <td style="background-color:${branding.primaryColor};border-radius:12px 12px 0 0;padding:24px 32px;">
            <span style="color:#FFFFFF;font-size:20px;font-weight:bold;letter-spacing:0.5px;">${escapeHtml(branding.name)} Learning</span>
          </td>
        </tr>
        <tr>
          <td style="background-color:#FFFFFF;padding:32px;">
            ${bodyHtml}
          </td>
        </tr>
        <tr>
          <td style="background-color:#FFFFFF;border-radius:0 0 12px 12px;border-top:1px solid #E2E8F0;padding:20px 32px;">
            <p style="margin:0;color:#94A3B8;font-size:12px;line-height:18px;">
              ${escapeHtml(branding.copyright)}<br/>
              Questions? Contact <a href="mailto:${branding.contactEmail}" style="color:${branding.primaryColor};">${branding.contactEmail}</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export interface RenderStoredTemplateInput {
  institutionSlug: string;
  subjectTemplate: string;
  bodyHtmlTemplate: string;
  variables: Record<string, string>;
  /** When false, bodyHtmlTemplate is treated as a full HTML document. */
  wrapInLayout?: boolean;
}

export function renderStoredEmailTemplate(input: RenderStoredTemplateInput): { subject: string; html: string } {
  const branding = getInstitutionBranding(input.institutionSlug);
  const vars: Record<string, string> = {
    primaryColor: branding.primaryColor,
    buttonColor: branding.secondaryColor,
    institutionName: branding.name,
    ...input.variables,
  };

  const subject = interpolateTemplate(input.subjectTemplate, vars);
  const bodyInner = interpolateTemplate(input.bodyHtmlTemplate, vars);
  const html = input.wrapInLayout === false
    ? bodyInner
    : baseEmailLayout(input.institutionSlug, bodyInner);

  return { subject, html };
}

export const SYSTEM_EMAIL_MERGE_TAGS: Record<string, { label: string; tags: string[] }> = {
  certificate: {
    label: 'Certificate issued',
    tags: [
      'recipientName',
      'greeting',
      'title',
      'kind',
      'certificateNumber',
      'verifyUrl',
      'certificatesUrl',
      'institutionName',
      'primaryColor',
      'buttonColor',
    ],
  },
  assignment: {
    label: 'Course assigned',
    tags: [
      'recipientName',
      'greeting',
      'courseTitle',
      'courseUrl',
      'dueDateBlock',
      'institutionName',
      'primaryColor',
      'buttonColor',
    ],
  },
  custom: {
    label: 'Custom broadcast',
    tags: [
      'recipientName',
      'greeting',
      'recipientEmail',
      'institutionName',
      'primaryColor',
      'buttonColor',
      'customMessage',
    ],
  },
};

export const DEFAULT_SYSTEM_TEMPLATES = {
  certificate: {
    slug: 'certificate',
    name: 'Certificate issued',
    subject_template: 'Your certificate for {{title}}',
    body_html_template: `<h1 style="margin:0 0 16px;color:#0F172A;font-size:22px;">Congratulations! 🎉</h1>
<p style="margin:0 0 12px;color:#334155;font-size:15px;line-height:24px;">{{greeting}}</p>
<p style="margin:0 0 12px;color:#334155;font-size:15px;line-height:24px;">
  You have completed the {{kind}} <strong>{{title}}</strong> and earned your certificate.
</p>
<p style="margin:0 0 4px;color:#64748B;font-size:13px;">Certificate number</p>
<p style="margin:0 0 8px;color:#0F172A;font-size:16px;font-weight:bold;letter-spacing:1px;">{{certificateNumber}}</p>
<p style="margin:24px 0;"><a href="{{certificatesUrl}}" style="display:inline-block;padding:12px 28px;background-color:{{buttonColor}};color:#FFFFFF;font-size:14px;font-weight:bold;text-decoration:none;border-radius:8px;">View your certificate</a></p>
<p style="margin:0;color:#94A3B8;font-size:12px;line-height:18px;">
  Anyone can verify this certificate at <a href="{{verifyUrl}}" style="color:{{primaryColor}};">{{verifyUrl}}</a>
</p>`,
  },
  assignment: {
    slug: 'assignment',
    name: 'Course assigned',
    subject_template: 'New course assigned: {{courseTitle}}',
    body_html_template: `<h1 style="margin:0 0 16px;color:#0F172A;font-size:22px;">A course has been assigned to you</h1>
<p style="margin:0 0 12px;color:#334155;font-size:15px;line-height:24px;">{{greeting}}</p>
<p style="margin:0 0 12px;color:#334155;font-size:15px;line-height:24px;">
  <strong>{{courseTitle}}</strong> is now available in your {{institutionName}} learning portal.
</p>
{{dueDateBlock}}
<p style="margin:24px 0;"><a href="{{courseUrl}}" style="display:inline-block;padding:12px 28px;background-color:{{buttonColor}};color:#FFFFFF;font-size:14px;font-weight:bold;text-decoration:none;border-radius:8px;">Start learning</a></p>`,
  },
} as const;
