'use client';

import { useState, useCallback, useEffect } from 'react';
import { CheckCircle2, ChevronRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { getSurveyResponse, upsertSurveyResponse } from '@/lib/db/surveys';
import type { BlockViewerProps } from '@/lib/content/block-registry';
import { LIKERT_SCALES, type SurveyData, type SurveyQuestion } from '@/lib/content/blocks/survey/schema';

type Responses = Record<string, string>;

function LikertQuestion({
  question,
  value,
  onChange,
  disabled,
}: {
  question: SurveyQuestion;
  value: string | undefined;
  onChange: (v: string) => void;
  disabled: boolean;
}) {
  const options = LIKERT_SCALES[question.scale ?? 'likelihood'];

  return (
    <div className="space-y-3">
      <p className="font-semibold text-slate-900 text-sm sm:text-base leading-snug">
        {question.question}
      </p>
      <div className="flex flex-col sm:flex-row gap-2">
        {options.map((opt) => {
          const selected = value === opt;
          return (
            <button
              key={opt}
              type="button"
              disabled={disabled}
              onClick={() => !disabled && onChange(opt)}
              className={cn(
                'flex-1 px-2 py-2 sm:py-3 rounded-lg border text-xs sm:text-sm font-medium transition-all text-center',
                selected
                  ? 'border-[#1A3C6E] bg-[#1A3C6E] text-white'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-[#1A3C6E] hover:text-[#1A3C6E]',
                disabled && !selected && 'opacity-50 cursor-default',
              )}
            >
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function FreeTextQuestion({
  question,
  value,
  onChange,
  disabled,
}: {
  question: SurveyQuestion;
  value: string | undefined;
  onChange: (v: string) => void;
  disabled: boolean;
}) {
  return (
    <div className="space-y-2">
      <p className="font-semibold text-slate-900 text-sm sm:text-base leading-snug">
        {question.question}
      </p>
      <textarea
        disabled={disabled}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={question.placeholder ?? 'Share your thoughts…'}
        rows={3}
        className={cn(
          'w-full px-3 py-2 text-sm border rounded-lg resize-y transition-colors',
          'placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1A3C6E] focus:border-transparent',
          disabled
            ? 'bg-slate-50 border-slate-200 text-slate-500 cursor-default'
            : 'border-slate-300 bg-white',
        )}
      />
    </div>
  );
}

export default function SurveyViewer({ data, block, onComplete }: BlockViewerProps<SurveyData>) {
  const [responses, setResponses] = useState<Responses>({});
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load any existing response on mount
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setLoading(false);
          return;
        }
        const existing = await getSurveyResponse(supabase, block.id, user.id);
        if (cancelled) return;
        if (existing) {
          setResponses(existing.responses);
          setSubmitted(true);
          onComplete?.();
        }
      } catch {
        // Not blocking — proceed as unanswered
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [block.id, onComplete]);

  const handleChange = useCallback((questionId: string, value: string) => {
    setResponses((prev) => ({ ...prev, [questionId]: value }));
  }, []);

  const requiredUnanswered = (data.questions ?? []).filter(
    (q) => q.required !== false && !responses[q.id],
  );
  const canSubmit = requiredUnanswered.length === 0;

  async function handleSubmit() {
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('You must be logged in to submit feedback.');
        return;
      }
      await upsertSurveyResponse(supabase, block.id, user.id, responses);
      setSubmitted(true);
      onComplete?.();
    } catch {
      setError('Failed to save your response. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white px-6 py-10 flex justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-6 py-8 text-center space-y-3">
        <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-500" />
        <p className="font-semibold text-emerald-800 text-lg">
          {data.thank_you_message ?? 'Thank you for your feedback!'}
        </p>
        <p className="text-sm text-emerald-700">Your responses have been recorded.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
      {(data.title || data.intro) && (
        <div className="px-5 py-4 bg-[#1A3C6E] text-white">
          {data.title && <h3 className="font-bold text-lg">{data.title}</h3>}
          {data.intro && <p className="text-sm text-blue-100 mt-1">{data.intro}</p>}
        </div>
      )}

      <div className="px-5 py-5 space-y-6">
        {(data.questions ?? []).map((q) => (
          <div key={q.id}>
            {q.type === 'likert' ? (
              <LikertQuestion
                question={q}
                value={responses[q.id]}
                onChange={(v) => handleChange(q.id, v)}
                disabled={submitting}
              />
            ) : (
              <FreeTextQuestion
                question={q}
                value={responses[q.id]}
                onChange={(v) => handleChange(q.id, v)}
                disabled={submitting}
              />
            )}
          </div>
        ))}
      </div>

      <div className="px-5 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-3">
        <div className="flex-1">
          {!canSubmit && (
            <p className="text-xs text-slate-500">
              {requiredUnanswered.length} question{requiredUnanswered.length !== 1 ? 's' : ''} remaining
            </p>
          )}
          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
        <Button
          onClick={handleSubmit}
          disabled={!canSubmit || submitting}
          className="gap-2 bg-[#1A3C6E] hover:bg-[#0F172A] text-white"
        >
          {submitting ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</>
          ) : (
            <>{data.submit_label ?? 'Submit Feedback'}<ChevronRight className="h-4 w-4" /></>
          )}
        </Button>
      </div>
    </div>
  );
}
