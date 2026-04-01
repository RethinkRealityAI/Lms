'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { CheckCircle, Trophy, Target, BookOpen, TrendingUp, ClipboardList, GraduationCap } from 'lucide-react';

export default function StudentProgressPage() {
  const [loading, setLoading] = useState(true);
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [allLessons, setAllLessons] = useState<any[]>([]);
  const [completedLessons, setCompletedLessons] = useState<any[]>([]);
  const [quizAttempts, setQuizAttempts] = useState<any[]>([]);
  const supabase = createClient();

  useEffect(() => {
    loadProgress();
  }, []);

  const loadProgress = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    // Get enrollments with course details
    const { data: enrollmentData } = await supabase
      .from('course_enrollments')
      .select('*, courses(*)')
      .eq('user_id', user.id);
    setEnrollments(enrollmentData || []);

    // Get all lessons for enrolled courses
    const courseIds = (enrollmentData || []).map((e: any) => e.course_id);
    if (courseIds.length > 0) {
      const { data: lessonData } = await supabase
        .from('lessons')
        .select('*')
        .in('course_id', courseIds);
      setAllLessons(lessonData || []);
    }

    // Get completed lessons
    const { data: completedData } = await supabase
      .from('progress')
      .select('*, lessons(*, courses(id, title))')
      .eq('user_id', user.id)
      .eq('completed', true)
      .order('completed_at', { ascending: false });
    setCompletedLessons(completedData || []);

    // Get quiz attempts
    const { data: quizData } = await supabase
      .from('quiz_attempts')
      .select('*, quizzes(title, lesson_id, lessons(title, course_id, courses(title)))')
      .eq('user_id', user.id)
      .order('completed_at', { ascending: false });
    setQuizAttempts(quizData || []);

    setLoading(false);
  };

  // Calculate overall stats
  const totalEnrollments = enrollments.length;
  const totalCompletedLessons = completedLessons.length;
  const averageScore = quizAttempts.length > 0
    ? Math.round(
        quizAttempts.reduce((acc: number, attempt: any) =>
          acc + (attempt.score / attempt.total_questions) * 100, 0
        ) / quizAttempts.length
      )
    : 0;

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <div className="bg-[#0F172A] px-4 sm:px-6 lg:px-8 py-10">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-black tracking-tight text-white mb-2">My Progress</h2>
          <p className="text-slate-400 font-medium">Track your learning journey and achievements.</p>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

      {loading ? (
        /* Loading skeleton */
        <>
          <div className="grid gap-6 md:grid-cols-3">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="bg-white border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <Skeleton className="h-4 w-28 bg-slate-200" />
                  <Skeleton className="h-8 w-8 rounded-lg bg-slate-200" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-16 bg-slate-200 mb-2" />
                  <Skeleton className="h-3 w-24 bg-slate-200" />
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="grid gap-8 lg:grid-cols-2">
            <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white">
              <CardHeader className="border-b border-slate-50">
                <Skeleton className="h-6 w-36 bg-slate-200" />
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-5 w-3/4 bg-slate-200" />
                    <Skeleton className="h-2 w-full bg-slate-200 rounded-full" />
                  </div>
                ))}
              </CardContent>
            </Card>
            <div className="space-y-8">
              {[...Array(2)].map((_, i) => (
                <Card key={i} className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white overflow-hidden">
                  <CardHeader className="border-b border-slate-50 bg-slate-50/30">
                    <Skeleton className="h-6 w-40 bg-slate-200" />
                  </CardHeader>
                  <CardContent className="pt-6 space-y-4">
                    {[...Array(3)].map((_, j) => (
                      <div key={j} className="flex justify-between items-center">
                        <Skeleton className="h-4 w-2/3 bg-slate-200" />
                        <Skeleton className="h-6 w-12 rounded-full bg-slate-200" />
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </>
      ) : totalEnrollments === 0 ? (
        /* Full empty state — no enrollments at all */
        <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white overflow-hidden">
          <CardContent className="flex flex-col items-center justify-center py-24">
            <div className="w-20 h-20 bg-gradient-to-br from-slate-50 to-slate-100 rounded-full flex items-center justify-center mb-6">
              <TrendingUp className="h-10 w-10 text-slate-300" />
            </div>
            <h3 className="text-lg font-black text-slate-900 mb-2">No Progress Yet</h3>
            <p className="text-slate-400 font-medium text-center mb-8 max-w-sm">
              Enroll in a course to start tracking your learning journey. Your progress, quiz scores, and completed lessons will appear here.
            </p>
            <Button asChild className="bg-[#DC2626] hover:bg-[#B91C1C] font-bold px-8 rounded-xl h-12 shadow-lg shadow-red-100">
              <Link href="/gansid/student">Browse Courses</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        /* Data loaded — show stats and progress */
        <>
      {/* Stats Overview */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="bg-white border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden relative">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-full -mr-8 -mt-8 transition-transform group-hover:scale-110" />
          <CardHeader className="flex flex-row items-center justify-between pb-2 relative">
            <CardTitle className="text-xs font-black uppercase tracking-widest text-slate-500">Enrolled Courses</CardTitle>
            <div className="h-8 w-8 bg-blue-50 rounded-lg flex items-center justify-center">
              <Target className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-3xl font-black text-slate-900">{totalEnrollments}</div>
            <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase">Active Learning Paths</p>
          </CardContent>
        </Card>

        <Card className="bg-white border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden relative">
          <div className="absolute top-0 right-0 w-24 h-24 bg-green-50 rounded-full -mr-8 -mt-8 transition-transform group-hover:scale-110" />
          <CardHeader className="flex flex-row items-center justify-between pb-2 relative">
            <CardTitle className="text-xs font-black uppercase tracking-widest text-slate-500">Completed Lessons</CardTitle>
            <div className="h-8 w-8 bg-green-50 rounded-lg flex items-center justify-center">
              <CheckCircle className="h-4 w-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-3xl font-black text-slate-900">{totalCompletedLessons}</div>
            <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase">Knowledge Milestones</p>
          </CardContent>
        </Card>

        <Card className="bg-white border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden relative">
          <div className="absolute top-0 right-0 w-24 h-24 bg-orange-50 rounded-full -mr-8 -mt-8 transition-transform group-hover:scale-110" />
          <CardHeader className="flex flex-row items-center justify-between pb-2 relative">
            <CardTitle className="text-xs font-black uppercase tracking-widest text-slate-500">Average Quiz Score</CardTitle>
            <div className="h-8 w-8 bg-orange-50 rounded-lg flex items-center justify-center">
              <Trophy className="h-4 w-4 text-orange-600" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-3xl font-black text-slate-900">{quizAttempts.length > 0 ? `${averageScore}%` : '\u2014'}</div>
            <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase">Academic Performance</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Course Progress */}
        <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white">
          <CardHeader className="border-b border-slate-50">
            <CardTitle className="text-lg font-black text-slate-900">Course Progress</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-6">
              {enrollments.map((enrollment: any) => {
                const totalCourseLessons = allLessons.filter(
                  (lesson: any) => lesson.course_id === enrollment.course_id
                );
                const completedCourseLessons = completedLessons.filter(
                  (cl: any) => cl.lessons?.courses?.id === enrollment.course_id
                );
                const progressValue = totalCourseLessons.length > 0
                  ? Math.round((completedCourseLessons.length / totalCourseLessons.length) * 100)
                  : 0;

                return (
                  <div key={enrollment.id} className="group">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <h4 className="font-bold text-slate-900 group-hover:text-[#2563EB] transition-colors line-clamp-1">{enrollment.courses.title}</h4>
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mt-0.5">
                          <BookOpen className="h-3 w-3" />
                          {completedCourseLessons.length} / {totalCourseLessons.length} Modules
                        </p>
                      </div>
                      <span className="text-lg font-black text-[#2563EB]">{progressValue}%</span>
                    </div>
                    <Progress value={progressValue} className="h-2 bg-slate-100" />
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-8">
          {/* Recent Quiz Attempts */}
          <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white overflow-hidden">
            <CardHeader className="border-b border-slate-50 bg-slate-50/30">
              <CardTitle className="text-lg font-black text-slate-900">Recent Assessments</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-slate-50">
                {quizAttempts.length > 0 ? (
                  quizAttempts.slice(0, 5).map((attempt: any) => (
                    <div key={attempt.id} className="flex justify-between items-center p-5 hover:bg-slate-50/50 transition-colors">
                      <div className="max-w-[70%]">
                        <p className="font-bold text-slate-900 line-clamp-1">{attempt.quizzes?.title}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">
                          {attempt.quizzes?.lessons?.courses?.title}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className={cn(
                          "px-3 py-1 rounded-full text-xs font-black",
                          (attempt.score / attempt.total_questions) >= 0.7
                            ? "bg-green-100 text-green-700"
                            : "bg-orange-100 text-orange-700"
                        )}>
                          {Math.round((attempt.score / attempt.total_questions) * 100)}%
                        </div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">
                          {new Date(attempt.completed_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 px-6">
                    <div className="w-14 h-14 bg-orange-50 rounded-full flex items-center justify-center mb-4">
                      <ClipboardList className="h-7 w-7 text-orange-300" />
                    </div>
                    <p className="text-sm font-black text-slate-700 mb-1">No Assessments Yet</p>
                    <p className="text-xs text-slate-400 font-medium text-center max-w-[220px]">
                      Complete lesson quizzes to see your scores and performance history here.
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Completed Lessons History */}
          <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white overflow-hidden">
            <CardHeader className="border-b border-slate-50 bg-slate-50/30">
              <CardTitle className="text-lg font-black text-slate-900">Recent Completion</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-slate-50">
                {completedLessons.length > 0 ? (
                  completedLessons.slice(0, 5).map((progress: any) => (
                    <div key={progress.id} className="flex justify-between items-center p-5 hover:bg-slate-50/50 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="w-8 h-8 bg-green-50 rounded-full flex items-center justify-center flex-shrink-0">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 line-clamp-1">{progress.lessons?.title}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            {progress.lessons?.courses?.title}
                          </p>
                        </div>
                      </div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        {new Date(progress.completed_at).toLocaleDateString()}
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 px-6">
                    <div className="w-14 h-14 bg-green-50 rounded-full flex items-center justify-center mb-4">
                      <GraduationCap className="h-7 w-7 text-green-300" />
                    </div>
                    <p className="text-sm font-black text-slate-700 mb-1">No Lessons Completed</p>
                    <p className="text-xs text-slate-400 font-medium text-center max-w-[220px]">
                      Start working through your enrolled courses. Completed lessons will be tracked here.
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
        </>
      )}
      </div>
    </div>
  );
}
