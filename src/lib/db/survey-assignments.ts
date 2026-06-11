import type { SupabaseClient } from '@supabase/supabase-js';
import type { SurveyTemplate } from '@/lib/db/survey-templates';

/**
 * Centralized completion-survey assignments (migration 046).
 * A survey template can be attached to:
 *   - every course in the institution ('all_courses' — the default survey)
 *   - a specific course ('course')
 *   - a program ('program' — shown once, when the learner completes the
 *     FINAL course of the program)
 *
 * Resolution precedence for a course's completion survey:
 *   courses.completion_survey_template_id (per-course override, set in the
 *   course settings modal) → scope='course' assignment → institution default.
 */

export type SurveyAssignmentScope = 'all_courses' | 'course' | 'program';

export interface SurveyAssignment {
  id: string;
  institution_id: string;
  survey_template_id: string;
  scope: SurveyAssignmentScope;
  course_id: string | null;
  program_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

/** Admin: every assignment for the institution. */
export async function getSurveyAssignments(
  supabase: SupabaseClient,
  institutionId: string,
): Promise<SurveyAssignment[]> {
  const { data, error } = await supabase
    .from('survey_assignments')
    .select('*')
    .eq('institution_id', institutionId);
  if (error) throw error;
  return (data ?? []) as SurveyAssignment[];
}

async function setAssignment(
  supabase: SupabaseClient,
  institutionId: string,
  scope: SurveyAssignmentScope,
  target: { course_id?: string; program_id?: string },
  templateId: string | null,
  createdBy?: string,
): Promise<void> {
  let query = supabase
    .from('survey_assignments')
    .select('id')
    .eq('institution_id', institutionId)
    .eq('scope', scope);
  if (target.course_id) query = query.eq('course_id', target.course_id);
  if (target.program_id) query = query.eq('program_id', target.program_id);
  const { data: existing, error: selErr } = await query.maybeSingle();
  if (selErr) throw selErr;

  if (!templateId) {
    if (existing) {
      const { error } = await supabase.from('survey_assignments').delete().eq('id', existing.id);
      if (error) throw error;
    }
    return;
  }

  if (existing) {
    const { error } = await supabase
      .from('survey_assignments')
      .update({ survey_template_id: templateId, updated_at: new Date().toISOString() })
      .eq('id', existing.id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from('survey_assignments').insert({
      institution_id: institutionId,
      survey_template_id: templateId,
      scope,
      course_id: target.course_id ?? null,
      program_id: target.program_id ?? null,
      created_by: createdBy ?? null,
    });
    if (error) throw error;
  }
}

/** Sets (or clears, with null) the institution-wide default completion survey. */
export async function setDefaultSurveyAssignment(
  supabase: SupabaseClient,
  institutionId: string,
  templateId: string | null,
  createdBy?: string,
): Promise<void> {
  await setAssignment(supabase, institutionId, 'all_courses', {}, templateId, createdBy);
}

/** Sets (or clears) the completion survey for one course. */
export async function setCourseSurveyAssignment(
  supabase: SupabaseClient,
  institutionId: string,
  courseId: string,
  templateId: string | null,
  createdBy?: string,
): Promise<void> {
  await setAssignment(supabase, institutionId, 'course', { course_id: courseId }, templateId, createdBy);
}

/** Sets (or clears) the end-of-program survey for one program. */
export async function setProgramSurveyAssignment(
  supabase: SupabaseClient,
  institutionId: string,
  programId: string,
  templateId: string | null,
  createdBy?: string,
): Promise<void> {
  await setAssignment(supabase, institutionId, 'program', { program_id: programId }, templateId, createdBy);
}

// ── Completion-time resolution (student viewer) ──────────────────────────────

export type CourseSurveySource = 'course_override' | 'course_assignment' | 'institution_default';

export interface ResolvedCompletionSurveys {
  /** Survey to show on this course's completion slide (null = none). */
  course: { templateId: string; template: SurveyTemplate; source: CourseSurveySource } | null;
  /**
   * End-of-program survey — present only when completing this course means
   * the user has now completed EVERY live published course in the program
   * and they haven't answered the program survey yet.
   */
  program: { programId: string; programTitle: string; templateId: string; template: SurveyTemplate } | null;
}

async function fetchTemplate(
  supabase: SupabaseClient,
  templateId: string,
): Promise<SurveyTemplate | null> {
  const { data } = await supabase
    .from('survey_templates')
    .select('*')
    .eq('id', templateId)
    .maybeSingle();
  return (data as SurveyTemplate) ?? null;
}

/**
 * Resolves the course-level and (if just completed) program-level surveys
 * for a course's completion slide. All failures degrade to null — surveys
 * must never break course completion.
 */
export async function resolveCompletionSurveys(
  supabase: SupabaseClient,
  courseId: string,
  userId: string,
): Promise<ResolvedCompletionSurveys> {
  const result: ResolvedCompletionSurveys = { course: null, program: null };

  try {
    const { data: course } = await supabase
      .from('courses')
      .select('institution_id, completion_survey_template_id')
      .eq('id', courseId)
      .maybeSingle();
    if (!course) return result;

    // ── Course-level: override → course assignment → institution default ──
    let courseTemplateId: string | null = course.completion_survey_template_id ?? null;
    let source: CourseSurveySource = 'course_override';

    if (!courseTemplateId) {
      const { data: courseAssignment } = await supabase
        .from('survey_assignments')
        .select('survey_template_id')
        .eq('scope', 'course')
        .eq('course_id', courseId)
        .maybeSingle();
      if (courseAssignment) {
        courseTemplateId = courseAssignment.survey_template_id;
        source = 'course_assignment';
      }
    }
    if (!courseTemplateId && course.institution_id) {
      const { data: defaultAssignment } = await supabase
        .from('survey_assignments')
        .select('survey_template_id')
        .eq('scope', 'all_courses')
        .eq('institution_id', course.institution_id)
        .maybeSingle();
      if (defaultAssignment) {
        courseTemplateId = defaultAssignment.survey_template_id;
        source = 'institution_default';
      }
    }
    if (courseTemplateId) {
      const template = await fetchTemplate(supabase, courseTemplateId);
      if (template) result.course = { templateId: courseTemplateId, template, source };
    }

    // ── Program-level: only when this course completes the whole program ──
    const { data: programLinks } = await supabase
      .from('program_courses')
      .select('program_id, program:programs(id, title)')
      .eq('course_id', courseId);
    const programIds = (programLinks ?? []).map((l: any) => l.program_id as string);
    if (programIds.length === 0) return result;

    const { data: programAssignments } = await supabase
      .from('survey_assignments')
      .select('program_id, survey_template_id')
      .eq('scope', 'program')
      .in('program_id', programIds);
    if (!programAssignments || programAssignments.length === 0) return result;

    for (const pa of programAssignments) {
      // already answered?
      const { data: existing } = await supabase
        .from('course_feedback_responses')
        .select('id')
        .eq('user_id', userId)
        .eq('program_id', pa.program_id)
        .maybeSingle();
      if (existing) continue;

      // all live, published program courses completed (non-revoked certs)?
      const { data: members } = await supabase
        .from('program_courses')
        .select('course_id, course:courses(id, is_published, deleted_at)')
        .eq('program_id', pa.program_id);
      const liveCourseIds = (members ?? [])
        .filter((m: any) => m.course && m.course.deleted_at == null && m.course.is_published !== false)
        .map((m: any) => m.course_id as string);
      if (liveCourseIds.length === 0) continue;

      const { data: certs } = await supabase
        .from('certificates')
        .select('course_id')
        .eq('user_id', userId)
        .is('revoked_at', null)
        .in('course_id', liveCourseIds);
      const certified = new Set((certs ?? []).map((c: any) => c.course_id as string));
      const allDone = liveCourseIds.every((id) => certified.has(id));
      if (!allDone) continue;

      const template = await fetchTemplate(supabase, pa.survey_template_id);
      const link = (programLinks ?? []).find((l: any) => l.program_id === pa.program_id) as any;
      if (template) {
        result.program = {
          programId: pa.program_id,
          programTitle: link?.program?.title ?? 'Program',
          templateId: pa.survey_template_id,
          template,
        };
        break; // one program survey at a time
      }
    }
  } catch (err) {
    console.error('resolveCompletionSurveys failed (surveys skipped):', err);
  }

  return result;
}
