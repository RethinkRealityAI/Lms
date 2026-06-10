/**
 * SMTP mailer — SERVER ONLY (API routes / server actions).
 * Transport is configured entirely from env vars so the SMTP provider can be
 * swapped without code changes:
 *   SMTP_HOST, SMTP_PORT (default 587), SMTP_USER, SMTP_PASS,
 *   SMTP_FROM (generic fallback),
 *   SMTP_FROM_GANSID / SMTP_FROM_SCAGO (optional per-tenant sender headers)
 * When SMTP_HOST is not set, sends become no-ops that log a warning — the
 * platform keeps working without email until SMTP is configured.
 */
import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { getInstitutionBranding } from '@/lib/tenant/branding';

let transporter: Transporter | null = null;

export function isEmailConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST);
}

/** Resolve the From header for an institution (env override → generic SMTP_FROM → branding default). */
export function resolveEmailFrom(institutionSlug?: string | null): string | undefined {
  let slug = institutionSlug?.toLowerCase();
  // belt-and-suspenders: slug feeds an env-var name — never allow arbitrary keys
  if (slug && !/^[a-z][a-z0-9-]{0,32}$/.test(slug)) slug = undefined;
  if (slug) {
    const perTenant = process.env[`SMTP_FROM_${slug.toUpperCase()}`];
    if (perTenant) return perTenant;
  }
  if (process.env.SMTP_FROM) return process.env.SMTP_FROM;
  if (slug) {
    const branding = getInstitutionBranding(slug);
    return `${branding.name} Learning <${branding.contactEmail}>`;
  }
  return process.env.SMTP_USER ?? undefined;
}

function getTransporter(): Transporter | null {
  if (!isEmailConfigured()) return null;
  if (!transporter) {
    const port = Number(process.env.SMTP_PORT ?? 587);
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465,
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
    });
  }
  return transporter;
}

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  /** Plain-text fallback; derived from subject when omitted */
  text?: string;
  /** Explicit From override (rare — prefer institutionSlug) */
  from?: string;
  /** Tenant slug — picks SMTP_FROM_GANSID / SMTP_FROM_SCAGO or branding default */
  institutionSlug?: string | null;
}

/**
 * Sends an email. Returns { sent: false, reason } instead of throwing when
 * SMTP is unconfigured; throws on real transport errors so callers can decide
 * whether the failure matters.
 */
export async function sendEmail(input: SendEmailInput): Promise<{ sent: boolean; reason?: string }> {
  const transport = getTransporter();
  if (!transport) {
    console.warn(`[email] SMTP not configured — skipped "${input.subject}" to ${input.to}`);
    return { sent: false, reason: 'smtp_not_configured' };
  }
  const from = input.from ?? resolveEmailFrom(input.institutionSlug);
  await transport.sendMail({
    from,
    to: input.to,
    subject: input.subject,
    html: input.html,
    text: input.text ?? input.subject,
  });
  return { sent: true };
}
