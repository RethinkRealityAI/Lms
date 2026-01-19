import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import Link from 'next/link';
import { BookOpen, CheckCircle } from 'lucide-react';

export default async function StudentPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Get enrolled courses with category
  const { data: enrollments } = await supabase
    .from('course_enrollments')
    .select('*, courses(*, categories(name))')
    .eq('user_id', user?.id)
    .order('enrolled_at', { ascending: false });

  // Get all available published courses with category
  const { data: allCourses } = await supabase
    .from('courses')
    .select('*, categories(name)')
    .eq('is_published', true)
    .order('created_at', { ascending: false });

  // Get progress for enrolled courses
  const { data: progressData } = await supabase
    .from('progress')
    .select('lesson_id, completed')
    .eq('user_id', user?.id)
    .eq('completed', true);

  // Get lessons count per course
  const courseIds = enrollments?.map(e => e.course_id) || [];
  const { data: lessonsData } = await supabase
    .from('lessons')
    .select('id, course_id')
    .in('course_id', courseIds);

  // Calculate progress per course
  const courseProgress: Record<string, { completed: number; total: number }> = {};
  if (lessonsData) {
    lessonsData.forEach((lesson: any) => {
      if (!courseProgress[lesson.course_id]) {
        courseProgress[lesson.course_id] = { completed: 0, total: 0 };
      }
      courseProgress[lesson.course_id].total++;
      if (progressData?.some((p: any) => p.lesson_id === lesson.id)) {
        courseProgress[lesson.course_id].completed++;
      }
    });
  }

  const enrolledCourseIds = enrollments?.map(e => e.course_id) || [];
  const availableCourses = allCourses?.filter(c => !enrolledCourseIds.includes(c.id)) || [];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-black tracking-tight text-white mb-2">My Learning</h2>
        <p className="text-slate-400 font-medium">Access your enrolled courses and explore new learning opportunities.</p>
      </div>

      {enrollments && enrollments.length > 0 && (
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="h-8 w-1 bg-[#0099CA] rounded-full" />
            <h3 className="text-xl font-black text-slate-900">Enrolled Courses</h3>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {enrollments.map((enrollment: any) => {
              const progress = courseProgress[enrollment.course_id];
              const progressPercent = progress?.total > 0 
                ? Math.round((progress.completed / progress.total) * 100) 
                : 0;
              const isComplete = progressPercent === 100;

              return (
                <Link key={enrollment.id} href={`/student/courses/${enrollment.course_id}`}>
                  <Card className="group hover:shadow-2xl hover:shadow-slate-200/50 transition-all duration-300 cursor-pointer h-full overflow-hidden border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col">
                    <div className="aspect-video w-full overflow-hidden bg-slate-100 relative">
                      {enrollment.courses.thumbnail_url ? (
                        <img
                          src={enrollment.courses.thumbnail_url}
                          alt={enrollment.courses.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center relative">
                          <BookOpen className="h-12 w-12 text-slate-300" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors" />
                      
                      <div className="absolute top-3 left-3">
                        <Badge className="bg-white/90 backdrop-blur text-[#0F172A] border-none font-bold shadow-sm">
                          {enrollment.courses.categories?.name || 'Uncategorized'}
                        </Badge>
                      </div>

                      {isComplete && (
                        <div className="absolute top-3 right-3">
                          <Badge className="bg-green-500 text-white border-none font-bold shadow-lg shadow-green-900/20 gap-1.5">
                            <CheckCircle className="h-3 w-3" />
                            Completed
                          </Badge>
                        </div>
                      )}
                    </div>

                    <CardHeader className="pb-3 flex-grow bg-white">
                      <CardTitle className="line-clamp-1 group-hover:text-[#2563EB] transition-colors font-black text-lg">{enrollment.courses.title}</CardTitle>
                      <CardDescription className="line-clamp-2 font-medium text-slate-500 mt-1">{enrollment.courses.description}</CardDescription>
                    </CardHeader>

                    <CardContent className="bg-white pt-0">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-xs font-bold uppercase tracking-widest text-slate-400">
                          <span>Progress</span>
                          <span className="text-[#2563EB]">{progressPercent}%</span>
                        </div>
                        <Progress value={progressPercent} className="h-2 bg-slate-100" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {availableCourses && availableCourses.length > 0 && (
        <div className="space-y-6 pt-4">
          <div className="flex items-center gap-3">
            <div className="h-8 w-1 bg-[#DC2626] rounded-full" />
            <h3 className="text-xl font-black text-slate-900">Explore Catalog</h3>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {availableCourses.map((course: any) => (
              <Link key={course.id} href={`/student/courses/${course.id}`}>
                <Card className="group hover:shadow-2xl hover:shadow-slate-200/50 transition-all duration-300 cursor-pointer h-full overflow-hidden border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                  <div className="aspect-video w-full overflow-hidden bg-slate-100 relative">
                    {course.thumbnail_url ? (
                      <img
                        src={course.thumbnail_url}
                        alt={course.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center relative">
                        <BookOpen className="h-12 w-12 text-slate-300" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/10 group-hover:bg-black/5 transition-colors" />
                    
                    <div className="absolute top-3 left-3">
                      <Badge className="bg-white/90 backdrop-blur text-[#0F172A] border-none font-bold shadow-sm">
                        {course.categories?.name || 'Uncategorized'}
                      </Badge>
                    </div>
                  </div>

                  <CardHeader className="pb-4 bg-white">
                    <CardTitle className="line-clamp-1 group-hover:text-[#DC2626] transition-colors font-black text-lg">{course.title}</CardTitle>
                    <CardDescription className="line-clamp-2 font-medium text-slate-500 mt-1">{course.description}</CardDescription>
                  </CardHeader>
                  
                  <CardContent className="bg-white border-t border-slate-50 pt-4 pb-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Published</span>
                      </div>
                      <span className="text-xs font-black text-[#DC2626] uppercase tracking-widest group-hover:translate-x-1 transition-transform inline-flex items-center">
                        Enroll Now <BookOpen className="ml-1.5 h-3 w-3" />
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}

      {(!enrollments || enrollments.length === 0) && (!availableCourses || availableCourses.length === 0) && (
        <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white overflow-hidden">
          <CardContent className="flex flex-col items-center justify-center py-20">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
              <BookOpen className="h-10 w-10 text-slate-300" />
            </div>
            <p className="text-slate-400 font-bold uppercase tracking-widest">No courses available yet</p>
            <p className="text-slate-400 text-sm mt-2">Check back later for new learning content.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
