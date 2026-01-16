import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, BookOpen, CheckCircle, TrendingUp } from 'lucide-react';

export default async function AnalyticsPage() {
  const supabase = await createClient();

  // Fetch statistics
  const { data: users, count: userCount } = await supabase
    .from('users')
    .select('*', { count: 'exact' })
    .eq('role', 'student');

  const { count: courseCount } = await supabase
    .from('courses')
    .select('*', { count: 'exact' });

  const { count: completedLessons } = await supabase
    .from('progress')
    .select('*', { count: 'exact' })
    .eq('completed', true);

  // Fetch quiz attempts with scores
  const { data: quizAttempts } = await supabase
    .from('quiz_attempts')
    .select('*, users(email), quizzes(title)')
    .order('completed_at', { ascending: false })
    .limit(10);

  // Fetch course enrollments with progress
  const { data: enrollments } = await supabase
    .from('course_enrollments')
    .select('*, users(email), courses(title)')
    .order('enrolled_at', { ascending: false })
    .limit(10);

  return (
    <div className="px-4 sm:px-0">
      <h2 className="text-3xl font-bold mb-6">Analytics Dashboard</h2>

      {/* Stats Overview */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{userCount || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Courses</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{courseCount || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Completed Lessons</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedLessons || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Quiz Attempts</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{quizAttempts?.length || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Quiz Attempts */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Recent Quiz Attempts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {quizAttempts && quizAttempts.length > 0 ? (
              quizAttempts.map((attempt: any) => (
                <div key={attempt.id} className="flex justify-between items-center p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">{attempt.users?.email}</p>
                    <p className="text-sm text-muted-foreground">{attempt.quizzes?.title}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-lg">
                      {attempt.score}/{attempt.total_questions}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {Math.round((attempt.score / attempt.total_questions) * 100)}%
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-muted-foreground py-4">No quiz attempts yet</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Recent Enrollments */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Enrollments</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {enrollments && enrollments.length > 0 ? (
              enrollments.map((enrollment: any) => (
                <div key={enrollment.id} className="flex justify-between items-center p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">{enrollment.users?.email}</p>
                    <p className="text-sm text-muted-foreground">{enrollment.courses?.title}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">
                      {new Date(enrollment.enrolled_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-muted-foreground py-4">No enrollments yet</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
