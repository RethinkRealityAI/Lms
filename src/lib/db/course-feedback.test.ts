import { describe, it, expect, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getCompletionSurveyAnalyticsBundle } from './course-feedback';

type FeedbackRow = {
  id: string;
  course_id: string;
  user_id: string;
  template_id: string | null;
  answers: Record<string, unknown> | null;
  submitted_at: string;
  user: { full_name: string | null; email: string | null } | null;
};

function makeSupabase(
  feedbackRows: FeedbackRow[],
  courseRows: { id: string; title: string }[],
  templateRows: { id: string; name: string; data: unknown }[],
  feedbackError: unknown = null,
): SupabaseClient {
  // course_feedback_responses: .select(..).eq(..).is(..).order(..)
  const order = vi.fn().mockResolvedValue({ data: feedbackRows, error: feedbackError });
  const isFn = vi.fn().mockReturnValue({ order });
  const eqFb = vi.fn().mockReturnValue({ is: isFn });
  const selectFb = vi.fn().mockReturnValue({ eq: eqFb });

  // courses: .select(..).in(..)
  const inCourses = vi.fn().mockResolvedValue({ data: courseRows });
  const selectCourses = vi.fn().mockReturnValue({ in: inCourses });

  // survey_templates: .select(..).in(..)
  const inTemplates = vi.fn().mockResolvedValue({ data: templateRows });
  const selectTemplates = vi.fn().mockReturnValue({ in: inTemplates });

  const from = vi.fn((table: string) => {
    if (table === 'course_feedback_responses') return { select: selectFb };
    if (table === 'courses') return { select: selectCourses };
    if (table === 'survey_templates') return { select: selectTemplates };
    throw new Error(`unexpected table ${table}`);
  });

  return { from } as unknown as SupabaseClient;
}

const QUESTIONS = [
  { id: 'q1', question: 'Would you recommend this course?', type: 'scale' },
  { id: 'q2', question: 'Any other comments?', type: 'textarea' },
];

function fb(over: Partial<FeedbackRow> = {}): FeedbackRow {
  return {
    id: 'r1',
    course_id: 'c1',
    user_id: 'u1',
    template_id: 't1',
    answers: { q1: 'Very Likely', q2: 'Great' },
    submitted_at: '2026-06-27T12:00:00Z',
    user: { full_name: 'Jordan Rivers', email: 'jordan@example.com' },
    ...over,
  };
}

describe('getCompletionSurveyAnalyticsBundle', () => {
  it('returns an empty bundle when there are no responses', async () => {
    const sb = makeSupabase([], [], []);
    const bundle = await getCompletionSurveyAnalyticsBundle(sb, 'inst-1');
    expect(bundle).toEqual({ courses: [], totalResponses: 0, totalRespondents: 0 });
  });

  it('returns an empty bundle (no throw) when the query errors', async () => {
    const sb = makeSupabase([fb()], [], [], new Error('RLS'));
    const bundle = await getCompletionSurveyAnalyticsBundle(sb, 'inst-1');
    expect(bundle.courses).toHaveLength(0);
    expect(bundle.totalResponses).toBe(0);
  });

  it('groups responses by course with title, template name, and labelled questions', async () => {
    const sb = makeSupabase(
      [fb()],
      [{ id: 'c1', title: 'Advocacy 101' }],
      [{ id: 't1', name: 'Course Feedback', data: { questions: QUESTIONS } }],
    );
    const bundle = await getCompletionSurveyAnalyticsBundle(sb, 'inst-1');
    expect(bundle.courses).toHaveLength(1);
    const course = bundle.courses[0];
    expect(course.courseTitle).toBe('Advocacy 101');
    expect(course.templateName).toBe('Course Feedback');
    expect(course.questions.map((q) => q.id)).toEqual(['q1', 'q2']);
    expect(course.responseCount).toBe(1);
    expect(course.uniqueRespondents).toBe(1);
    expect(course.responses[0]).toMatchObject({
      userName: 'Jordan Rivers',
      userEmail: 'jordan@example.com',
      answers: { q1: 'Very Likely', q2: 'Great' },
    });
  });

  it('counts unique respondents separately from response count', async () => {
    const sb = makeSupabase(
      [
        fb({ id: 'r1', user_id: 'u1' }),
        fb({ id: 'r2', user_id: 'u1' }), // same user, second response
        fb({ id: 'r3', user_id: 'u2' }),
      ],
      [{ id: 'c1', title: 'Advocacy 101' }],
      [{ id: 't1', name: 'Course Feedback', data: { questions: QUESTIONS } }],
    );
    const bundle = await getCompletionSurveyAnalyticsBundle(sb, 'inst-1');
    expect(bundle.totalResponses).toBe(3);
    expect(bundle.totalRespondents).toBe(2);
    expect(bundle.courses[0].responseCount).toBe(3);
    expect(bundle.courses[0].uniqueRespondents).toBe(2);
  });

  it('sorts courses by response count (desc)', async () => {
    const sb = makeSupabase(
      [
        fb({ id: 'r1', course_id: 'c1' }),
        fb({ id: 'r2', course_id: 'c2' }),
        fb({ id: 'r3', course_id: 'c2' }),
      ],
      [
        { id: 'c1', title: 'A course' },
        { id: 'c2', title: 'B course' },
      ],
      [{ id: 't1', name: 'Course Feedback', data: { questions: QUESTIONS } }],
    );
    const bundle = await getCompletionSurveyAnalyticsBundle(sb, 'inst-1');
    expect(bundle.courses.map((c) => c.courseId)).toEqual(['c2', 'c1']);
  });

  it('falls back to a placeholder title and empty questions when unresolved', async () => {
    const sb = makeSupabase(
      [fb({ template_id: null, answers: { q1: 'Yes' } })],
      [], // course not found
      [],
    );
    const bundle = await getCompletionSurveyAnalyticsBundle(sb, 'inst-1');
    expect(bundle.courses[0].courseTitle).toBe('Untitled course');
    expect(bundle.courses[0].templateName).toBeNull();
    expect(bundle.courses[0].questions).toEqual([]);
    // answers still carried so the UI can discover keys
    expect(bundle.courses[0].responses[0].answers).toEqual({ q1: 'Yes' });
  });
});
