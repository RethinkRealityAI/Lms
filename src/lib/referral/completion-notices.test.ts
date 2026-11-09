import { describe, it, expect } from 'vitest';
import {
  buildCompletionNoticeEmail,
  parseNotifyEmails,
  referralLearnersCsv,
  type ReferralLearnerRow,
} from './completion-notices';

describe('parseNotifyEmails', () => {
  it('splits on commas, semicolons, spaces and new lines; lowercases and de-duplicates', () => {
    expect(parseNotifyEmails('A@x.org, b@y.ca;\nA@x.org  c@z.com')).toEqual({
      emails: ['a@x.org', 'b@y.ca', 'c@z.com'],
      invalid: [],
    });
  });

  it('reports invalid entries instead of dropping them silently', () => {
    expect(parseNotifyEmails('ok@x.org, nope, bad@nodot')).toEqual({
      emails: ['ok@x.org'],
      invalid: ['nope', 'bad@nodot'],
    });
  });

  it('returns nothing for an empty list', () => {
    expect(parseNotifyEmails('  ')).toEqual({ emails: [], invalid: [] });
  });
});

describe('buildCompletionNoticeEmail', () => {
  const base = {
    partnerLabel: 'NorWest Community Health Centres',
    referralCode: 'nchc',
    institutionName: 'SCAGO',
    programTitle: 'Sickle Cell Disease Education Program for Healthcare Providers',
    learnerName: 'Jane Doe',
    learnerEmail: 'jane@example.com',
    profession: 'Nurse',
    campaign: 'thunder-bay',
    joinedAt: '2026-10-20T12:00:00Z',
    completedAt: '2026-11-09T15:00:00Z',
    certificateNumber: 'SCAGO-2026-00999',
  };

  it('names the learner, partner and every detail needed to send a gift card', () => {
    const { subject, html, text } = buildCompletionNoticeEmail(base);
    expect(subject).toBe('Program completed: Jane Doe (NorWest Community Health Centres referral)');
    for (const s of ['Jane Doe', 'jane@example.com', 'Nurse', 'SCAGO-2026-00999', '?s=thunder-bay', 'November 9, 2026']) {
      expect(text).toContain(s);
      expect(html).toContain(s);
    }
    expect(text).toContain('do not forward it further');
  });

  it('escapes learner-controlled text in the HTML', () => {
    const { html } = buildCompletionNoticeEmail({ ...base, learnerName: '<script>x</script>' });
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('falls back to the email when the learner has no name, and marks untagged links', () => {
    const { subject, text } = buildCompletionNoticeEmail({ ...base, learnerName: null, campaign: null });
    expect(subject).toContain('jane@example.com');
    expect(text).toContain('Link tag: none (untagged link)');
  });
});

describe('referralLearnersCsv', () => {
  const row: ReferralLearnerRow = {
    user_id: 'u1',
    full_name: 'Doe, Jane',
    email: 'jane@example.com',
    profession: 'Nurse',
    campaign: null,
    joined_at: '2026-10-20T12:00:00Z',
    modules_completed: 13,
    modules_total: 13,
    program_completed_at: '2026-11-09T15:00:00Z',
    certificate_number: 'SCAGO-2026-00999',
    notice_status: 'sent',
    notice_sent_at: '2026-11-09T15:05:00Z',
  };

  it('writes a header and one quoted, dated row per learner', () => {
    const [header, line] = referralLearnersCsv([row]).split('\r\n');
    expect(header.startsWith('Name,Email,Profession')).toBe(true);
    expect(line).toBe('"Doe, Jane",jane@example.com,Nurse,,2026-10-20,13,13,2026-11-09,SCAGO-2026-00999,Emailed,2026-11-09');
  });

  it('neutralises spreadsheet formulas in learner-controlled fields', () => {
    const line = referralLearnersCsv([{ ...row, full_name: '=HYPERLINK("x")' }]).split('\r\n')[1];
    expect(line.startsWith(`"'=HYPERLINK(""x"")"`)).toBe(true);
  });
});
