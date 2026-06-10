import { createClient } from '@/lib/supabase/server';
import { getUserInstitutionId } from '@/lib/db/users';
import { getVisibleCourseIds } from '@/lib/db/course-assignments';
import { getTenantContext } from '@/lib/tenant/server';
import { getInstitutionBranding } from '@/lib/tenant/branding';
import { getMyCmeRequest, isEligibleForCme } from '@/lib/db';
import { getProgramsWithProgress } from '@/lib/db/programs';
import { CmeRequestBanner } from '@/components/student/cme-request-banner';
import { WelcomeBackBanner } from '@/components/student/welcome-back-banner';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { BookOpen, CheckCircle, TrendingUp, Target, GraduationCap, Award, Lock, Clock, Play } from 'lucide-react';
import { redirect } from 'next/navigation';

export default async function StudentPage() {
  const supabase = await createClient();
  const { institutionSlug, institutionId: tenantInstitutionId } = await getTenantContext();
  const branding = getInstitutionBranding(institutionSlug);
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect(`/${institutionSlug}/login`);

  let institutionId = await getUserInstitutionId(supabase, user.id);

  // Self-heal a missing institution_id from a TRUSTED source only — NEVER from the URL slug
  // (the user controls the URL; a wrong-tenant link must not reassign their institution).
  // Trusted order: signup metadata institution_slug -> a legacy record matching their email.
  if (!institutionId) {
    const metaSlug = String(
      user.user_metadata?.institution_slug ?? user.app_metadata?.institution_slug ?? '',
    ).toLowerCase().trim();
    let healId: string | null = null;
    if (metaSlug) {
      const { data: inst } = await supabase
        .from('institutions').select('id').eq('slug', metaSlug).maybeSingle();
      healId = (inst?.id as string | undefined) ?? null;
    }
    if (!healId && user.email) {
      const { data: legacy } = await supabase
        .from('legacy_users').select('institution_id')
        .eq('email', user.email.toLowerCase()).limit(1).maybeSingle();
      healId = (legacy?.institution_id as string | undefined) ?? null;
    }
    if (healId) {
      await supabase.from('users').update({ institution_id: healId }).eq('id', user.id);
      institutionId = healId;
    }
  }

  // No trusted institution could be determined — do not guess from the URL.
  if (!institutionId) {
    redirect(`/${institutionSlug}/login`);
  }

  // Tenant guard: send a student viewing a tenant that isn't theirs back to their own tenant.
  // Prevents wrong-tenant viewing and any URL-driven mis-scoping of courses/CME. platform_admin
  // never reaches /student (middleware bounces admins to /admin), so tenant-switching is unaffected.
  if (tenantInstitutionId && institutionId !== tenantInstitutionId) {
    const { data: ownInst } = await supabase
      .from('institutions').select('slug').eq('id', institutionId).maybeSingle();
    const ownSlug = (ownInst?.slug as string | undefined) ?? null;
    if (ownSlug && ownSlug !== institutionSlug) {
      redirect(`/${ownSlug}/student`);
    }
  }

  // Fetch user's display name
  const { data: userData } = await supabase
    .from('users')
    .select('full_name')
    .eq('id', user.id)
    .single();
  const firstName = userData?.full_name?.split(' ')[0] ?? '';

  // Check for a linked legacy record — to show the welcome-back banner once.
  // Students can read their own legacy row; defensive try/catch so a missing
  // table or RLS error never breaks the dashboard.
  let showWelcomeBanner = false;
  try {
    const { data: legacyRow } = await supabase
      .from('legacy_users')
      .select('id, welcome_acknowledged_at')
      .eq('linked_user_id', user.id)
      .maybeSingle();
    showWelcomeBanner = !!legacyRow && legacyRow.welcome_acknowledged_at == null;
  } catch {
    showWelcomeBanner = false;
  }

  // Get visible course IDs based on access_mode + assignments
  const visibleIds = await getVisibleCourseIds(supabase, user.id, institutionId);

  let coursesRaw: any[] = [];
  if (visibleIds.length > 0) {
    const { data: primary } = await supabase
      .from('courses')
      .select('id, title, description, slug, thumbnail_url, is_published, status, institution_id, display_order')
      .in('id', visibleIds);
    if (primary) {
      coursesRaw = primary;
    } else {
      // Defensive fallback if display_order isn't available yet
      const { data: fallback } = await supabase
        .from('courses')
        .select('id, title, description, slug, thumbnail_url, is_published, status, institution_id')
        .in('id', visibleIds);
      coursesRaw = (fallback ?? []).map((c) => ({ ...c, display_order: null }));
    }
  }

  // Sort by display_order (nulls last), then title
  const sortedCourses = coursesRaw.sort((a: any, b: any) => {
    const aOrder = a.display_order ?? Number.MAX_SAFE_INTEGER;
    const bOrder = b.display_order ?? Number.MAX_SAFE_INTEGER;
    if (aOrder !== bOrder) return aOrder - bOrder;
    return String(a.title ?? '').localeCompare(String(b.title ?? ''));
  });

  // Fetch enrollments for this student
  const { data: enrollments } = await supabase
    .from('course_enrollments')
    .select('course_id')
    .eq('user_id', user?.id ?? '');

  const enrolledIds = new Set((enrollments ?? []).map((e: any) => e.course_id));
  const enrolledCourseIds = Array.from(enrolledIds) as string[];

  // Fetch lesson counts for enrolled courses to compute progress
  const { data: lessonsData } = enrolledCourseIds.length > 0
    ? await supabase
        .from('lessons')
        .select('id, course_id')
        .in('course_id', enrolledCourseIds)
        .is('deleted_at', null)
    : { data: [] as { id: string; course_id: string }[] };

  const { data: progressData } = await supabase
    .from('progress')
    .select('lesson_id')
    .eq('user_id', user?.id ?? '')
    .eq('completed', true);

  const completedLessonIds = new Set((progressData ?? []).map((p: any) => p.lesson_id));

  const courseProgress: Record<string, { completed: number; total: number }> = {};
  for (const lesson of (lessonsData ?? [])) {
    if (!courseProgress[lesson.course_id]) {
      courseProgress[lesson.course_id] = { completed: 0, total: 0 };
    }
    courseProgress[lesson.course_id].total++;
    if (completedLessonIds.has(lesson.id)) {
      courseProgress[lesson.course_id].completed++;
    }
  }

  // Compute aggregate stats
  const enrolledCount = enrolledIds.size;
  const completedCourseCount = enrolledCourseIds.filter((id) => {
    const prog = courseProgress[id];
    return prog && prog.total > 0 && prog.completed === prog.total;
  }).length;
  const overallPercent = enrolledCount > 0
    ? Math.round(
        enrolledCourseIds.reduce((sum, id) => {
          const prog = courseProgress[id];
          return sum + (prog && prog.total > 0 ? (prog.completed / prog.total) * 100 : 0);
        }, 0) / enrolledCount
      )
    : 0;
  const totalLessonsCompleted = completedLessonIds.size;

  // CME certificate eligibility + current request (for the dashboard banner)
  // Authoritative eligibility = completed every catalog course (server RPC), matching what
  // request_cme_certificate enforces — avoids a banner/RPC mismatch under restricted visibility.
  const eligible = await isEligibleForCme(supabase, user.id, institutionId);
  const initialRequest = await getMyCmeRequest(supabase, user.id);
  const profileHref = `/${institutionSlug}/student/profile`;

  // Program progress — "X of Y courses complete" toward each program certificate
  const programProgress = institutionId
    ? await getProgramsWithProgress(supabase, institutionId, user.id).catch(() => [])
    : [];

  // "Continue where you left off" — most recently completed lesson in an enrolled,
  // not-yet-finished course. Defensive: never break the dashboard if this fails.
  let continueCourse: { id: string; title: string; percent: number } | null = null;
  try {
    const { data: recentRows } = await supabase
      .from('progress')
      .select('lesson_id, completed_at, lessons(course_id)')
      .eq('user_id', user.id)
      .order('completed_at', { ascending: false, nullsFirst: false })
      .limit(25);
    for (const row of recentRows ?? []) {
      const lessonRel = (row as any).lessons;
      const cid: string | undefined = Array.isArray(lessonRel)
        ? lessonRel[0]?.course_id
        : lessonRel?.course_id;
      if (!cid || !enrolledIds.has(cid)) continue;
      const prog = courseProgress[cid];
      const percent = prog && prog.total > 0 ? Math.round((prog.completed / prog.total) * 100) : 0;
      if (percent >= 100) continue;
      const c = sortedCourses.find((x: any) => x.id === cid);
      if (!c) continue;
      continueCourse = { id: cid, title: c.title, percent };
      break;
    }
  } catch {
    continueCourse = null;
  }

  // Due dates — effective due date per course = earliest non-null across the user's
  // direct assignments and group assignments. Defensive: empty on any failure.
  const dueDates: Record<string, string> = {};
  try {
    const { data: userAssigns } = await supabase
      .from('course_user_assignments')
      .select('course_id, due_date')
      .eq('user_id', user.id);
    let groupAssigns: any[] = [];
    const { data: memberships } = await supabase
      .from('user_group_members')
      .select('group_id')
      .eq('user_id', user.id);
    const groupIds = (memberships ?? []).map((m: any) => m.group_id).filter(Boolean);
    if (groupIds.length > 0) {
      const { data } = await supabase
        .from('course_group_assignments')
        .select('course_id, due_date')
        .in('group_id', groupIds);
      groupAssigns = data ?? [];
    }
    for (const a of [...(userAssigns ?? []), ...groupAssigns]) {
      if (!a?.course_id || !a?.due_date) continue;
      const existing = dueDates[a.course_id];
      if (!existing || new Date(a.due_date).getTime() < new Date(existing).getTime()) {
        dueDates[a.course_id] = a.due_date;
      }
    }
  } catch {
    // ignore — due-date badges are best-effort
  }
  const now = Date.now();

  // Sequential program locks — courses after the first incomplete course in a
  // sequential program are locked until the earlier ones are complete.
  const lockedCourseIds = new Set<string>();
  for (const program of programProgress) {
    if (!(program as any).sequential) continue;
    const completed = new Set(program.completedCourseIds);
    const firstIncompleteIdx = program.courses.findIndex((c) => !completed.has(c.id));
    if (firstIncompleteIdx === -1) continue;
    for (let i = firstIncompleteIdx + 1; i < program.courses.length; i++) {
      const c = program.courses[i];
      if (!completed.has(c.id)) lockedCourseIds.add(c.id);
    }
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Compact dark header — welcome + stats on one line */}
      <div className="bg-[#0F172A]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-col lg:flex-row lg:items-center gap-3">
          {/* Left: welcome */}
          <div className="shrink-0">
            <h2 className="text-lg font-black tracking-tight text-white leading-tight">
              {firstName ? `Welcome back, ${firstName}` : 'Capacity Building Curriculum'}
            </h2>
            <p className="text-slate-400 text-xs font-medium">
              {sortedCourses.length} modules · {branding.programTitle}
            </p>
          </div>

          {/* Right: stats */}
          <div className="flex flex-wrap gap-2 lg:ml-auto">
            <div className="bg-white/10 backdrop-blur rounded-lg px-3 py-2 flex items-center gap-2">
              <div className="rounded-full bg-[#0099CA]/20 p-1.5 shrink-0">
                <BookOpen className="h-3.5 w-3.5 text-[#0099CA]" />
              </div>
              <div>
                <p className="text-base font-black text-white leading-none">{enrolledCount}</p>
                <p className="text-[10px] font-medium text-slate-400">Enrolled</p>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur rounded-lg px-3 py-2 flex items-center gap-2">
              <div className="rounded-full bg-green-500/20 p-1.5 shrink-0">
                <CheckCircle className="h-3.5 w-3.5 text-green-400" />
              </div>
              <div>
                <p className="text-base font-black text-white leading-none">{completedCourseCount}</p>
                <p className="text-[10px] font-medium text-slate-400">Completed</p>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur rounded-lg px-3 py-2 flex items-center gap-2">
              <div className="rounded-full bg-[#DC2626]/20 p-1.5 shrink-0">
                <TrendingUp className="h-3.5 w-3.5 text-[#DC2626]" />
              </div>
              <div>
                <p className="text-base font-black text-white leading-none">{overallPercent}%</p>
                <p className="text-[10px] font-medium text-slate-400">Progress</p>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur rounded-lg px-3 py-2 flex items-center gap-2">
              <div className="rounded-full bg-[#1E3A5F]/60 p-1.5 shrink-0">
                <Target className="h-3.5 w-3.5 text-blue-300" />
              </div>
              <div>
                <p className="text-base font-black text-white leading-none">{totalLessonsCompleted}</p>
                <p className="text-[10px] font-medium text-slate-400">Lessons</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Welcome-back banner for legacy users (shown once, dismissed via RPC) */}
      {showWelcomeBanner && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
          <WelcomeBackBanner
            institutionName={branding.name}
            contactEmail={branding.contactEmail}
            institutionId={tenantInstitutionId ?? institutionId}
            userEmail={user.email ?? ''}
            userName={firstName || userData?.full_name || ''}
          />
        </div>
      )}

      {/* CME certificate banner */}
      {(eligible || initialRequest?.status === 'pending' || initialRequest?.status === 'issued') && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
          <CmeRequestBanner
            userId={user.id}
            eligible={eligible}
            initialRequest={initialRequest}
            profileHref={profileHref}
          />
        </div>
      )}

      {/* Program progress */}
      {programProgress.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-3">
          {programProgress.map((program) => {
            const done = program.completedCourseIds.length;
            const total = program.totalCourses;
            const percent = total > 0 ? Math.round((done / total) * 100) : 0;
            return (
              <Card key={program.id} className="border-none shadow-sm bg-white overflow-hidden">
                <CardContent className="p-4 sm:p-5">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className={`rounded-full p-2 shrink-0 ${program.earnedCertificate ? 'bg-green-50' : 'bg-slate-100'}`}>
                        <GraduationCap className={`h-5 w-5 ${program.earnedCertificate ? 'text-green-600' : 'text-[#1E3A5F]'}`} />
                      </div>
                      <div className="min-w-0">
                        <p className="font-black text-slate-900 text-sm truncate">{program.title}</p>
                        <p className="text-xs font-medium text-slate-500">
                          {program.earnedCertificate
                            ? 'Program complete — certificate earned'
                            : `${done} of ${total} courses complete`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 sm:w-72 shrink-0">
                      {program.earnedCertificate ? (
                        <Link
                          href={`/${institutionSlug}/student/certificates`}
                          className="inline-flex items-center gap-1.5 text-xs font-bold text-green-700 bg-green-50 hover:bg-green-100 px-3 py-1.5 rounded-full transition-colors"
                        >
                          <Award className="h-3.5 w-3.5" /> View certificate
                        </Link>
                      ) : (
                        <>
                          <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                            <div className="h-full rounded-full bg-[#DC2626] transition-all" style={{ width: `${percent}%` }} />
                          </div>
                          <span className="text-xs font-black text-slate-700 w-9 text-right">{percent}%</span>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Continue where you left off */}
      {continueCourse && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
          <Card className="border-none shadow-sm bg-white overflow-hidden">
            <CardContent className="p-4 sm:p-5">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="rounded-full bg-[#DC2626]/10 p-2 shrink-0">
                    <Play className="h-5 w-5 text-[#DC2626]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                      Continue where you left off
                    </p>
                    <p className="font-black text-slate-900 text-sm truncate">{continueCourse.title}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 sm:w-80 shrink-0">
                  <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[#0099CA] transition-all"
                      style={{ width: `${continueCourse.percent}%` }}
                    />
                  </div>
                  <span className="text-xs font-black text-slate-700 w-9 text-right">
                    {continueCourse.percent}%
                  </span>
                  <Link
                    href={`/${institutionSlug}/student/courses/${continueCourse.id}`}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-[#DC2626] hover:bg-[#B91C1C] px-4 py-2 rounded-full transition-colors shrink-0"
                  >
                    Continue
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Course grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {sortedCourses.length === 0 ? (
          <Card className="border-none shadow-sm bg-white">
            <CardContent className="flex flex-col items-center justify-center py-20">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-5">
                <BookOpen className="h-8 w-8 text-slate-300" />
              </div>
              <h3 className="text-lg font-black text-slate-700 mb-2">Courses Coming Soon</h3>
              <p className="text-slate-400 font-medium text-sm max-w-sm text-center">
                New training modules are being prepared for you. Check back soon to start your learning journey.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {sortedCourses.map((course: any) => {
              const moduleNum = course.display_order ?? null;
              const isEnrolled = enrolledIds.has(course.id);
              const prog = courseProgress[course.id];
              const progressPercent =
                prog?.total > 0 ? Math.round((prog.completed / prog.total) * 100) : 0;
              const isComplete = isEnrolled && progressPercent === 100;
              const isLocked = !isComplete && lockedCourseIds.has(course.id);
              const dueDate = !isComplete ? dueDates[course.id] : undefined;
              const isOverdue = dueDate ? new Date(dueDate).getTime() < now : false;

              const card = (
                  <Card className={`group transition-all duration-300 h-full overflow-hidden border border-slate-200 bg-white flex flex-col ${
                    isLocked ? 'opacity-60' : 'hover:shadow-lg hover:-translate-y-1 cursor-pointer'
                  }`}>

                    {/* Thumbnail */}
                    <div className="aspect-video w-full overflow-hidden relative bg-gradient-to-br from-[#1E3A5F] to-[#0F172A]">
                      {course.thumbnail_url ? (
                        <img
                          src={course.thumbnail_url}
                          alt={course.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <BookOpen className="h-14 w-14 text-white/30" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />

                      {/* Module badge */}
                      {moduleNum != null && (
                        <div className="absolute top-2.5 left-2.5">
                          <Badge className="bg-white/90 backdrop-blur text-[#0F172A] border-none font-bold text-[11px] px-2 py-0.5 shadow-sm">
                            Module {moduleNum}
                          </Badge>
                        </div>
                      )}

                      {/* Complete / lock / due badge */}
                      {isComplete ? (
                        <div className="absolute top-2.5 right-2.5">
                          <Badge className="bg-green-500 text-white border-none font-bold text-[11px] gap-1 px-2 py-0.5 shadow-sm">
                            <CheckCircle className="h-3 w-3" />
                            Complete
                          </Badge>
                        </div>
                      ) : isLocked ? (
                        <div className="absolute top-2.5 right-2.5">
                          <Badge className="bg-slate-700/90 backdrop-blur text-white border-none font-bold text-[10px] gap-1 px-2 py-0.5 shadow-sm">
                            <Lock className="h-3 w-3" />
                            Complete previous module first
                          </Badge>
                        </div>
                      ) : dueDate ? (
                        <div className="absolute top-2.5 right-2.5">
                          <Badge className={`border-none font-bold text-[11px] gap-1 px-2 py-0.5 shadow-sm text-white ${
                            isOverdue ? 'bg-red-600' : 'bg-amber-500'
                          }`}>
                            <Clock className="h-3 w-3" />
                            {isOverdue
                              ? 'Overdue'
                              : `Due ${new Date(dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
                          </Badge>
                        </div>
                      ) : null}
                    </div>

                    {/* Card body */}
                    <div className="p-4 flex flex-col flex-grow space-y-2">
                      <h3 className="font-semibold text-[#0F172A] text-sm leading-snug group-hover:text-[#DC2626] transition-colors">
                        {course.title}
                      </h3>
                      {course.description && (
                        <p className="text-sm text-slate-500 line-clamp-3 leading-relaxed">
                          {course.description}
                        </p>
                      )}

                      {/* Progress / CTA */}
                      <div className="pt-2 mt-auto border-t border-slate-100">
                        {isEnrolled ? (
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-semibold text-slate-600">{progressPercent}% complete</span>
                              {prog && <span className="text-slate-400">{prog.completed}/{prog.total} lessons</span>}
                            </div>
                            {!isComplete && (
                              <div className="w-full bg-slate-100 rounded-full h-1.5"
                                role="progressbar" aria-valuenow={progressPercent} aria-valuemin={0} aria-valuemax={100}
                                aria-label={`${course.title} progress`}>
                                <div
                                  className="h-full bg-[#0099CA] rounded-full transition-all duration-500 ease-out"
                                  style={{ width: `${progressPercent}%` }}
                                />
                              </div>
                            )}
                          </div>
                        ) : isLocked ? (
                          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest inline-flex items-center gap-1">
                            <Lock className="h-3 w-3" /> Locked
                          </span>
                        ) : (
                          <span className="text-xs font-bold text-[#DC2626] uppercase tracking-widest inline-flex items-center gap-1 transition-opacity group-hover:opacity-80">
                            Start Course <span className="inline-block transition-transform duration-300 group-hover:translate-x-1">&rarr;</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </Card>
              );

              return isLocked ? (
                <div
                  key={course.id}
                  aria-disabled="true"
                  title="Complete previous module first"
                  className="rounded-xl cursor-not-allowed"
                >
                  {card}
                </div>
              ) : (
                <Link key={course.id} href={`/${institutionSlug}/student/courses/${course.id}`}
                  className="rounded-xl focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2 focus-visible:outline-none">
                  {card}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
