import { createClient } from '@/lib/supabase/server';
import { getTenantContext } from '@/lib/tenant/server';
import {
  getPlatformStats,
  getCourseStats,
  getEnrollmentTrend,
  getCompletionTrend,
  getStudentProgress,
} from '@/lib/db/analytics';
import { getSurveyAnalyticsBundle } from '@/lib/db/surveys';
import { getInstitutionFeedbackCounts } from '@/lib/db/course-feedback';
import { getProblematicQuizzes } from '@/lib/db/quiz-health';
import { getEventCounts, getRecentEvents, type AnalyticsEvent, type EventCounts } from '@/lib/db/events';
import { AnalyticsDashboard } from './analytics-dashboard';

const TREND_DAY_OPTIONS = [30, 90, 180] as const;

function parseTrendDays(raw: string | undefined): number {
  const n = Number(raw);
  return TREND_DAY_OPTIONS.includes(n as (typeof TREND_DAY_OPTIONS)[number]) ? n : 90;
}

export default async function AnalyticsPage({
  searchParams: searchParamsPromise,
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  const searchParams = await searchParamsPromise;
  const trendDays = parseTrendDays(searchParams.days);

  const supabase = await createClient();
  const { institutionId } = await getTenantContext();

  if (!institutionId) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-slate-500 font-medium">Institution not found.</p>
      </div>
    );
  }

  const [platform, courses, enrollmentTrend, completionTrend, students, surveyAnalytics, feedbackCounts, problematicQuizzes] =
    await Promise.all([
      getPlatformStats(supabase, institutionId),
      getCourseStats(supabase, institutionId),
      getEnrollmentTrend(supabase, institutionId, trendDays),
      getCompletionTrend(supabase, institutionId, trendDays),
      getStudentProgress(supabase, institutionId),
      getSurveyAnalyticsBundle(supabase, institutionId),
      getInstitutionFeedbackCounts(supabase, institutionId),
      getProblematicQuizzes(supabase, institutionId).catch(() => []),
    ]);

  // Engagement events are best-effort — never break the page if the
  // analytics_events table is empty or unavailable.
  let eventCounts: EventCounts | null = null;
  let recentEvents: AnalyticsEvent[] = [];
  try {
    [eventCounts, recentEvents] = await Promise.all([
      getEventCounts(supabase, institutionId, trendDays),
      getRecentEvents(supabase, institutionId, 20),
    ]);
  } catch {
    eventCounts = null;
    recentEvents = [];
  }

  return (
    <AnalyticsDashboard
      trendDays={trendDays}
      platform={platform}
      courses={courses}
      enrollmentTrend={enrollmentTrend}
      completionTrend={completionTrend}
      students={students}
      surveyAnalytics={surveyAnalytics}
      feedbackCounts={feedbackCounts}
      eventCounts={eventCounts}
      recentEvents={recentEvents}
      problematicQuizzes={problematicQuizzes}
    />
  );
}
