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
  ChevronDown,
  ChevronRight,
  Circle,
  type LucideIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { getUserCourseReviews, getSurveyResponsesByUser } from '@/lib/db/surveys';
import { getUserCourseProgressDetailed, getEnrollableCourses } from '@/lib/db/users';
import { getLegacyCompletionsForUser, type LegacyCourseCompletion } from '@/lib/db/legacy-users';
import { getUserQuizPerformance } from '@/lib/db/quizzes';
import { resetCourseProgress, enrollUsers, unenrollUser } from '@/lib/db/admin-actions';
import { getUserEvents } from '@/lib/db/events';
import { formatAnswer } from '@/components/blocks/survey/viewer';
import type { ActiveUser, UserCourseProgressDetailed, CourseOption } from '@/lib/db/users';
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
// Progress tab helpers
// ---------------------------------------------------------------------------

function shortDate(iso: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function quizChipStyle(pct: number): string {
  if (pct >= 80) return 'bg-green-50 text-green-700 border-green-200';
  if (pct >= 50) return 'bg-amber-50 text-amber-700 border-amber-200';
  return 'bg-red-50 text-red-700 border-red-200';
}

// ---------------------------------------------------------------------------
// Summary stat chip
// ---------------------------------------------------------------------------

function StatChip({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="flex-1 min-w-0 rounded-xl bg-slate-50 border border-slate-100 px-3 py-2.5 flex flex-col gap-0.5">
      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 leading-none">{label}</span>
      <span className="text-lg font-black text-[#1E3A5F] leading-tight">{value}</span>
      {sub && <span className="text-[11px] text-slate-500 font-medium leading-none">{sub}</span>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Expandable lesson list
// ---------------------------------------------------------------------------

function LessonChecklist({ lessons }: { lessons: UserCourseProgressDetailed['lessons'] }) {
  return (
    <div className="mt-2 border-t border-slate-100 pt-2 space-y-0.5">
      {lessons.map((l) => (
        <div key={l.id} className="flex items-center gap-2 py-0.5">
          {l.completed ? (
            <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
          ) : (
            <Circle className="h-3.5 w-3.5 text-slate-300 shrink-0" />
          )}
          <span className={`text-xs flex-1 min-w-0 truncate font-medium ${l.completed ? 'text-slate-700' : 'text-slate-400'}`}>
            {l.title}
          </span>
          {l.completed && l.completed_at && (
            <span className="text-[11px] text-slate-400 shrink-0 font-medium">{shortDate(l.completed_at)}</span>
          )}
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Progress tab
// ---------------------------------------------------------------------------

function ProgressTab({ userId, institutionId }: { userId: string; institutionId: string }) {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<UserCourseProgressDetailed[]>([]);
  const [quizPerf, setQuizPerf] = useState<Record<string, { answered: number; correct: number; attempts: number }>>({});
  const [enrollable, setEnrollable] = useState<CourseOption[]>([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [busyCourseId, setBusyCourseId] = useState<string | null>(null);
  const [enrolling, setEnrolling] = useState(false);
  const [expandedCourses, setExpandedCourses] = useState<Set<string>>(new Set());
  const [legacyRows, setLegacyRows] = useState<LegacyCourseCompletion[]>([]);

  const load = useCallback(async () => {
    const supabase = createClient();
    try {
      const [progressRows, quizData, courses, legacyHistory] = await Promise.all([
        getUserCourseProgressDetailed(supabase, userId, institutionId),
        getUserQuizPerformance(supabase, userId),
        getEnrollableCourses(supabase, userId, institutionId),
        getLegacyCompletionsForUser(supabase, userId),
      ]);
      setRows(progressRows);
      setQuizPerf(quizData);
      setEnrollable(courses);
      setLegacyRows(legacyHistory);
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

  const handleReset = async (row: UserCourseProgressDetailed) => {
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

  const handleUnenroll = async (row: UserCourseProgressDetailed) => {
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

  const toggleExpanded = (courseId: string) => {
    setExpandedCourses((prev) => {
      const next = new Set(prev);
      if (next.has(courseId)) next.delete(courseId);
      else next.add(courseId);
      return next;
    });
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {/* Summary skeleton */}
        <div className="flex gap-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex-1 h-14 rounded-xl bg-slate-100 animate-pulse" />
          ))}
        </div>
        {/* Card skeletons */}
        {[1, 2].map((i) => (
          <div key={i} className="rounded-xl border border-slate-100 p-4 space-y-2 animate-pulse">
            <div className="h-4 bg-slate-100 rounded w-2/3" />
            <div className="h-2 bg-slate-100 rounded w-full" />
          </div>
        ))}
      </div>
    );
  }

  // ── Derived summary stats ──────────────────────────────────────────────────
  const started = rows.filter((r) => r.completed_lessons > 0 || r.started_at).length;
  const completed = rows.filter(
    (r) => r.completed_lessons === r.total_lessons && r.total_lessons > 0,
  ).length;
  const totalLessonsDone = rows.reduce((sum, r) => sum + r.completed_lessons, 0);

  // Aggregate quiz accuracy across all courses
  const quizValues = Object.values(quizPerf);
  const totalAnswered = quizValues.reduce((s, v) => s + v.answered, 0);
  const totalCorrect = quizValues.reduce((s, v) => s + v.correct, 0);
  const quizAccuracyPct = totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : null;

  // ── Sort: in-progress (any completed but not done) first by last_activity desc,
  //         then fully completed, then untouched ───────────────────────────────
  const sorted = [...rows].sort((a, b) => {
    const statusA =
      a.completed_lessons > 0 && a.completed_lessons < a.total_lessons
        ? 0
        : a.completed_lessons === a.total_lessons && a.total_lessons > 0
          ? 1
          : 2;
    const statusB =
      b.completed_lessons > 0 && b.completed_lessons < b.total_lessons
        ? 0
        : b.completed_lessons === b.total_lessons && b.total_lessons > 0
          ? 1
          : 2;
    if (statusA !== statusB) return statusA - statusB;
    // within in-progress: sort by last_activity descending
    if (statusA === 0) {
      const tA = a.last_activity_at ? new Date(a.last_activity_at).getTime() : 0;
      const tB = b.last_activity_at ? new Date(b.last_activity_at).getTime() : 0;
      return tB - tA;
    }
    return 0;
  });

  return (
    <div className="space-y-3">
      {/* ── Summary strip ───────────────────────────────────────────────────── */}
      {rows.length > 0 && (
        <div className="flex gap-2">
          <StatChip label="Started" value={started} />
          <StatChip label="Completed" value={completed} />
          <StatChip label="Lessons done" value={totalLessonsDone} />
          {quizAccuracyPct !== null && (
            <StatChip
              label="Quiz accuracy"
              value={`${quizAccuracyPct}%`}
              sub={`${totalCorrect}/${totalAnswered} correct`}
            />
          )}
        </div>
      )}

      {/* ── Per-course cards ─────────────────────────────────────────────────── */}
      {sorted.length === 0 ? (
        <p className="text-center text-slate-400 font-medium py-8">No enrollments yet.</p>
      ) : (
        sorted.map((row) => {
          const pct =
            row.total_lessons > 0
              ? Math.round((row.completed_lessons / row.total_lessons) * 100)
              : 0;
          const busy = busyCourseId === row.course_id;
          const expanded = expandedCourses.has(row.course_id);
          const quiz = quizPerf[row.course_id];
          const quizPct = quiz && quiz.answered > 0 ? Math.round((quiz.correct / quiz.answered) * 100) : null;

          // Build meta line parts
          const metaParts: string[] = [];
          if (row.started_at) metaParts.push(`Started ${shortDate(row.started_at)}`);
          if (row.last_activity_at && row.last_activity_at !== row.started_at)
            metaParts.push(`Last active ${shortDate(row.last_activity_at)}`);
          if (row.completed_at) metaParts.push(`Completed ${shortDate(row.completed_at)}`);

          return (
            <div key={row.course_id} className="rounded-xl border border-slate-100 p-4 space-y-2">
              {/* Header row */}
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-slate-900 text-sm truncate">{row.course_title}</p>
                  {/* Certificate chip */}
                  {row.certificate_number && (
                    <div className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5">
                      <Award className="h-3 w-3 text-amber-500 shrink-0" />
                      <span
                        className={`text-xs font-semibold ${
                          row.certificate_revoked_at
                            ? 'line-through text-slate-400'
                            : 'text-amber-700'
                        }`}
                      >
                        {row.certificate_number}
                      </span>
                      {row.certificate_issued_at && !row.certificate_revoked_at && (
                        <span className="text-[11px] text-amber-600">
                          · {shortDate(row.certificate_issued_at)}
                        </span>
                      )}
                      {row.certificate_revoked_at && (
                        <span className="text-[11px] font-bold text-red-600">revoked</span>
                      )}
                    </div>
                  )}
                </div>
                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy}
                    onClick={() => handleReset(row)}
                    className="gap-1 text-xs h-7 px-2"
                  >
                    <RotateCcw className="h-3 w-3" />
                    {busy ? 'Working…' : 'Reset'}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy}
                    onClick={() => handleUnenroll(row)}
                    className="gap-1 text-xs text-red-600 hover:text-red-700 h-7 px-2"
                  >
                    <UserMinus className="h-3 w-3" />
                    Unenroll
                  </Button>
                </div>
              </div>

              {/* Meta line */}
              {metaParts.length > 0 && (
                <p className="text-[11px] text-slate-400 font-medium">{metaParts.join(' · ')}</p>
              )}

              {/* Progress bar */}
              <div className="flex items-center gap-3">
                <Progress value={pct} className="h-1.5 flex-1" />
                <span className="text-xs font-bold text-slate-600 whitespace-nowrap">
                  {row.completed_lessons}/{row.total_lessons} lessons · {pct}%
                </span>
              </div>

              {/* Quiz chip */}
              {quizPct !== null && quiz && (
                <div
                  className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${quizChipStyle(quizPct)}`}
                >
                  <CheckCircle2 className="h-3 w-3" />
                  Quizzes: {quiz.correct}/{quiz.answered} correct ({quizPct}%)
                </div>
              )}

              {/* Expandable lesson detail */}
              {row.lessons.length > 0 && (
                <button
                  onClick={() => toggleExpanded(row.course_id)}
                  className="flex items-center gap-1 text-[11px] font-bold text-slate-400 hover:text-slate-600 transition-colors mt-1"
                >
                  {expanded ? (
                    <ChevronDown className="h-3 w-3" />
                  ) : (
                    <ChevronRight className="h-3 w-3" />
                  )}
                  {expanded ? 'Hide lessons' : `Show ${row.lessons.length} lessons`}
                </button>
              )}
              {expanded && <LessonChecklist lessons={row.lessons} />}
            </div>
          );
        })
      )}

      {/* ── Enroll in course ─────────────────────────────────────────────────── */}
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

      {/* ── EdApp import history (only for claimed legacy users) ─────────────── */}
      {legacyRows.length > 0 && (
        <div className="rounded-xl border border-slate-100 p-4">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">
            EdApp import history
          </p>
          <p className="text-[11px] text-slate-400 font-medium mb-3">
            As exported from the previous platform — the source of this user&apos;s backdated progress and certificates.
          </p>
          <div className="space-y-1.5">
            {legacyRows.map((r, i) => {
              const done = r.completed_at != null || (r.progress_percent ?? 0) >= 95;
              const mins = r.time_spent_minutes ?? 0;
              const timeLabel = mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins}m`;
              return (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <span
                    className={`h-2 w-2 rounded-full shrink-0 ${done ? 'bg-green-500' : 'bg-slate-300'}`}
                  />
                  <span className="font-semibold text-slate-700 truncate flex-1 min-w-0">
                    {r.course_title || 'Untitled course'}
                  </span>
                  <span className="text-slate-400 font-medium shrink-0">
                    {Math.round(r.progress_percent ?? 0)}%
                    {r.lessons_total ? ` · ${r.lessons_completed ?? 0}/${r.lessons_total} lessons` : ''}
                    {mins > 0 ? ` · ${timeLabel}` : ''}
                    {r.completed_at ? ` · done ${shortDate(r.completed_at)}` : ''}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
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
