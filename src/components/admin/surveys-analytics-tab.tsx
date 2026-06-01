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
import { ClipboardList, Users, ChevronRight } from 'lucide-react';
import { formatAnswer } from '@/components/blocks/survey/viewer';
import type {
  CourseSurveySummary,
  SurveyBlockSummary,
  SurveyResponseWithMeta,
} from '@/lib/db/surveys';

interface Props {
  summaries: CourseSurveySummary[];
  blocksByCourse: Record<string, SurveyBlockSummary[]>;
  responsesByBlock: Record<string, SurveyResponseWithMeta[]>;
}

export function SurveysAnalyticsTab({ summaries, blocksByCourse, responsesByBlock }: Props) {
  const [selectedCourseId, setSelectedCourseId] = useState<string>(
    summaries[0]?.course_id ?? '',
  );
  const [selectedBlockId, setSelectedBlockId] = useState<string>('');

  const courseBlocks = blocksByCourse[selectedCourseId] ?? [];
  const activeBlockId = selectedBlockId || courseBlocks[0]?.block_id || '';
  const activeBlock = courseBlocks.find((b) => b.block_id === activeBlockId);
  const responses = responsesByBlock[activeBlockId] ?? [];

  const questionLabels = useMemo(() => {
    const map = new Map<string, string>();
    for (const q of activeBlock?.questions ?? []) {
      map.set(q.id, q.question);
    }
    return map;
  }, [activeBlock]);

  const answerKeys = useMemo(() => {
    const keys: string[] = [];
    if (activeBlock?.questions?.length) {
      for (const q of activeBlock.questions) keys.push(q.id);
    } else {
      const keySet = new Set<string>();
      for (const r of responses) {
        Object.keys(r.answers ?? {}).forEach((k) => keySet.add(k));
      }
      keys.push(...keySet);
    }
    return keys;
  }, [activeBlock, responses]);

  if (summaries.length === 0) {
    return (
      <Card className="border-none shadow-[0_4px_20px_rgb(0,0,0,0.04)] bg-white mt-4">
        <CardContent className="py-16 text-center">
          <ClipboardList className="h-10 w-10 text-slate-300 mx-auto mb-3" />
          <p className="font-bold text-slate-700">No surveys yet</p>
          <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
            Add a Survey block to any course slide in the editor. Responses will appear here once students submit them.
          </p>
        </CardContent>
      </Card>
    );
  }

  const selectedSummary = summaries.find((s) => s.course_id === selectedCourseId);

  return (
    <div className="space-y-4 mt-4">
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-none shadow-[0_4px_20px_rgb(0,0,0,0.04)] bg-white">
          <CardContent className="pt-6">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Courses with surveys</p>
            <p className="text-3xl font-black text-slate-900 mt-1">{summaries.length}</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-[0_4px_20px_rgb(0,0,0,0.04)] bg-white">
          <CardContent className="pt-6">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Total responses</p>
            <p className="text-3xl font-black text-slate-900 mt-1">
              {summaries.reduce((n, s) => n + s.response_count, 0)}
            </p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-[0_4px_20px_rgb(0,0,0,0.04)] bg-white">
          <CardContent className="pt-6">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Unique respondents</p>
            <p className="text-3xl font-black text-slate-900 mt-1">
              {summaries.reduce((n, s) => n + s.unique_respondents, 0)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-[0_4px_20px_rgb(0,0,0,0.04)] bg-white">
        <CardHeader>
          <CardTitle className="text-lg font-black text-slate-900">Survey responses by course</CardTitle>
          <CardDescription className="font-medium text-slate-500">
            Select a course and survey to review individual responses and aggregates.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Course</p>
              <Select
                value={selectedCourseId}
                onValueChange={(v) => {
                  setSelectedCourseId(v);
                  setSelectedBlockId('');
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select course" />
                </SelectTrigger>
                <SelectContent>
                  {summaries.map((s) => (
                    <SelectItem key={s.course_id} value={s.course_id}>
                      {s.course_title} ({s.response_count} responses)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Survey</p>
              <Select value={activeBlockId} onValueChange={setSelectedBlockId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select survey" />
                </SelectTrigger>
                <SelectContent>
                  {courseBlocks.map((b) => (
                    <SelectItem key={b.block_id} value={b.block_id}>
                      {b.block_title || b.lesson_title} — {b.response_count} responses
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {selectedSummary && (
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary" className="font-bold">
                <ClipboardList className="h-3 w-3 mr-1" />
                {selectedSummary.survey_blocks} survey{selectedSummary.survey_blocks !== 1 ? 's' : ''}
              </Badge>
              <Badge variant="secondary" className="font-bold">
                <Users className="h-3 w-3 mr-1" />
                {selectedSummary.unique_respondents} respondent{selectedSummary.unique_respondents !== 1 ? 's' : ''}
              </Badge>
            </div>
          )}

          {activeBlock && responses.length > 0 ? (
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
                    {responses.map((row) => (
                      <tr key={row.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                        <td className="py-3 px-4">
                          <p className="font-bold text-slate-900">{row.user_name || 'Unnamed'}</p>
                          <p className="text-xs text-slate-400">{row.user_email}</p>
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-500 whitespace-nowrap">
                          {new Date(row.submitted_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </td>
                        {answerKeys.map((key) => (
                          <td key={key} className="py-3 px-4 text-slate-700 max-w-[200px] truncate">
                            {formatAnswer(row.answers[key])}
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
                  for (const r of responses) {
                    const label = formatAnswer(r.answers[key]);
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
              {activeBlock
                ? 'No responses for this survey yet.'
                : 'No survey blocks in this course.'}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-none shadow-[0_4px_20px_rgb(0,0,0,0.04)] bg-white">
        <CardHeader>
          <CardTitle className="text-sm font-black text-slate-900">All courses</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-slate-50">
            {summaries.map((s) => (
              <button
                key={s.course_id}
                type="button"
                onClick={() => {
                  setSelectedCourseId(s.course_id);
                  setSelectedBlockId('');
                }}
                className="w-full flex items-center justify-between px-6 py-4 hover:bg-slate-50/80 transition-colors text-left"
              >
                <div>
                  <p className="font-bold text-slate-900">{s.course_title}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {s.survey_blocks} surveys · {s.response_count} responses · {s.unique_respondents} students
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
