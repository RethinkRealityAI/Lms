import type { SupabaseClient } from '@supabase/supabase-js';
import type { SurveyAnswers } from '@/lib/content/blocks/survey/schema';

// ── Types ────────────────────────────────────────────────────────────────────

export interface SurveyResponseRow {
  id: string;
  institution_id: string;
  course_id: string;
  lesson_id: string;
  block_id: string;
  user_id: string;
  answers: SurveyAnswers;
  submitted_at: string;
  updated_at: string;
}

export interface SurveyResponseWithMeta extends SurveyResponseRow {
  course_title?: string;
  lesson_title?: string;
  block_title?: string | null;
  user_email?: string;
  user_name?: string | null;
}

export interface CourseSurveySummary {
  course_id: string;
  course_title: string;
  response_count: number;
  unique_respondents: number;
  survey_blocks: number;
}

export interface SurveyBlockSummary {
  block_id: string;
  block_title: string | null;
  lesson_id: string;
  lesson_title: string;
  response_count: number;
  question_count: number;
  questions?: Array<{ id: string; question: string; type: string }>;
}

export interface UserCourseReview {
  id: string;
  course_id: string;
  course_title: string;
  rating: number;
  review_text: string | null;
  created_at: string;
  updated_at: string;
}

// ── Student submission ───────────────────────────────────────────────────────

export async function getSurveyResponse(
  supabase: SupabaseClient,
  blockId: string,
  userId: string,
): Promise<SurveyResponseRow | null> {
  const { data, error } = await supabase
    .from('survey_responses')
    .select('*')
    .eq('block_id', blockId)
    .eq('user_id', userId)
    .maybeSingle();
  if (error) return null;
  return data as SurveyResponseRow | null;
}

export async function submitSurveyResponse(
  supabase: SupabaseClient,
  params: {
    institutionId: string;
    courseId: string;
    lessonId: string;
    blockId: string;
    userId: string;
    answers: SurveyAnswers;
  },
): Promise<{ error: string | null }> {
  const now = new Date().toISOString();
  const { error } = await supabase.from('survey_responses').upsert(
    {
      institution_id: params.institutionId,
      course_id: params.courseId,
      lesson_id: params.lessonId,
      block_id: params.blockId,
      user_id: params.userId,
      answers: params.answers,
      updated_at: now,
      submitted_at: now,
    },
    { onConflict: 'block_id,user_id' },
  );
  return { error: error?.message ?? null };
}

// ── Admin analytics ──────────────────────────────────────────────────────────

export async function getCourseSurveySummaries(
  supabase: SupabaseClient,
  institutionId: string,
): Promise<CourseSurveySummary[]> {
  const { data: courses, error: coursesError } = await supabase
    .from('courses')
    .select('id, title')
    .eq('institution_id', institutionId)
    .order('title');
  if (coursesError || !courses?.length) return [];

  const courseIds = courses.map((c) => c.id);

  const [{ data: responses }, { data: surveyBlocksRaw }] = await Promise.all([
    supabase
      .from('survey_responses')
      .select('course_id, user_id')
      .eq('institution_id', institutionId)
      .in('course_id', courseIds),
    supabase
      .from('lesson_blocks')
      .select('id, lesson_id, lessons!inner(course_id, courses!inner(institution_id))')
      .eq('block_type', 'survey')
      .eq('lessons.courses.institution_id', institutionId),
  ]);

  const surveyBlocks = surveyBlocksRaw ?? [];

  const responseCountByCourse = new Map<string, number>();
  const respondentsByCourse = new Map<string, Set<string>>();
  for (const row of responses ?? []) {
    responseCountByCourse.set(row.course_id, (responseCountByCourse.get(row.course_id) ?? 0) + 1);
    if (!respondentsByCourse.has(row.course_id)) respondentsByCourse.set(row.course_id, new Set());
    respondentsByCourse.get(row.course_id)!.add(row.user_id);
  }

  const blockCountByCourse = new Map<string, number>();
  for (const block of surveyBlocks) {
    const lesson = block.lessons as unknown as { course_id: string };
    const courseId = lesson.course_id;
    blockCountByCourse.set(courseId, (blockCountByCourse.get(courseId) ?? 0) + 1);
  }

  return courses
    .map((course) => ({
      course_id: course.id,
      course_title: course.title,
      response_count: responseCountByCourse.get(course.id) ?? 0,
      unique_respondents: respondentsByCourse.get(course.id)?.size ?? 0,
      survey_blocks: blockCountByCourse.get(course.id) ?? 0,
    }))
    .filter((c) => c.survey_blocks > 0 || c.response_count > 0);
}

