'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Users,
  BookOpen,
  GraduationCap,
  TrendingUp,
  Award,
  Building2,
  Activity,
  BarChart3,
  CheckCircle,
  Clock,
  Star,
  ClipboardList,
  Download,
  ChevronDown,
  ChevronRight,
  LogIn,
  Loader2,
  ShieldAlert,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import {
  getLessonFunnel,
  type LessonFunnelRow,
  type PlatformStats,
  type CourseStats,
  type EnrollmentTrend,
  type CompletionTrend,
  type StudentProgress,
} from '@/lib/db/analytics';
import type { AnalyticsEvent, EventCounts } from '@/lib/db/events';
import type {
  CourseSurveySummary,
  SurveyBlockSummary,
  SurveyResponseWithMeta,
} from '@/lib/db/surveys';
import { SurveysAnalyticsTab } from '@/components/admin/surveys-analytics-tab';
import { FeedbackAnalyticsTab, buildFeedbackSummaries } from '@/components/admin/feedback-analytics-tab';
import { ContentHealthTab } from '@/components/admin/content-health-tab';
import type { ProblematicQuiz } from '@/lib/db/quiz-health';

interface Props {
  trendDays: number;
  platform: PlatformStats | null;
  courses: CourseStats[];
  enrollmentTrend: EnrollmentTrend[];
  completionTrend: CompletionTrend[];
  students: StudentProgress[];
  surveyAnalytics: {
    summaries: CourseSurveySummary[];
    blocksByCourse: Record<string, SurveyBlockSummary[]>;
    responsesByBlock: Record<string, SurveyResponseWithMeta[]>;
  };
  feedbackCounts: Record<string, number>;
  eventCounts: EventCounts | null;
  recentEvents: AnalyticsEvent[];
  problematicQuizzes: ProblematicQuiz[];
}

// ── CSV export (client-side, no deps) ────────────────────────────────────────

