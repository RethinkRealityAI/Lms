import { createClient } from '@/lib/supabase/server';
import type { Progress } from '@/types';

export async function getProgressByUserAndCourse(
  userId: string,
  courseId: string
): Promise<Progress[]> {
  const supabase = await createClient();
  // First get all lesson IDs for this course
  const { data: lessons } = await supabase
    .from('lessons')
    .select('id')
    .eq('course_id', courseId);

  if (!lessons || lessons.length === 0) return [];

  const lessonIds = lessons.map((l) => l.id);

  const { data, error } = await supabase
    .from('progress')
    .select('*')
    .eq('user_id', userId)
    .in('lesson_id', lessonIds);
  if (error) return [];
  return (data ?? []) as Progress[];
}

export async function markLessonComplete(
  userId: string,
  lessonId: string
): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from('progress')
    .upsert(
      { user_id: userId, lesson_id: lessonId, completed: true, completed_at: new Date().toISOString() },
      { onConflict: 'user_id,lesson_id' }
    );
  if (error) throw error;
}