export async function getSurveyBlocksForCourse(
  supabase: SupabaseClient,
  courseId: string,
): Promise<SurveyBlockSummary[]> {
  const { data: lessons } = await supabase
    .from('lessons')
    .select('id, title')
    .eq('course_id', courseId);

  if (!lessons?.length) return [];

  const lessonMap = new Map(lessons.map((l) => [l.id, l.title]));
  const lessonIds = lessons.map((l) => l.id);

  const { data: blocks } = await supabase
    .from('lesson_blocks')
    .select('id, title, lesson_id, data')
    .eq('block_type', 'survey')
    .in('lesson_id', lessonIds);

  if (!blocks?.length) return [];

  const blockIds = blocks.map((b) => b.id);
  const { data: responses } = await supabase
    .from('survey_responses')
    .select('block_id')
    .in('block_id', blockIds);

  const countByBlock = new Map<string, number>();
  for (const r of responses ?? []) {
    countByBlock.set(r.block_id, (countByBlock.get(r.block_id) ?? 0) + 1);
  }

  return blocks.map((block) => {
    const data = block.data as { questions?: Array<{ id: string; question: string; type: string }> } | null;
    const questions = Array.isArray(data?.questions) ? data!.questions! : [];
    return {
      block_id: block.id,
      block_title: block.title,
      lesson_id: block.lesson_id,
      lesson_title: lessonMap.get(block.lesson_id) ?? 'Unknown lesson',
      response_count: countByBlock.get(block.id) ?? 0,
      question_count: questions.length,
      questions: questions.map((q) => ({
        id: q.id,
        question: q.question || 'Untitled question',
        type: q.type,
      })),
    };
  });
}

export async function getSurveyResponsesForBlock(
  supabase: SupabaseClient,
  blockId: string,
): Promise<SurveyResponseWithMeta[]> {
  const { data, error } = await supabase
    .from('survey_responses')
    .select(`
      *,
      users ( email, full_name ),
      courses ( title ),
      lessons ( title ),
      lesson_blocks ( title )
    `)
    .eq('block_id', blockId)
    .order('submitted_at', { ascending: false });

  if (error || !data) return [];

  return data.map((row) => {
    const users = row.users as { email: string; full_name: string | null } | null;
    const courses = row.courses as { title: string } | null;
    const lessons = row.lessons as { title: string } | null;
    const lessonBlocks = row.lesson_blocks as { title: string | null } | null;
    return {
      id: row.id,
      institution_id: row.institution_id,
      course_id: row.course_id,
      lesson_id: row.lesson_id,
      block_id: row.block_id,
      user_id: row.user_id,
      answers: row.answers as SurveyAnswers,
      submitted_at: row.submitted_at,
      updated_at: row.updated_at,
      user_email: users?.email,
      user_name: users?.full_name,
      course_title: courses?.title,
      lesson_title: lessons?.title,
      block_title: lessonBlocks?.title,
    };
  });
}

export async function getSurveyResponsesByUser(
  supabase: SupabaseClient,
  userId: string,
  institutionId: string,
): Promise<SurveyResponseWithMeta[]> {
  const { data, error } = await supabase
    .from('survey_responses')
    .select(`
      *,
      courses ( title ),
      lessons ( title ),
      lesson_blocks ( title, data )
    `)
    .eq('user_id', userId)
    .eq('institution_id', institutionId)
    .order('submitted_at', { ascending: false });

  if (error || !data) return [];

  return data.map((row) => {
    const courses = row.courses as { title: string } | null;
    const lessons = row.lessons as { title: string } | null;
    const lessonBlocks = row.lesson_blocks as { title: string | null } | null;
    return {
      id: row.id,
      institution_id: row.institution_id,
      course_id: row.course_id,
      lesson_id: row.lesson_id,
      block_id: row.block_id,
      user_id: row.user_id,
      answers: row.answers as SurveyAnswers,
      submitted_at: row.submitted_at,
      updated_at: row.updated_at,
      course_title: courses?.title,
      lesson_title: lessons?.title,
      block_title: lessonBlocks?.title,
    };
  });
}

export async function getUserCourseReviews(
  supabase: SupabaseClient,
  userId: string,
  institutionId: string,
): Promise<UserCourseReview[]> {
  const { data, error } = await supabase
    .from('course_reviews')
    .select('id, course_id, rating, review_text, created_at, updated_at, courses ( title )')
    .eq('user_id', userId)
    .eq('institution_id', institutionId)
    .order('updated_at', { ascending: false });

  if (error || !data) return [];

  return data.map((row) => ({
    id: row.id,
    course_id: row.course_id,
    course_title: (row.courses as unknown as { title: string } | null)?.title ?? 'Unknown course',
    rating: row.rating,
    review_text: row.review_text,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }));
}

export async function getSurveyAnalyticsBundle(
  supabase: SupabaseClient,
  institutionId: string,
): Promise<{
  summaries: CourseSurveySummary[];
  blocksByCourse: Record<string, SurveyBlockSummary[]>;
  responsesByBlock: Record<string, SurveyResponseWithMeta[]>;
}> {
  const summaries = await getCourseSurveySummaries(supabase, institutionId);
  const blocksByCourse: Record<string, SurveyBlockSummary[]> = {};
  const responsesByBlock: Record<string, SurveyResponseWithMeta[]> = {};

  await Promise.all(
    summaries.map(async (summary) => {
      const blocks = await getSurveyBlocksForCourse(supabase, summary.course_id);
      blocksByCourse[summary.course_id] = blocks;
      await Promise.all(
        blocks
          .filter((block) => block.response_count > 0)
          .map(async (block) => {
            responsesByBlock[block.block_id] = await getSurveyResponsesForBlock(
              supabase,
              block.block_id,
            );
          }),
      );
    }),
  );

  return { summaries, blocksByCourse, responsesByBlock };
}
