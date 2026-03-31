import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import type { Lesson, LessonBlock } from '@/types';

// ── Client-side CRUD ──────────────────────────────────────────────────────────

export interface CreateLessonInput {
  moduleId: string;
  title: string;
  institutionId: string;
}

export async function createLesson(
  supabase: SupabaseClient,
  input: CreateLessonInput,
): Promise<{ id: string; title: string; module_id: string; order_index: number }> {
  const { data: existing } = await supabase
    .from('lessons')
    .select('order_index')
    .eq('module_id', input.moduleId)
    .is('deleted_at', null)
    .order('order_index', { ascending: false })
    .limit(1);

  const nextIndex = existing?.[0]?.order_index != null ? existing[0].order_index + 1 : 0;

  const { data, error } = await supabase
    .from('lessons')
    .insert({
      module_id: input.moduleId,
      title: input.title,
      order_index: nextIndex,
      content_type: 'blocks',
    })
    .select('id, title, module_id, order_index')
    .single();

  if (error) throw error;
  return data;
}

export async function deleteLesson(
  supabase: SupabaseClient,
  lessonId: string,
): Promise<void> {
  const { error } = await supabase
    .from('lessons')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', lessonId);
  if (error) throw error;
}

// ── Server-side read helpers ───────────────────────────────────────────────────

export async function getLessonsByCourse(courseId: string): Promise<Lesson[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('lessons')
    .select('*')
    .eq('course_id', courseId)
    .order('order_index', { ascending: true });
  if (error) return [];
  return (data ?? []) as Lesson[];
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
  return (data ?? []) as LessonBlock[];
}
