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
      .select('lesson_id, completed')
      .eq('user_id', userId)
      .eq('completed', true)
      .in('lesson_id', lessonIds);
    completedLessonIds = new Set(
      ((progress ?? []) as { lesson_id: string }[]).map((p) => p.lesson_id),
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

export interface LessonProgressDetail {
  id: string;
  title: string;
  order_index: number;
  completed: boolean;
  completed_at: string | null;
}

export interface UserCourseProgressDetailed extends UserCourseProgress {
  /** Earliest completed_at across lessons (or enrollment date if earlier / available). */
  started_at: string | null;
  /** Latest completed_at across lessons. */
  last_activity_at: string | null;
  /**
   * certificate_issued_at when a cert exists, otherwise last_activity_at when
   * the course is fully completed (completed_lessons === total_lessons > 0).
   */
  completed_at: string | null;
  /** All live lessons in order, merged with the user's progress rows. */
  lessons: LessonProgressDetail[];
}

/**
 * Per-course progress with full lesson-level detail for a single user.
 * Includes started_at / last_activity_at / completed_at derived timestamps
 * and an ordered lesson checklist.
 */
export async function getUserCourseProgressDetailed(
  supabase: SupabaseClient,
  userId: string,
  institutionId: string,
): Promise<UserCourseProgressDetailed[]> {
  // ── 1. Enrollments scoped to institution ───────────────────────────────────
  const { data: enrollments, error: enrErr } = await supabase
    .from('course_enrollments')
    .select('course_id, enrolled_at, course:course_id(id, title, institution_id)')
    .eq('user_id', userId);
  if (enrErr || !enrollments) return [];

  type EnrRow = {
    course_id: string;
    enrolled_at: string | null;
    course: { id: string; title: string; institution_id: string } | null;
  };

  const enrolledAt: Record<string, string | null> = {};
  const courses: { id: string; title: string }[] = [];
  for (const e of enrollments as unknown as EnrRow[]) {
    const c = e.course;
    if (!c || c.institution_id !== institutionId) continue;
    courses.push({ id: c.id, title: c.title });
    enrolledAt[c.id] = e.enrolled_at ?? null;
  }
  if (courses.length === 0) return [];

  const courseIds = courses.map((c) => c.id);

  // ── 2. Lessons, progress (with completed_at), and certificates in parallel ─
  const [{ data: lessonRows }, { data: progressRows }, { data: certRows }] = await Promise.all([
    supabase
      .from('lessons')
      .select('id, course_id, title, order_index')
      .in('course_id', courseIds)
      .is('deleted_at', null)
      .order('order_index', { ascending: true }),
    supabase
      .from('progress')
      .select('lesson_id, completed, completed_at')
      .eq('user_id', userId),
    supabase
      .from('certificates')
      .select('course_id, certificate_number, issued_at, revoked_at')
      .eq('user_id', userId)
      .in('course_id', courseIds)
      .order('issued_at', { ascending: false }),
  ]);

  type LessonRow = { id: string; course_id: string; title: string; order_index: number };
  type ProgressRow = { lesson_id: string; completed: boolean; completed_at: string | null };
  type CertRow = { course_id: string; certificate_number: string | null; issued_at: string | null; revoked_at: string | null };

  const lessons = (lessonRows ?? []) as LessonRow[];
  const progress = (progressRows ?? []) as ProgressRow[];
  const certs = (certRows ?? []) as CertRow[];

  // Build progress lookup by lesson_id
  const progressByLesson = new Map<string, ProgressRow>();
  for (const p of progress) progressByLesson.set(p.lesson_id, p);

  // Build lesson lists per course
  const lessonsByCourse = new Map<string, LessonRow[]>();
  for (const l of lessons) {
    const arr = lessonsByCourse.get(l.course_id) ?? [];
    arr.push(l);
    lessonsByCourse.set(l.course_id, arr);
  }

  // Certificate lookup: prefer active cert over revoked
  const certByCourse = new Map<string, CertRow>();
  for (const cert of certs) {
    const existing = certByCourse.get(cert.course_id);
    if (!existing || (existing.revoked_at && !cert.revoked_at)) {
      certByCourse.set(cert.course_id, cert);
    }
  }

  return courses.map((c) => {
    const courseLessons = lessonsByCourse.get(c.id) ?? [];
    const totalLessons = courseLessons.length;

    // Build per-lesson detail + collect timestamps
    const lessonDetails: LessonProgressDetail[] = [];
    const completedTimes: number[] = [];

    for (const l of courseLessons) {
      const p = progressByLesson.get(l.id);
      const completed = p?.completed === true;
      const completedAt = p?.completed_at ?? null;
      lessonDetails.push({
        id: l.id,
        title: l.title,
        order_index: l.order_index,
        completed,
        completed_at: completedAt,
      });
      if (completed && completedAt) {
        completedTimes.push(new Date(completedAt).getTime());
      }
    }

    const completedLessons = lessonDetails.filter((l) => l.completed).length;
    const cert = certByCourse.get(c.id);

    // started_at: earliest completed_at, or enrollment date if earlier / no activity yet
    let startedAt: string | null = null;
    if (completedTimes.length > 0) {
      const earliest = new Date(Math.min(...completedTimes)).toISOString();
      const enr = enrolledAt[c.id];
      if (enr && new Date(enr).getTime() < new Date(earliest).getTime()) {
        startedAt = enr;
      } else {
        startedAt = earliest;
      }
    } else {
      startedAt = enrolledAt[c.id] ?? null;
    }

    // last_activity_at: latest completed_at
    const lastActivityAt =
      completedTimes.length > 0
        ? new Date(Math.max(...completedTimes)).toISOString()
        : null;

    // completed_at: cert issued_at, else last_activity_at when fully done
    let completedAt: string | null = null;
    if (cert?.issued_at && !cert.revoked_at) {
      completedAt = cert.issued_at;
    } else if (completedLessons === totalLessons && totalLessons > 0) {
      completedAt = lastActivityAt;
    }

    return {
      course_id: c.id,
      course_title: c.title,
      completed_lessons: completedLessons,
      total_lessons: totalLessons,
      certificate_number: cert?.certificate_number ?? null,
      certificate_issued_at: cert?.issued_at ?? null,
      certificate_revoked_at: cert?.revoked_at ?? null,
      started_at: startedAt,
      last_activity_at: lastActivityAt,
      completed_at: completedAt,
      lessons: lessonDetails,
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
