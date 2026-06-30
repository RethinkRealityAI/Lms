'use client';

import { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Star, MessageSquare, ClipboardList, ChevronRight, Users } from 'lucide-react';
import type { CourseStats } from '@/lib/db/analytics';
import type { CompletionSurveyBundle } from '@/lib/db/course-feedback';
import { formatAnswer } from '@/components/blocks/survey/viewer';
import type { SurveyAnswerValue } from '@/lib/content/blocks/survey/schema';
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
  /** Completion-survey responses grouped by course, with answers + questions. */
  bundle: CompletionSurveyBundle;
}

export function FeedbackAnalyticsTab({ summaries, bundle }: Props) {
  const pathname = usePathname();

  const totalReviews = summaries.reduce((n, s) => n + s.reviewCount, 0);
  const coursesWithRatings = summaries.filter((s) => s.reviewCount > 0);
  const overallAvg =
    coursesWithRatings.length > 0
      ? coursesWithRatings.reduce((sum, s) => sum + s.avgRating * s.reviewCount, 0) /
        coursesWithRatings.reduce((n, s) => n + s.reviewCount, 0)
      : null;

  const [selectedCourseId, setSelectedCourseId] = useState<string>(
    bundle.courses[0]?.courseId ?? '',
  );
  const selectedCourse =
    bundle.courses.find((c) => c.courseId === selectedCourseId) ?? bundle.courses[0] ?? null;

  // Answer keys: ordered by the template questions when available, else discovered.
  const answerKeys = useMemo(() => {
    if (!selectedCourse) return [];
    if (selectedCourse.questions.length) return selectedCourse.questions.map((q) => q.id);
    const keys = new Set<string>();
    for (const r of selectedCourse.responses) Object.keys(r.answers ?? {}).forEach((k) => keys.add(k));
    return Array.from(keys);
  }, [selectedCourse]);

  const questionLabels = useMemo(() => {
    const map = new Map<string, string>();
    for (const q of selectedCourse?.questions ?? []) map.set(q.id, q.question || 'Untitled question');
    return map;
  }, [selectedCourse]);

  const hasAnyData =
    bundle.totalResponses > 0 || summaries.some((s) => s.reviewCount > 0);

  if (!hasAnyData) {
    return (
      <Card className="border-none shadow-[0_4px_20px_rgb(0,0,0,0.04)] bg-white mt-4">
        <CardContent className="py-16 text-center">
          <MessageSquare className="h-10 w-10 text-slate-300 mx-auto mb-3" />
          <p className="font-bold text-slate-700">No completion surveys yet</p>
          <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
            End-of-course survey responses and star reviews will appear here once students complete
            your courses.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4 mt-4">
      {/* Stat cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-none shadow-[0_4px_20px_rgb(0,0,0,0.04)] bg-white">
          <CardContent className="pt-6">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Survey responses</p>
            <p className="text-3xl font-black text-slate-900 mt-1">{bundle.totalResponses}</p>
            <p className="text-sm text-slate-500 font-medium mt-1">Completion surveys</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-[0_4px_20px_rgb(0,0,0,0.04)] bg-white">
          <CardContent className="pt-6">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Respondents</p>
            <p className="text-3xl font-black text-slate-900 mt-1">{bundle.totalRespondents}</p>
            <p className="text-sm text-slate-500 font-medium mt-1">Unique students</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-[0_4px_20px_rgb(0,0,0,0.04)] bg-white">
          <CardContent className="pt-6">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Courses with responses</p>
            <p className="text-3xl font-black text-slate-900 mt-1">{bundle.courses.length}</p>
            <p className="text-sm text-slate-500 font-medium mt-1">of {summaries.length} total</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-[0_4px_20px_rgb(0,0,0,0.04)] bg-white">
          <CardContent className="pt-6">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Star reviews</p>
            <p className="text-3xl font-black text-slate-900 mt-1">{totalReviews}</p>
            {overallAvg !== null ? (
              <div className="flex items-center gap-1 mt-1">
                <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
                <span className="text-sm font-bold text-slate-600">{overallAvg.toFixed(1)} avg rating</span>
              </div>
            ) : (
              <p className="text-sm text-slate-500 font-medium mt-1">No ratings yet</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Completion survey responses — selectable per course, with aggregates */}
      <Card className="border-none shadow-[0_4px_20px_rgb(0,0,0,0.04)] bg-white">
        <CardHeader>
          <CardTitle className="text-lg font-black text-slate-900">Completion survey responses</CardTitle>
          <CardDescription className="font-medium text-slate-500">
            The end-of-course survey every learner submits to finish a course. Select a course to
            review individual responses and aggregates.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {bundle.courses.length === 0 ? (
            <div className="text-center py-10 text-slate-400 font-medium">
              No completion survey responses yet.
            </div>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Course</p>
                  <Select value={selectedCourse?.courseId ?? ''} onValueChange={setSelectedCourseId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select course" />
                    </SelectTrigger>
                    <SelectContent>
                      {bundle.courses.map((c) => (
                        <SelectItem key={c.courseId} value={c.courseId}>
                          {c.courseTitle} ({c.responseCount} response{c.responseCount !== 1 ? 's' : ''})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {selectedCourse && (
                  <div className="flex items-end">
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary" className="font-bold">
                        <ClipboardList className="h-3 w-3 mr-1" />
                        {selectedCourse.templateName ?? 'Survey'}
                      </Badge>
                      <Badge variant="secondary" className="font-bold">
                        <Users className="h-3 w-3 mr-1" />
                        {selectedCourse.uniqueRespondents} respondent{selectedCourse.uniqueRespondents !== 1 ? 's' : ''}
                      </Badge>
                      <Link
                        href={withInstitutionPath(`/admin/courses/${selectedCourse.courseId}?tab=feedback`, pathname)}
                        className="inline-flex items-center text-xs font-bold text-[#1E3A5F] hover:underline"
                      >
                        Open course <ChevronRight className="h-3 w-3" />
                      </Link>
                    </div>
                  </div>
                )}
              </div>

              {selectedCourse && selectedCourse.responses.length > 0 ? (
                <>
                  <div className="overflow-x-auto rounded-xl border border-slate-100">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-100 bg-slate-50/80">
                          <th className="text-left py-3 px-4 text-xs font-bold uppercase tracking-widest text-slate-400">Student</th>
                          <th className="text-left py-3 px-4 text-xs font-bold uppercase tracking-widest text-slate-400">Submitted</th>
                          {answerKeys.map((key) => (
                            <th key={key} className="text-left py-3 px-4 text-xs font-bold uppercase tracking-widest text-slate-400 max-w-[180px]">
                              {questionLabels.get(key) ?? `Q…${key.slice(0, 6)}`}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {selectedCourse.responses.map((row) => (
                          <tr key={row.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                            <td className="py-3 px-4">
                              <p className="font-bold text-slate-900">{row.userName || 'Unnamed'}</p>
                              <p className="text-xs text-slate-400">{row.userEmail ?? '—'}</p>
                            </td>
                            <td className="py-3 px-4 text-xs text-slate-500 whitespace-nowrap">
                              {new Date(row.submittedAt).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })}
                            </td>
                            {answerKeys.map((key) => (
                              <td key={key} className="py-3 px-4 text-slate-700 max-w-[200px] truncate">
                                {formatAnswer(row.answers[key] as SurveyAnswerValue)}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-4 space-y-3">
                    <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Response summary</p>
                    {answerKeys.map((key) => {
                      const counts = new Map<string, number>();
                      for (const r of selectedCourse.responses) {
                        const label = formatAnswer(r.answers[key] as SurveyAnswerValue);
                        counts.set(label, (counts.get(label) ?? 0) + 1);
                      }
                      const entries = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
                      return (
                        <div key={key} className="space-y-1">
                          <p className="text-xs font-semibold text-slate-600">
                            {questionLabels.get(key) ?? `Question ${key.slice(0, 8)}…`}
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {entries.map(([label, count]) => (
                              <Badge key={label} variant="outline" className="text-xs font-medium">
                                {label}: {count}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : (
                <div className="text-center py-10 text-slate-400 font-medium">
                  No responses for this course yet.
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* All courses — quick index with counts + ratings, links to course detail */}
      <Card className="border-none shadow-[0_4px_20px_rgb(0,0,0,0.04)] bg-white">
        <CardHeader>
          <CardTitle className="text-sm font-black text-slate-900">All courses</CardTitle>
          <CardDescription className="font-medium text-slate-500">
            Completion-survey responses and star reviews per course. Click to open the course&apos;s feedback.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-slate-50">
            {summaries
              .filter((s) => s.reviewCount > 0 || s.feedbackResponseCount > 0)
              .map((s) => {
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
                        {s.feedbackResponseCount > 0 ? (
                          <span className="flex items-center gap-1 text-xs text-slate-500 font-medium">
                            <ClipboardList className="h-3 w-3 text-slate-400" />
                            {s.feedbackResponseCount} survey response{s.feedbackResponseCount !== 1 ? 's' : ''}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400 font-medium">No survey responses</span>
                        )}
                        {s.reviewCount > 0 && (
                          <span className="flex items-center gap-1 text-xs text-slate-500 font-medium">
                            <Star className="h-3 w-3 text-amber-400 fill-amber-400" />
                            {Number(s.avgRating).toFixed(1)} ({s.reviewCount} review{s.reviewCount !== 1 ? 's' : ''})
                          </span>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-slate-400 shrink-0 ml-4" />
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
