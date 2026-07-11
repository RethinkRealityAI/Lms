import type { SupabaseClient } from '@supabase/supabase-js';
import { getQuizConfigError, isGatedQuizType } from '@/lib/content/blocks/quiz-inline/validation';
import type { QuizInlineData } from '@/lib/content/blocks/quiz-inline/schema';

export interface ProblematicQuiz {
  blockId: string;
  courseId: string;
  courseTitle: string;
  lessonId: string;
  lessonTitle: string;
  /** 0-based lesson order; UI shows order + 1 */
  lessonOrder: number;
  slideId: string | null;
  question: string;
  questionType: string | null;
  /** Human-readable reason the quiz is misconfigured (from getQuizConfigError) */
  problem: string;
  /**
   * True when the quiz is an interactive/gated type. A gated quiz that is also
   * misconfigured would prevent learners from completing the lesson (the viewer
   * now skips it as a fail-safe, but it still needs fixing). A non-gated problem
   * (e.g. missing question type) only renders a broken placeholder.
   */
  blocksCompletion: boolean;
}

/**
 * Scan every quiz_inline block in an institution's courses and return the ones
 * that are misconfigured — i.e. that a learner can never answer correctly, or
 * that render as a broken placeholder. Powers the admin Content Health report so
 * problematic quizzes are surfaced and fixed rather than silently bypassed.
 */
export async function getProblematicQuizzes(
  supabase: SupabaseClient,
  institutionId: string,
): Promise<ProblematicQuiz[]> {
  const { data, error } = await supabase
    .from('lesson_blocks')
    .select(
      'id, slide_id, data, lessons!inner(id, title, order_index, deleted_at, courses!inner(id, title, institution_id))',
    )
    .eq('block_type', 'quiz_inline')
    .eq('institution_id', institutionId);

  // Throw rather than returning [] — an empty array means "all quizzes are
  // healthy", which a failed query must never masquerade as.
  if (error) throw error;
  if (!data) return [];

  const out: ProblematicQuiz[] = [];
  for (const row of data as unknown as Array<{
    id: string;
    slide_id: string | null;
    data: Partial<QuizInlineData> | null;
    lessons:
      | {
          id: string;
          title: string;
          order_index: number | null;
          deleted_at: string | null;
          courses: { id: string; title: string; institution_id: string } | { id: string; title: string; institution_id: string }[];
        }
      | null;
  }>) {
    const lesson = row.lessons;
    if (!lesson || lesson.deleted_at) continue;
    const course = Array.isArray(lesson.courses) ? lesson.courses[0] : lesson.courses;
    if (!course || course.institution_id !== institutionId) continue;

    const qdata = (row.data ?? {}) as Partial<QuizInlineData>;
    const problem = getQuizConfigError(qdata);
    if (!problem) continue;

    out.push({
      blockId: row.id,
      courseId: course.id,
      courseTitle: course.title,
      lessonId: lesson.id,
      lessonTitle: lesson.title,
      lessonOrder: lesson.order_index ?? 0,
      slideId: row.slide_id ?? null,
      question: String(qdata.question ?? ''),
      questionType: (qdata.question_type as string | undefined) ?? null,
      problem,
      blocksCompletion: isGatedQuizType(qdata.question_type as string | undefined),
    });
  }

  // Completion-blockers first, then alphabetically by course and lesson order.
  out.sort(
    (a, b) =>
      Number(b.blocksCompletion) - Number(a.blocksCompletion) ||
      a.courseTitle.localeCompare(b.courseTitle) ||
      a.lessonOrder - b.lessonOrder,
  );
  return out;
}

/** A quiz block whose slide was deleted — it can never render, but its row lingers. */
export interface StrandedQuizBlock {
  blockId: string;
  lessonId: string;
  lessonTitle: string;
  /** 0-based lesson order; UI shows order + 1 */
  lessonOrder: number;
  question: string;
}

export interface CourseQuizHealth {
  problematic: ProblematicQuiz[];
  stranded: StrandedQuizBlock[];
}

/**
 * Course-scoped quiz health for the editor's warnings panel: misconfigured
 * quiz_inline blocks (same criteria as the institution-wide report) plus quiz
 * blocks stranded on soft-deleted slides — detected cheaply via the slides join.
 */
export async function getCourseQuizHealth(
  supabase: SupabaseClient,
  courseId: string,
): Promise<CourseQuizHealth> {
  const { data, error } = await supabase
    .from('lesson_blocks')
    .select(
      'id, slide_id, data, slides(deleted_at), lessons!inner(id, title, order_index, deleted_at, course_id, courses!inner(id, title, institution_id))',
    )
    .eq('block_type', 'quiz_inline')
    .eq('lessons.course_id', courseId);

  // Throw rather than returning empty results — "no issues" must never be the
  // silent outcome of a failed query (same rule as getProblematicQuizzes).
  if (error) throw error;

  const problematic: ProblematicQuiz[] = [];
  const stranded: StrandedQuizBlock[] = [];

  for (const row of (data ?? []) as unknown as Array<{
    id: string;
    slide_id: string | null;
    data: Partial<QuizInlineData> | null;
    slides: { deleted_at: string | null } | { deleted_at: string | null }[] | null;
    lessons:
      | {
          id: string;
          title: string;
          order_index: number | null;
          deleted_at: string | null;
          courses: { id: string; title: string; institution_id: string } | { id: string; title: string; institution_id: string }[];
        }
      | null;
  }>) {
    const lesson = row.lessons;
    if (!lesson || lesson.deleted_at) continue;
    const course = Array.isArray(lesson.courses) ? lesson.courses[0] : lesson.courses;
    if (!course) continue;

    const qdata = (row.data ?? {}) as Partial<QuizInlineData>;
    const slideRel = Array.isArray(row.slides) ? row.slides[0] : row.slides;

    // Stranded: the owning slide was soft-deleted. The block never renders, so a
    // config problem on top of it is moot — report the stranding only.
    if (row.slide_id && slideRel?.deleted_at) {
      stranded.push({
        blockId: row.id,
        lessonId: lesson.id,
        lessonTitle: lesson.title,
        lessonOrder: lesson.order_index ?? 0,
        question: String(qdata.question ?? ''),
      });
      continue;
    }

    const problem = getQuizConfigError(qdata);
    if (!problem) continue;

    problematic.push({
      blockId: row.id,
      courseId: course.id,
      courseTitle: course.title,
      lessonId: lesson.id,
      lessonTitle: lesson.title,
      lessonOrder: lesson.order_index ?? 0,
      slideId: row.slide_id ?? null,
      question: String(qdata.question ?? ''),
      questionType: (qdata.question_type as string | undefined) ?? null,
      problem,
      blocksCompletion: isGatedQuizType(qdata.question_type as string | undefined),
    });
  }

  problematic.sort(
    (a, b) => Number(b.blocksCompletion) - Number(a.blocksCompletion) || a.lessonOrder - b.lessonOrder,
  );
  stranded.sort((a, b) => a.lessonOrder - b.lessonOrder);
  return { problematic, stranded };
}

/** Course-scoped variant of getProblematicQuizzes (same row shape). */
export async function getProblematicQuizzesForCourse(
  supabase: SupabaseClient,
  courseId: string,
): Promise<ProblematicQuiz[]> {
  return (await getCourseQuizHealth(supabase, courseId)).problematic;
}
