'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
} from 'lucide-react';
import type {
  PlatformStats,
  CourseStats,
  EnrollmentTrend,
  CompletionTrend,
  StudentProgress,
} from '@/lib/db/analytics';

interface Props {
  platform: PlatformStats | null;
  courses: CourseStats[];
  enrollmentTrend: EnrollmentTrend[];
  completionTrend: CompletionTrend[];
  students: StudentProgress[];
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
}: {
  title: string;
  data: (EnrollmentTrend | CompletionTrend)[];
  labelKey: string;
  valueKey: string;
  color: string;
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
            {total} total (90d)
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

function CourseStatsTable({ courses }: { courses: CourseStats[] }) {
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
          {courses.map((course, idx) => (
            <tr key={course.id ?? idx} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
              <td className="py-3 px-4">
                <p className="font-bold text-slate-900 line-clamp-1">{course.title}</p>
                <p className="text-xs text-slate-400 font-medium">
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
          ))}
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

export function AnalyticsDashboard({ platform, courses, enrollmentTrend, completionTrend, students }: Props) {
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

  return (
    <div className="px-4 sm:px-0 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black tracking-tight">Analytics Dashboard</h2>
          <p className="text-slate-500 font-medium mt-1">
            Platform-wide metrics and course performance.
          </p>
        </div>
        <Badge className="w-fit bg-[#0099CA] hover:bg-[#007EA0] text-white border-none font-bold px-3 py-1">
          <Activity className="h-3 w-3 mr-1" />
          {p.monthly_active_users} MAU
        </Badge>
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
          title="Enrollment Trend (90 days)"
          data={enrollmentTrend}
          labelKey="day"
          valueKey="enrollments"
          color="#1E3A5F"
        />
        <TrendCard
          title="Lesson Completions (90 days)"
          data={completionTrend}
          labelKey="day"
          valueKey="completions"
          color="#DC2626"
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
        </TabsList>

        <TabsContent value="courses">
          <Card className="border-none shadow-[0_4px_20px_rgb(0,0,0,0.04)] bg-white mt-4">
            <CardHeader>
              <CardTitle className="text-lg font-black text-slate-900">Course Performance</CardTitle>
              <CardDescription className="font-medium text-slate-500">
                Enrollment, completion, and rating data for all courses.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <CourseStatsTable courses={courses} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="students">
          <Card className="border-none shadow-[0_4px_20px_rgb(0,0,0,0.04)] bg-white mt-4">
            <CardHeader>
              <CardTitle className="text-lg font-black text-slate-900">Student Activity</CardTitle>
              <CardDescription className="font-medium text-slate-500">
                Progress and engagement metrics for enrolled students.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <StudentLeaderboard students={students} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
