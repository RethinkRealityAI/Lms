import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { BookOpen } from 'lucide-react';

export default async function StudentPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Get enrolled courses
  const { data: enrollments } = await supabase
    .from('course_enrollments')
    .select('*, courses(*)')
    .eq('user_id', user?.id)
    .order('enrolled_at', { ascending: false });

  // Get all available courses for demo purposes
  const { data: allCourses } = await supabase
    .from('courses')
    .select('*')
    .order('created_at', { ascending: false });

  const enrolledCourseIds = enrollments?.map(e => e.course_id) || [];
  const availableCourses = allCourses?.filter(c => !enrolledCourseIds.includes(c.id)) || [];

  return (
    <div className="px-4 sm:px-0">
      <h2 className="text-3xl font-bold mb-6">My Courses</h2>

      {enrollments && enrollments.length > 0 && (
        <div className="mb-8">
          <h3 className="text-xl font-semibold mb-4">Enrolled Courses</h3>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {enrollments.map((enrollment: any) => (
              <Link key={enrollment.id} href={`/student/courses/${enrollment.course_id}`}>
                <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                  <CardHeader>
                    <CardTitle>{enrollment.courses.title}</CardTitle>
                    <CardDescription>{enrollment.courses.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Enrolled: {new Date(enrollment.enrolled_at).toLocaleDateString()}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}

      {availableCourses && availableCourses.length > 0 && (
        <div>
          <h3 className="text-xl font-semibold mb-4">Available Courses</h3>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {availableCourses.map((course: any) => (
              <Link key={course.id} href={`/student/courses/${course.id}`}>
                <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                  <CardHeader>
                    <CardTitle>{course.title}</CardTitle>
                    <CardDescription>{course.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-primary font-medium">Click to enroll →</p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}

      {(!enrollments || enrollments.length === 0) && (!availableCourses || availableCourses.length === 0) && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No courses available yet.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
