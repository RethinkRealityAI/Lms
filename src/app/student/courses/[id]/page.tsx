'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, Circle, Play } from 'lucide-react';
import type { Course, Lesson, Progress as ProgressType } from '@/types';

export default function StudentCoursePage({ params }: { params: { id: string } }) {
  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [progress, setProgress] = useState<Record<string, ProgressType>>({});
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    fetchData();
  }, [params.id]);

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Fetch course
    const { data: courseData } = await supabase
      .from('courses')
      .select('*')
      .eq('id', params.id)
      .single();
    
    if (courseData) setCourse(courseData);

    // Check enrollment
    const { data: enrollment } = await supabase
      .from('course_enrollments')
      .select('*')
      .eq('user_id', user.id)
      .eq('course_id', params.id)
      .single();
    
    setIsEnrolled(!!enrollment);

    // Fetch lessons
    const { data: lessonsData } = await supabase
      .from('lessons')
      .select('*')
      .eq('course_id', params.id)
      .order('order_index', { ascending: true });
    
    if (lessonsData) {
      setLessons(lessonsData);
      if (lessonsData.length > 0 && !selectedLesson) {
        setSelectedLesson(lessonsData[0]);
      }
    }

    // Fetch progress
    if (enrollment) {
      const { data: progressData } = await supabase
        .from('progress')
        .select('*')
        .eq('user_id', user.id);
      
      if (progressData) {
        const progressMap: Record<string, ProgressType> = {};
        progressData.forEach(p => {
          progressMap[p.lesson_id] = p;
        });
        setProgress(progressMap);
      }
    }
  };

  const handleEnroll = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      const { error } = await supabase
        .from('course_enrollments')
        .insert([{ user_id: user.id, course_id: params.id }]);

      if (error) throw error;
      setIsEnrolled(true);
    } catch (error: any) {
      alert('Error enrolling: ' + error.message);
    }
  };

  const handleMarkComplete = async () => {
    if (!selectedLesson) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      const { error } = await supabase
        .from('progress')
        .upsert([
          {
            user_id: user.id,
            lesson_id: selectedLesson.id,
            completed: true,
            completed_at: new Date().toISOString(),
          }
        ]);

      if (error) throw error;
      fetchData();
    } catch (error: any) {
      alert('Error marking complete: ' + error.message);
    }
  };

  const renderContent = (lesson: Lesson) => {
    switch (lesson.content_type) {
      case 'video':
        return (
          <video
            src={lesson.content_url}
            controls
            className="w-full rounded-lg"
            style={{ maxHeight: '500px' }}
          >
            Your browser does not support the video tag.
          </video>
        );
      case 'pdf':
        return (
          <iframe
            src={lesson.content_url}
            className="w-full rounded-lg"
            style={{ height: '600px' }}
            title={lesson.title}
          />
        );
      case 'iframe':
        return (
          <iframe
            src={lesson.content_url}
            className="w-full rounded-lg"
            style={{ height: '600px' }}
            title={lesson.title}
          />
        );
      case '3d':
        return (
          <model-viewer
            src={lesson.content_url}
            alt={lesson.title}
            auto-rotate
            camera-controls
            style={{ width: '100%', height: '600px' }}
            className="rounded-lg"
          ></model-viewer>
        );
      default:
        return <p>Unsupported content type</p>;
    }
  };

  if (!course) return <div>Loading...</div>;

  if (!isEnrolled) {
    return (
      <div className="px-4 sm:px-0">
        <Card>
          <CardHeader>
            <CardTitle>{course.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4">{course.description}</p>
            <Button onClick={handleEnroll}>Enroll in this course</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const completedCount = Object.values(progress).filter(p => p.completed).length;
  const progressPercent = lessons.length > 0 ? Math.round((completedCount / lessons.length) * 100) : 0;

  return (
    <div className="px-4 sm:px-0">
      <div className="mb-6">
        <h2 className="text-3xl font-bold">{course.title}</h2>
        <p className="text-muted-foreground mt-2">{course.description}</p>
        <div className="mt-4">
          <div className="flex items-center gap-4">
            <div className="flex-1 bg-gray-200 rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <span className="text-sm font-medium">{progressPercent}%</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lesson List */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Lessons</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {lessons.map((lesson) => (
                <button
                  key={lesson.id}
                  onClick={() => setSelectedLesson(lesson)}
                  className={`w-full text-left p-3 rounded-lg flex items-center gap-3 transition-colors ${
                    selectedLesson?.id === lesson.id
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-accent'
                  }`}
                >
                  {progress[lesson.id]?.completed ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <Circle className="h-5 w-5" />
                  )}
                  <span className="text-sm">{lesson.title}</span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Content Viewer */}
        <Card className="lg:col-span-2">
          {selectedLesson ? (
            <>
              <CardHeader>
                <CardTitle>{selectedLesson.title}</CardTitle>
                <p className="text-sm text-muted-foreground">{selectedLesson.description}</p>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  {renderContent(selectedLesson)}
                </div>
                <div className="flex gap-4">
                  {!progress[selectedLesson.id]?.completed && (
                    <Button onClick={handleMarkComplete}>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Mark as Complete
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    onClick={() => router.push(`/student/courses/${params.id}/lessons/${selectedLesson.id}/quiz`)}
                  >
                    <Play className="mr-2 h-4 w-4" />
                    Take Quiz
                  </Button>
                </div>
              </CardContent>
            </>
          ) : (
            <CardContent className="py-12 text-center text-muted-foreground">
              Select a lesson to start learning
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
}
