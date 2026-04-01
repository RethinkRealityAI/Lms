import { createClient } from '@/lib/supabase/server';
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

  const [platform, courses, enrollmentTrend, completionTrend, students] =
    await Promise.all([
      getPlatformStats(supabase),
      getCourseStats(supabase),
      getEnrollmentTrend(supabase),
      getCompletionTrend(supabase),
      getStudentProgress(supabase),
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
