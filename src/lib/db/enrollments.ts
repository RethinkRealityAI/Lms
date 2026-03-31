import type { SupabaseClient } from '@supabase/supabase-js';
import type { CourseEnrollment } from '@/types';

export async function getEnrollment(
  supabase: SupabaseClient,
  userId: string,
  courseId: string
): Promise<CourseEnrollment | null> {
  const { data, error } = await supabase
    .from('course_enrollments')
    .select('*')
    .eq('user_id', userId)
    .eq('course_id', courseId)
    .single();
  if (error) return null;
  return data as CourseEnrollment;
}

export async function getEnrolledCourseIds(
  supabase: SupabaseClient,
  userId: string,
): Promise<string[]> {
  const { data, error } = await supabase
    .from('course_enrollments')
    .select('course_id')
    .eq('user_id', userId);
  if (error) return [];
  return (data ?? []).map((e) => e.course_id);
}
