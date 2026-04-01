import { createClient } from '@/lib/supabase/server';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Eye, Plus, BookOpen, Pencil } from 'lucide-react';
import Link from 'next/link';

export default async function AdminPage() {
  const supabase = await createClient();

  const { data: courses } = await supabase
    .from('courses')
    .select('*, categories(name)')
    .order('created_at', { ascending: false });

  const courseCount = courses?.length ?? 0;

  return (
    <div className="px-4 sm:px-0">
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-3">
          <h2 className="text-3xl font-bold text-[#0F172A]">Courses</h2>
          <Badge
            variant="secondary"
            className="bg-[#1E3A5F] text-white text-sm px-3 py-0.5"
          >
            {courseCount}
          </Badge>
        </div>
        <Link href="/gansid/admin/courses/create">
          <Button className="bg-[#DC2626] hover:bg-[#B91C1C] text-white shadow-sm">
            <Plus className="mr-2 h-4 w-4" />
            Create Course
          </Button>
        </Link>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {courses && courseCount > 0 ? (
          courses.map((course: any) => (
            <div key={course.id} className="relative group">
              <Link href={`/gansid/admin/courses/${course.id}/editor`}>
                <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full overflow-hidden border border-slate-200 bg-white">
                  {/* Thumbnail area */}
                  {course.thumbnail_url ? (
                    <div className="aspect-video w-full overflow-hidden relative">
                      <img
                        src={course.thumbnail_url}
                        alt={course.title}
                        className="w-full h-full object-cover"
                      />
                      {/* Overlay for icons on image */}
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
                      <h3 className="font-semibold text-[#0F172A] line-clamp-1 text-base">
                        {course.title}
                      </h3>
                      {!course.is_published && (
                        <Badge
                          variant="outline"
                          className="border-[#DC2626] text-[#DC2626] text-xs shrink-0"
                        >
                          Draft
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-slate-500 line-clamp-2">
                      {course.description}
                    </p>
                    <div className="flex items-center justify-between text-xs text-slate-400 pt-1 border-t border-slate-100">
                      <span>{course.categories?.name || 'Uncategorized'}</span>
                      <span>{new Date(course.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </Card>
              </Link>

              {/* Action icons — top-right, visible on hover */}
              <div className="absolute top-2 right-2 flex gap-1.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                <Link
                  href={`/gansid/admin/courses/${course.id}/edit`}
                  aria-label="Edit course details"
                  title="Edit course details"
                  onClick={(e) => e.stopPropagation()}
                  className="bg-white/90 hover:bg-white rounded-lg p-1.5 shadow-sm border border-gray-200"
                >
                  <Pencil aria-hidden="true" className="h-4 w-4 text-[#1E3A5F]" />
                </Link>
                <Link
                  href={`/gansid/admin/courses/${course.id}/preview`}
                  aria-label="Preview as student"
                  title="Preview as student"
                  className="bg-white/90 hover:bg-white rounded-lg p-1.5 shadow-sm border border-gray-200"
                >
                  <Eye aria-hidden="true" className="h-4 w-4 text-[#1E3A5F]" />
                </Link>
              </div>
            </div>
          ))
        ) : (
          <Card className="col-span-full bg-white border border-slate-200">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="rounded-full bg-[#1E3A5F]/10 p-4 mb-4">
                <BookOpen className="h-10 w-10 text-[#1E3A5F]" />
              </div>
              <p className="text-slate-500 mb-6 text-center">
                No courses yet. Create your first course to get started!
              </p>
              <Link href="/gansid/admin/courses/create">
                <Button className="bg-[#DC2626] hover:bg-[#B91C1C] text-white">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Course
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
