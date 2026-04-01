import type { SupabaseClient } from '@supabase/supabase-js';

// ── Types ────────────────────────────────────────────────────────────────────

export interface PlatformStats {
  total_institutions: number;
  total_users: number;
  total_students: number;
  total_admins: number;
  total_courses: number;
  published_courses: number;
  total_enrollments: number;
  total_completions: number;
  total_certificates: number;
  total_quiz_attempts: number;
  avg_quiz_score: number;
  monthly_active_users: number;
  completion_rate: number;
}

export interface CourseStats {
  id: string;
  title: string;
  is_published: boolean;
  created_at: string;
  enrollment_count: number;
  lesson_count: number;
  completion_count: number;
  completion_rate: number;
  avg_progress: number;
  quiz_attempts: number;
  avg_quiz_score: number;
  review_count: number;
  avg_rating: number;
  certificate_count: number;
}

export interface EnrollmentTrend {
  day: string;
  enrollments: number;
}

export interface CompletionTrend {
  day: string;
  completions: number;
}

export interface StudentProgress {
  user_id: string;
  email: string;
  full_name: string | null;
  enrollment_count: number;
  completed_lessons: number;
  quiz_attempts: number;
  avg_quiz_score: number;
  certificates_earned: number;
  last_activity: string | null;
}

// ── Query helpers ────────────────────────────────────────────────────────────

export async function getPlatformStats(
  supabase: SupabaseClient,
): Promise<PlatformStats | null> {
  const { data, error } = await supabase
    .from('v_platform_stats')
    .select('*')
    .single();
  if (error) return null;
  return data as PlatformStats;
}

export async function getCourseStats(
  supabase: SupabaseClient,
): Promise<CourseStats[]> {
  const { data, error } = await supabase
    .from('v_course_stats')
    .select('*')
    .order('enrollment_count', { ascending: false });
  if (error) return [];
  return (data ?? []) as CourseStats[];
}

export async function getEnrollmentTrend(
  supabase: SupabaseClient,
): Promise<EnrollmentTrend[]> {
  const { data, error } = await supabase
    .from('v_enrollment_trend')
    .select('*')
    .order('day', { ascending: true });
  if (error) return [];
  return (data ?? []) as EnrollmentTrend[];
}

export async function getCompletionTrend(
  supabase: SupabaseClient,
): Promise<CompletionTrend[]> {
  const { data, error } = await supabase
    .from('v_completion_trend')
    .select('*')
    .order('day', { ascending: true });
  if (error) return [];
  return (data ?? []) as CompletionTrend[];
}

export async function getStudentProgress(
  supabase: SupabaseClient,
): Promise<StudentProgress[]> {
  const { data, error } = await supabase
    .from('v_student_progress')
    .select('*')
    .order('completed_lessons', { ascending: false });
  if (error) return [];
  return (data ?? []) as StudentProgress[];
}

export async function getStudentProgressById(
  supabase: SupabaseClient,
  userId: string,
): Promise<StudentProgress | null> {
  const { data, error } = await supabase
    .from('v_student_progress')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) return null;
  return data as StudentProgress | null;
}
