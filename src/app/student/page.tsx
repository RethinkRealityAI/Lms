import { createClient } from '@/lib/supabase/server';
import { getUserInstitutionId } from '@/lib/db/users';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { BookOpen, CheckCircle, TrendingUp, Target } from 'lucide-react';
import { redirect } from 'next/navigation';

// Canonical module order for the GANSID Capacity Building Curriculum
const MODULE_ORDER: Record<string, number> = {
  '6b4906f1-803b-40bb-8582-d591220e5d09': 1,  // Fundamentals of Effective Advocacy
  '823fe330-1df4-42ee-89af-d7df079958f5': 2,  // Fundraising Strategies that Drive Results
  '9b228b9b-820f-4abb-92ac-d3a47091cab4': 3,  // Volunteer Management
  '27692b1f-819f-4cfc-b2a0-2ae516c378e5': 4,  // Leadership
  '73ab4867-f29a-4bd3-b9bf-5f84705d9747': 5,  // Project Management
  '4d759125-3682-4698-83ae-8ba5a0e7630b': 6,  // Effective Communication
  '5f779fd0-2926-4bd7-a085-5959df2a5c74': 7,  // Development of Impactful Strategic Work Plans
  'd4657dcc-be32-489e-aed3-d8e4297a8a65': 8,  // Grant Writing
  '2b746569-abd1-4b5f-805a-8015055f6e67': 9,  // Leadership: What Works and What Does Not Work
  'f109c2ea-a204-42cf-9849-50676d3b9f44': 10, // The Final Quiz
};

export default async function StudentPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/gansid/login');

  let institutionId = await getUserInstitutionId(supabase, user.id);

  // Self-heal: if institution_id is missing, set it to GANSID (default) instead of
  // redirect-looping to /login (which middleware bounces back here for authenticated users).
  if (!institutionId) {
    const GANSID_INSTITUTION_ID = '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a';
    await supabase
      .from('users')
      .update({ institution_id: GANSID_INSTITUTION_ID })
      .eq('id', user.id);
    institutionId = GANSID_INSTITUTION_ID;
  }

  // Fetch user's display name
  const { data: userData } = await supabase
    .from('users')
    .select('full_name')
    .eq('id', user.id)
    .single();
  const firstName = userData?.full_name?.split(' ')[0] ?? '';

  // Fetch all published courses for this institution
  const { data: allCourses } = await supabase
    .from('courses')
    .select('id, title, description, slug, thumbnail_url, is_published, status, institution_id')
    .eq('institution_id', institutionId)
    .eq('is_published', true);

  // Sort by canonical module order
  const sortedCourses = (allCourses ?? []).sort((a: any, b: any) => {
    const aOrder = MODULE_ORDER[a.id] ?? 999;
    const bOrder = MODULE_ORDER[b.id] ?? 999;
    return aOrder - bOrder;
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
              {sortedCourses.length} modules · GANSID Patient Advocacy Training
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
              const moduleNum = MODULE_ORDER[course.id];
              const isEnrolled = enrolledIds.has(course.id);
              const prog = courseProgress[course.id];
              const progressPercent =
                prog?.total > 0 ? Math.round((prog.completed / prog.total) * 100) : 0;
              const isComplete = isEnrolled && progressPercent === 100;

              return (
                <Link key={course.id} href={`/gansid/student/courses/${course.id}`}
                  className="rounded-xl focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2 focus-visible:outline-none">
                  <Card className="group hover:shadow-lg hover:-translate-y-1 transition-all duration-300 cursor-pointer h-full overflow-hidden border border-slate-200 bg-white flex flex-col">

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

                      {/* Complete badge */}
                      {isComplete && (
                        <div className="absolute top-2.5 right-2.5">
                          <Badge className="bg-green-500 text-white border-none font-bold text-[11px] gap-1 px-2 py-0.5 shadow-sm">
                            <CheckCircle className="h-3 w-3" />
                            Complete
                          </Badge>
                        </div>
                      )}
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
                        ) : (
                          <span className="text-xs font-bold text-[#DC2626] uppercase tracking-widest inline-flex items-center gap-1 transition-opacity group-hover:opacity-80">
                            Start Course <span className="inline-block transition-transform duration-300 group-hover:translate-x-1">&rarr;</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
