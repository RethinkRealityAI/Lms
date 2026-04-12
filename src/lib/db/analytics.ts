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

/**
 * Build platform-level stats scoped to a single institution.
 *
 * The `v_platform_stats` view is a global aggregate with no institution_id
 * column, so we derive the numbers from institution-filtered queries and
 * the already-filtered course / student views.
 */
export async function getPlatformStats(
  supabase: SupabaseClient,
  institutionId: string,
): Promise<PlatformStats | null> {
  // Fetch institution-scoped course stats and student progress first —
  // we can derive several platform stats from them.
  const [courseStats, studentProgress] = await Promise.all([
    getCourseStats(supabase, institutionId),
    getStudentProgress(supabase, institutionId),
  ]);

  // Direct institution-scoped counts for things not derivable from the views
  const [
    usersRes,
    studentsRes,
    adminsRes,
    certificatesRes,
    quizAttemptsRes,
    reviewsRes,
    avgRatingRes,
    monthlyActiveRes,
  ] = await Promise.all([
    supabase
      .from('users')
      .select('id', { count: 'exact', head: true })
      .eq('institution_id', institutionId),
    supabase
      .from('users')
      .select('id', { count: 'exact', head: true })
      .eq('institution_id', institutionId)
      .eq('role', 'student'),
    supabase
      .from('users')
      .select('id', { count: 'exact', head: true })
      .eq('institution_id', institutionId)
      .in('role', ['institution_admin', 'instructor', 'admin', 'platform_admin']),
    supabase
      .from('certificates')
      .select('id, courses!inner(institution_id)', { count: 'exact', head: true })
      .eq('courses.institution_id', institutionId),
    supabase
      .from('quiz_attempts')
      .select('id, quizzes!inner(lessons!inner(courses!inner(institution_id)))', { count: 'exact', head: true })
      .eq('quizzes.lessons.courses.institution_id', institutionId),
    supabase
      .from('course_reviews')
      .select('id, courses!inner(institution_id)', { count: 'exact', head: true })
      .eq('courses.institution_id', institutionId),
    supabase
      .from('course_reviews')
      .select('rating, courses!inner(institution_id)')
      .eq('courses.institution_id', institutionId),
    // Monthly active: users in this institution who had activity in the last 30 days
    supabase
      .from('users')
      .select('id', { count: 'exact', head: true })
      .eq('institution_id', institutionId)
      .gte('updated_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
  ]);

  const totalEnrollments = courseStats.reduce(
    (sum, c) => sum + (Number(c.enrollment_count) || 0),
    0,
  );
  const totalCompletions = studentProgress.reduce(
    (sum, s) => sum + (Number(s.completed_lessons) || 0),
    0,
  );

  // Compute avg quiz score from reviews result
  const ratings = avgRatingRes.data ?? [];
  const avgScore =
    ratings.length > 0
      ? ratings.reduce((sum: number, r: { rating: number }) => sum + Number(r.rating), 0) / ratings.length
      : 0;

  // Compute completion rate: fully completed enrollments / total enrollments
  const completionRate =
    totalEnrollments > 0
      ? Math.round(
          (courseStats.reduce(
            (sum, c) =>
              sum +
              (Number(c.enrollment_count) > 0
                ? (Number(c.completion_rate) / 100) * Number(c.enrollment_count)
                : 0),
            0,
          ) /
            totalEnrollments) *
            100,
        )
      : 0;

  return {
    total_institutions: 1, // Scoped to a single institution
    total_users: usersRes.count ?? 0,
    total_students: studentsRes.count ?? 0,
    total_admins: adminsRes.count ?? 0,
    total_courses: courseStats.length,
    published_courses: courseStats.filter((c) => c.is_published).length,
    total_enrollments: totalEnrollments,
    total_completions: totalCompletions,
    total_certificates: certificatesRes.count ?? 0,
    total_quiz_attempts: quizAttemptsRes.count ?? 0,
    avg_quiz_score: avgScore,
    monthly_active_users: monthlyActiveRes.count ?? 0,
    completion_rate: completionRate,
  };
}

export async function getCourseStats(
  supabase: SupabaseClient,
  institutionId: string,
): Promise<CourseStats[]> {
  const { data, error } = await supabase
    .from('v_course_stats')
    .select('*')
    .eq('institution_id', institutionId)
    .order('enrollment_count', { ascending: false });
  if (error) return [];
  return (data ?? []) as CourseStats[];
}

export async function getEnrollmentTrend(
  supabase: SupabaseClient,
  institutionId: string,
): Promise<EnrollmentTrend[]> {
  // The v_enrollment_trend view has no institution_id column.
  // Query course_enrollments directly, joining through courses for filtering.
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0];

  const { data, error } = await supabase
    .from('course_enrollments')
    .select('enrolled_at, courses!inner(institution_id)')
    .eq('courses.institution_id', institutionId)
    .gte('enrolled_at', ninetyDaysAgo);

  if (error || !data) return [];

  // Group by day and fill gaps
  const countsByDay = new Map<string, number>();
  for (const row of data) {
    const day = new Date(row.enrolled_at).toISOString().split('T')[0];
    countsByDay.set(day, (countsByDay.get(day) ?? 0) + 1);
  }

  // Generate all days in range
  const result: EnrollmentTrend[] = [];
  const start = new Date(ninetyDaysAgo);
  const end = new Date();
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const day = d.toISOString().split('T')[0];
    result.push({ day, enrollments: countsByDay.get(day) ?? 0 });
  }
  return result;
}

export async function getCompletionTrend(
  supabase: SupabaseClient,
  institutionId: string,
): Promise<CompletionTrend[]> {
  // The v_completion_trend view has no institution_id column.
  // Query progress directly, joining through lessons → courses for filtering.
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0];

  const { data, error } = await supabase
    .from('progress')
    .select('completed_at, lessons!inner(courses!inner(institution_id))')
    .eq('completed', true)
    .eq('lessons.courses.institution_id', institutionId)
    .gte('completed_at', ninetyDaysAgo);

  if (error || !data) return [];

  // Group by day and fill gaps
  const countsByDay = new Map<string, number>();
  for (const row of data) {
    if (!row.completed_at) continue;
    const day = new Date(row.completed_at).toISOString().split('T')[0];
    countsByDay.set(day, (countsByDay.get(day) ?? 0) + 1);
  }

  const result: CompletionTrend[] = [];
  const start = new Date(ninetyDaysAgo);
  const end = new Date();
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const day = d.toISOString().split('T')[0];
    result.push({ day, completions: countsByDay.get(day) ?? 0 });
  }
  return result;
}

export async function getStudentProgress(
  supabase: SupabaseClient,
  institutionId: string,
): Promise<StudentProgress[]> {
  const { data, error } = await supabase
    .from('v_student_progress')
    .select('*')
    .eq('institution_id', institutionId)
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
