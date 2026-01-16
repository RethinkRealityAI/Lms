import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, Trophy, Target } from 'lucide-react';

export default async function StudentProgressPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  // Get enrollments
  const { data: enrollments } = await supabase
    .from('course_enrollments')
    .select('*, courses(*)')
    .eq('user_id', user.id);

  // Get completed lessons
  const { data: completedLessons } = await supabase
    .from('progress')
    .select('*, lessons(*, courses(title))')
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
    <div className="px-4 sm:px-0">
      <h2 className="text-3xl font-bold mb-6">My Progress</h2>

      {/* Stats Overview */}
      <div className="grid gap-6 md:grid-cols-3 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Enrolled Courses</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalEnrollments}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Completed Lessons</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCompletedLessons}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Average Quiz Score</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{averageScore}%</div>
          </CardContent>
        </Card>
      </div>

      {/* Course Progress */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Course Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {enrollments && enrollments.length > 0 ? (
              enrollments.map((enrollment: any) => {
                // Get lessons for this course
                const courseLessons = completedLessons?.filter(
                  (cl: any) => cl.lessons?.courses?.title === enrollment.courses.title
                ) || [];

                return (
                  <div key={enrollment.id} className="p-4 border rounded-lg">
                    <h4 className="font-semibold mb-2">{enrollment.courses.title}</h4>
                    <div className="flex items-center gap-4">
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-primary h-2 rounded-full"
                          style={{ width: `${courseLessons.length > 0 ? 50 : 0}%` }}
                        />
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {courseLessons.length} lessons completed
                      </span>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-center text-muted-foreground py-4">
                No enrollments yet. Enroll in courses to see your progress.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Recent Quiz Attempts */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Recent Quiz Attempts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {quizAttempts && quizAttempts.length > 0 ? (
              quizAttempts.slice(0, 10).map((attempt: any) => (
                <div key={attempt.id} className="flex justify-between items-center p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">{attempt.quizzes?.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {attempt.quizzes?.lessons?.courses?.title} - {attempt.quizzes?.lessons?.title}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(attempt.completed_at).toLocaleDateString()} at{' '}
                      {new Date(attempt.completed_at).toLocaleTimeString()}
                    </p>
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
              <p className="text-center text-muted-foreground py-4">
                No quiz attempts yet. Take quizzes to see your results here.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Completed Lessons History */}
      <Card>
        <CardHeader>
          <CardTitle>Completed Lessons</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {completedLessons && completedLessons.length > 0 ? (
              completedLessons.slice(0, 10).map((progress: any) => (
                <div key={progress.id} className="flex justify-between items-center p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <div>
                      <p className="font-medium">{progress.lessons?.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {progress.lessons?.courses?.title}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {new Date(progress.completed_at).toLocaleDateString()}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-center text-muted-foreground py-4">
                No completed lessons yet. Complete lessons to see your history here.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
