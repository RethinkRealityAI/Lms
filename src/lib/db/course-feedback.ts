import type { SupabaseClient } from '@supabase/supabase-js';
import type { SurveyData } from '@/lib/content/blocks/survey/schema';
import type { SurveyTemplate } from './survey-templates';

/**
 * Course-completion feedback.
 *
 * A course may attach a `survey_template` (via `courses.completion_survey_template_id`)
 * that is shown — optional, prompted — on the completion slide. Learner answers are
 * stored one-row-per-(course,user) in `course_feedback_responses`.
 */

export interface CourseFeedbackResponse {
  id: string;
  institution_id: string;
  course_id: string;
  user_id: string;
  template_id: string | null;
  answers: Record<string, unknown>;
  submitted_at: string;
  updated_at: string;
}

export interface CourseFeedbackResponseWithUser extends CourseFeedbackResponse {
  user: { full_name: string | null; email: string | null } | null;
}

/** The completion survey config for a course: the chosen template (with its SurveyData), if any. */
export async function getCompletionSurvey(
  supabase: SupabaseClient,
  courseId: string,
): Promise<{ templateId: string | null; template: SurveyTemplate | null }> {
  const { data: course } = await supabase
    .from('courses')
    .select('completion_survey_template_id')
    .eq('id', courseId)
    .single();

  const templateId = (course?.completion_survey_template_id as string | null) ?? null;
  if (!templateId) return { templateId: null, template: null };

  const { data: tmpl } = await supabase
    .from('survey_templates')
    .select('*')
    .eq('id', templateId)
    .single();

  return {
    templateId,
    template: tmpl ? ({ ...tmpl, data: tmpl.data as SurveyData } as SurveyTemplate) : null,
  };
}

/** Set (or clear with null) the completion survey template for a course. */
export async function setCourseCompletionSurveyTemplate(
  supabase: SupabaseClient,
  courseId: string,
  templateId: string | null,
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('courses')
    .update({ completion_survey_template_id: templateId })
    .eq('id', courseId);
  return { error: error?.message ?? null };
}

/** Read whether the completion survey is required to finish a course. */
export async function getCourseCompletionSurveyRequired(
  supabase: SupabaseClient,
  courseId: string,
): Promise<boolean> {
  const { data } = await supabase
    .from('courses')
    .select('completion_survey_required')
    .eq('id', courseId)
    .maybeSingle();
  return data?.completion_survey_required ?? true;
}

/** Toggle whether the completion survey must be submitted to finish a course. */
export async function setCourseCompletionSurveyRequired(
  supabase: SupabaseClient,
  courseId: string,
  required: boolean,
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('courses')
    .update({ completion_survey_required: required })
    .eq('id', courseId);
  return { error: error?.message ?? null };
}

/** The current user's existing completion-feedback response for a course, if any. */
export async function getMyCourseFeedback(
  supabase: SupabaseClient,
  courseId: string,
  userId: string,
): Promise<CourseFeedbackResponse | null> {
  const { data } = await supabase
    .from('course_feedback_responses')
    .select('*')
    .eq('course_id', courseId)
    .eq('user_id', userId)
    .maybeSingle();
  return (data as CourseFeedbackResponse) ?? null;
}

/** Insert or update the current user's completion-feedback response.
 *
 * - Course path (no programId): upsert on `course_id,user_id` conflict — unchanged behaviour.
 * - Program path (programId set): select-then-update-or-insert keyed by `user_id,program_id`,
 *   because the partial unique index cannot be named for ON CONFLICT reliably across all
 *   Postgres/Supabase versions. The course path is left untouched.
 */
export async function upsertCourseFeedbackResponse(
  supabase: SupabaseClient,
  input: {
    institutionId: string;
    courseId: string;
    userId: string;
    templateId: string | null;
    answers: Record<string, unknown>;
    /** When set, stores a program-level feedback row instead of a course-level one. */
    programId?: string | null;
  },
): Promise<{ error: string | null }> {
  if (input.programId) {
    // Program path: select existing by (user_id, program_id), then update or insert
    const { data: existing, error: selErr } = await supabase
      .from('course_feedback_responses')
      .select('id')
      .eq('user_id', input.userId)
      .eq('program_id', input.programId)
      .maybeSingle();
    if (selErr) return { error: selErr.message };

    if (existing) {
      const { error } = await supabase
        .from('course_feedback_responses')
        .update({
          template_id: input.templateId,
          answers: input.answers,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);
      return { error: error?.message ?? null };
    } else {
      const { error } = await supabase.from('course_feedback_responses').insert({
        institution_id: input.institutionId,
        course_id: input.courseId,
        user_id: input.userId,
        program_id: input.programId,
        template_id: input.templateId,
        answers: input.answers,
      });
      return { error: error?.message ?? null };
    }
  }

  // Course path — original behaviour
  const { error } = await supabase
    .from('course_feedback_responses')
    .upsert(
      {
        institution_id: input.institutionId,
        course_id: input.courseId,
        user_id: input.userId,
        template_id: input.templateId,
        answers: input.answers,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'course_id,user_id' },
    );
  return { error: error?.message ?? null };
}

/** The current user's existing program-survey feedback response for a program, if any. */
export async function getMyProgramFeedback(
  supabase: SupabaseClient,
  programId: string,
  userId: string,
): Promise<CourseFeedbackResponse | null> {
  const { data } = await supabase
    .from('course_feedback_responses')
    .select('*')
    .eq('program_id', programId)
    .eq('user_id', userId)
    .maybeSingle();
  return (data as CourseFeedbackResponse) ?? null;
}

/** Admin: all completion-feedback responses for a course, with the responder's identity. */
export async function getCourseFeedbackResponses(
  supabase: SupabaseClient,
  courseId: string,
): Promise<CourseFeedbackResponseWithUser[]> {
  const { data, error } = await supabase
    .from('course_feedback_responses')
    .select('*, user:users!course_feedback_responses_user_id_fkey(full_name, email)')
    .eq('course_id', courseId)
    .order('submitted_at', { ascending: false });
  if (error) return [];
  return (data ?? []) as CourseFeedbackResponseWithUser[];
}

export interface CourseReview {
  id: string;
  course_id: string;
  user_id: string;
  rating: number;
  review_text: string | null;
  created_at: string;
  user: { full_name: string | null; email: string | null } | null;
}

/** Admin: all course reviews for a course, with reviewer identity, newest first. */
export async function getCourseReviews(
  supabase: SupabaseClient,
  courseId: string,
): Promise<CourseReview[]> {
  const { data, error } = await supabase
    .from('course_reviews')
    .select('id, course_id, user_id, rating, review_text, created_at, user:users!course_reviews_user_id_fkey(full_name, email)')
    .eq('course_id', courseId)
    .order('created_at', { ascending: false });
  if (error) return [];
  return (data ?? []) as unknown as CourseReview[];
}

/** Admin: completion-feedback response counts per course for an institution (global rollup). */
export async function getInstitutionFeedbackCounts(
  supabase: SupabaseClient,
  institutionId: string,
): Promise<Record<string, number>> {
  const { data, error } = await supabase
    .from('course_feedback_responses')
    .select('course_id')
    .eq('institution_id', institutionId);
  if (error) return {};
  const counts: Record<string, number> = {};
  for (const row of data ?? []) {
    const cid = (row as { course_id: string }).course_id;
    counts[cid] = (counts[cid] ?? 0) + 1;
  }
  return counts;
}
