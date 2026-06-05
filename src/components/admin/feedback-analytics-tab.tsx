'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Star, MessageSquare, ClipboardList, ChevronRight } from 'lucide-react';
import type { CourseStats } from '@/lib/db/analytics';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { withInstitutionPath } from '@/lib/tenant/path';

export interface FeedbackCourseSummary {
  courseId: string;
  courseTitle: string;
  /** From CourseStats — already fetched for the analytics page. */
  reviewCount: number;
  avgRating: number;
  /** From getInstitutionFeedbackCounts. */
  feedbackResponseCount: number;
}

interface Props {
  summaries: FeedbackCourseSummary[];
}

export function FeedbackAnalyticsTab({ summaries }: Props) {
  const pathname = usePathname();

  const totalReviews = summaries.reduce((n, s) => n + s.reviewCount, 0);
  const totalFeedback = summaries.reduce((n, s) => n + s.feedbackResponseCount, 0);
  const coursesWithRatings = summaries.filter((s) => s.reviewCount > 0);
  const overallAvg =
    coursesWithRatings.length > 0
      ? coursesWithRatings.reduce((sum, s) => sum + s.avgRating * s.reviewCount, 0) /
        coursesWithRatings.reduce((n, s) => n + s.reviewCount, 0)
      : null;

  const activeSummaries = summaries.filter(
    (s) => s.reviewCount > 0 || s.feedbackResponseCount > 0,
  );

  if (activeSummaries.length === 0) {
    return (
      <Card className="border-none shadow-[0_4px_20px_rgb(0,0,0,0.04)] bg-white mt-4">
        <CardContent className="py-16 text-center">
          <MessageSquare className="h-10 w-10 text-slate-300 mx-auto mb-3" />
          <p className="font-bold text-slate-700">No feedback yet</p>
          <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
            Course reviews and completion survey responses will appear here once students start
            engaging with your courses.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4 mt-4">
      {/* Stat cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-none shadow-[0_4px_20px_rgb(0,0,0,0.04)] bg-white">
          <CardContent className="pt-6">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Total reviews</p>
            <p className="text-3xl font-black text-slate-900 mt-1">{totalReviews}</p>
            {overallAvg !== null && (
              <div className="flex items-center gap-1 mt-1">
                <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
                <span className="text-sm font-bold text-slate-600">{overallAvg.toFixed(1)} avg rating</span>
              </div>
            )}
          </CardContent>
        </Card>
        <Card className="border-none shadow-[0_4px_20px_rgb(0,0,0,0.04)] bg-white">
          <CardContent className="pt-6">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Survey responses</p>
            <p className="text-3xl font-black text-slate-900 mt-1">{totalFeedback}</p>
            <p className="text-sm text-slate-500 font-medium mt-1">Completion feedback</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-[0_4px_20px_rgb(0,0,0,0.04)] bg-white">
          <CardContent className="pt-6">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Courses with feedback</p>
            <p className="text-3xl font-black text-slate-900 mt-1">{activeSummaries.length}</p>
            <p className="text-sm text-slate-500 font-medium mt-1">of {summaries.length} total</p>
          </CardContent>
        </Card>
      </div>

      {/* Per-course table */}
      <Card className="border-none shadow-[0_4px_20px_rgb(0,0,0,0.04)] bg-white">
        <CardHeader>
          <CardTitle className="text-lg font-black text-slate-900">Feedback by course</CardTitle>
          <CardDescription className="font-medium text-slate-500">
            Review counts, ratings, and completion survey responses. Click a course to view
            individual responses.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-slate-50">
            {activeSummaries.map((s) => {
              const href = withInstitutionPath(`/admin/courses/${s.courseId}?tab=feedback`, pathname);
              return (
                <Link
                  key={s.courseId}
                  href={href}
                  className="w-full flex items-center justify-between px-6 py-4 hover:bg-slate-50/80 transition-colors text-left group"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-900 truncate group-hover:text-[#1E3A5F] transition-colors">
                      {s.courseTitle}
                    </p>
                    <div className="flex flex-wrap items-center gap-3 mt-1">
                      {s.reviewCount > 0 ? (
                        <span className="flex items-center gap-1 text-xs text-slate-500 font-medium">
                          <Star className="h-3 w-3 text-amber-400 fill-amber-400" />
                          {Number(s.avgRating).toFixed(1)} ({s.reviewCount} review{s.reviewCount !== 1 ? 's' : ''})
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400 font-medium">No reviews</span>
                      )}
                      {s.feedbackResponseCount > 0 && (
                        <span className="flex items-center gap-1 text-xs text-slate-500 font-medium">
                          <ClipboardList className="h-3 w-3 text-slate-400" />
                          {s.feedbackResponseCount} survey response{s.feedbackResponseCount !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-4">
                    {s.reviewCount > 0 && (
                      <Badge variant="secondary" className="font-bold text-xs">
                        <Star className="h-2.5 w-2.5 mr-1 text-amber-400 fill-amber-400" />
                        {Number(s.avgRating).toFixed(1)}
                      </Badge>
                    )}
                    <ChevronRight className="h-4 w-4 text-slate-400" />
                  </div>
                </Link>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/** Build the summaries array from already-fetched CourseStats + feedback counts. */
export function buildFeedbackSummaries(
  courses: CourseStats[],
  feedbackCounts: Record<string, number>,
): FeedbackCourseSummary[] {
  return courses.map((c) => ({
    courseId: c.id,
    courseTitle: c.title,
    reviewCount: c.review_count ?? 0,
    avgRating: Number(c.avg_rating) || 0,
    feedbackResponseCount: feedbackCounts[c.id] ?? 0,
  }));
}
