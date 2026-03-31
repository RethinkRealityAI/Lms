import { describe, it, expect, vi } from 'vitest';
import { publishCourse, getCourseStatus } from './courses';
import type { SupabaseClient } from '@supabase/supabase-js';

describe('publishCourse', () => {
  it('calls update on courses table with status published', async () => {
    const courseUpdateMock = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    });
    const modulesSelectMock = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        is: vi.fn().mockResolvedValue({ data: [], error: null }),
      }),
    });
    const mockFromSimple = vi.fn((table: string) => {
      if (table === 'courses') return { update: courseUpdateMock };
      if (table === 'modules') return { select: modulesSelectMock };
      return { select: vi.fn().mockReturnValue({ in: vi.fn().mockReturnValue({ is: vi.fn().mockResolvedValue({ data: [], error: null }) }) }) };
    });
    const sb = { from: mockFromSimple } as unknown as SupabaseClient;

    await publishCourse(sb, 'course-1', 'inst-1');

    expect(mockFromSimple).toHaveBeenCalledWith('courses');
    expect(courseUpdateMock).toHaveBeenCalledWith({ status: 'published' });
  });

  it('fetches modules and lessons for the course then updates slides', async () => {
    const slidesUpdateMock = vi.fn().mockReturnValue({
      in: vi.fn().mockResolvedValue({ error: null }),
    });
    const slidesSelectMock = vi.fn().mockReturnValue({
      in: vi.fn().mockReturnValue({
        is: vi.fn().mockResolvedValue({ data: [{ id: 'sl-1' }], error: null }),
      }),
    });
    let slidesCallCount = 0;

    const mockFromFull = vi.fn((table: string) => {
      if (table === 'courses') {
        return {
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
          }),
        };
      }
      if (table === 'modules') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              is: vi.fn().mockResolvedValue({ data: [{ id: 'mod-1' }], error: null }),
            }),
          }),
        };
      }
      if (table === 'lessons') {
        return {
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockReturnValue({
              is: vi.fn().mockResolvedValue({ data: [{ id: 'les-1' }], error: null }),
            }),
          }),
        };
      }
      if (table === 'slides') {
        slidesCallCount += 1;
        if (slidesCallCount === 1) return { select: slidesSelectMock };
        return { update: slidesUpdateMock };
      }
      return {};
    });

    const sb = { from: mockFromFull } as unknown as SupabaseClient;
    await publishCourse(sb, 'course-1', 'inst-1');

    expect(slidesUpdateMock).toHaveBeenCalledWith({ status: 'published' });
  });

  it('does not throw when there are no slides to publish', async () => {
    const mockFromEmpty = vi.fn((table: string) => {
      if (table === 'courses') {
        return {
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
          }),
        };
      }
      // modules returns empty
      if (table === 'modules') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              is: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
        };
      }
      return { select: vi.fn().mockReturnValue({ in: vi.fn().mockReturnValue({ is: vi.fn().mockResolvedValue({ data: [], error: null }) }) }) };
    });

    const sb = { from: mockFromEmpty } as unknown as SupabaseClient;
    await expect(publishCourse(sb, 'course-1', 'inst-1')).resolves.toBeUndefined();
  });
});

describe('getCourseStatus', () => {
  it('returns the status from the courses table', async () => {
    const mockFromStatus = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { status: 'published' }, error: null }),
          }),
        }),
      }),
    });
    const sb = { from: mockFromStatus } as unknown as SupabaseClient;

    const status = await getCourseStatus(sb, 'course-1', 'inst-1');
    expect(status).toBe('published');
  });

  it('returns draft as default when status is null', async () => {
    const mockFromNull = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { status: null }, error: null }),
          }),
        }),
      }),
    });
    const sb = { from: mockFromNull } as unknown as SupabaseClient;

    const status = await getCourseStatus(sb, 'course-1', 'inst-1');
    expect(status).toBe('draft');
  });

  it('throws when Supabase returns an error', async () => {
    const mockSingle = vi.fn().mockResolvedValue({ data: null, error: { message: 'not found' } });
    const mockFromError = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: mockSingle,
          }),
        }),
      }),
    });
    const sb = { from: mockFromError } as unknown as SupabaseClient;

    await expect(getCourseStatus(sb, 'course-1', 'inst-1')).rejects.toThrow();
  });
});
