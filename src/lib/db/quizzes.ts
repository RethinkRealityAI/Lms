import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Per-course quiz performance for a single user.
 * Fetches all quiz_block_responses rows for the user and aggregates by course.
 * Returns {} on any error (table may be empty or unavailable).
 */
export async function getUserQuizPerformance(
  supabase: SupabaseClient,
  userId: string,
): Promise<Record<string, { answered: number; correct: number; attempts: number }>> {
  try {
    const { data, error } = await supabase
      .from('quiz_block_responses')
      .select('course_id, is_correct, attempt_count')
      .eq('user_id', userId);

    if (error || !data || data.length === 0) return {};

    const result: Record<string, { answered: number; correct: number; attempts: number }> = {};
    for (const row of data as { course_id: string | null; is_correct: boolean | null; attempt_count: number }[]) {
      if (!row.course_id) continue;
      const agg = result[row.course_id] ?? { answered: 0, correct: 0, attempts: 0 };
      agg.answered += 1;
      if (row.is_correct === true) agg.correct += 1;
      agg.attempts += row.attempt_count ?? 1;
      result[row.course_id] = agg;
    }
    return result;
  } catch {
    return {};
  }
}
