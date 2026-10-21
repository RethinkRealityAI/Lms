import type { SupabaseClient } from '@supabase/supabase-js';
import { isGatedQuizType, isQuizSatisfiable } from '@/lib/content/blocks/quiz-inline/validation';
import type { QuizInlineData } from '@/lib/content/blocks/quiz-inline/schema';

/**
 * Which required quizzes are stopping a learner's course certificate.
 *
 * issue_course_certificate only says "N remaining" — learners could not find the
 * quiz (support reports, SCAGO Modules 3/4/6/7). This returns the SAME set the RPC
 * counts, with lesson + slide so the UI can name it and link straight to it.
 * Rules mirror issue_course_certificate v5 (migrations 054/058/061):
 *   live lessons; quiz_inline, not trashed; required !== false; gated question type;
 *   satisfiable config; on a published, non-deleted slide OR slide-less (legacy);
 *   no is_correct=true response; lesson not completed before the enforcement cutoff.
 * Keep in lockstep with the RPC if either changes.
 */

/** Lessons completed before this are grandfathered (answers weren't persisted pre-039). */
export const QUIZ_ENFORCEMENT_SINCE = '2026-07-11T02:47:00Z';

export interface MissingQuiz {
  blockId: string;
  lessonId: string;
  lessonTitle: string;
  /** 0-based position of the lesson in the course (UI shows +1). */
  lessonPosition: number;
  slideId: string | null;
  slideTitle: string | null;
}

export interface CertificateBlockerInput {
  lessons: Array<{ id: string; title: string | null; order_index: number | null }>;
  slides: Array<{ id: string; lesson_id: string; title: string | null; order_index: number | null; status: string | null; deleted_at: string | null }>;
  blocks: Array<{ id: string; lesson_id: string; slide_id: string | null; block_type: string; deleted_at?: string | null; data: Record<string, unknown> | null }>;
  correctBlockIds: Set<string>;
  progress: Array<{ lesson_id: string; completed: boolean | null; completed_at: string | null }>;
}

/** Pure core of getMissingRequiredQuizzes — exported for tests. */
export function computeMissingQuizzes(input: CertificateBlockerInput): MissingQuiz[] {
  const lessons = [...input.lessons].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
  const lessonPos = new Map(lessons.map((l, i) => [l.id, i]));
  const visibleSlides = new Map(
    input.slides
      .filter((s) => s.status === 'published' && !s.deleted_at && lessonPos.has(s.lesson_id))
      .map((s) => [s.id, s]),
  );
  const cutoff = Date.parse(QUIZ_ENFORCEMENT_SINCE);
  const grandfathered = new Set(
    input.progress
      .filter((p) => p.completed && p.completed_at && Date.parse(p.completed_at) < cutoff)
      .map((p) => p.lesson_id),
  );

  const missing = input.blocks.filter((b) => {
    if (!lessonPos.has(b.lesson_id) || b.deleted_at) return false;
    if (b.block_type !== 'quiz_inline') return false;
    const d = (b.data ?? {}) as Record<string, unknown>;
    if (d.required === false || d.required === 'false') return false;
    if (!isGatedQuizType(d.question_type as string | undefined)) return false;
    if (!isQuizSatisfiable(d as Partial<QuizInlineData>)) return false;
    if (b.slide_id !== null && !visibleSlides.has(b.slide_id)) return false;
    if (input.correctBlockIds.has(b.id)) return false;
    if (grandfathered.has(b.lesson_id)) return false;
    return true;
  });

  return missing
    .map((b) => {
      const slide = b.slide_id ? visibleSlides.get(b.slide_id) ?? null : null;
      const lesson = lessons[lessonPos.get(b.lesson_id)!];
      return {
        blockId: b.id,
        lessonId: b.lesson_id,
        lessonTitle: lesson.title ?? 'Lesson',
        lessonPosition: lessonPos.get(b.lesson_id)!,
        slideId: slide?.id ?? null,
        slideTitle: slide?.title ?? null,
        _slideOrder: slide?.order_index ?? -1,
      };
    })
    .sort((a, b) => a.lessonPosition - b.lessonPosition || a._slideOrder - b._slideOrder)
    .map(({ _slideOrder: _ignored, ...rest }) => rest);
}

/**
 * Fetch and compute the learner's missing required quizzes for a course.
 * Throws on a failed read — callers should treat a failure as "unknown", never as
 * "nothing missing".
 */
export async function getMissingRequiredQuizzes(
  supabase: SupabaseClient,
  courseId: string,
  userId: string,
): Promise<MissingQuiz[]> {
  const { data: lessons, error: lErr } = await supabase
    .from('lessons')
    .select('id, title, order_index')
    .eq('course_id', courseId)
    .is('deleted_at', null);
  if (lErr) throw lErr;
  const lessonIds = (lessons ?? []).map((l) => l.id as string);
  if (lessonIds.length === 0) return [];

  const [slidesRes, blocksRes, progressRes] = await Promise.all([
    supabase.from('slides').select('id, lesson_id, title, order_index, status, deleted_at').in('lesson_id', lessonIds),
    supabase
      .from('lesson_blocks')
      .select('id, lesson_id, slide_id, block_type, deleted_at, data')
      .in('lesson_id', lessonIds)
      .eq('block_type', 'quiz_inline')
      .is('deleted_at', null),
    supabase.from('progress').select('lesson_id, completed, completed_at').eq('user_id', userId).in('lesson_id', lessonIds),
  ]);
  if (slidesRes.error) throw slidesRes.error;
  if (blocksRes.error) throw blocksRes.error;
  if (progressRes.error) throw progressRes.error;

  const quizIds = (blocksRes.data ?? []).map((b) => b.id as string);
  let correct = new Set<string>();
  if (quizIds.length > 0) {
    const { data: responses, error: rErr } = await supabase
      .from('quiz_block_responses')
      .select('block_id')
      .eq('user_id', userId)
      .eq('is_correct', true)
      .in('block_id', quizIds);
    if (rErr) throw rErr;
    correct = new Set((responses ?? []).map((r) => r.block_id as string));
  }

  return computeMissingQuizzes({
    lessons: (lessons ?? []) as CertificateBlockerInput['lessons'],
    slides: (slidesRes.data ?? []) as CertificateBlockerInput['slides'],
    blocks: (blocksRes.data ?? []) as CertificateBlockerInput['blocks'],
    correctBlockIds: correct,
    progress: (progressRes.data ?? []) as CertificateBlockerInput['progress'],
  });
}
