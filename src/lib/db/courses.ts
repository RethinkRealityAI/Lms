import { createClient } from '@/lib/supabase/server';
import type { Course } from '@/types';

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

export async function getPublishedCourses(): Promise<Course[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('courses')
    .select('*, category:categories(*)')
    .eq('is_published', true)
    .order('created_at', { ascending: false });
  if (error) return [];
  return (data ?? []) as Course[];
}
