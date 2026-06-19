'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { withInstitutionPath } from '@/lib/tenant/path';
import type { ProblematicQuiz } from '@/lib/db/quiz-health';
import { AlertTriangle, CheckCircle2, ExternalLink, Lock } from 'lucide-react';

const QUESTION_TYPE_LABELS: Record<string, string> = {
  multiple_choice: 'Multiple choice',
  true_false: 'True / false',
  select_all: 'Select all',
  categorize: 'Categorize',
  swipe: 'Swipe',
};

export function ContentHealthTab({ quizzes }: { quizzes: ProblematicQuiz[] }) {
  const pathname = usePathname();

  if (quizzes.length === 0) {
    return (
      <Card className="border-none shadow-[0_4px_20px_rgb(0,0,0,0.04)] bg-white mt-4">
        <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-50">
            <CheckCircle2 className="h-6 w-6 text-green-600" />
          </div>
          <div>
            <p className="text-base font-black text-slate-900">All quizzes are healthy</p>
            <p className="text-sm font-medium text-slate-500">
              No misconfigured quizzes were found. Learners can answer and complete every quiz.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const blockers = quizzes.filter((q) => q.blocksCompletion);
  const displayIssues = quizzes.filter((q) => !q.blocksCompletion);

  // Group by course, preserving the blockers-first ordering from the query.
  const byCourse = new Map<string, { title: string; items: ProblematicQuiz[] }>();
  for (const q of quizzes) {
    const entry = byCourse.get(q.courseId) ?? { title: q.courseTitle, items: [] };
    entry.items.push(q);
    byCourse.set(q.courseId, entry);
  }

  return (
    <div className="mt-4 space-y-4">
      <Card className="border-none shadow-[0_4px_20px_rgb(0,0,0,0.04)] bg-white">
        <CardHeader>
          <CardTitle className="text-lg font-black text-slate-900">Quiz Health</CardTitle>
          <CardDescription className="font-medium text-slate-500">
            Quizzes that are misconfigured. A learner can never answer a{' '}
            <span className="font-semibold text-red-600">completion-blocking</span> quiz correctly, which
            would stop them finishing the lesson — these are skipped by the viewer as a fail-safe, but must
            be fixed. A <span className="font-semibold text-amber-600">display issue</span> only renders a
            broken placeholder.
          </CardDescription>
          <div className="flex flex-wrap gap-2 pt-1">
            {blockers.length > 0 && (
              <Badge className="bg-red-100 text-red-700 hover:bg-red-100 font-bold">
                {blockers.length} blocking completion
              </Badge>
            )}
            {displayIssues.length > 0 && (
              <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 font-bold">
                {displayIssues.length} display issue{displayIssues.length === 1 ? '' : 's'}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {[...byCourse.entries()].map(([courseId, { title, items }]) => (
            <div key={courseId} className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-black uppercase tracking-wide text-slate-700">{title}</h3>
                <Button asChild variant="outline" size="sm" className="shrink-0 font-bold">
                  <Link href={withInstitutionPath(`/admin/courses/${courseId}/editor`, pathname)}>
                    <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                    Open editor
                  </Link>
                </Button>
              </div>
              <ul className="divide-y divide-slate-100 rounded-xl border border-slate-100">
                {items.map((q) => (
                  <li key={q.blockId} className="flex items-start gap-3 px-4 py-3">
                    {q.blocksCompletion ? (
                      <Lock className="h-4 w-4 mt-0.5 shrink-0 text-red-500" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-amber-500" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-900 truncate">
                        {q.question.trim() || <span className="italic text-slate-400">(no question text)</span>}
                      </p>
                      <p className="text-xs font-medium text-slate-500">
                        Lesson {q.lessonOrder + 1}: {q.lessonTitle}
                        {' · '}
                        {QUESTION_TYPE_LABELS[q.questionType ?? ''] ?? 'Unknown type'}
                      </p>
                      <p className="text-xs font-medium text-slate-600 mt-0.5">{q.problem}</p>
                    </div>
                    <Badge
                      variant="outline"
                      className={
                        q.blocksCompletion
                          ? 'shrink-0 border-red-200 bg-red-50 text-red-700 font-bold'
                          : 'shrink-0 border-amber-200 bg-amber-50 text-amber-700 font-bold'
                      }
                    >
                      {q.blocksCompletion ? 'Blocks completion' : 'Display issue'}
                    </Badge>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
