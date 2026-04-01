'use client';

import { useState, useEffect, useRef } from 'react';
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
import { Loader2, Upload, Link2, X, ImageIcon } from 'lucide-react';
import type { Category } from '@/types';
import { getUserInstitutionId } from '@/lib/db/users';

type ThumbnailMode = 'upload' | 'url';

export default function CreateCoursePage() {
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    const { data } = await supabase
      .from('categories')
      .select('*')
      .order('name');

    if (data) {
      setCategories(data);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Show local preview immediately
    const localPreview = URL.createObjectURL(file);
    setThumbnailPreview(localPreview);
    setUploading(true);

    try {
      const filePath = `courses/${Date.now()}-${file.name}`;
      const { data, error } = await supabase.storage
        .from('course-thumbnails')
        .upload(filePath, file);

      if (error) {
        toast.error('Upload failed', {
          description: error.message.includes('not found')
            ? 'Storage bucket "course-thumbnails" does not exist. Please ask an administrator to create it.'
            : error.message,
        });
        setThumbnailPreview(null);
        return;
      }

      if (data) {
        const { data: urlData } = supabase.storage
          .from('course-thumbnails')
          .getPublicUrl(filePath);
        setThumbnailUrl(urlData.publicUrl);
        toast.success('Image uploaded successfully');
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
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        toast.error('Authentication required', {
          description: 'You must be logged in to create a course',
        });
        return;
      }

      const institutionId = await getUserInstitutionId(supabase, user.id);
      if (!institutionId) {
        toast.error('No institution found', {
          description: 'Your account is not linked to an institution. Contact an administrator.',
        });
        return;
      }

      const { data, error } = await supabase
        .from('courses')
        .insert([
          {
            title,
            description,
            created_by: user.id,
            institution_id: institutionId,
            category_id: categoryId || null,
            thumbnail_url: thumbnailUrl || null,
            is_published: isPublished
          }
        ])
        .select()
        .single();

      if (error) throw error;

      toast.success('Course created successfully!', {
        description: 'Opening editor...',
      });

      router.push(`/admin/courses/${data.id}/editor`);
    } catch (error: any) {
      toast.error('Failed to create course', {
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const currentPreview = thumbnailPreview || (thumbnailMode === 'url' && thumbnailUrl ? thumbnailUrl : null);

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-0">
      <Card className="bg-white border border-slate-200 shadow-sm">
        <CardHeader className="border-b border-slate-100">
          <CardTitle className="text-[#0F172A] text-xl">Create New Course</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title" className="text-[#0F172A] font-medium">
                Course Title
              </Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Introduction to Web Development"
                required
                className="border-slate-300 focus:border-[#1E3A5F] focus:ring-[#1E3A5F]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="text-[#0F172A] font-medium">
                Description
              </Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Learn the basics of web development..."
                rows={4}
                required
                className="border-slate-300 focus:border-[#1E3A5F] focus:ring-[#1E3A5F]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category" className="text-[#0F172A] font-medium">
                Category (Optional)
              </Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger id="category" className="border-slate-300">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No Category</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Thumbnail Section */}
            <div className="space-y-3">
              <Label className="text-[#0F172A] font-medium">
                Course Thumbnail (Optional)
              </Label>

              {/* Mode toggle */}
              <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
                <button
                  type="button"
                  onClick={() => setThumbnailMode('upload')}
                  className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    thumbnailMode === 'upload'
                      ? 'bg-white text-[#0F172A] shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <Upload className="h-4 w-4" />
                  Upload Image
                </button>
                <button
                  type="button"
                  onClick={() => setThumbnailMode('url')}
                  className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    thumbnailMode === 'url'
                      ? 'bg-white text-[#0F172A] shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <Link2 className="h-4 w-4" />
                  Image URL
                </button>
              </div>

              {/* Upload mode */}
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
                      <span className="text-xs text-slate-400 mt-1">
                        PNG, JPG, GIF up to 10MB
                      </span>
                    </label>
                  ) : (
                    <div className="relative rounded-lg overflow-hidden border border-slate-200">
                      <img
                        src={currentPreview}
                        alt="Thumbnail preview"
                        className="w-full h-40 object-cover"
                      />
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

              {/* URL mode */}
              {thumbnailMode === 'url' && (
                <div className="space-y-2">
                  <Input
                    id="thumbnail"
                    value={thumbnailUrl}
                    onChange={(e) => {
                      setThumbnailUrl(e.target.value);
                      setThumbnailPreview(null);
                    }}
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
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between p-4 border border-slate-200 rounded-lg bg-slate-50">
              <div className="space-y-0.5">
                <Label htmlFor="published" className="text-[#0F172A] font-medium">
                  Publish Course
                </Label>
                <p className="text-sm text-slate-500">
                  Make this course visible to students
                </p>
              </div>
              <Switch
                id="published"
                checked={isPublished}
                onCheckedChange={setIsPublished}
              />
            </div>

            <div className="flex gap-4 pt-2">
              <Button
                type="submit"
                disabled={loading || uploading}
                className="bg-[#DC2626] hover:bg-[#B91C1C] text-white shadow-sm"
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {loading ? 'Creating...' : 'Create Course'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                className="border-slate-300 text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
