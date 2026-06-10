/**
 * Institution-branded HTML email templates.
 * Branding (colors, names, contact email, logo) comes from
 * src/lib/tenant/branding.ts; an unknown slug falls back to a neutral
 * e-learning look via getInstitutionBranding's default handling.
 * Tables + inline styles only — email clients ignore stylesheets.
 */
import { getInstitutionBranding, type InstitutionBranding } from '@/lib/tenant/branding';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function baseLayout(branding: InstitutionBranding, bodyHtml: string): string {
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

function button(branding: InstitutionBranding, label: string, url: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;">
    <tr><td style="background-color:${branding.secondaryColor};border-radius:8px;">
      <a href="${url}" style="display:inline-block;padding:12px 28px;color:#FFFFFF;font-size:14px;font-weight:bold;text-decoration:none;">${escapeHtml(label)}</a>
    </td></tr>
  </table>`;
}

export interface CertificateEmailInput {
  institutionSlug: string;
  recipientName: string | null;
  title: string; // course or program title
  isProgram: boolean;
  certificateNumber: string;
  verifyUrl: string;
  certificatesUrl: string;
}

export function certificateIssuedEmail(input: CertificateEmailInput): { subject: string; html: string } {
  const branding = getInstitutionBranding(input.institutionSlug);
  const greeting = input.recipientName ? `Hi ${escapeHtml(input.recipientName)},` : 'Hello,';
  const kind = input.isProgram ? 'program' : 'course';
  const subject = `Your certificate for ${input.title}`;
  const body = `
    <h1 style="margin:0 0 16px;color:#0F172A;font-size:22px;">Congratulations! 🎉</h1>
    <p style="margin:0 0 12px;color:#334155;font-size:15px;line-height:24px;">${greeting}</p>
    <p style="margin:0 0 12px;color:#334155;font-size:15px;line-height:24px;">
      You have completed the ${kind} <strong>${escapeHtml(input.title)}</strong> and earned your certificate.
    </p>
    <p style="margin:0 0 4px;color:#64748B;font-size:13px;">Certificate number</p>
    <p style="margin:0 0 8px;color:#0F172A;font-size:16px;font-weight:bold;letter-spacing:1px;">${escapeHtml(input.certificateNumber)}</p>
    ${button(branding, 'View your certificate', input.certificatesUrl)}
    <p style="margin:0;color:#94A3B8;font-size:12px;line-height:18px;">
      Anyone can verify this certificate at <a href="${input.verifyUrl}" style="color:${branding.primaryColor};">${input.verifyUrl}</a>
    </p>`;
  return { subject, html: baseLayout(branding, body) };
}

export interface AssignmentEmailInput {
  institutionSlug: string;
  recipientName: string | null;
  courseTitle: string;
  courseUrl: string;
  dueDate?: string | null; // ISO
}

export function courseAssignedEmail(input: AssignmentEmailInput): { subject: string; html: string } {
  const branding = getInstitutionBranding(input.institutionSlug);
  const greeting = input.recipientName ? `Hi ${escapeHtml(input.recipientName)},` : 'Hello,';
  const due = input.dueDate
    ? `<p style="margin:0 0 12px;color:#B45309;font-size:14px;line-height:22px;"><strong>Due by:</strong> ${new Date(input.dueDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>`
    : '';
  const subject = `New course assigned: ${input.courseTitle}`;
  const body = `
    <h1 style="margin:0 0 16px;color:#0F172A;font-size:22px;">A course has been assigned to you</h1>
    <p style="margin:0 0 12px;color:#334155;font-size:15px;line-height:24px;">${greeting}</p>
    <p style="margin:0 0 12px;color:#334155;font-size:15px;line-height:24px;">
      <strong>${escapeHtml(input.courseTitle)}</strong> is now available in your ${escapeHtml(branding.name)} learning portal.
    </p>
    ${due}
    ${button(branding, 'Start learning', input.courseUrl)}`;
  return { subject, html: baseLayout(branding, body) };
}
