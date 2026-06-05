import { describe, it, expect, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  applySurveyTemplate,
  createSurveyTemplate,
  getSurveyTemplates,
} from './survey-templates';

describe('getSurveyTemplates', () => {
  it('returns templates for an institution', async () => {
    const sb = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: [
                {
                  id: 'tpl-1',
                  institution_id: 'inst-1',
                  name: 'Module feedback',
                  description: null,
                  data: { title: 'Feedback', questions: [] },
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
    } as unknown as SupabaseClient;

    const rows = await getSurveyTemplates(sb, 'inst-1');
    expect(rows).toHaveLength(1);
    expect(rows[0].name).toBe('Module feedback');
  });
});

describe('createSurveyTemplate', () => {
  it('inserts template data', async () => {
    const mockSingle = vi.fn().mockResolvedValue({
      data: {
        id: 'tpl-new',
        institution_id: 'inst-1',
        name: 'Exit survey',
        description: 'After module',
        data: { title: 'Survey', questions: [] },
        created_by: 'user-1',
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
      },
      error: null,
    });
    const sb = {
      from: vi.fn().mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({ single: mockSingle }),
        }),
      }),
    } as unknown as SupabaseClient;

    const { template, error } = await createSurveyTemplate(sb, {
      institutionId: 'inst-1',
      name: 'Exit survey',
      description: 'After module',
      data: { title: 'Survey', submit_label: 'Submit Survey', questions: [] },
      createdBy: 'user-1',
    });

    expect(error).toBeNull();
    expect(template?.name).toBe('Exit survey');
  });
});

describe('applySurveyTemplate', () => {
  it('returns cloned survey data with fresh question ids', () => {
    vi.stubGlobal('crypto', { randomUUID: vi.fn(() => 'fresh-id') });
    const result = applySurveyTemplate({
      id: 'tpl-1',
      institution_id: 'inst-1',
      name: 'Test',
      description: null,
      data: {
        title: 'Course feedback',
        submit_label: 'Submit Survey',
        questions: [{ id: 'q-old', type: 'text', question: 'Thoughts?', required: false }],
      },
      created_by: null,
      created_at: '2024-01-01',
      updated_at: '2024-01-01',
    });
    expect(result.title).toBe('Course feedback');
    expect(result.questions[0].id).toBe('fresh-id');
  });
});
