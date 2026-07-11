'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { resolveCompletionSurveys } from '@/lib/db/survey-assignments';
import { upsertCourseFeedbackResponse, getMyCourseFeedback } from '@/lib/db/course-feedback';
import { resolveInstitutionSlug, withInstitutionPath } from '@/lib/tenant/path';
import { getInstitutionBranding } from '@/lib/tenant/branding';
import { CompletionSurveyForm } from '@/components/student/completion-survey-form';
import { CertificateCelebration } from '@/components/certificates/certificate-celebration';
import { fetchCertificateDisplay, type CertificateDisplay } from '@/lib/content/certificate-display';
import type { SurveyTemplate } from '@/lib/db/survey-templates';
import type { SurveyAnswers } from '@/lib/content/blocks/survey/schema';
import { Loader2, ClipboardList, CheckCircle2, ChevronLeft, Award } from 'lucide-react';
import { toast } from 'sonner';

export default function CourseSurveyPage({ params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const params = React.use(paramsPromise);
  const courseId = params.id;
  const router = useRouter();
  const pathname = usePathname();
  const supabase = useMemo(() => createClient(), []);

  const branding = useMemo(() => getInstitutionBranding(resolveInstitutionSlug(pathname)), [pathname]);
  const accent = branding.accentColor;
  const gradientEnd = branding.accentColor !== branding.primaryColor ? branding.accentColor : branding.secondaryColor;

  const [loading, setLoading] = useState(true);
  const [courseTitle, setCourseTitle] = useState('');
  const [institutionId, setInstitutionId] = useState<string | null>(null);
  const [template, setTemplate] = useState<SurveyTemplate | null>(null);
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [alreadyDone, setAlreadyDone] = useState(false);
  const [certNumber, setCertNumber] = useState<string | null>(null);
  const [certGated, setCertGated] = useState(false);
  const [certIssueError, setCertIssueError] = useState<string | null>(null);
  const [celebration, setCelebration] = useState<CertificateDisplay | null>(null);
  const institutionSlug = useMemo(() => resolveInstitutionSlug(pathname), [pathname]);

  const backToCourse = withInstitutionPath(`/student/courses/${courseId}`, pathname);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace(withInstitutionPath('/login', pathname));
        return;
      }
      const [{ data: course }, resolved, existing] = await Promise.all([
        supabase.from('courses').select('title, institution_id, completion_survey_required').eq('id', courseId).maybeSingle(),
        resolveCompletionSurveys(supabase, courseId, user.id),
        getMyCourseFeedback(supabase, courseId, user.id),
      ]);
      if (cancelled) return;
      setCourseTitle(course?.title ?? 'Course');
      setInstitutionId(course?.institution_id ?? null);
      setCertGated(Boolean(course?.completion_survey_required));
      setTemplate(resolved.course?.template ?? null);
      setTemplateId(resolved.course?.templateId ?? null);
      if (existing) setAlreadyDone(true);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [supabase, courseId, pathname, router]);

  const handleSubmit = async (answers: SurveyAnswers) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !institutionId || !templateId) {
      toast.error('You must be signed in to submit this survey');
      return;
    }
    setSubmitting(true);
    const { error } = await upsertCourseFeedbackResponse(supabase, {
      institutionId, courseId, userId: user.id, templateId, answers,
    });
    if (error) {
      setSubmitting(false);
      toast.error('Failed to submit survey', { description: error });
      return;
    }
    // The survey may have been gating course completion. If every lesson except
    // the final one is already complete, finalize the course now: mark the final
    // lesson complete, then issue the certificate (server-verified). The RPC is a
    // no-op if lessons still aren't all done, so this can't bypass content gating.
    try {
      const { data: lessonRows } = await supabase
        .from('lessons')
        .select('id, order_index')
        .eq('course_id', courseId)
        .is('deleted_at', null)
        .order('order_index', { ascending: true });
      if (lessonRows && lessonRows.length > 0) {
        const ids = lessonRows.map((l) => l.id);
        const { data: progressRows } = await supabase
          .from('progress')
          .select('lesson_id, completed')
          .eq('user_id', user.id)
          .in('lesson_id', ids);
        const completed = new Set((progressRows ?? []).filter((p) => p.completed).map((p) => p.lesson_id));
        const finalLesson = lessonRows[lessonRows.length - 1];
        const othersComplete = lessonRows.slice(0, -1).every((l) => completed.has(l.id));
        if (othersComplete && !completed.has(finalLesson.id)) {
          await supabase.from('progress').upsert(
            [{ user_id: user.id, lesson_id: finalLesson.id, completed: true, completed_at: new Date().toISOString() }],
            { onConflict: 'user_id,lesson_id' },
          );
        }
      }

      const { data: certData, error: certError } = await supabase.rpc('issue_course_certificate', { p_course_id: courseId });
      if (certError) {
        // The RPC refused (e.g. a required quiz still isn't answered correctly).
        // Surface it instead of silently stranding the learner at "100% complete,
        // no certificate, no explanation".
        setCertIssueError(certError.message || 'Your certificate could not be issued yet.');
      } else if (certData?.certificate_id) {
        setCertNumber(certData.certificate_number ?? null);
        if (!certData.already_issued) {
          fetch(`/api/certificates/${certData.certificate_id}/pdf`).catch(() => {});
          fetch('/api/notify/certificate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ certificateId: certData.certificate_id }),
          }).catch(() => {});
        }
        // Reveal the actual certificate in the celebration overlay
        const display = await fetchCertificateDisplay(supabase, certData.certificate_id);
        if (display) setCelebration(display);
      }
    } catch {
      /* issuance is best-effort here; the course viewer also issues on completion */
    }
    setSubmitting(false);
    setDone(true);
    toast.success('Thank you for your feedback!');
  };

  return (
    <div className="min-h-[calc(100vh-6rem)] bg-slate-50 py-8 px-4">
      <CertificateCelebration
        open={!!celebration}
        display={celebration}
        onClose={() => setCelebration(null)}
        institutionSlug={institutionSlug}
        onViewCertificates={() => {
          setCelebration(null);
          router.push(withInstitutionPath('/student/certificates', pathname));
        }}
      />
      <div className="mx-auto w-full max-w-2xl">
        <Link
          href={backToCourse}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-800 mb-4"
        >
          <ChevronLeft className="h-4 w-4" /> Back to course
        </Link>

        <div className="rounded-2xl bg-white shadow-[0_8px_30px_rgb(0,0,0,0.06)] overflow-hidden">
          <div
            className="px-6 py-6 text-white text-center"
            style={{ backgroundImage: `linear-gradient(to right, ${branding.primaryColor}, ${gradientEnd})` }}
          >
            <div className="flex items-center justify-center gap-2 mb-1">
              <ClipboardList className="h-5 w-5 opacity-90" />
              <h1 className="text-xl font-black">{template?.data?.title ?? 'Course Survey'}</h1>
            </div>
            <p className="text-sm text-white/85">{courseTitle}</p>
          </div>

          <div className="p-6">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-6 w-6 animate-spin" style={{ color: accent }} />
              </div>
            ) : !template ? (
              <div className="text-center py-12 space-y-3">
                <p className="text-slate-600 font-medium">This course doesn&apos;t have a survey.</p>
                <Link href={backToCourse} className="inline-block font-bold" style={{ color: accent }}>
                  Return to course
                </Link>
              </div>
            ) : done || alreadyDone ? (
              <div className="text-center py-10 space-y-4">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-50">
                  <CheckCircle2 className="h-7 w-7 text-green-600" />
                </div>
                <div>
                  <p className="text-lg font-black text-slate-900">Thank you for your feedback!</p>
                  <p className="text-sm text-slate-500 mt-1">
                    {alreadyDone && !done ? 'You have already completed this survey.' : 'Your response has been recorded.'}
                  </p>
                </div>
                {certNumber && (
                  <div className="inline-flex items-center gap-2 rounded-xl bg-amber-50 border border-amber-200 px-4 py-2 text-sm font-semibold text-amber-800">
                    <Award className="h-4 w-4" /> Certificate issued — {certNumber}
                  </div>
                )}
                {certIssueError && !certNumber && (
                  <div className="mx-auto max-w-md rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm font-semibold text-amber-900">
                    Your certificate isn&apos;t ready yet: {certIssueError} Head back to the module, make sure
                    every required quiz is answered correctly, and return to the module-complete screen — your
                    certificate will be issued there.
                  </div>
                )}
                <div>
                  <Link
                    href={backToCourse}
                    className="inline-block rounded-lg px-5 py-2.5 font-bold text-white"
                    style={{ backgroundColor: accent }}
                  >
                    Return to course
                  </Link>
                </div>
              </div>
            ) : (
              <div className="space-y-5">
                {certGated && (
                  <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                    <Award className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                    <p className="text-sm font-semibold text-amber-900">
                      Module complete — one last step! Submitting this survey finishes the module and
                      issues your certificate.
                    </p>
                  </div>
                )}
                <CompletionSurveyForm
                  surveyData={
                    certGated
                      ? { ...template.data, submit_label: 'Submit Survey & Get Certificate' }
                      : template.data
                  }
                  accent={accent}
                  submitting={submitting}
                  onSubmit={handleSubmit}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
