'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import {
  Star,
  ClipboardList,
  Loader2,
  GraduationCap,
  Activity,
  Award,
  RotateCcw,
  UserMinus,
  LogIn,
  CheckCircle2,
  BookOpen,
  XCircle,
  UserCog,
  UserX,
  UserCheck,
  RefreshCw,
  type LucideIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { getUserCourseReviews, getSurveyResponsesByUser } from '@/lib/db/surveys';
import { getUserCourseProgress, getEnrollableCourses } from '@/lib/db/users';
import { resetCourseProgress, enrollUsers, unenrollUser } from '@/lib/db/admin-actions';
import { getUserEvents } from '@/lib/db/events';
import { formatAnswer } from '@/components/blocks/survey/viewer';
import type { ActiveUser, UserCourseProgress, CourseOption } from '@/lib/db/users';
import type { UserCourseReview, SurveyResponseWithMeta } from '@/lib/db/surveys';
import type { AnalyticsEvent } from '@/lib/db/events';

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

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// ---------------------------------------------------------------------------
// Progress tab
// ---------------------------------------------------------------------------

function ProgressTab({ userId, institutionId }: { userId: string; institutionId: string }) {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<UserCourseProgress[]>([]);
  const [enrollable, setEnrollable] = useState<CourseOption[]>([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [busyCourseId, setBusyCourseId] = useState<string | null>(null);
  const [enrolling, setEnrolling] = useState(false);

  const load = useCallback(async () => {
    const supabase = createClient();
    try {
      const [progressRows, courses] = await Promise.all([
        getUserCourseProgress(supabase, userId, institutionId),
        getEnrollableCourses(supabase, userId, institutionId),
      ]);
      setRows(progressRows);
      setEnrollable(courses);
    } catch {
      toast.error('Failed to load course progress');
    } finally {
      setLoading(false);
    }
  }, [userId, institutionId]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  const handleReset = async (row: UserCourseProgress) => {
    if (
      !window.confirm(
        `Reset all progress for "${row.course_title}"? This clears completed lessons and revokes any certificate.`,
      )
    ) {
      return;
    }
    setBusyCourseId(row.course_id);
    try {
      const supabase = createClient();
      const result = await resetCourseProgress(supabase, userId, row.course_id, true);
      toast.success(
        `Cleared ${result.lessons_cleared} lesson${result.lessons_cleared !== 1 ? 's' : ''}${
          result.certificate_revoked ? ', certificate revoked' : ''
        }`,
      );
      await load();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to reset progress');
    } finally {
      setBusyCourseId(null);
    }
  };

  const handleUnenroll = async (row: UserCourseProgress) => {
    if (!window.confirm(`Unenroll this user from "${row.course_title}"?`)) return;
    setBusyCourseId(row.course_id);
    try {
      const supabase = createClient();
      await unenrollUser(supabase, row.course_id, userId);
      toast.success(`Unenrolled from ${row.course_title}`);
      await load();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to unenroll');
    } finally {
      setBusyCourseId(null);
    }
  };

  const handleEnroll = async () => {
    if (!selectedCourse) return;
    setEnrolling(true);
    try {
      const supabase = createClient();
      const count = await enrollUsers(supabase, selectedCourse, [userId]);
      toast.success(count > 0 ? 'Enrolled in course' : 'User was already enrolled');
      setSelectedCourse('');
      await load();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to enroll');
    } finally {
      setEnrolling(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-[#1A3C6E]" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {rows.length === 0 ? (
        <p className="text-center text-slate-400 font-medium py-8">Not enrolled in any courses yet.</p>
      ) : (
        rows.map((row) => {
          const pct = row.total_lessons > 0 ? Math.round((row.completed_lessons / row.total_lessons) * 100) : 0;
          const busy = busyCourseId === row.course_id;
          return (
            <div key={row.course_id} className="rounded-xl border border-slate-100 p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-bold text-slate-900 text-sm truncate">{row.course_title}</p>
                  {row.certificate_number && (
                    <p className="text-xs mt-0.5 flex items-center gap-1.5">
                      <Award className="h-3 w-3 text-amber-500 shrink-0" />
                      <span
                        className={
                          row.certificate_revoked_at
                            ? 'line-through text-slate-400 font-medium'
                            : 'text-slate-600 font-medium'
                        }
                      >
                        {row.certificate_number}
                      </span>
                      {row.certificate_revoked_at && (
                        <span className="text-red-600 font-bold">revoked</span>
                      )}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy}
                    onClick={() => handleReset(row)}
                    className="gap-1 text-xs"
                  >
                    <RotateCcw className="h-3 w-3" />
                    {busy ? 'Working…' : 'Reset progress'}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy}
                    onClick={() => handleUnenroll(row)}
                    className="gap-1 text-xs text-red-600 hover:text-red-700"
                  >
                    <UserMinus className="h-3 w-3" />
                    Unenroll
                  </Button>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Progress value={pct} className="h-2 flex-1" />
                <span className="text-xs font-bold text-slate-600 whitespace-nowrap">
                  {row.completed_lessons}/{row.total_lessons} lessons
                </span>
              </div>
            </div>
          );
        })
      )}

      <div className="rounded-xl border border-dashed border-slate-200 p-4">
        <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Enroll in course</p>
        {enrollable.length === 0 ? (
          <p className="text-sm text-slate-400 font-medium">No other courses available.</p>
        ) : (
          <div className="flex items-center gap-2">
            <Select value={selectedCourse} onValueChange={setSelectedCourse}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Select a course…" />
              </SelectTrigger>
              <SelectContent>
                {enrollable.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={handleEnroll}
              disabled={!selectedCourse || enrolling}
              className="bg-[#1E3A5F] hover:bg-[#162d4a] text-white"
            >
              {enrolling ? 'Enrolling…' : 'Enroll'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Activity tab
// ---------------------------------------------------------------------------

const EVENT_META: Record<string, { label: string; icon: LucideIcon; cls: string }> = {
  sign_in: { label: 'Signed in', icon: LogIn, cls: 'bg-slate-100 text-slate-600' },
  lesson_completed: { label: 'Completed a lesson', icon: CheckCircle2, cls: 'bg-green-50 text-green-600' },
  enrolled: { label: 'Enrolled in a course', icon: BookOpen, cls: 'bg-blue-50 text-blue-600' },
  unenrolled: { label: 'Unenrolled from a course', icon: XCircle, cls: 'bg-slate-100 text-slate-500' },
  certificate_issued: { label: 'Certificate issued', icon: Award, cls: 'bg-amber-50 text-amber-600' },
  certificate_revoked: { label: 'Certificate revoked', icon: XCircle, cls: 'bg-red-50 text-red-600' },
  certificate_restored: { label: 'Certificate restored', icon: RefreshCw, cls: 'bg-green-50 text-green-600' },
  role_changed: { label: 'Role changed', icon: UserCog, cls: 'bg-violet-50 text-violet-600' },
  user_deactivated: { label: 'Account deactivated', icon: UserX, cls: 'bg-red-50 text-red-600' },
  user_reactivated: { label: 'Account reactivated', icon: UserCheck, cls: 'bg-green-50 text-green-600' },
  progress_reset: { label: 'Course progress reset', icon: RotateCcw, cls: 'bg-amber-50 text-amber-600' },
};

function eventDetail(event: AnalyticsEvent): string | null {
  const p = event.payload ?? {};
  if (typeof p.course_title === 'string') return p.course_title;
  if (typeof p.lesson_title === 'string') return p.lesson_title;
  if (event.event_type === 'role_changed' && typeof p.new_role === 'string') return `New role: ${p.new_role}`;
  if (typeof p.certificate_number === 'string') return p.certificate_number;
  return null;
}

function ActivityTab({ userId }: { userId: string }) {
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<AnalyticsEvent[]>([]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const data = await getUserEvents(createClient(), userId, 100);
        if (!cancelled) setEvents(data);
      } catch {
        if (!cancelled) toast.error('Failed to load activity');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-[#1A3C6E]" />
      </div>
    );
  }

  if (events.length === 0) {
    return <p className="text-center text-slate-400 font-medium py-8">No activity recorded yet.</p>;
  }

  return (
    <div className="space-y-1">
      {events.map((event) => {
        const meta = EVENT_META[event.event_type] ?? {
          label: event.event_type.replace(/_/g, ' '),
          icon: Activity,
          cls: 'bg-slate-100 text-slate-500',
        };
        const Icon = meta.icon;
        const detail = eventDetail(event);
        return (
          <div key={event.id} className="flex items-start gap-3 py-2 border-b border-slate-50 last:border-0">
            <div className={`h-7 w-7 rounded-full flex items-center justify-center shrink-0 ${meta.cls}`}>
              <Icon className="h-3.5 w-3.5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-slate-800">{meta.label}</p>
              {detail && <p className="text-xs text-slate-500 font-medium truncate">{detail}</p>}
            </div>
            <span className="text-xs text-slate-400 font-medium whitespace-nowrap shrink-0">
              {relativeTime(event.created_at)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Dialog
// ---------------------------------------------------------------------------

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

        <Tabs defaultValue="progress" className="flex-1 min-h-0 flex flex-col">
          <TabsList className="bg-slate-100 p-1 rounded-xl w-full shrink-0">
            <TabsTrigger value="progress" className="rounded-lg font-bold text-sm flex-1">
              <GraduationCap className="h-4 w-4 mr-1.5" />
              Progress
            </TabsTrigger>
            <TabsTrigger value="activity" className="rounded-lg font-bold text-sm flex-1">
              <Activity className="h-4 w-4 mr-1.5" />
              Activity
            </TabsTrigger>
            <TabsTrigger value="reviews" className="rounded-lg font-bold text-sm flex-1">
              <Star className="h-4 w-4 mr-1.5" />
              Reviews ({reviews.length})
            </TabsTrigger>
            <TabsTrigger value="surveys" className="rounded-lg font-bold text-sm flex-1">
              <ClipboardList className="h-4 w-4 mr-1.5" />
              Surveys ({surveys.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="progress" className="flex-1 overflow-y-auto mt-4">
            <ProgressTab userId={user.id} institutionId={institutionId} />
          </TabsContent>

          <TabsContent value="activity" className="flex-1 overflow-y-auto mt-4">
            <ActivityTab userId={user.id} />
          </TabsContent>

          <TabsContent value="reviews" className="flex-1 overflow-y-auto mt-4 space-y-3">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-[#1A3C6E]" />
              </div>
            ) : reviews.length === 0 ? (
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
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-[#1A3C6E]" />
              </div>
            ) : surveys.length === 0 ? (
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
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
