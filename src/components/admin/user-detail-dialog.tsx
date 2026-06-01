'use client';

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Star, ClipboardList, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { getUserCourseReviews, getSurveyResponsesByUser } from '@/lib/db/surveys';
import { formatAnswer } from '@/components/blocks/survey/viewer';
import type { ActiveUser } from '@/lib/db/users';
import type { UserCourseReview, SurveyResponseWithMeta } from '@/lib/db/surveys';

interface Props {
  user: ActiveUser | null;
  institutionId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function initials(name: string | null, email: string): string {
  if (name) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return parts[0].slice(0, 2).toUpperCase();
  }
  return email.slice(0, 2).toUpperCase();
}

export function UserDetailDialog({ user, institutionId, open, onOpenChange }: Props) {
  const [loading, setLoading] = useState(false);
  const [reviews, setReviews] = useState<UserCourseReview[]>([]);
  const [surveys, setSurveys] = useState<SurveyResponseWithMeta[]>([]);

  useEffect(() => {
    if (!open || !user) return;

    let cancelled = false;
    setLoading(true);

    (async () => {
      const supabase = createClient();
      const [reviewData, surveyData] = await Promise.all([
        getUserCourseReviews(supabase, user.id, institutionId),
        getSurveyResponsesByUser(supabase, user.id, institutionId),
      ]);
      if (cancelled) return;
      setReviews(reviewData);
      setSurveys(surveyData);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [open, user, institutionId]);

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-[#1E3A5F] text-white flex items-center justify-center text-sm font-bold shrink-0">
              {initials(user.full_name, user.email)}
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-lg font-black truncate">
                {user.full_name || 'Unnamed user'}
              </DialogTitle>
              <DialogDescription className="truncate">{user.email}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="reviews" className="flex-1 min-h-0 flex flex-col">
          <TabsList className="bg-slate-100 p-1 rounded-xl w-full shrink-0">
            <TabsTrigger value="reviews" className="rounded-lg font-bold text-sm flex-1">
              <Star className="h-4 w-4 mr-1.5" />
              Reviews ({reviews.length})
            </TabsTrigger>
            <TabsTrigger value="surveys" className="rounded-lg font-bold text-sm flex-1">
              <ClipboardList className="h-4 w-4 mr-1.5" />
              Surveys ({surveys.length})
            </TabsTrigger>
          </TabsList>

          {loading ? (
            <div className="flex-1 flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-[#1A3C6E]" />
            </div>
          ) : (
            <>
              <TabsContent value="reviews" className="flex-1 overflow-y-auto mt-4 space-y-3">
                {reviews.length === 0 ? (
                  <p className="text-center text-slate-400 font-medium py-8">No course reviews yet.</p>
                ) : (
                  reviews.map((review) => (
                    <div key={review.id} className="rounded-xl border border-slate-100 p-4 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-bold text-slate-900 text-sm">{review.course_title}</p>
                        <div className="flex items-center gap-0.5 shrink-0">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`h-3.5 w-3.5 ${
                                star <= review.rating
                                  ? 'fill-amber-400 text-amber-400'
                                  : 'text-slate-200'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                      {review.review_text && (
                        <p className="text-sm text-slate-600 leading-relaxed">{review.review_text}</p>
                      )}
                      <p className="text-xs text-slate-400">
                        Updated {new Date(review.updated_at).toLocaleDateString()}
                      </p>
                    </div>
                  ))
                )}
              </TabsContent>

              <TabsContent value="surveys" className="flex-1 overflow-y-auto mt-4 space-y-3">
                {surveys.length === 0 ? (
                  <p className="text-center text-slate-400 font-medium py-8">No survey responses yet.</p>
                ) : (
                  surveys.map((response) => (
                    <div key={response.id} className="rounded-xl border border-slate-100 p-4 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-bold text-slate-900 text-sm">
                            {response.block_title || response.lesson_title || 'Survey'}
                          </p>
                          <p className="text-xs text-slate-500">{response.course_title}</p>
                        </div>
                        <Badge variant="secondary" className="text-xs shrink-0">
                          {new Date(response.submitted_at).toLocaleDateString()}
                        </Badge>
                      </div>
                      <div className="space-y-2">
                        {Object.entries(response.answers ?? {}).map(([qId, answer]) => (
                          <div key={qId} className="text-sm">
                            <span className="text-slate-400 text-xs font-medium">Answer · </span>
                            <span className="text-slate-800">{formatAnswer(answer)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </TabsContent>
            </>
          )}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
