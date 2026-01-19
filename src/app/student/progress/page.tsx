import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, Trophy, Target, BookOpen } from 'lucide-react';

export default async function StudentProgressPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  // Get enrollments with course details
  const { data: enrollments } = await supabase
    .from('course_enrollments')
    .select('*, courses(*)')
    .eq('user_id', user.id);

  // Get all lessons for enrolled courses
  const courseIds = enrollments?.map(e => e.course_id) || [];
  const { data: allLessons } = await supabase
    .from('lessons')
    .select('*')
    .in('course_id', courseIds);

  // Get completed lessons
  const { data: completedLessons } = await supabase
    .from('progress')
    .select('*, lessons(*, courses(id, title))')
    .eq('user_id', user.id)
    .eq('completed', true)
    .order('completed_at', { ascending: false });

  // Get quiz attempts
  const { data: quizAttempts } = await supabase
    .from('quiz_attempts')
    .select('*, quizzes(title, lesson_id, lessons(title, course_id, courses(title)))')
    .eq('user_id', user.id)
    .order('completed_at', { ascending: false });

  // Calculate overall progress
  const totalEnrollments = enrollments?.length || 0;
  const totalCompletedLessons = completedLessons?.length || 0;
  const totalQuizAttempts = quizAttempts?.length || 0;

  const averageScore = quizAttempts && quizAttempts.length > 0
    ? Math.round(
        quizAttempts.reduce((acc: number, attempt: any) => 
          acc + (attempt.score / attempt.total_questions) * 100, 0
        ) / quizAttempts.length
      )
    : 0;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-black tracking-tight text-white mb-2">My Progress</h2>
        <p className="text-slate-400 font-medium">Track your learning journey and achievements.</p>
      </div>

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
            <div className="text-3xl font-black text-slate-900">{averageScore}%</div>
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
              {enrollments && enrollments.length > 0 ? (
                enrollments.map((enrollment: any) => {
                  const totalCourseLessons = allLessons?.filter(
                    (lesson: any) => lesson.course_id === enrollment.course_id
                  ) || [];
                  const completedCourseLessons = completedLessons?.filter(
                    (cl: any) => cl.lessons?.courses?.id === enrollment.course_id
                  ) || [];
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
                })
              ) : (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <BookOpen className="h-8 w-8 text-slate-300" />
                  </div>
                  <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">No Active Enrollments</p>
                </div>
              )}
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
                {quizAttempts && quizAttempts.length > 0 ? (
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
                  <div className="text-center py-12">
                    <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">No Quiz History</p>
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
                {completedLessons && completedLessons.length > 0 ? (
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
                  <div className="text-center py-12">
                    <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">No Completed Lessons</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
