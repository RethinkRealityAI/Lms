import { describe, it, expect, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getEmailTemplates, createEmailTemplate, deleteEmailTemplate } from './email-templates';

describe('getEmailTemplates', () => {
  it('returns templates for an institution', async () => {
    const sb = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: [
                  {
                    id: 'tpl-1',
                    institution_id: 'inst-1',
                    slug: 'certificate',
                    name: 'Certificate issued',
                    description: null,
                    category: 'system',
                    system_type: 'certificate',
                    subject_template: 'Subject',
                    body_html_template: '<p>Body</p>',
                    created_by: null,
                    created_at: '2024-01-01',
                    updated_at: '2024-01-01',
                  },
                ],
                error: null,
              }),
            }),
          }),
        }),
      }),
    } as unknown as SupabaseClient;

    const rows = await getEmailTemplates(sb, 'inst-1');
    expect(rows).toHaveLength(1);
    expect(rows[0].system_type).toBe('certificate');
  });
});

describe('createEmailTemplate', () => {
  it('inserts a custom template', async () => {
    const sb = {
      from: vi.fn().mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                id: 'tpl-new',
                institution_id: 'inst-1',
                slug: 'newsletter',
                name: 'Newsletter',
                description: null,
                category: 'custom',
                system_type: null,
                subject_template: 'News',
                body_html_template: '<p>Hi</p>',
                created_by: 'user-1',
                created_at: '2024-01-01',
                updated_at: '2024-01-01',
              },
              error: null,
            }),
          }),
        }),
      }),
    } as unknown as SupabaseClient;

    const row = await createEmailTemplate(sb, {
      institutionId: 'inst-1',
      name: 'Newsletter',
      subjectTemplate: 'News',
      bodyHtmlTemplate: '<p>Hi</p>',
      createdBy: 'user-1',
    });
    expect(row.category).toBe('custom');
  });
});

describe('deleteEmailTemplate', () => {
  it('blocks deleting system templates', async () => {
    const sb = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: { category: 'system' } }),
          }),
        }),
        delete: vi.fn(),
      }),
    } as unknown as SupabaseClient;

    await expect(deleteEmailTemplate(sb, 'tpl-1')).rejects.toThrow(/System templates/);
  });
});
