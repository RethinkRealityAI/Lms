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

export interface LessonFunnelRow {
  lesson_id: string;
  title: string;
  order_index: number;
  /** distinct users with completed progress on this lesson */
  completed_count: number;
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
  // v_course_stats uses course_id/course_title/avg_progress_pct/... — map to the CourseStats shape
  // (a blind cast leaves c.id/c.title/c.avg_progress undefined at runtime).
  return (data ?? []).map((r: Record<string, unknown>) => ({
    id: r.course_id as string,
    title: (r.course_title as string) ?? '',
    is_published: Boolean(r.is_published),
    created_at: r.created_at as string,
    enrollment_count: Number(r.enrollment_count) || 0,
    lesson_count: Number(r.lesson_count) || 0,
    completion_count: Number(r.completed_lesson_count) || 0,
    completion_rate: Number(r.completion_rate) || 0,
    avg_progress: Number(r.avg_progress_pct) || 0,
    quiz_attempts: Number(r.quiz_attempt_count) || 0,
    avg_quiz_score: Number(r.avg_quiz_score) || 0,
    review_count: Number(r.review_count) || 0,
    avg_rating: Number(r.avg_rating) || 0,
    certificate_count: Number(r.certificate_count) || 0,
  })) as CourseStats[];
}

export async function getEnrollmentTrend(
  supabase: SupabaseClient,
  institutionId: string,
  days = 90,
): Promise<EnrollmentTrend[]> {
  // The v_enrollment_trend view has no institution_id column.
  // Query course_enrollments directly, joining through courses for filtering.
  const windowDays = Math.min(Math.max(days, 7), 365);
  const rangeStart = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0];

  const { data, error } = await supabase
    .from('course_enrollments')
    .select('enrolled_at, courses!inner(institution_id)')
    .eq('courses.institution_id', institutionId)
    .gte('enrolled_at', rangeStart);

  if (error || !data) return [];

  // Group by day and fill gaps
  const countsByDay = new Map<string, number>();
  for (const row of data) {
    const day = new Date(row.enrolled_at).toISOString().split('T')[0];
    countsByDay.set(day, (countsByDay.get(day) ?? 0) + 1);
  }

  // Generate all days in range
  const result: EnrollmentTrend[] = [];
  const start = new Date(rangeStart);
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
  days = 90,
): Promise<CompletionTrend[]> {
  // The v_completion_trend view has no institution_id column.
  // Query progress directly, joining through lessons → courses for filtering.
  const windowDays = Math.min(Math.max(days, 7), 365);
  const rangeStart = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0];

  const { data, error } = await supabase
    .from('progress')
    .select('completed_at, lessons!inner(courses!inner(institution_id))')
    .eq('completed', true)
    .eq('lessons.courses.institution_id', institutionId)
    .gte('completed_at', rangeStart);

  if (error || !data) return [];

  // Group by day and fill gaps
  const countsByDay = new Map<string, number>();
  for (const row of data) {
    if (!row.completed_at) continue;
    const day = new Date(row.completed_at).toISOString().split('T')[0];
    countsByDay.set(day, (countsByDay.get(day) ?? 0) + 1);
  }

  const result: CompletionTrend[] = [];
  const start = new Date(rangeStart);
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

/**
 * Per-lesson completion funnel for a course: lessons in order with the count
 * of distinct users who completed each lesson — shows where learners drop off.
 */
export async function getLessonFunnel(
  supabase: SupabaseClient,
  courseId: string,
): Promise<LessonFunnelRow[]> {
  const { data: lessons, error: lessonsError } = await supabase
    .from('lessons')
    .select('id, title, order_index')
    .eq('course_id', courseId)
    .is('deleted_at', null)
    .order('order_index', { ascending: true });

  if (lessonsError || !lessons || lessons.length === 0) return [];

  const lessonIds = lessons.map((l) => l.id);
  const { data: progressRows, error: progressError } = await supabase
    .from('progress')
    .select('lesson_id, user_id')
    .eq('completed', true)
    .in('lesson_id', lessonIds);

  const usersByLesson = new Map<string, Set<string>>();
  if (!progressError) {
    for (const row of progressRows ?? []) {
      if (!row.lesson_id || !row.user_id) continue;
      let set = usersByLesson.get(row.lesson_id);
      if (!set) {
        set = new Set<string>();
        usersByLesson.set(row.lesson_id, set);
      }
      set.add(row.user_id);
    }
  }

  return lessons.map((l) => ({
    lesson_id: l.id,
    title: l.title ?? 'Untitled lesson',
    order_index: Number(l.order_index) || 0,
    completed_count: usersByLesson.get(l.id)?.size ?? 0,
  }));
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
