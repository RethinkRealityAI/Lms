import { describe, it, expect, vi } from 'vitest';
import {
  getCertificateTemplates,
  getDefaultCertificateTemplate,
  getCourseTemplateId,
  assignCourseTemplate,
  removeCourseTemplate,
} from './certificate-templates';
import type { SupabaseClient } from '@supabase/supabase-js';

function mockSupabase(overrides: Record<string, any> = {}) {
  const chainable = (resolved: any) => {
    const chain: any = {};
    chain.select = vi.fn().mockReturnValue(chain);
    chain.eq = vi.fn().mockReturnValue(chain);
    chain.order = vi.fn().mockReturnValue(chain);
    chain.maybeSingle = vi.fn().mockResolvedValue(resolved);
    chain.single = vi.fn().mockResolvedValue(resolved);
    chain.insert = vi.fn().mockReturnValue(chain);
    chain.update = vi.fn().mockReturnValue(chain);
    chain.upsert = vi.fn().mockReturnValue(chain);
    chain.delete = vi.fn().mockReturnValue(chain);
    Object.assign(chain, resolved);
    return chain;
  };

  return {
    from: vi.fn((table: string) => {
      if (overrides[table]) return overrides[table];
      return chainable({ data: null, error: null });
    }),
  } as unknown as SupabaseClient;
}

describe('getCertificateTemplates', () => {
  function buildChain(resolved: { data: any; error: any }) {
    const chain: any = {};
    chain.select = vi.fn().mockReturnValue(chain);
    chain.eq = vi.fn().mockReturnValue(chain);
    // .order() is called twice — first returns chain, second resolves
    let orderCallCount = 0;
    chain.order = vi.fn().mockImplementation(() => {
      orderCallCount++;
      if (orderCallCount >= 2) return Promise.resolve(resolved);
      return chain;
    });
    return chain;
  }

  it('queries certificate_templates filtered by institution_id', async () => {
    const templates = [{ id: 't1', name: 'Default', is_default: true }];
    const chain = buildChain({ data: templates, error: null });

    const sb = { from: vi.fn().mockReturnValue(chain) } as unknown as SupabaseClient;
    const result = await getCertificateTemplates(sb, 'inst-1');

    expect(sb.from).toHaveBeenCalledWith('certificate_templates');
    expect(chain.eq).toHaveBeenCalledWith('institution_id', 'inst-1');
    expect(result).toEqual(templates);
  });

  it('throws on error', async () => {
    const chain = buildChain({ data: null, error: new Error('DB error') });

    const sb = { from: vi.fn().mockReturnValue(chain) } as unknown as SupabaseClient;
    await expect(getCertificateTemplates(sb, 'inst-1')).rejects.toThrow('DB error');
  });
});

describe('getDefaultCertificateTemplate', () => {
  it('queries for is_default = true', async () => {
    const template = { id: 't1', name: 'Default', is_default: true };
    const chain: any = {};
    chain.select = vi.fn().mockReturnValue(chain);
    chain.eq = vi.fn().mockReturnValue(chain);
    chain.maybeSingle = vi.fn().mockResolvedValue({ data: template, error: null });

    const sb = { from: vi.fn().mockReturnValue(chain) } as unknown as SupabaseClient;
    const result = await getDefaultCertificateTemplate(sb, 'inst-1');

    expect(chain.eq).toHaveBeenCalledWith('institution_id', 'inst-1');
    expect(chain.eq).toHaveBeenCalledWith('is_default', true);
    expect(result).toEqual(template);
  });

  it('returns null when no default exists', async () => {
    const chain: any = {};
    chain.select = vi.fn().mockReturnValue(chain);
    chain.eq = vi.fn().mockReturnValue(chain);
    chain.maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });

    const sb = { from: vi.fn().mockReturnValue(chain) } as unknown as SupabaseClient;
    const result = await getDefaultCertificateTemplate(sb, 'inst-1');
    expect(result).toBeNull();
  });
});

describe('getCourseTemplateId', () => {
  it('returns template_id for a course', async () => {
    const chain: any = {};
    chain.select = vi.fn().mockReturnValue(chain);
    chain.eq = vi.fn().mockReturnValue(chain);
    chain.maybeSingle = vi.fn().mockResolvedValue({ data: { template_id: 'tmpl-1' }, error: null });

    const sb = { from: vi.fn().mockReturnValue(chain) } as unknown as SupabaseClient;
    const result = await getCourseTemplateId(sb, 'course-1');

    expect(sb.from).toHaveBeenCalledWith('course_certificate_templates');
    expect(result).toBe('tmpl-1');
  });

  it('returns null when no template assigned', async () => {
    const chain: any = {};
    chain.select = vi.fn().mockReturnValue(chain);
    chain.eq = vi.fn().mockReturnValue(chain);
    chain.maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });

    const sb = { from: vi.fn().mockReturnValue(chain) } as unknown as SupabaseClient;
    const result = await getCourseTemplateId(sb, 'course-1');
    expect(result).toBeNull();
  });
});

describe('assignCourseTemplate', () => {
  it('upserts on course_certificate_templates with onConflict course_id', async () => {
    const upsertMock = vi.fn().mockResolvedValue({ error: null });
    const sb = {
      from: vi.fn().mockReturnValue({ upsert: upsertMock }),
    } as unknown as SupabaseClient;

    await assignCourseTemplate(sb, 'course-1', 'tmpl-1', 'user-1');

    expect(sb.from).toHaveBeenCalledWith('course_certificate_templates');
    expect(upsertMock).toHaveBeenCalledWith(
      { course_id: 'course-1', template_id: 'tmpl-1', assigned_by: 'user-1' },
      { onConflict: 'course_id' }
    );
  });
});

describe('removeCourseTemplate', () => {
  it('deletes from course_certificate_templates by course_id', async () => {
    const eqMock = vi.fn().mockResolvedValue({ error: null });
    const deleteMock = vi.fn().mockReturnValue({ eq: eqMock });
    const sb = {
      from: vi.fn().mockReturnValue({ delete: deleteMock }),
    } as unknown as SupabaseClient;

    await removeCourseTemplate(sb, 'course-1');

    expect(sb.from).toHaveBeenCalledWith('course_certificate_templates');
    expect(eqMock).toHaveBeenCalledWith('course_id', 'course-1');
  });
});
