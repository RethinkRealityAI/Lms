import type { SupabaseClient } from '@supabase/supabase-js';

export async function getUserInstitutionId(supabase: SupabaseClient, userId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('users')
    .select('institution_id')
    .eq('id', userId)
    .single();
  if (error) return null;
  return data?.institution_id ?? null;
}

export interface ActiveUser {
  id: string;
  email: string;
  role: string;
  full_name: string | null;
  avatar_url: string | null;
  is_active: boolean | null;
  created_at: string;
  updated_at: string;
  enrollment_count: number;
  last_activity: string | null;
}

export async function getActiveUsers(
  supabase: SupabaseClient,
  institutionId: string,
): Promise<ActiveUser[]> {
  const { data, error } = await supabase
    .from('users')
    .select('id, email, role, full_name, avatar_url, is_active, created_at, updated_at')
    .eq('institution_id', institutionId)
    .order('created_at', { ascending: false });
  if (error || !data) return [];

  const userIds = data.map((u) => u.id);
  if (userIds.length === 0) return data.map((u) => ({ ...u, enrollment_count: 0, last_activity: null }));

  const { data: enrollments } = await supabase
    .from('course_enrollments')
    .select('user_id')
    .in('user_id', userIds);

  const enrollmentCounts: Record<string, number> = {};
  for (const e of enrollments ?? []) {
    enrollmentCounts[e.user_id] = (enrollmentCounts[e.user_id] || 0) + 1;
  }

  const { data: progress } = await supabase
    .from('progress')
    .select('user_id, completed_at')
    .in('user_id', userIds)
    .order('completed_at', { ascending: false });

  const lastActivity: Record<string, string> = {};
  for (const p of progress ?? []) {
    if (p.completed_at && !lastActivity[p.user_id]) {
      lastActivity[p.user_id] = p.completed_at;
    }
  }

  return data.map((u) => ({
    ...u,
    enrollment_count: enrollmentCounts[u.id] || 0,
    last_activity: lastActivity[u.id] || null,
  }));
}

/** Self-service profile update (RLS: own row only). Admins editing other users must use adminUpdateUserProfile. */
export async function updateUserDetails(
  supabase: SupabaseClient,
  userId: string,
  changes: { full_name?: string; bio?: string; occupation?: string; affiliation?: string; country?: string },
): Promise<void> {
  const { error } = await supabase
    .from('users')
    .update({ ...changes, updated_at: new Date().toISOString() })
    .eq('id', userId);
  if (error) throw error;
}

export interface UserCourseProgress {
  course_id: string;
  course_title: string;
  completed_lessons: number;
  total_lessons: number;
  certificate_number: string | null;
  certificate_issued_at: string | null;
  certificate_revoked_at: string | null;
}

/**
 * Per-course progress for a single user: enrolled courses (scoped to the
 * institution), completed vs total lessons, and any issued certificate.
 */
export async function getUserCourseProgress(
  supabase: SupabaseClient,
  userId: string,
  institutionId: string,
): Promise<UserCourseProgress[]> {
  const { data: enrollments, error } = await supabase
    .from('course_enrollments')
    .select('course_id, course:course_id(id, title, institution_id)')
    .eq('user_id', userId);
  if (error || !enrollments) return [];

  const courses = enrollments
    .map((e) => e.course as unknown as { id: string; title: string; institution_id: string } | null)
    .filter(
      (c): c is { id: string; title: string; institution_id: string } =>
        !!c && c.institution_id === institutionId,
    );
  if (courses.length === 0) return [];
  const courseIds = courses.map((c) => c.id);

  const [{ data: lessons }, { data: certs }] = await Promise.all([
    supabase
      .from('lessons')
      .select('id, course_id')
      .in('course_id', courseIds)
      .is('deleted_at', null),
    supabase
      .from('certificates')
      .select('course_id, certificate_number, issued_at, revoked_at')
      .eq('user_id', userId)
      .in('course_id', courseIds)
      .order('issued_at', { ascending: false }),
  ]);

  const lessonRows = (lessons ?? []) as { id: string; course_id: string }[];
  const lessonIds = lessonRows.map((l) => l.id);

  let completedLessonIds = new Set<string>();
  if (lessonIds.length > 0) {
    const { data: progress } = await supabase
      .from('progress')
      .select('lesson_id, completed_at')
      .eq('user_id', userId)
      .in('lesson_id', lessonIds);
    completedLessonIds = new Set(
      ((progress ?? []) as { lesson_id: string; completed_at: string | null }[])
        .filter((p) => p.completed_at)
        .map((p) => p.lesson_id),
    );
  }

  const totalByCourse: Record<string, number> = {};
  const completedByCourse: Record<string, number> = {};
  for (const l of lessonRows) {
    totalByCourse[l.course_id] = (totalByCourse[l.course_id] || 0) + 1;
    if (completedLessonIds.has(l.id)) {
      completedByCourse[l.course_id] = (completedByCourse[l.course_id] || 0) + 1;
    }
  }

  type CertRow = {
    course_id: string;
    certificate_number: string | null;
    issued_at: string | null;
    revoked_at: string | null;
  };
  // Prefer an active certificate; fall back to the most recent (possibly revoked) one.
  const certByCourse: Record<string, CertRow> = {};
  for (const cert of (certs ?? []) as CertRow[]) {
    const existing = certByCourse[cert.course_id];
    if (!existing || (existing.revoked_at && !cert.revoked_at)) {
      certByCourse[cert.course_id] = cert;
    }
  }

  return courses.map((c) => {
    const cert = certByCourse[c.id];
    return {
      course_id: c.id,
      course_title: c.title,
      completed_lessons: completedByCourse[c.id] || 0,
      total_lessons: totalByCourse[c.id] || 0,
      certificate_number: cert?.certificate_number ?? null,
      certificate_issued_at: cert?.issued_at ?? null,
      certificate_revoked_at: cert?.revoked_at ?? null,
    };
  });
}

export interface CourseOption {
  id: string;
  title: string;
}

/** Institution courses the user is NOT yet enrolled in (for admin enroll). */
export async function getEnrollableCourses(
  supabase: SupabaseClient,
  userId: string,
  institutionId: string,
): Promise<CourseOption[]> {
  const [{ data: courses }, { data: enrollments }] = await Promise.all([
    supabase
      .from('courses')
      .select('id, title')
      .eq('institution_id', institutionId)
      .order('title', { ascending: true }),
    supabase.from('course_enrollments').select('course_id').eq('user_id', userId),
  ]);
  const enrolled = new Set(((enrollments ?? []) as { course_id: string }[]).map((e) => e.course_id));
  return ((courses ?? []) as CourseOption[]).filter((c) => !enrolled.has(c.id));
}

export async function removeUserFromCourse(
  supabase: SupabaseClient,
  userId: string,
  courseId: string,
): Promise<void> {
  await supabase
    .from('course_enrollments')
    .delete()
    .eq('user_id', userId)
    .eq('course_id', courseId);
  const { data: lessons } = await supabase
    .from('lessons')
    .select('id')
    .eq('course_id', courseId)
    .is('deleted_at', null);
  if (lessons && lessons.length > 0) {
    await supabase
      .from('progress')
      .delete()
      .eq('user_id', userId)
      .in('lesson_id', lessons.map((l) => l.id));
  }
}
