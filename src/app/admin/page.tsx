import { createClient } from '@/lib/supabase/server';
import { getTenantContext } from '@/lib/tenant/server';
import { getEventCounts } from '@/lib/db/events';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, BookOpen, Users, GraduationCap, Award, Activity, LogIn } from 'lucide-react';
import Link from 'next/link';
import { CourseCardGrid } from '@/components/admin/course-card-grid';

function KpiCard({
  title,
  value,
  icon: Icon,
  color = 'text-slate-600',
}: {
  title: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  color?: string;
}) {
  return (
    <Card className="bg-white border border-slate-200 rounded-xl">
      <CardContent className="py-4 px-5 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 truncate">{title}</p>
          <p className="text-2xl font-black text-[#0F172A] mt-0.5">{value}</p>
        </div>
        <div className={`p-2.5 rounded-xl bg-slate-50 shrink-0 ${color}`}>
          <Icon className="h-5 w-5" />
        </div>
      </CardContent>
    </Card>
  );
}

export default async function AdminPage() {
  const supabase = await createClient();
  const { institutionId, institutionSlug } = await getTenantContext();

  let coursesQuery = supabase.from('courses').select('*, categories(name)');
  if (institutionId) {
    coursesQuery = coursesQuery.eq('institution_id', institutionId);
  }
  coursesQuery = coursesQuery.order('display_order', { ascending: true });

  const [{ data: courses }, { data: categories }] = await Promise.all([
    coursesQuery,
    supabase.from('categories').select('id, name').order('name'),
  ]);

  const courseCount = courses?.length ?? 0;

  // ── KPI metrics (best-effort: never break the page if a query fails) ──────
  let totalUsers = 0;
  let totalEnrollments = 0;
  let certificatesIssued = 0;
  let activeUsers30d: number | null = null;
  let signIns7d: number | null = null;

  if (institutionId) {
    try {
      const [usersRes, enrollmentsRes, certsRes] = await Promise.all([
        supabase
          .from('users')
          .select('id', { count: 'exact', head: true })
          .eq('institution_id', institutionId),
        supabase
          .from('course_enrollments')
          .select('id, courses!inner(institution_id)', { count: 'exact', head: true })
          .eq('courses.institution_id', institutionId),
        supabase
          .from('certificates')
          .select('id', { count: 'exact', head: true })
          .eq('institution_id', institutionId)
          .is('revoked_at', null)
          .eq('hidden', false), // exclude internal per-course certs (migration 067)
      ]);
      totalUsers = usersRes.count ?? 0;
      totalEnrollments = enrollmentsRes.count ?? 0;
      certificatesIssued = certsRes.count ?? 0;
    } catch {
      // keep zeros — the course grid below must always render
    }

    try {
      const counts = await getEventCounts(supabase, institutionId, 30);
      activeUsers30d = counts.activeUsers;
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10);
      signIns7d = Object.entries(counts.signInsByDay)
        .filter(([day]) => day >= sevenDaysAgo)
        .reduce((sum, [, n]) => sum + n, 0);
    } catch {
      activeUsers30d = null;
      signIns7d = null;
    }
  }

  return (
    <div className="px-4 sm:px-0">
      {institutionId && (
        <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-5 mb-8">
          <KpiCard title="Total Users" value={totalUsers} icon={Users} color="text-blue-600" />
          <KpiCard title="Enrollments" value={totalEnrollments} icon={GraduationCap} color="text-violet-600" />
          <KpiCard title="Certificates" value={certificatesIssued} icon={Award} color="text-amber-600" />
          <KpiCard title="Active (30d)" value={activeUsers30d ?? '—'} icon={Activity} color="text-teal-600" />
          <KpiCard title="Sign-ins (7d)" value={signIns7d ?? '—'} icon={LogIn} color="text-emerald-600" />
        </div>
      )}
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-3">
          <h2 className="text-3xl font-bold text-[#0F172A]">Courses</h2>
          <Badge variant="secondary" className="bg-[#1E3A5F] text-white text-sm px-3 py-0.5">
            {courseCount}
          </Badge>
        </div>
        <Link href={`/${institutionSlug}/admin/courses/create`}>
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
              <Link href={`/${institutionSlug}/admin/courses/create`}>
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
