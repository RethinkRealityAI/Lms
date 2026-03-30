import { createClient } from '@/lib/supabase/server';
import type { Module, Lesson } from '@/types';

export async function getModulesByCourse(courseId: string): Promise<Module[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('modules')
    .select('*')
    .eq('course_id', courseId)
    .eq('is_published', true)
    .order('order_index', { ascending: true });
  if (error) return [];
  return (data ?? []) as Module[];
}

export async function getModulesWithLessonsByCourse(
  courseId: string
): Promise<(Module & { lessons: Lesson[] })[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('modules')
    .select('*, lessons(*)')
    .eq('course_id', courseId)
    .eq('is_published', true)
    .order('order_index', { ascending: true });
  if (error) return [];
  return (data ?? []) as unknown as (Module & { lessons: Lesson[] })[];
}
