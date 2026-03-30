import { createClient } from '@/lib/supabase/server';
import type { Progress } from '@/types';

export async function getProgressByUserAndCourse(
  userId: string,
  lessonIds: string[]
): Promise<Progress[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('progress')
    .select('*')
    .eq('user_id', userId)
    .in('lesson_id', lessonIds);
  if (error) return [];
  return data as Progress[];
}

export async function markLessonComplete(
  userId: string,
  lessonId: string
): Promise<void> {
  const supabase = await createClient();
  await supabase
    .from('progress')
    .upsert(
      { user_id: userId, lesson_id: lessonId, completed: true, completed_at: new Date().toISOString() },
      { onConflict: 'user_id,lesson_id' }
    );
}
