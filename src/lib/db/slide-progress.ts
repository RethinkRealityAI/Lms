import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Per-slide progress (migration 059). One row per (user, slide) marks a slide as VIEWED.
 * Powers the smooth progress bar, the sidebar per-slide checkmarks, and jump-to-slide.
 * Whole-lesson completion still lives in the `progress` table and drives certificates —
 * slide_progress is additive display/navigation state, never a completion gate.
 */

/** All slide ids the user has viewed in a course. Empty on error (never breaks the viewer). */
export async function getViewedSlideIds(
  supabase: SupabaseClient,
  userId: string,
  courseId: string,
): Promise<Set<string>> {
  const { data, error } = await supabase
    .from('slide_progress')
    .select('slide_id')
    .eq('user_id', userId)
    .eq('course_id', courseId);
  if (error || !data) return new Set<string>();
  return new Set(data.map((r) => r.slide_id as string));
}

export interface MarkSlideViewedInput {
  userId: string;
  slideId: string;
  courseId: string;
  lessonId?: string | null;
  institutionId?: string | null;
}

/**
 * Mark a slide viewed (idempotent upsert on user+slide). Fire-and-forget from the viewer —
 * callers ignore the result and never let a failure interrupt navigation. Skip in preview mode.
 */
export async function markSlideViewed(
  supabase: SupabaseClient,
  input: MarkSlideViewedInput,
): Promise<void> {
  const { error } = await supabase.from('slide_progress').upsert(
    {
      user_id: input.userId,
      slide_id: input.slideId,
      course_id: input.courseId,
      lesson_id: input.lessonId ?? null,
      institution_id: input.institutionId ?? null,
    },
    { onConflict: 'user_id,slide_id', ignoreDuplicates: true },
  );
  if (error) throw error;
}
