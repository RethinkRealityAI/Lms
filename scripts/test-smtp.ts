/**
 * One-off SMTP smoke test — loads .env.local and sends a sample message.
 * Usage: npx tsx scripts/test-smtp.ts [recipient@email.com] [gansid|scago]
 */
import { config } from 'dotenv';
import { resolve } from 'path';
import { sendEmail, isEmailConfigured, resolveEmailFrom } from '../src/lib/email/mailer';
import { certificateIssuedEmail } from '../src/lib/email/templates';

config({ path: resolve(process.cwd(), '.env.local') });

async function main() {
  const to = process.argv[2] ?? process.env.SMTP_USER;
  const slug = process.argv[3] ?? 'scago';

  if (!to) {
    console.error('Usage: npx tsx scripts/test-smtp.ts [recipient] [gansid|scago]');
    process.exit(1);
  }

  if (!isEmailConfigured()) {
    console.error('SMTP_HOST is not set in .env.local');
    process.exit(1);
  }

  const from = resolveEmailFrom(slug);
  const { subject, html } = certificateIssuedEmail({
    institutionSlug: slug,
    recipientName: 'SMTP Test',
    title: 'Sample Course',
    isProgram: false,
    certificateNumber: `${slug.toUpperCase()}-CLI-TEST`,
    verifyUrl: 'https://example.com/verify/test',
    certificatesUrl: `https://example.com/${slug}/student/certificates`,
  });

  console.log(`Sending test email to ${to} from ${from ?? '(default)'}…`);
  const result = await sendEmail({
    to,
    subject: `[CLI TEST] ${subject}`,
    html,
    institutionSlug: slug,
  });

  if (result.sent) {
    console.log('✓ Email sent successfully');
  } else {
    console.error('✗ Email not sent:', result.reason);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
