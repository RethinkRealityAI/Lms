import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { EmailTemplate } from '@/lib/db/email-templates';
import { sendBulkEmails } from './bulk-send';

vi.mock('./mailer', () => ({
  sendEmail: vi.fn().mockResolvedValue({ sent: true }),
}));

const customTemplate: EmailTemplate = {
  id: 'tpl-custom',
  institution_id: 'inst-1',
  slug: 'announcement',
  name: 'Announcement',
  description: null,
  category: 'custom',
  system_type: null,
  subject_template: 'News from {{institutionName}}',
  body_html_template: '<p>{{greeting}} {{customMessage}}</p>',
  created_by: null,
  created_at: '2024-01-01',
  updated_at: '2024-01-01',
};

describe('sendBulkEmails', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sends to all recipients with email addresses', async () => {
    const sb = {} as SupabaseClient;
    const result = await sendBulkEmails({
      supabase: sb,
      template: customTemplate,
      institutionId: 'inst-1',
      institutionSlug: 'gansid',
      origin: 'https://example.com',
      recipients: [
        { id: 'u1', email: 'a@test.com', full_name: 'A' },
        { id: 'u2', email: 'b@test.com', full_name: 'B' },
      ],
      customMessage: 'Hello everyone',
    });

    expect(result.sent).toBe(2);
    expect(result.failed).toBe(0);
    expect(result.skipped).toBe(0);
  });

  it('skips recipients without email', async () => {
    const sb = {} as SupabaseClient;
    const result = await sendBulkEmails({
      supabase: sb,
      template: customTemplate,
      institutionId: 'inst-1',
      institutionSlug: 'gansid',
      origin: 'https://example.com',
      recipients: [{ id: 'u1', email: '', full_name: null }],
    });

    expect(result.skipped).toBe(1);
    expect(result.sent).toBe(0);
  });
});
