import { describe, it, expect, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  getSurveyResponse,
  submitSurveyResponse,
  getUserCourseReviews,
} from './surveys';

describe('getSurveyResponse', () => {
  it('returns the response row when found', async () => {
    const row = {
      id: 'resp-1',
      block_id: 'block-1',
      user_id: 'user-1',
      answers: { 'q-1': 'Yes' },
    };
    const mockMaybeSingle = vi.fn().mockResolvedValue({ data: row, error: null });
    const sb = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: mockMaybeSingle,
            }),
          }),
        }),
      }),
    } as unknown as SupabaseClient;

    const result = await getSurveyResponse(sb, 'block-1', 'user-1');
    expect(result).toEqual(row);
    expect(sb.from).toHaveBeenCalledWith('survey_responses');
  });

  it('returns null on error', async () => {
    const sb = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: null, error: { message: 'fail' } }),
            }),
          }),
        }),
      }),
    } as unknown as SupabaseClient;

    const result = await getSurveyResponse(sb, 'block-1', 'user-1');
    expect(result).toBeNull();
  });
});

describe('submitSurveyResponse', () => {
  it('upserts survey response with all required fields', async () => {
    const mockUpsert = vi.fn().mockResolvedValue({ error: null });
    const sb = {
      from: vi.fn().mockReturnValue({ upsert: mockUpsert }),
    } as unknown as SupabaseClient;

    const params = {
      institutionId: 'inst-1',
      courseId: 'course-1',
      lessonId: 'lesson-1',
      blockId: 'block-1',
      userId: 'user-1',
      answers: { 'q-1': 'Agree', 'q-2': 4 },
    };

    const { error } = await submitSurveyResponse(sb, params);
    expect(error).toBeNull();
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        institution_id: 'inst-1',
        course_id: 'course-1',
        lesson_id: 'lesson-1',
        block_id: 'block-1',
        user_id: 'user-1',
        answers: { 'q-1': 'Agree', 'q-2': 4 },
      }),
      { onConflict: 'block_id,user_id' },
    );
  });

  it('returns error message when upsert fails', async () => {
    const sb = {
      from: vi.fn().mockReturnValue({
        upsert: vi.fn().mockResolvedValue({ error: { message: 'RLS violation' } }),
      }),
    } as unknown as SupabaseClient;

    const { error } = await submitSurveyResponse(sb, {
      institutionId: 'inst-1',
      courseId: 'course-1',
      lessonId: 'lesson-1',
      blockId: 'block-1',
      userId: 'user-1',
      answers: {},
    });
    expect(error).toBe('RLS violation');
  });
});

describe('getUserCourseReviews', () => {
  it('maps joined course titles onto review rows', async () => {
    const sb = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: [
                  {
                    id: 'rev-1',
                    course_id: 'course-1',
                    rating: 5,
                    review_text: 'Great course',
                    created_at: '2024-01-01',
                    updated_at: '2024-01-02',
                    courses: { title: 'Advocacy 101' },
                  },
                ],
                error: null,
              }),
            }),
          }),
        }),
      }),
    } as unknown as SupabaseClient;

    const reviews = await getUserCourseReviews(sb, 'user-1', 'inst-1');
    expect(reviews).toHaveLength(1);
    expect(reviews[0].course_title).toBe('Advocacy 101');
    expect(reviews[0].rating).toBe(5);
    expect(reviews[0].review_text).toBe('Great course');
  });

  it('returns empty array on error', async () => {
    const sb = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ data: null, error: { message: 'fail' } }),
            }),
          }),
        }),
      }),
    } as unknown as SupabaseClient;

    const reviews = await getUserCourseReviews(sb, 'user-1', 'inst-1');
    expect(reviews).toEqual([]);
  });
});
