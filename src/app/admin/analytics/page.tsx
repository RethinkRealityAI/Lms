import { createClient } from '@/lib/supabase/server';
import { getTenantContext } from '@/lib/tenant/server';
import {
  getPlatformStats,
  getCourseStats,
  getEnrollmentTrend,
  getCompletionTrend,
  getStudentProgress,
} from '@/lib/db/analytics';
import { AnalyticsDashboard } from './analytics-dashboard';

export default async function AnalyticsPage() {
  const supabase = await createClient();
  const { institutionId } = await getTenantContext();

  if (!institutionId) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-slate-500 font-medium">Institution not found.</p>
      </div>
    );
  }

  const [platform, courses, enrollmentTrend, completionTrend, students] =
    await Promise.all([
      getPlatformStats(supabase, institutionId),
      getCourseStats(supabase, institutionId),
      getEnrollmentTrend(supabase, institutionId),
      getCompletionTrend(supabase, institutionId),
      getStudentProgress(supabase, institutionId),
    ]);

  return (
    <AnalyticsDashboard
      platform={platform}
      courses={courses}
      enrollmentTrend={enrollmentTrend}
      completionTrend={completionTrend}
      students={students}
    />
  );
}
