import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import type { Module, Lesson } from '@/types';

// ── Client-side CRUD ──────────────────────────────────────────────────────────

export interface CreateModuleInput {
  courseId: string;
  title: string;
  institutionId: string;
}

export async function createModule(
  supabase: SupabaseClient,
  input: CreateModuleInput,
): Promise<{ id: string; title: string; course_id: string; order_index: number }> {
  const { data: existing } = await supabase
    .from('modules')
    .select('order_index')
    .eq('course_id', input.courseId)
    .is('deleted_at', null)
    .order('order_index', { ascending: false })
    .limit(1);

  const nextIndex = existing?.[0]?.order_index != null ? existing[0].order_index + 1 : 0;

  const { data, error } = await supabase
    .from('modules')
    .insert({
      course_id: input.courseId,
      title: input.title,
      order_index: nextIndex,
    })
    .select('id, title, course_id, order_index')
    .single();

  if (error) throw error;
  return data;
}

export async function deleteModule(
  supabase: SupabaseClient,
  moduleId: string,
  _institutionId: string,
): Promise<void> {
  const { error } = await supabase
    .from('modules')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', moduleId);
  if (error) throw error;
}

// ── Server-side read helpers ───────────────────────────────────────────────────

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
