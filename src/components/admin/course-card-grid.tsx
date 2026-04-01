'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Eye, BookOpen, Pencil, Upload, Link2, X, ImageIcon, Loader2 } from 'lucide-react';

type Course = {
  id: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  is_published: boolean;
  created_at: string;
  category_id: string | null;
  categories: { name: string } | null;
};

type Category = { id: string; name: string };

interface CourseCardGridProps {
  courses: Course[];
  categories: Category[];
}

type ThumbnailMode = 'upload' | 'url';

export function CourseCardGrid({ courses, categories }: CourseCardGridProps) {
  const router = useRouter();
  const supabase = createClient();

  // Modal state
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [thumbnailMode, setThumbnailMode] = useState<ThumbnailMode>('url');
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [isPublished, setIsPublished] = useState(true);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function openEdit(course: Course) {
    setEditingCourse(course);
    setTitle(course.title);
    setDescription(course.description ?? '');
    setCategoryId(course.category_id ?? '');
    setThumbnailUrl(course.thumbnail_url ?? '');
    setThumbnailPreview(null);
    setThumbnailMode(course.thumbnail_url ? 'url' : 'upload');
    setIsPublished(course.is_published);
  }

  function closeEdit() {
    setEditingCourse(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setThumbnailPreview(URL.createObjectURL(file));
    setUploading(true);
    try {
      const filePath = `courses/${Date.now()}-${file.name}`;
      const { data, error } = await supabase.storage.from('course-thumbnails').upload(filePath, file);
      if (error) { toast.error('Upload failed', { description: error.message }); setThumbnailPreview(null); return; }
      if (data) {
        const { data: urlData } = supabase.storage.from('course-thumbnails').getPublicUrl(filePath);
        setThumbnailUrl(urlData.publicUrl);
        toast.success('Image uploaded');
      }
    } catch (err: any) {
      toast.error('Upload failed', { description: err.message });
      setThumbnailPreview(null);
    } finally {
      setUploading(false);
    }
  }

  function clearThumbnail() {
    setThumbnailUrl('');
    setThumbnailPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function handleSave() {
    if (!editingCourse) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('courses')
        .update({
          title: title.trim(),
          description: description.trim() || null,
          category_id: categoryId || null,
          thumbnail_url: thumbnailUrl || null,
          is_published: isPublished,
        })
        .eq('id', editingCourse.id);
      if (error) throw error;
      toast.success('Course updated');
      closeEdit();
      router.refresh();
    } catch (err: any) {
      toast.error('Failed to save', { description: err.message });
    } finally {
      setSaving(false);
    }
  }

  const currentPreview = thumbnailPreview || (thumbnailMode === 'url' && thumbnailUrl ? thumbnailUrl : null);

  return (
    <>
      {/* Course grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {courses.map((course) => (
          <div key={course.id} className="relative group">
            <Link href={`/gansid/admin/courses/${course.id}/editor`}>
              <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full overflow-hidden border border-slate-200 bg-white">
                {/* Thumbnail */}
                {course.thumbnail_url ? (
                  <div className="aspect-video w-full overflow-hidden relative">
                    <img src={course.thumbnail_url} alt={course.title} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                  </div>
                ) : (
                  <div className="aspect-video w-full bg-gradient-to-br from-[#1E3A5F] to-[#2563EB] flex items-center justify-center relative">
                    <BookOpen className="h-14 w-14 text-white/40" />
                  </div>
                )}

                {/* Card body */}
                <div className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-[#0F172A] text-sm leading-snug">
                      {course.title}
                    </h3>
                    {!course.is_published && (
                      <Badge variant="outline" className="border-[#DC2626] text-[#DC2626] text-xs shrink-0">
                        Draft
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-slate-500 line-clamp-2">{course.description}</p>
                  <div className="flex items-center justify-between text-xs text-slate-400 pt-1 border-t border-slate-100">
                    <span>{course.categories?.name || 'Uncategorized'}</span>
                    <span>{new Date(course.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </Card>
            </Link>

            {/* Hover action buttons */}
            <div className="absolute top-2 right-2 flex gap-1.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
              <button
                type="button"
                aria-label="Edit course details"
                title="Edit course details"
                onClick={() => openEdit(course)}
                className="bg-white/90 hover:bg-white rounded-lg p-1.5 shadow-sm border border-gray-200"
              >
                <Pencil className="h-4 w-4 text-[#1E3A5F]" />
              </button>
              <Link
                href={`/gansid/admin/courses/${course.id}/preview`}
                aria-label="Preview as student"
                title="Preview as student"
                className="bg-white/90 hover:bg-white rounded-lg p-1.5 shadow-sm border border-gray-200"
              >
                <Eye className="h-4 w-4 text-[#1E3A5F]" />
              </Link>
            </div>
          </div>
        ))}
      </div>

      {/* Edit modal */}
      <Dialog open={!!editingCourse} onOpenChange={(open) => { if (!open) closeEdit(); }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-[#0F172A] text-lg font-black">Edit Course</DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-1">
            {/* Title */}
            <div className="space-y-1.5">
              <Label htmlFor="edit-title" className="text-[#0F172A] font-medium text-sm">Course Title</Label>
              <Input
                id="edit-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Course title"
                className="border-slate-300 focus:border-[#1E3A5F] focus:ring-[#1E3A5F]"
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label htmlFor="edit-desc" className="text-[#0F172A] font-medium text-sm">Description</Label>
              <Textarea
                id="edit-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What will students learn?"
                rows={3}
                className="border-slate-300 focus:border-[#1E3A5F] focus:ring-[#1E3A5F] resize-none"
              />
            </div>

            {/* Category */}
            <div className="space-y-1.5">
              <Label className="text-[#0F172A] font-medium text-sm">Category</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger className="border-slate-300">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No Category</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Thumbnail */}
            <div className="space-y-2">
              <Label className="text-[#0F172A] font-medium text-sm">Thumbnail</Label>
              <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
                <button
                  type="button"
                  onClick={() => setThumbnailMode('upload')}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    thumbnailMode === 'upload' ? 'bg-white text-[#0F172A] shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <Upload className="h-3.5 w-3.5" />Upload
                </button>
                <button
                  type="button"
                  onClick={() => setThumbnailMode('url')}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    thumbnailMode === 'url' ? 'bg-white text-[#0F172A] shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <Link2 className="h-3.5 w-3.5" />URL
                </button>
              </div>

              {thumbnailMode === 'upload' && (
                <div>
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileUpload} className="hidden" id="modal-thumb-upload" />
                  {!currentPreview ? (
                    <label
                      htmlFor="modal-thumb-upload"
                      className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:border-[#1E3A5F] hover:bg-slate-50 transition-colors"
                    >
                      <ImageIcon className="h-6 w-6 text-slate-400 mb-1.5" />
                      <span className="text-xs text-slate-500">{uploading ? 'Uploading...' : 'Click to upload'}</span>
                    </label>
                  ) : (
                    <div className="relative rounded-lg overflow-hidden border border-slate-200">
                      <img src={currentPreview} alt="Preview" className="w-full h-32 object-cover" />
                      {uploading && (
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                          <Loader2 className="h-5 w-5 animate-spin text-white" />
                        </div>
                      )}
                      <button type="button" onClick={clearThumbnail}
                        className="absolute top-2 right-2 bg-white/90 hover:bg-white rounded-full p-1 shadow-sm">
                        <X className="h-3.5 w-3.5 text-slate-600" />
                      </button>
                    </div>
                  )}
                </div>
              )}

              {thumbnailMode === 'url' && (
                <div className="space-y-2">
                  <Input
                    value={thumbnailUrl}
                    onChange={(e) => { setThumbnailUrl(e.target.value); setThumbnailPreview(null); }}
                    placeholder="https://example.com/image.jpg"
                    type="url"
                    className="border-slate-300 focus:border-[#1E3A5F] focus:ring-[#1E3A5F]"
                  />
                  {thumbnailUrl && (
                    <div className="relative rounded-lg overflow-hidden border border-slate-200">
                      <img src={thumbnailUrl} alt="Preview" className="w-full h-32 object-cover"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Published */}
            <div className="flex items-center justify-between p-3 border border-slate-200 rounded-lg bg-slate-50">
              <div>
                <p className="text-sm font-medium text-[#0F172A]">Published</p>
                <p className="text-xs text-slate-500">Visible to students</p>
              </div>
              <Switch checked={isPublished} onCheckedChange={setIsPublished} />
            </div>
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button type="button" variant="outline" onClick={closeEdit}
              className="border-slate-300 text-slate-700 font-bold">
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={saving || uploading || !title.trim()}
              className="bg-[#DC2626] hover:bg-[#B91C1C] text-white font-bold"
            >
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {saving ? 'Saving…' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
