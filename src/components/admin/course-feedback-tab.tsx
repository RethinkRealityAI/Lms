'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Star, MessageSquare, ClipboardList, Loader2 } from 'lucide-react';
import { getCourseFeedbackResponses, getCourseReviews } from '@/lib/db/course-feedback';
import { getEffectiveCourseCompletionSurvey, type CourseSurveySource } from '@/lib/db/survey-assignments';
import type { CourseFeedbackResponseWithUser, CourseReview } from '@/lib/db/course-feedback';
import type { SurveyTemplate } from '@/lib/db/survey-templates';

const SURVEY_SOURCE_LABEL: Record<CourseSurveySource, string> = {
  course_override: 'course-specific',
  course_assignment: 'course assignment',
  institution_default: 'institution default',
};

interface Props {
  courseId: string;
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`h-3.5 w-3.5 ${i <= rating ? 'text-amber-400 fill-amber-400' : 'text-slate-200 fill-slate-200'}`}
        />
      ))}
    </div>
  );
}

function formatAnswerValue(value: unknown): string {
  if (value === undefined || value === null) return '—';
  if (Array.isArray(value)) return value.join(', ');
  if (typeof value === 'boolean') return value ? 'True' : 'False';
  return String(value);
}

export function CourseFeedbackTab({ courseId }: Props) {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [template, setTemplate] = useState<SurveyTemplate | null>(null);
  const [surveySource, setSurveySource] = useState<CourseSurveySource | null>(null);
  const [feedbackResponses, setFeedbackResponses] = useState<CourseFeedbackResponseWithUser[]>([]);
  const [reviews, setReviews] = useState<CourseReview[]>([]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [effective, responses, reviewList] = await Promise.all([
        getEffectiveCourseCompletionSurvey(supabase, courseId),
        getCourseFeedbackResponses(supabase, courseId),
        getCourseReviews(supabase, courseId),
      ]);
      setTemplate(effective?.template ?? null);
      setSurveySource(effective?.source ?? null);
      setFeedbackResponses(responses);
      setReviews(reviewList);
      setLoading(false);
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  // Build a question-id → label map from the template
  const questions: Array<{ id: string; question: string; type: string }> =
    template?.data?.questions ?? [];
  const questionLabels = new Map(questions.map((q) => [q.id, q.question || `Question ${q.id.slice(0, 6)}`]));

  // All answer keys across responses (ordered by template if available, otherwise discovered)
  const orderedKeys: string[] = questions.length
    ? questions.map((q) => q.id)
    : Array.from(
        new Set(feedbackResponses.flatMap((r) => Object.keys(r.answers ?? {}))),
      );

  const avgRating =
    reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : null;

  return (
    <div className="space-y-6">
      {/* ── Completion Survey Responses ─────────────────────────────────── */}
      <Card className="border-none shadow-[0_4px_20px_rgb(0,0,0,0.04)] bg-white">
        <CardHeader>
          <CardTitle className="text-lg font-black text-slate-900 flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-slate-400" />
            Completion Survey Responses
          </CardTitle>
          <CardDescription className="font-medium text-slate-500">
            {template
              ? `Template: ${template.name}${surveySource ? ` (${SURVEY_SOURCE_LABEL[surveySource]})` : ''} · ${feedbackResponses.length} response${feedbackResponses.length !== 1 ? 's' : ''}`
              : feedbackResponses.length > 0
                ? `${feedbackResponses.length} response${feedbackResponses.length !== 1 ? 's' : ''} captured (no survey currently assigned)`
                : 'No completion survey configured for this course.'}
          </CardDescription>
        </CardHeader>

        {template || feedbackResponses.length > 0 ? (
          <CardContent className="p-0">
            {feedbackResponses.length === 0 ? (
              <div className="px-6 pb-8 text-center text-slate-400 font-medium">
                No responses yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/80">
                      <th className="text-left py-3 px-4 text-xs font-bold uppercase tracking-widest text-slate-400 whitespace-nowrap">
                        Responder
                      </th>
                      <th className="text-left py-3 px-4 text-xs font-bold uppercase tracking-widest text-slate-400 whitespace-nowrap">
                        Submitted
                      </th>
                      {orderedKeys.map((key) => (
                        <th
                          key={key}
                          className="text-left py-3 px-4 text-xs font-bold uppercase tracking-widest text-slate-400 max-w-[180px]"
                        >
                          {questionLabels.get(key) ?? `Q ${key.slice(0, 6)}…`}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {feedbackResponses.map((row) => (
                      <tr key={row.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                        <td className="py-3 px-4">
                          <p className="font-bold text-slate-900">
                            {row.user?.full_name || 'Unnamed'}
                          </p>
                          <p className="text-xs text-slate-400">{row.user?.email ?? '—'}</p>
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-500 whitespace-nowrap">
                          {new Date(row.submitted_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </td>
                        {orderedKeys.map((key) => (
                          <td key={key} className="py-3 px-4 text-slate-700 max-w-[220px] truncate">
                            {formatAnswerValue((row.answers as Record<string, unknown>)[key])}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        ) : null}
      </Card>

      {/* ── Course Reviews ──────────────────────────────────────────────── */}
      <Card className="border-none shadow-[0_4px_20px_rgb(0,0,0,0.04)] bg-white">
        <CardHeader>
          <CardTitle className="text-lg font-black text-slate-900 flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-slate-400" />
            Course Reviews
            {reviews.length > 0 && (
              <Badge variant="secondary" className="font-bold ml-auto">
                <Star className="h-3 w-3 mr-1 text-amber-400 fill-amber-400" />
                {avgRating!.toFixed(1)} avg · {reviews.length} review{reviews.length !== 1 ? 's' : ''}
              </Badge>
            )}
          </CardTitle>
          <CardDescription className="font-medium text-slate-500">
            Star ratings and written feedback left by students.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {reviews.length === 0 ? (
            <div className="px-6 pb-8 text-center text-slate-400 font-medium">
              No reviews yet.
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {reviews.map((review) => (
                <div key={review.id} className="px-6 py-4 hover:bg-slate-50/50 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <StarRating rating={review.rating} />
                        <span className="text-xs font-bold text-slate-500">{review.rating}/5</span>
                      </div>
                      {review.review_text ? (
                        <p className="text-sm text-slate-700 leading-relaxed">{review.review_text}</p>
                      ) : (
                        <p className="text-sm text-slate-400 italic">No written feedback.</p>
                      )}
                      <p className="text-xs text-slate-400 font-medium mt-2">
                        {review.user?.full_name || 'Unnamed'}{' '}
                        {review.user?.email ? (
                          <span className="text-slate-300">·</span>
                        ) : null}{' '}
                        {review.user?.email ?? ''}
                      </p>
                    </div>
                    <span className="text-xs text-slate-400 whitespace-nowrap shrink-0">
                      {new Date(review.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
