import { createClient } from '@/lib/supabase/server';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, BookOpen } from 'lucide-react';
import Link from 'next/link';
import { CourseCardGrid } from '@/components/admin/course-card-grid';

export default async function AdminPage() {
  const supabase = await createClient();

  const [{ data: courses }, { data: categories }] = await Promise.all([
    supabase.from('courses').select('*, categories(name)').order('display_order', { ascending: true }),
    supabase.from('categories').select('id, name').order('name'),
  ]);

  const courseCount = courses?.length ?? 0;

  return (
    <div className="px-4 sm:px-0">
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-3">
          <h2 className="text-3xl font-bold text-[#0F172A]">Courses</h2>
          <Badge variant="secondary" className="bg-[#1E3A5F] text-white text-sm px-3 py-0.5">
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

      {courseCount > 0 ? (
        <CourseCardGrid
          courses={(courses ?? []) as any}
          categories={(categories ?? []) as any}
        />
      ) : (
        <div className="grid">
          <Card className="bg-white border border-slate-200">
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
        </div>
      )}
    </div>
  );
}