function downloadCsv(filename: string, headers: string[], rows: (string | number)[][]) {
  const escape = (v: string | number) => {
    const s = String(v ?? '');
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [headers, ...rows].map((r) => r.map(escape).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ── Engagement helpers ───────────────────────────────────────────────────────

const EVENT_LABELS: Record<string, string> = {
  sign_in: 'Signed in',
  lesson_completed: 'Completed a lesson',
  enrolled: 'Enrolled in a course',
  unenrolled: 'Unenrolled from a course',
  certificate_issued: 'Certificate issued',
  certificate_revoked: 'Certificate revoked',
  certificate_restored: 'Certificate restored',
  progress_reset: 'Progress reset',
  role_changed: 'Role changed',
  user_deactivated: 'User deactivated',
  user_reactivated: 'User reactivated',
};

function eventLabel(type: string): string {
  return EVENT_LABELS[type] ?? type.replace(/_/g, ' ');
}

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  color = 'text-slate-600',
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  color?: string;
}) {
  return (
    <Card className="border-none shadow-[0_4px_20px_rgb(0,0,0,0.04)] bg-white">
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">{title}</p>
            <p className="text-3xl font-black text-slate-900 mt-1">{value}</p>
            {subtitle && (
              <p className="text-sm text-slate-500 font-medium mt-1">{subtitle}</p>
            )}
          </div>
          <div className={`p-3 rounded-xl bg-slate-50 ${color}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function MiniBarChart({ data, maxValue }: { data: number[]; maxValue: number }) {
  const max = maxValue || Math.max(...data, 1);
  return (
    <div className="flex items-end gap-[2px] h-12">
      {data.map((v, i) => (
        <div
          key={i}
          className="flex-1 bg-[#1E3A5F] rounded-t-sm min-w-[2px] transition-all"
          style={{ height: `${Math.max((v / max) * 100, 2)}%` }}
          title={`${v}`}
        />
      ))}
    </div>
  );
}

function TrendCard({
  title,
  data,
  labelKey,
  valueKey,
  color,
  trendDays,
}: {
  title: string;
  data: (EnrollmentTrend | CompletionTrend)[];
  labelKey: string;
  valueKey: string;
  color: string;
  trendDays: number;
}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = data as any[];
  const values = rows.map((d) => Number(d[valueKey]) || 0);
  const total = values.reduce((a, b) => a + b, 0);
  const maxValue = Math.max(...values, 1);

  const recentRows = rows.slice(-30);
  const recentValues = recentRows.map((d) => Number(d[valueKey]) || 0);
  const firstDay = recentRows[0]?.[labelKey] as string | undefined;
  const lastDay = recentRows[recentRows.length - 1]?.[labelKey] as string | undefined;

  return (
    <Card className="border-none shadow-[0_4px_20px_rgb(0,0,0,0.04)] bg-white">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-bold text-slate-700">{title}</CardTitle>
          <Badge variant="secondary" className="font-bold">
            {total} total ({trendDays}d)
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <MiniBarChart data={recentValues} maxValue={maxValue} />
        <div className="flex justify-between text-[10px] text-slate-400 font-medium mt-1">
          <span>{firstDay ? new Date(firstDay).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}</span>
          <span>Last 30 days</span>
          <span>{lastDay ? new Date(lastDay).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}</span>
        </div>
      </CardContent>
    </Card>
  );
}

function LessonFunnelPanel({ courseId, enrolledCount }: { courseId: string; enrolledCount: number }) {
  const [rows, setRows] = useState<LessonFunnelRow[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();
    getLessonFunnel(supabase, courseId)
      .then((r) => {
        if (!cancelled) setRows(r);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [courseId]);

  if (error) {
    return <p className="text-sm text-red-500 font-medium py-3">Failed to load lesson breakdown.</p>;
  }
  if (rows === null) {
    return (
      <div className="flex items-center gap-2 py-3 text-slate-400 text-sm font-medium">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading lesson breakdown…
      </div>
    );
  }
  if (rows.length === 0) {
    return <p className="text-sm text-slate-400 font-medium py-3">No lessons in this course yet.</p>;
  }

  return (
    <div className="py-3 space-y-2">
      <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
        Lesson completion funnel
        {enrolledCount > 0 && <span className="normal-case tracking-normal font-medium text-slate-400"> · {enrolledCount} enrolled</span>}
      </p>
      {rows.map((lesson, i) => {
        const pct = enrolledCount > 0 ? Math.min(100, Math.round((lesson.completed_count / enrolledCount) * 100)) : 0;
        return (
          <div key={lesson.lesson_id} className="flex items-center gap-3">
            <span className="shrink-0 w-5 text-xs font-bold text-slate-400 text-right">{i + 1}</span>
            <span className="w-56 shrink-0 truncate text-sm text-slate-700 font-medium" title={lesson.title}>
              {lesson.title}
            </span>
            <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#1E3A5F] rounded-full transition-all"
                style={{ width: `${enrolledCount > 0 ? Math.max(pct, lesson.completed_count > 0 ? 2 : 0) : 0}%` }}
              />
            </div>
            <span className="shrink-0 w-32 text-right text-xs font-bold text-slate-600">
              {lesson.completed_count} completed{enrolledCount > 0 ? ` · ${pct}%` : ''}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function CourseStatsTable({ courses }: { courses: CourseStats[] }) {
  const [expandedCourseId, setExpandedCourseId] = useState<string | null>(null);

  if (courses.length === 0) {
    return (
      <div className="text-center py-12 text-slate-400 font-medium">
        No courses found.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100">
            <th className="text-left py-3 px-4 text-xs font-bold uppercase tracking-widest text-slate-400">Course</th>
            <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-widest text-slate-400">Status</th>
            <th className="text-right py-3 px-2 text-xs font-bold uppercase tracking-widest text-slate-400">Enrolled</th>
            <th className="text-right py-3 px-2 text-xs font-bold uppercase tracking-widest text-slate-400">Lessons</th>
            <th className="text-right py-3 px-2 text-xs font-bold uppercase tracking-widest text-slate-400">Completion</th>
            <th className="text-right py-3 px-2 text-xs font-bold uppercase tracking-widest text-slate-400">Avg Progress</th>
            <th className="text-right py-3 px-2 text-xs font-bold uppercase tracking-widest text-slate-400">Rating</th>
            <th className="text-right py-3 px-4 text-xs font-bold uppercase tracking-widest text-slate-400">Certs</th>
          </tr>
        </thead>
        <tbody>
          {courses.map((course, idx) => {
            const isExpanded = expandedCourseId === course.id;
            return (
            <React.Fragment key={course.id ?? idx}>
            <tr
              className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors cursor-pointer"
              onClick={() => setExpandedCourseId(isExpanded ? null : course.id)}
              title="Click to view per-lesson completion"
            >
              <td className="py-3 px-4">
                <div className="flex items-center gap-1.5">
                  {isExpanded ? (
                    <ChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                  )}
                  <p className="font-bold text-slate-900 line-clamp-1">{course.title}</p>
                </div>
                <p className="text-xs text-slate-400 font-medium ml-5">
                  Created {new Date(course.created_at).toLocaleDateString()}
                </p>
              </td>
              <td className="text-center py-3 px-2">
                <Badge
                  className={
                    course.is_published
                      ? 'bg-green-50 text-green-700 border-green-200 font-bold'
                      : 'bg-amber-50 text-amber-700 border-amber-200 font-bold'
                  }
                >
                  {course.is_published ? 'Published' : 'Draft'}
                </Badge>
              </td>
              <td className="text-right py-3 px-2 font-bold text-slate-900">{course.enrollment_count}</td>
              <td className="text-right py-3 px-2 font-medium text-slate-600">{course.lesson_count}</td>
              <td className="text-right py-3 px-2">
                <span className="font-bold text-slate-900">{Math.round(course.completion_rate || 0)}%</span>
              </td>
              <td className="text-right py-3 px-2">
                <div className="flex items-center justify-end gap-2">
                  <Progress value={course.avg_progress || 0} className="w-16 h-2" />
                  <span className="text-xs font-bold text-slate-600 w-8 text-right">
                    {Math.round(course.avg_progress || 0)}%
                  </span>
                </div>
              </td>
              <td className="text-right py-3 px-2">
                {course.review_count > 0 ? (
                  <div className="flex items-center justify-end gap-1">
                    <Star className="h-3 w-3 text-amber-400 fill-amber-400" />
                    <span className="font-bold text-slate-900">{Number(course.avg_rating).toFixed(1)}</span>
                    <span className="text-xs text-slate-400">({course.review_count})</span>
                  </div>
                ) : (
                  <span className="text-xs text-slate-400">—</span>
                )}
              </td>
              <td className="text-right py-3 px-4 font-medium text-slate-600">{course.certificate_count}</td>
            </tr>
            {isExpanded && (
              <tr className="border-b border-slate-50 bg-slate-50/40">
                <td colSpan={8} className="px-4">
                  <LessonFunnelPanel courseId={course.id} enrolledCount={course.enrollment_count} />
                </td>
              </tr>
            )}
            </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function StudentLeaderboard({ students }: { students: StudentProgress[] }) {
  if (students.length === 0) {
    return (
      <div className="text-center py-12 text-slate-400 font-medium">
        No student activity yet.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100">
            <th className="text-left py-3 px-4 text-xs font-bold uppercase tracking-widest text-slate-400">Student</th>
            <th className="text-right py-3 px-2 text-xs font-bold uppercase tracking-widest text-slate-400">Enrolled</th>
            <th className="text-right py-3 px-2 text-xs font-bold uppercase tracking-widest text-slate-400">Completed</th>
            <th className="text-right py-3 px-2 text-xs font-bold uppercase tracking-widest text-slate-400">Quizzes</th>
            <th className="text-right py-3 px-2 text-xs font-bold uppercase tracking-widest text-slate-400">Avg Score</th>
            <th className="text-right py-3 px-2 text-xs font-bold uppercase tracking-widest text-slate-400">Certs</th>
            <th className="text-right py-3 px-4 text-xs font-bold uppercase tracking-widest text-slate-400">Last Active</th>
          </tr>
        </thead>
        <tbody>
          {students.map((student) => (
            <tr key={student.user_id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
              <td className="py-3 px-4">
                <p className="font-bold text-slate-900">{student.full_name || 'Unnamed'}</p>
                <p className="text-xs text-slate-400 font-medium">{student.email}</p>
              </td>
              <td className="text-right py-3 px-2 font-bold text-slate-900">{student.enrollment_count}</td>
              <td className="text-right py-3 px-2 font-medium text-slate-600">{student.completed_lessons}</td>
              <td className="text-right py-3 px-2 font-medium text-slate-600">{student.quiz_attempts}</td>
              <td className="text-right py-3 px-2">
                {student.quiz_attempts > 0 ? (
                  <span className="font-bold text-slate-900">{Math.round(student.avg_quiz_score)}%</span>
                ) : (
                  <span className="text-xs text-slate-400">—</span>
                )}
              </td>
              <td className="text-right py-3 px-2">
                {student.certificates_earned > 0 ? (
                  <div className="flex items-center justify-end gap-1">
                    <Award className="h-3 w-3 text-amber-500" />
                    <span className="font-bold text-slate-900">{student.certificates_earned}</span>
                  </div>
                ) : (
                  <span className="text-xs text-slate-400">0</span>
                )}
              </td>
              <td className="text-right py-3 px-4 text-xs text-slate-500 font-medium">
                {student.last_activity
                  ? new Date(student.last_activity).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })
                  : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EngagementTab({
  eventCounts,
  recentEvents,
  trendDays,
}: {
  eventCounts: EventCounts | null;
  recentEvents: AnalyticsEvent[];
  trendDays: number;
}) {
  if (!eventCounts && recentEvents.length === 0) {
    return (
      <Card className="border-none shadow-[0_4px_20px_rgb(0,0,0,0.04)] bg-white mt-4">
        <CardContent className="py-12 text-center">
          <Activity className="h-10 w-10 text-slate-200 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">No engagement data yet</p>
          <p className="text-sm text-slate-400 mt-1">
            Sign-ins and activity events will appear here as learners use the platform.
          </p>
        </CardContent>
      </Card>
    );
  }

  const byType = eventCounts?.byType ?? {};
  const signInsByDay = eventCounts?.signInsByDay ?? {};

  // Build a gap-filled series for the selected window
  const chartDays = Math.min(trendDays, 30);
  const days: { day: string; count: number }[] = [];
  for (let i = chartDays - 1; i >= 0; i--) {
    const key = new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    days.push({ day: key, count: signInsByDay[key] ?? 0 });
  }
  const maxSignIns = Math.max(...days.map((d) => d.count), 1);

  return (
    <div className="space-y-4 mt-4">
      {/* Key event counts for the selected window */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <StatCard title={`Sign-ins (${trendDays}d)`} value={byType['sign_in'] ?? 0} icon={LogIn} color="text-blue-600" />
        <StatCard title={`Lesson Completions (${trendDays}d)`} value={byType['lesson_completed'] ?? 0} icon={CheckCircle} color="text-green-600" />
        <StatCard title={`Enrollments (${trendDays}d)`} value={byType['enrolled'] ?? 0} icon={GraduationCap} color="text-violet-600" />
        <StatCard title={`Certificates Issued (${trendDays}d)`} value={byType['certificate_issued'] ?? 0} icon={Award} color="text-amber-600" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Sign-ins per day */}
        <Card className="border-none shadow-[0_4px_20px_rgb(0,0,0,0.04)] bg-white">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-bold text-slate-700">Sign-ins per day ({chartDays} days)</CardTitle>
              <Badge variant="secondary" className="font-bold">
                {eventCounts?.activeUsers ?? 0} active users
              </Badge>
            </div>
            <CardDescription className="text-xs font-medium text-slate-400">
              Distinct users signing in each day.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-[3px] h-24">
              {days.map((d) => (
                <div
                  key={d.day}
                  className="flex-1 bg-[#1E3A5F] rounded-t-sm min-w-[2px] transition-all"
                  style={{ height: `${Math.max((d.count / maxSignIns) * 100, d.count > 0 ? 4 : 2)}%`, opacity: d.count > 0 ? 1 : 0.15 }}
                  title={`${new Date(d.day).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}: ${d.count} sign-in${d.count === 1 ? '' : 's'}`}
                />
              ))}
            </div>
            <div className="flex justify-between text-[10px] text-slate-400 font-medium mt-1">
              <span>{new Date(days[0].day).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
              <span>Today</span>
            </div>
          </CardContent>
        </Card>

        {/* Recent activity */}
        <Card className="border-none shadow-[0_4px_20px_rgb(0,0,0,0.04)] bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold text-slate-700">Recent activity</CardTitle>
            <CardDescription className="text-xs font-medium text-slate-400">
              Latest {Math.min(recentEvents.length, 20)} events across the institution.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {recentEvents.length === 0 ? (
              <p className="text-center py-8 text-sm text-slate-400 font-medium">No recent events.</p>
            ) : (
              <ul className="divide-y divide-slate-50 max-h-72 overflow-y-auto">
                {recentEvents.slice(0, 20).map((ev) => (
                  <li key={ev.id} className="flex items-center justify-between gap-3 px-5 py-2.5">
                    <span className="text-sm font-medium text-slate-700 capitalize">{eventLabel(ev.event_type)}</span>
                    <span className="text-xs text-slate-400 font-medium shrink-0">{relativeTime(ev.created_at)}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export function AnalyticsDashboard({ trendDays, platform, courses, enrollmentTrend, completionTrend, students, surveyAnalytics, feedbackCounts, eventCounts, recentEvents, problematicQuizzes }: Props) {
  const router = useRouter();
  const pathname = usePathname();

  const setTrendDays = (days: number) => {
    router.push(`${pathname}?days=${days}`);
  };
  const raw = platform ?? {
    total_institutions: 0,
    total_users: 0,
    total_students: 0,
    total_admins: 0,
    total_courses: 0,
    published_courses: 0,
    total_enrollments: 0,
    total_completions: 0,
    total_certificates: 0,
    total_quiz_attempts: 0,
    avg_quiz_score: 0,
    monthly_active_users: 0,
    completion_rate: 0,
  };
  // DB aggregate functions (AVG, etc.) return null for empty sets.
  // Coerce every field to a safe number so downstream Math.round() never produces NaN.
  const p = Object.fromEntries(
    Object.entries(raw).map(([k, v]) => [k, typeof v === 'number' && !Number.isNaN(v) ? v : 0]),
  ) as unknown as PlatformStats;

  const exportCoursesCsv = () =>
    downloadCsv(
      `course-performance-${new Date().toISOString().slice(0, 10)}.csv`,
      ['Course', 'Status', 'Created', 'Enrolled', 'Lessons', 'Completion %', 'Avg Progress %', 'Avg Rating', 'Reviews', 'Certificates'],
      courses.map((c) => [
        c.title,
        c.is_published ? 'Published' : 'Draft',
        new Date(c.created_at).toLocaleDateString(),
        c.enrollment_count,
        c.lesson_count,
        Math.round(c.completion_rate || 0),
        Math.round(c.avg_progress || 0),
        c.review_count > 0 ? Number(c.avg_rating).toFixed(1) : '',
        c.review_count,
        c.certificate_count,
      ]),
    );

  const exportStudentsCsv = () =>
    downloadCsv(
      `student-progress-${new Date().toISOString().slice(0, 10)}.csv`,
      ['Name', 'Email', 'Enrolled', 'Completed Lessons', 'Quiz Attempts', 'Avg Quiz Score %', 'Certificates', 'Last Activity'],
      students.map((s) => [
        s.full_name ?? '',
        s.email,
        s.enrollment_count,
        s.completed_lessons,
        s.quiz_attempts,
        s.quiz_attempts > 0 ? Math.round(s.avg_quiz_score) : '',
        s.certificates_earned,
        s.last_activity ? new Date(s.last_activity).toLocaleDateString() : '',
      ]),
    );

  return (
    <div className="px-4 sm:px-0 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black tracking-tight">Analytics Dashboard</h2>
          <p className="text-slate-500 font-medium mt-1">
            Platform-wide metrics and course performance.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={trendDays}
            onChange={(e) => setTrendDays(Number(e.target.value))}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-ring"
            aria-label="Trend date range"
          >
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
            <option value={180}>Last 180 days</option>
          </select>
          <Badge className="w-fit bg-[#0099CA] hover:bg-[#007EA0] text-white border-none font-bold px-3 py-1">
            <Activity className="h-3 w-3 mr-1" />
            {p.monthly_active_users} MAU
          </Badge>
        </div>
      </div>

      {/* Platform Overview */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Users" value={p.total_users} subtitle={`${p.total_students} students · ${p.total_admins} admins`} icon={Users} color="text-blue-600" />
        <StatCard title="Courses" value={p.total_courses} subtitle={`${p.published_courses} published`} icon={BookOpen} color="text-emerald-600" />
        <StatCard title="Enrollments" value={p.total_enrollments} subtitle={`${Math.round(p.completion_rate || 0)}% completion rate`} icon={GraduationCap} color="text-violet-600" />
        <StatCard title="Certificates" value={p.total_certificates} subtitle={`${p.total_quiz_attempts} quiz attempts`} icon={Award} color="text-amber-600" />
      </div>

      {/* Secondary Stats */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <StatCard title="Institutions" value={p.total_institutions} icon={Building2} color="text-slate-600" />
        <StatCard title="Lesson Completions" value={p.total_completions || 0} icon={CheckCircle} color="text-green-600" />
        <StatCard
          title="Avg Quiz Score"
          value={p.total_quiz_attempts > 0 ? `${Math.round(p.avg_quiz_score)}%` : '—'}
          icon={BarChart3}
          color="text-indigo-600"
        />
        <StatCard title="Monthly Active" value={p.monthly_active_users} subtitle="Last 30 days" icon={TrendingUp} color="text-teal-600" />
      </div>

      {/* Trends */}
      <div className="grid gap-4 md:grid-cols-2">
        <TrendCard
          title={`Enrollment Trend (${trendDays} days)`}
          data={enrollmentTrend}
          labelKey="day"
          valueKey="enrollments"
          color="#1E3A5F"
          trendDays={trendDays}
        />
        <TrendCard
          title={`Lesson Completions (${trendDays} days)`}
          data={completionTrend}
          labelKey="day"
          valueKey="completions"
          color="#DC2626"
          trendDays={trendDays}
        />
      </div>

      {/* Tabbed Detail Views */}
      <Tabs defaultValue="courses">
        <TabsList className="bg-slate-100 p-1 rounded-xl">
          <TabsTrigger value="courses" className="rounded-lg font-bold text-sm px-4">
            <BookOpen className="h-4 w-4 mr-2" />
            Course Performance
          </TabsTrigger>
          <TabsTrigger value="students" className="rounded-lg font-bold text-sm px-4">
            <Users className="h-4 w-4 mr-2" />
            Student Progress
          </TabsTrigger>
          <TabsTrigger value="engagement" className="rounded-lg font-bold text-sm px-4">
            <Activity className="h-4 w-4 mr-2" />
            Engagement
          </TabsTrigger>
          <TabsTrigger value="surveys" className="rounded-lg font-bold text-sm px-4">
            <ClipboardList className="h-4 w-4 mr-2" />
            Surveys
          </TabsTrigger>
          <TabsTrigger value="feedback" className="rounded-lg font-bold text-sm px-4">
            <Star className="h-4 w-4 mr-2" />
            Feedback
          </TabsTrigger>
          <TabsTrigger value="content-health" className="rounded-lg font-bold text-sm px-4">
            <ShieldAlert className="h-4 w-4 mr-2" />
            Content Health
            {problematicQuizzes.length > 0 && (
              <span className="ml-2 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-black bg-red-500 text-white">
                {problematicQuizzes.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="courses">
          <Card className="border-none shadow-[0_4px_20px_rgb(0,0,0,0.04)] bg-white mt-4">
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-lg font-black text-slate-900">Course Performance</CardTitle>
                  <CardDescription className="font-medium text-slate-500">
                    Enrollment, completion, and rating data for all courses. Click a course to see per-lesson drop-off.
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={exportCoursesCsv} disabled={courses.length === 0} className="shrink-0 font-bold">
                  <Download className="h-3.5 w-3.5 mr-1.5" />
                  Export CSV
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <CourseStatsTable courses={courses} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="students">
          <Card className="border-none shadow-[0_4px_20px_rgb(0,0,0,0.04)] bg-white mt-4">
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-lg font-black text-slate-900">Student Activity</CardTitle>
                  <CardDescription className="font-medium text-slate-500">
                    Progress and engagement metrics for enrolled students.
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={exportStudentsCsv} disabled={students.length === 0} className="shrink-0 font-bold">
                  <Download className="h-3.5 w-3.5 mr-1.5" />
                  Export CSV
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <StudentLeaderboard students={students} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="engagement">
          <EngagementTab eventCounts={eventCounts} recentEvents={recentEvents} trendDays={trendDays} />
        </TabsContent>

        <TabsContent value="surveys">
          <SurveysAnalyticsTab
            summaries={surveyAnalytics.summaries}
            blocksByCourse={surveyAnalytics.blocksByCourse}
            responsesByBlock={surveyAnalytics.responsesByBlock}
          />
        </TabsContent>

        <TabsContent value="feedback">
          <FeedbackAnalyticsTab summaries={buildFeedbackSummaries(courses, feedbackCounts)} />
        </TabsContent>

        <TabsContent value="content-health">
          <ContentHealthTab quizzes={problematicQuizzes} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
