'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Loader2, Upload, Link2, X, ImageIcon, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import type { Category } from '@/types';

type ThumbnailMode = 'upload' | 'url';

export default function EditCoursePage({
  params: paramsPromise,
}: {
  params: Promise<{ id: string }>;
}) {
  const params = React.use(paramsPromise);
  const courseId = params.id;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [thumbnailMode, setThumbnailMode] = useState<ThumbnailMode>('upload');
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [isPublished, setIsPublished] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const [{ data: course }, { data: cats }] = await Promise.all([
        supabase.from('courses').select('*, categories(id, name)').eq('id', courseId).single(),
        supabase.from('categories').select('*').order('name'),
      ]);
      if (course) {
        setTitle(course.title ?? '');
        setDescription(course.description ?? '');
        setCategoryId(course.category_id ?? '');
        setThumbnailUrl(course.thumbnail_url ?? '');
        setIsPublished(course.is_published ?? true);
        if (course.thumbnail_url) setThumbnailMode('url');
      }
      if (cats) setCategories(cats);
      setInitialLoading(false);
    }
    load();
  }, [courseId]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const localPreview = URL.createObjectURL(file);
    setThumbnailPreview(localPreview);
    setUploading(true);
    try {
      const filePath = `courses/${Date.now()}-${file.name}`;
      const { data, error } = await supabase.storage.from('course-thumbnails').upload(filePath, file);
      if (error) {
        toast.error('Upload failed', { description: error.message });
        setThumbnailPreview(null);
        return;
      }
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
  };

  const clearThumbnail = () => {
    setThumbnailUrl('');
    setThumbnailPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase
        .from('courses')
        .update({
          title,
          description,
          category_id: categoryId || null,
          thumbnail_url: thumbnailUrl || null,
          is_published: isPublished,
        })
        .eq('id', courseId);
      if (error) throw error;
      toast.success('Course updated');
      router.push('/gansid/admin');
    } catch (err: any) {
      toast.error('Failed to update course', { description: err.message });
    } finally {
      setLoading(false);
    }
  };

  const currentPreview = thumbnailPreview || (thumbnailUrl ? thumbnailUrl : null);

  if (initialLoading) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-0">
        <div className="h-96 bg-slate-100 animate-pulse rounded-xl" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-0">
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/gansid/admin"
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Courses
        </Link>
      </div>

      <Card className="bg-white border border-slate-200 shadow-sm">
        <CardHeader className="border-b border-slate-100">
          <CardTitle className="text-[#0F172A] text-xl">Edit Course</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title" className="text-[#0F172A] font-medium">Course Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Course title"
                required
                className="border-slate-300 focus:border-[#1E3A5F] focus:ring-[#1E3A5F]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="text-[#0F172A] font-medium">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What will students learn?"
                rows={4}
                className="border-slate-300 focus:border-[#1E3A5F] focus:ring-[#1E3A5F]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category" className="text-[#0F172A] font-medium">Category (Optional)</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger id="category" className="border-slate-300">
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
            <div className="space-y-3">
              <Label className="text-[#0F172A] font-medium">Course Thumbnail</Label>
              <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
                <button
                  type="button"
                  onClick={() => setThumbnailMode('upload')}
                  className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    thumbnailMode === 'upload' ? 'bg-white text-[#0F172A] shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <Upload className="h-4 w-4" />Upload Image
                </button>
                <button
                  type="button"
                  onClick={() => setThumbnailMode('url')}
                  className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    thumbnailMode === 'url' ? 'bg-white text-[#0F172A] shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <Link2 className="h-4 w-4" />Image URL
                </button>
              </div>

              {thumbnailMode === 'upload' && (
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="thumbnail-upload"
                  />
                  {!currentPreview ? (
                    <label
                      htmlFor="thumbnail-upload"
                      className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:border-[#1E3A5F] hover:bg-slate-50 transition-colors"
                    >
                      <ImageIcon className="h-8 w-8 text-slate-400 mb-2" />
                      <span className="text-sm text-slate-500">
                        {uploading ? 'Uploading...' : 'Click to upload an image'}
                      </span>
                      <span className="text-xs text-slate-400 mt-1">PNG, JPG, GIF up to 10MB</span>
                    </label>
                  ) : (
                    <div className="relative rounded-lg overflow-hidden border border-slate-200">
                      <img src={currentPreview} alt="Thumbnail preview" className="w-full h-40 object-cover" />
                      {uploading && (
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                          <Loader2 className="h-6 w-6 animate-spin text-white" />
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={clearThumbnail}
                        className="absolute top-2 right-2 bg-white/90 hover:bg-white rounded-full p-1 shadow-sm"
                        aria-label="Remove image"
                      >
                        <X className="h-4 w-4 text-slate-600" />
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
                      <img
                        src={thumbnailUrl}
                        alt="Thumbnail preview"
                        className="w-full h-40 object-cover"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between p-4 border border-slate-200 rounded-lg bg-slate-50">
              <div className="space-y-0.5">
                <Label htmlFor="published" className="text-[#0F172A] font-medium">Published</Label>
                <p className="text-sm text-slate-500">Make this course visible to students</p>
              </div>
              <Switch id="published" checked={isPublished} onCheckedChange={setIsPublished} />
            </div>

            <div className="flex gap-4 pt-2">
              <Button
                type="submit"
                disabled={loading || uploading}
                className="bg-[#DC2626] hover:bg-[#B91C1C] text-white shadow-sm"
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {loading ? 'Saving...' : 'Save Changes'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push('/gansid/admin')}
                className="border-slate-300 text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push(`/gansid/admin/courses/${courseId}/editor`)}
                className="border-slate-300 text-slate-700 hover:bg-slate-50 ml-auto"
              >
                Open Editor
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
