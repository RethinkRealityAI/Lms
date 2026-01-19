'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Video, FileText, Globe, Box, Trash2, Edit, Loader2, GripVertical } from 'lucide-react';
import { toast } from 'sonner';
import type { Course, Lesson, Quiz } from '@/types';

export default function CoursePage({ params }: { params: { id: string } }) {
  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [showLessonForm, setShowLessonForm] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showLessonEditDialog, setShowLessonEditDialog] = useState(false);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [editData, setEditData] = useState({
    title: '',
    description: '',
    category_id: '',
    thumbnail_url: '',
    is_published: true,
  });
  const [lessonData, setLessonData] = useState({
    title: '',
    description: '',
    content_type: 'video' as 'video' | 'pdf' | 'iframe' | '3d',
    content_url: '',
  });
  const [lessonEditData, setLessonEditData] = useState({
    title: '',
    description: '',
    content_type: 'video' as 'video' | 'pdf' | 'iframe' | '3d',
    content_url: '',
  });
  const [loading, setLoading] = useState(false);
  const [lessonLoading, setLessonLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    fetchCourse();
    fetchLessons();
    fetchCategories();
  }, [params.id]);

  const fetchCourse = async () => {
    const { data } = await supabase
      .from('courses')
      .select('*')
      .eq('id', params.id)
      .single();

    if (data) {
      setCourse(data);
      setEditData({
        title: data.title,
        description: data.description || '',
        category_id: data.category_id || '',
        thumbnail_url: data.thumbnail_url || '',
        is_published: data.is_published ?? true,
      });
    }
  };

  const fetchCategories = async () => {
    const { data } = await supabase
      .from('categories')
      .select('*')
      .order('name');

    if (data) setCategories(data);
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

      toast.success('Lesson created successfully!');
      setLessonData({
        title: '',
        description: '',
        content_type: 'video',
        content_url: '',
      });
      setShowLessonForm(false);
      fetchLessons();
    } catch (error: any) {
      toast.error('Failed to create lesson', {
        description: error.message,
      });
    }
  };

  const handleDeleteLesson = async (lessonId: string) => {
    try {
      const { error } = await supabase
        .from('lessons')
        .delete()
        .eq('id', lessonId);

      if (error) throw error;

      toast.success('Lesson deleted successfully');
      fetchLessons();
    } catch (error: any) {
      toast.error('Failed to delete lesson', {
        description: error.message,
      });
    }
  };

  const handleEditLesson = (lesson: Lesson) => {
    setEditingLesson(lesson);
    setLessonEditData({
      title: lesson.title,
      description: lesson.description || '',
      content_type: lesson.content_type,
      content_url: lesson.content_url,
    });
    setShowLessonEditDialog(true);
  };

  const handleUpdateLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLesson) return;

    setLessonLoading(true);

    try {
      const { error } = await supabase
        .from('lessons')
        .update({
          title: lessonEditData.title,
          description: lessonEditData.description,
          content_type: lessonEditData.content_type,
          content_url: lessonEditData.content_url,
        })
        .eq('id', editingLesson.id);

      if (error) throw error;

      toast.success('Lesson updated successfully');
      setShowLessonEditDialog(false);
      setEditingLesson(null);
      fetchLessons();
    } catch (error: any) {
      toast.error('Failed to update lesson', {
        description: error.message,
      });
    } finally {
      setLessonLoading(false);
    }
  };

  const handleUpdateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from('courses')
        .update({
          title: editData.title,
          description: editData.description,
          category_id: editData.category_id || null,
          thumbnail_url: editData.thumbnail_url || null,
          is_published: editData.is_published,
          updated_at: new Date().toISOString(),
        })
        .eq('id', params.id);

      if (error) throw error;

      toast.success('Course updated successfully!');
      setShowEditDialog(false);
      fetchCourse();
    } catch (error: any) {
      toast.error('Failed to update course', {
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCourse = async () => {
    setLoading(true);

    try {
      const { error } = await supabase
        .from('courses')
        .delete()
        .eq('id', params.id);

      if (error) throw error;

      toast.success('Course deleted successfully');
      router.push('/admin');
    } catch (error: any) {
      toast.error('Failed to delete course', {
        description: error.message,
      });
      setLoading(false);
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

  if (!course) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-0">
      <div className="mb-6 flex items-start justify-between">
        <div className="flex-1">
          <h2 className="text-3xl font-bold">{course.title}</h2>
          <p className="text-muted-foreground mt-2">{course.description}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowEditDialog(true)}>
            <Edit className="mr-2 h-4 w-4" />
            Edit Course
          </Button>
          <Button variant="destructive" onClick={() => setShowDeleteDialog(true)}>
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </Button>
        </div>
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
              {lessons.map((lesson, index) => (
                <div
                  key={lesson.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent"
                >
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-medium text-muted-foreground w-6">
                      {index + 1}.
                    </span>
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
                      onClick={() => handleEditLesson(lesson)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
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

      {/* Edit Course Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Course</DialogTitle>
            <DialogDescription>
              Update course information and settings
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateCourse} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-title">Course Title</Label>
              <Input
                id="edit-title"
                value={editData.title}
                onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={editData.description}
                onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                rows={4}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-category">Category</Label>
              <select
                id="edit-category"
                value={editData.category_id}
                onChange={(e) => setEditData({ ...editData, category_id: e.target.value })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">No Category</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-thumbnail">Thumbnail URL</Label>
              <Input
                id="edit-thumbnail"
                value={editData.thumbnail_url}
                onChange={(e) => setEditData({ ...editData, thumbnail_url: e.target.value })}
                placeholder="https://example.com/image.jpg"
                type="url"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="edit-published"
                checked={editData.is_published}
                onChange={(e) => setEditData({ ...editData, is_published: e.target.checked })}
                className="h-4 w-4"
              />
              <Label htmlFor="edit-published">Published (visible to students)</Label>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowEditDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Course Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Course</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this course? This action cannot be undone.
              All lessons, quizzes, and student progress will be permanently deleted.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteCourse} disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete Course
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Lesson Dialog */}
      <Dialog open={showLessonEditDialog} onOpenChange={setShowLessonEditDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Lesson</DialogTitle>
            <DialogDescription>
              Update the lesson details
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateLesson} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-lesson-title">Lesson Title</Label>
              <Input
                id="edit-lesson-title"
                value={lessonEditData.title}
                onChange={(e) => setLessonEditData({ ...lessonEditData, title: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-lesson-description">Description</Label>
              <Textarea
                id="edit-lesson-description"
                value={lessonEditData.description}
                onChange={(e) => setLessonEditData({ ...lessonEditData, description: e.target.value })}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-content-type">Content Type</Label>
              <select
                id="edit-content-type"
                value={lessonEditData.content_type}
                onChange={(e) => setLessonEditData({ ...lessonEditData, content_type: e.target.value as any })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="video">Video</option>
                <option value="pdf">PDF</option>
                <option value="iframe">iFrame (Embed)</option>
                <option value="3d">3D Model</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-content-url">Content URL</Label>
              <Input
                id="edit-content-url"
                value={lessonEditData.content_url}
                onChange={(e) => setLessonEditData({ ...lessonEditData, content_url: e.target.value })}
                placeholder="https://..."
                required
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowLessonEditDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={lessonLoading}>
                {lessonLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
