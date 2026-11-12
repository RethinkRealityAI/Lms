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

/**
 * Shared shell for every platform email (certificates, assignments, custom
 * broadcasts). Matches the Supabase auth email templates: brand stripe, real
 * logo + platform title, flat colours. Table-based with inline styles so it
 * renders in Gmail/Outlook; the <style> block only stacks the header on phones.
 */
export function baseEmailLayout(institutionSlug: string, bodyHtml: string): string {
  const branding = getInstitutionBranding(institutionSlug);
  const font = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
  const logoWidth = Math.min(180, branding.logoDimensions.width);
  const logoHeight = Math.round((logoWidth * branding.logoDimensions.height) / branding.logoDimensions.width);
  const bar = branding.emailBrandBar
    .map(([color, pct]) => `<td width="${pct}%" height="6" style="height:6px;line-height:6px;font-size:0;background-color:${color};">&nbsp;</td>`)
    .join('');
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<style>@media only screen and (max-width:480px){.hdr-logo,.hdr-title{display:block!important;width:100%!important;text-align:left!important;}.hdr-logo{padding:0 0 14px 0!important;}.hdr-title{border-left:0!important;border-top:1px solid #eef2f6!important;padding:14px 0 0 0!important;}}</style>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:${font};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f1f5f9" style="background-color:#f1f5f9;">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:560px;background-color:#ffffff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
  <tr><td style="padding:0;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>${bar}</tr></table></td></tr>
  <tr><td style="padding:24px 40px 22px;border-bottom:1px solid #eef2f6;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
      <td class="hdr-logo" valign="middle" style="padding-right:16px;"><img src="${branding.logoUrl}" width="${logoWidth}" height="${logoHeight}" alt="${escapeHtml(branding.fullName)}" style="display:block;border:0;outline:none;width:${logoWidth}px;height:auto;"></td>
      <td class="hdr-title" valign="middle" align="right" style="font-family:${font};border-left:1px solid #e2e8f0;padding-left:16px;">
        <p style="margin:0 0 2px;font-size:11px;line-height:14px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;white-space:nowrap;color:${branding.primaryColor};">E-Learning Platform</p>
        <p style="margin:0;font-size:16px;line-height:21px;font-weight:700;color:#0f172a;">${escapeHtml(branding.emailHeaderTitle)}</p>
      </td>
    </tr></table>
  </td></tr>
  <tr><td style="padding:32px 40px 24px;font-family:${font};font-size:16px;line-height:26px;color:#334155;">
${bodyHtml}
  </td></tr>
  <tr><td style="padding:24px 40px 28px;background-color:#f8fafc;border-top:1px solid #eef2f6;font-family:${font};">
    <p style="margin:0 0 6px;font-size:13px;line-height:20px;color:#475569;">Questions? Email <a href="mailto:${branding.contactEmail}" style="color:${branding.primaryColor};text-decoration:none;font-weight:600;">${branding.contactEmail}</a></p>
    <p style="margin:0;font-size:12px;line-height:18px;color:#94a3b8;">${escapeHtml(branding.copyright)}</p>
  </td></tr>
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
    buttonColor: branding.primaryColor,
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
  legacy_claim_invite: {
    label: 'Legacy claim invite',
    tags: [
      'recipientName',
      'greeting',
      'recipientEmail',
      'completionSummaryBlock',
      'loginUrl',
      'institutionName',
      'primaryColor',
      'buttonColor',
    ],
  },
  referral_link: {
    label: 'Ambassador referral link',
    tags: [
      'recipientName',
      'greeting',
      'referralLabel',
      'referralUrl',
      'reportUrl',
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
  // Fallback for the stored 'legacy_claim_invite' template (seeded in migration 047).
  legacy_claim_invite: {
    slug: 'legacy_claim_invite',
    name: 'Legacy claim invite',
    subject_template: 'Your {{institutionName}} certificates are waiting',
    body_html_template: `<h1 style="margin:0 0 16px;color:#0F172A;font-size:22px;">Your learning history moved with us</h1>
<p style="margin:0 0 12px;color:#334155;font-size:15px;line-height:24px;">{{greeting}}</p>
<p style="margin:0 0 12px;color:#334155;font-size:15px;line-height:24px;">
  You completed courses on our previous learning platform (EdApp). We've moved to a new home — and your history came with us.
</p>
{{completionSummaryBlock}}
<p style="margin:0 0 12px;color:#334155;font-size:15px;line-height:24px;">
  Create your account using this email address (<strong>{{recipientEmail}}</strong>) and your completed courses, progress, and certificates will be restored automatically — backdated to when you originally earned them.
</p>
<p style="margin:24px 0;"><a href="{{loginUrl}}" style="display:inline-block;padding:12px 28px;background-color:{{buttonColor}};color:#FFFFFF;font-size:14px;font-weight:bold;text-decoration:none;border-radius:8px;">Claim my account</a></p>`,
  },
  // Fallback for the stored 'referral_link' template (seeded in migration 068).
  referral_link: {
    slug: 'referral_link',
    name: 'Ambassador referral link',
    subject_template: 'Your {{institutionName}} outreach link for {{referralLabel}}',
    body_html_template: `<h1 style="margin:0 0 16px;color:#0F172A;font-size:22px;">Your outreach link is ready</h1>
<p style="margin:0 0 12px;color:#334155;font-size:15px;line-height:24px;">{{greeting}}</p>
<p style="margin:0 0 12px;color:#334155;font-size:15px;line-height:24px;">
  Here is your tracked link for <strong>{{referralLabel}}</strong>. Share it in emails, on your website, in presentations, or as a QR code on printed material.
</p>
<p style="margin:0 0 4px;color:#64748B;font-size:13px;">Your link</p>
<p style="margin:0 0 20px;"><a href="{{referralUrl}}" style="color:{{primaryColor}};font-size:16px;font-weight:bold;word-break:break-all;">{{referralUrl}}</a></p>
<p style="margin:0 0 12px;color:#334155;font-size:15px;line-height:24px;">
  Anyone who signs up after opening it is counted toward your outreach, and you can watch the results on your own live dashboard.
</p>
<p style="margin:24px 0;"><a href="{{reportUrl}}" style="display:inline-block;padding:12px 28px;background-color:{{buttonColor}};color:#FFFFFF;font-size:14px;font-weight:bold;text-decoration:none;border-radius:8px;">Open my dashboard</a></p>
<p style="margin:0;color:#94A3B8;font-size:12px;line-height:18px;">
  The dashboard shows anonymised totals only — never the names or contact details of individual learners.
</p>`,
  },
} as const;
