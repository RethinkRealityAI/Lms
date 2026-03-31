import { createClient } from '@/lib/supabase/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Course, CourseStatus } from '@/types';
import { logActivity } from './activity-log';

export async function getCourseById(id: string): Promise<Course | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('courses')
    .select('*, category:categories(*)')
    .eq('id', id)
    .single();
  if (error) return null;
  return data as Course;
}

export async function getCoursesByInstitution(institutionId: string): Promise<Course[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('courses')
    .select('*, category:categories(*)')
    .eq('institution_id', institutionId)
    .order('created_at', { ascending: false });
  if (error) return [];
  return (data ?? []) as Course[];
}

export async function getCourseStatus(
  supabase: SupabaseClient,
  courseId: string,
  institutionId: string,
): Promise<CourseStatus> {
  const { data, error } = await supabase
    .from('courses')
    .select('status')
    .eq('id', courseId)
    .eq('institution_id', institutionId)
    .single();
  if (error) throw error;
  return (data?.status as CourseStatus) ?? 'draft';
}

export async function publishCourse(
  supabase: SupabaseClient,
  courseId: string,
  institutionId: string,
): Promise<void> {
  const { error: courseErr } = await supabase
    .from('courses')
    .update({ status: 'published' })
    .eq('id', courseId)
    .eq('institution_id', institutionId);
  if (courseErr) throw courseErr;

  // Get all module IDs for this course
  const { data: modules, error: modErr } = await supabase
    .from('modules')
    .select('id')
    .eq('course_id', courseId)
    .is('deleted_at', null);
  if (modErr) throw modErr;

  const moduleIds = (modules ?? []).map((m: { id: string }) => m.id);
  if (moduleIds.length === 0) return;

  // Get all lesson IDs for those modules
  const { data: lessons, error: lesErr } = await supabase
    .from('lessons')
    .select('id')
    .in('module_id', moduleIds)
    .is('deleted_at', null);
  if (lesErr) throw lesErr;

  const lessonIds = (lessons ?? []).map((l: { id: string }) => l.id);
  if (lessonIds.length === 0) return;

  // Get all slide IDs for those lessons
  const { data: slides, error: slideSelectErr } = await supabase
    .from('slides')
    .select('id')
    .in('lesson_id', lessonIds)
    .is('deleted_at', null);
  if (slideSelectErr) throw slideSelectErr;

  const slideIds = (slides ?? []).map((s: { id: string }) => s.id);
  if (slideIds.length === 0) return;

  // Publish all slides
  const { error: slideErr } = await supabase
    .from('slides')
    .update({ status: 'published' })
    .in('id', slideIds);
  if (slideErr) throw slideErr;

  await logActivity(supabase, {
    institutionId,
    entityType: 'course',
    entityId: courseId,
    action: 'publish',
  });
}

export async function getPublishedCourses(): Promise<Course[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('courses')
    .select('*, category:categories(*)')
    .eq('status', 'published')
    .order('created_at', { ascending: false });
  if (error) return [];
  return (data ?? []) as Course[];
}
