import { createClient } from '@/lib/supabase/server';
import type { Lesson, LessonBlock } from '@/types';

export async function getLessonsByCourse(courseId: string): Promise<Lesson[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('lessons')
    .select('*')
    .eq('course_id', courseId)
    .order('order_index', { ascending: true });
  if (error) return [];
  return data as Lesson[];
}

export async function getLessonById(id: string): Promise<Lesson | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('lessons')
    .select('*')
    .eq('id', id)
    .single();
  if (error) return null;
  return data as Lesson;
}

export async function getBlocksByLesson(lessonId: string): Promise<LessonBlock[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('lesson_blocks')
    .select('*')
    .eq('lesson_id', lessonId)
    .order('order_index', { ascending: true });
  if (error) return [];
  return data as LessonBlock[];
}
