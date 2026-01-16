'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Video, FileText, Globe, Box, Trash2 } from 'lucide-react';
import type { Course, Lesson, Quiz } from '@/types';

export default function CoursePage({ params }: { params: { id: string } }) {
  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [showLessonForm, setShowLessonForm] = useState(false);
  const [lessonData, setLessonData] = useState({
    title: '',
    description: '',
    content_type: 'video' as 'video' | 'pdf' | 'iframe' | '3d',
    content_url: '',
  });
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    fetchCourse();
    fetchLessons();
  }, [params.id]);

  const fetchCourse = async () => {
    const { data } = await supabase
      .from('courses')
      .select('*')
      .eq('id', params.id)
      .single();
    
    if (data) setCourse(data);
  };

  const fetchLessons = async () => {
    const { data } = await supabase
      .from('lessons')
      .select('*')
      .eq('course_id', params.id)
      .order('order_index', { ascending: true });
    
    if (data) setLessons(data);
  };

  const handleCreateLesson = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const { error } = await supabase
        .from('lessons')
        .insert([
          {
            ...lessonData,
            course_id: params.id,
            order_index: lessons.length,
          }
        ]);

      if (error) throw error;

      setLessonData({
        title: '',
        description: '',
        content_type: 'video',
        content_url: '',
      });
      setShowLessonForm(false);
      fetchLessons();
    } catch (error: any) {
      alert('Error creating lesson: ' + error.message);
    }
  };

  const handleDeleteLesson = async (lessonId: string) => {
    if (!confirm('Are you sure you want to delete this lesson?')) return;

    try {
      const { error } = await supabase
        .from('lessons')
        .delete()
        .eq('id', lessonId);

      if (error) throw error;
      fetchLessons();
    } catch (error: any) {
      alert('Error deleting lesson: ' + error.message);
    }
  };

  const getContentIcon = (type: string) => {
    switch (type) {
      case 'video': return <Video className="h-5 w-5" />;
      case 'pdf': return <FileText className="h-5 w-5" />;
      case 'iframe': return <Globe className="h-5 w-5" />;
      case '3d': return <Box className="h-5 w-5" />;
      default: return null;
    }
  };

  if (!course) return <div>Loading...</div>;

  return (
    <div className="px-4 sm:px-0">
      <div className="mb-6">
        <h2 className="text-3xl font-bold">{course.title}</h2>
        <p className="text-muted-foreground mt-2">{course.description}</p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Lessons</CardTitle>
            <Button onClick={() => setShowLessonForm(!showLessonForm)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Lesson
            </Button>
          </CardHeader>
          <CardContent>
            {showLessonForm && (
              <form onSubmit={handleCreateLesson} className="space-y-4 mb-6 p-4 border rounded-lg">
                <div className="space-y-2">
                  <Label htmlFor="lesson-title">Lesson Title</Label>
                  <Input
                    id="lesson-title"
                    value={lessonData.title}
                    onChange={(e) => setLessonData({ ...lessonData, title: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lesson-description">Description</Label>
                  <Textarea
                    id="lesson-description"
                    value={lessonData.description}
                    onChange={(e) => setLessonData({ ...lessonData, description: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="content-type">Content Type</Label>
                  <select
                    id="content-type"
                    value={lessonData.content_type}
                    onChange={(e) => setLessonData({ ...lessonData, content_type: e.target.value as any })}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="video">Video</option>
                    <option value="pdf">PDF</option>
                    <option value="iframe">iFrame (Embed)</option>
                    <option value="3d">3D Model</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="content-url">Content URL</Label>
                  <Input
                    id="content-url"
                    value={lessonData.content_url}
                    onChange={(e) => setLessonData({ ...lessonData, content_url: e.target.value })}
                    placeholder="https://..."
                    required
                  />
                </div>
                <div className="flex gap-2">
                  <Button type="submit">Create Lesson</Button>
                  <Button type="button" variant="outline" onClick={() => setShowLessonForm(false)}>
                    Cancel
                  </Button>
                </div>
              </form>
            )}

            <div className="space-y-3">
              {lessons.map((lesson) => (
                <div
                  key={lesson.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent"
                >
                  <div className="flex items-center gap-4">
                    {getContentIcon(lesson.content_type)}
                    <div>
                      <h4 className="font-medium">{lesson.title}</h4>
                      <p className="text-sm text-muted-foreground">{lesson.description}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/admin/courses/${params.id}/lessons/${lesson.id}/quiz`)}
                    >
                      Manage Quiz
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteLesson(lesson.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
              {lessons.length === 0 && !showLessonForm && (
                <p className="text-center text-muted-foreground py-8">
                  No lessons yet. Add your first lesson!
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
