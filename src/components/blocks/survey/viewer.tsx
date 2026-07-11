'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Star, Loader2, CheckCircle2, ClipboardList } from 'lucide-react';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import type { BlockViewerProps } from '@/lib/content/block-registry';
import type {
  SurveyData,
  SurveyQuestion,
  SurveyAnswers,
  SurveyAnswerValue,
} from '@/lib/content/blocks/survey/schema';
import { usePathname } from 'next/navigation';
import { getSurveyResponse, submitSurveyResponse } from '@/lib/db/surveys';
import { BLOCK_CONTENT_SHELL, surfaceMutedClass } from '@/lib/content/block-surface-tokens';
import { resolveInstitutionSlug } from '@/lib/tenant/path';
import { getInstitutionBranding } from '@/lib/tenant/branding';

/** Append an 8-digit alpha to a 6-digit hex (e.g. '1A' ≈ 10%); pass through otherwise. */
function withAlpha(hex: string, alpha: string): string {
  return /^#[0-9a-fA-F]{6}$/.test(hex) ? `${hex}${alpha}` : hex;
}

/** Resolved accent + header gradient for the current institution (prop-overridable). */
interface SurveyTheme {
  accent: string;
  gradientStart: string;
  gradientEnd: string;
}

function formatAnswer(value: SurveyAnswerValue | undefined): string {
  if (value === undefined || value === null) return '—';
  if (Array.isArray(value)) return value.join(', ');
  if (typeof value === 'boolean') return value ? 'True' : 'False';
  return String(value);
}

function isAnswerEmpty(value: SurveyAnswerValue | undefined): boolean {
  if (value === undefined || value === null) return true;
  if (typeof value === 'string') return value.trim().length === 0;
  if (Array.isArray(value)) return value.length === 0;
  return false;
}

// Surface-aware option styling — adapts to glass / glass-dark / classic / none.
// Unselected uses surface chip tokens; selected uses the institution accent.
const OPTION_BASE =
  'w-full text-left px-4 py-3 rounded-lg border text-sm transition-all text-[color:var(--surface-text)]';
const OPTION_UNSELECTED =
  'bg-[color:var(--surface-chip-bg)] border-[color:var(--surface-chip-border)] hover:bg-[color:var(--surface-chip-hover)]';

function QuestionField({
  question,
  value,
  onChange,
  disabled,
  accent,
}: {
  question: SurveyQuestion;
  value: SurveyAnswerValue | undefined;
  onChange: (value: SurveyAnswerValue) => void;
  disabled?: boolean;
  accent: string;
}) {
  const options = question.options ?? [];
  const selectedStyle = { borderColor: accent, backgroundColor: withAlpha(accent, '24'), color: accent };
  // Inputs sit on a white field, so force dark text regardless of surface.
  const inputClass = 'bg-white text-slate-900 placeholder:text-slate-400';

  switch (question.type) {
    case 'true_false':
    case 'multiple_choice':
      return (
        <div className="space-y-2">
          {options.map((option, i) => {
            const selected = value === option;
            return (
              <button
                key={i}
                type="button"
                disabled={disabled}
                onClick={() => onChange(option)}
                style={selected ? selectedStyle : undefined}
                className={cn(
                  OPTION_BASE,
                  selected ? 'font-semibold' : OPTION_UNSELECTED,
                  disabled && 'opacity-60 cursor-not-allowed',
                )}
              >
                {question.type === 'multiple_choice' && (
                  <span className={cn('mr-2', !selected && 'text-[color:var(--surface-text-subtle)]')}>
                    {String.fromCharCode(65 + i)}.
                  </span>
                )}
                {option}
              </button>
            );
          })}
        </div>
      );

    case 'multi_select': {
      const selected = Array.isArray(value) ? value : [];
      const toggle = (option: string) => {
        if (selected.includes(option)) {
          onChange(selected.filter((o) => o !== option));
        } else {
          onChange([...selected, option]);
        }
      };
      return (
        <div className="space-y-2">
          {options.map((option, i) => {
            const checked = selected.includes(option);
            return (
              <label
                key={i}
                style={checked ? { borderColor: accent, backgroundColor: withAlpha(accent, '24') } : undefined}
                className={cn(
                  'flex items-center gap-3 px-4 py-3 rounded-lg border cursor-pointer transition-all text-[color:var(--surface-text)]',
                  !checked && OPTION_UNSELECTED,
                  disabled && 'opacity-60 cursor-not-allowed',
                )}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={disabled}
                  onChange={() => !disabled && toggle(option)}
                  style={{ accentColor: accent }}
                  className="h-4 w-4 rounded"
                />
                <span className="text-sm">{option}</span>
              </label>
            );
          })}
        </div>
      );
    }

    case 'text':
      return (
        <Input
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder="Your answer"
          className={inputClass}
        />
      );

    case 'textarea':
      return (
        <Textarea
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder="Share your thoughts..."
          rows={4}
          className={cn(inputClass, 'resize-y min-h-[100px]')}
        />
      );

    case 'rating': {
      const rating = typeof value === 'number' ? value : 0;
      return (
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              disabled={disabled}
              onClick={() => onChange(star)}
              aria-label={`Rate ${star} star${star !== 1 ? 's' : ''}`}
              className="cursor-pointer hover:scale-110 transition-transform disabled:cursor-not-allowed"
            >
              <Star
                className={cn(
                  'h-8 w-8',
                  star <= rating
                    ? 'fill-amber-400 text-amber-400'
                    : 'text-[color:var(--surface-text-subtle)]',
                )}
              />
            </button>
          ))}
        </div>
      );
    }

    case 'scale': {
      const min = question.min_value ?? 1;
      const max = question.max_value ?? 10;
      const step = question.increment ?? 1;
      const num = typeof value === 'number' ? value : min;
      const range = max - min;
      const pct = range === 0 ? 0 : ((num - min) / range) * 100;
      return (
        <div className="space-y-3 px-1">
          <div className="text-center">
            <span
              className="inline-flex items-center justify-center min-w-[3rem] px-3 py-1 rounded-lg text-white text-sm font-bold"
              style={{ backgroundColor: accent }}
            >
              {num}
            </span>
          </div>
          <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={num}
            disabled={disabled}
            onChange={(e) => onChange(Number(e.target.value))}
            className="w-full h-2 rounded-full appearance-none cursor-pointer disabled:opacity-60"
            style={{
              background: `linear-gradient(to right, ${accent} 0%, ${accent} ${pct}%, var(--surface-inset-bg) ${pct}%, var(--surface-inset-bg) 100%)`,
            }}
          />
          {(question.min_label || question.max_label) && (
            <div className="flex justify-between text-xs text-[color:var(--surface-text-muted)]">
              <span>{question.min_label ?? min}</span>
              <span>{question.max_label ?? max}</span>
            </div>
          )}
        </div>
      );
    }

    default:
      return null;
  }
}

export default function SurveyViewer({
  data,
  block,
  context,
  onComplete,
}: BlockViewerProps<SurveyData>) {
  const {
    title = 'Survey',
    description,
    submit_label = 'Submit Survey',
    questions = [],
  } = data;

  const previewMode = context?.previewMode ?? false;
  const canPersist = Boolean(
    context?.courseId && context?.lessonId && context?.institutionId && !previewMode,
  );

  // Per-institution accent + header gradient (SCAGO red/black, GANSID navy/teal),
  // overridable per block via data.accent_color.
  const pathname = usePathname();
  const theme = useMemo<SurveyTheme>(() => {
    const branding = getInstitutionBranding(resolveInstitutionSlug(pathname));
    const override =
      typeof data.accent_color === 'string' && /^#[0-9a-fA-F]{6}$/.test(data.accent_color)
        ? data.accent_color
        : undefined;
    return {
      accent: override ?? branding.accentColor,
      gradientStart: branding.primaryColor,
      gradientEnd:
        branding.accentColor !== branding.primaryColor ? branding.accentColor : branding.secondaryColor,
    };
  }, [pathname, data.accent_color]);

  const [answers, setAnswers] = useState<SurveyAnswers>({});
  const [loading, setLoading] = useState(canPersist);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [existingId, setExistingId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    if (!canPersist) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) {
        setLoading(false);
        return;
      }
      const existing = await getSurveyResponse(supabase, block.id, user.id);
      if (cancelled) return;
      if (existing) {
        setAnswers(existing.answers ?? {});
        setExistingId(existing.id);
        setSubmitted(true);
      }
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [canPersist, supabase, block.id]);

  const setAnswer = useCallback((questionId: string, value: SurveyAnswerValue) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
    setErrors((prev) => {
      if (!prev[questionId]) return prev;
      const next = { ...prev };
      delete next[questionId];
      return next;
    });
  }, []);

  const validate = useCallback((): boolean => {
    const nextErrors: Record<string, string> = {};
    for (const q of questions) {
      if (!q.required) continue;
      if (isAnswerEmpty(answers[q.id])) {
        nextErrors[q.id] = 'This question is required';
      }
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }, [answers, questions]);

  const handleSubmit = async () => {
    if (!validate()) {
      toast.error('Please answer all required questions');
      return;
    }

    if (previewMode) {
      setSubmitted(true);
      onComplete?.();
      toast.success('Survey preview submitted (not saved)');
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !context?.courseId || !context?.lessonId || !context?.institutionId) {
      toast.error('You must be signed in to submit this survey');
      return;
    }

    setSubmitting(true);
    const { error } = await submitSurveyResponse(supabase, {
      institutionId: context.institutionId,
      courseId: context.courseId,
      lessonId: context.lessonId,
      blockId: block.id,
      userId: user.id,
      answers,
    });
    setSubmitting(false);

    if (error) {
      toast.error('Failed to submit survey', { description: error });
      return;
    }

    setSubmitted(true);
    setExistingId(existingId ?? 'saved');
    onComplete?.();
    toast.success(existingId ? 'Survey updated!' : 'Survey submitted — thank you!');
  };

  if (loading) {
    return (
      <div className={cn(BLOCK_CONTENT_SHELL, 'items-center justify-center py-8')}>
        <Loader2 className="h-6 w-6 animate-spin" style={{ color: theme.accent }} />
      </div>
    );
  }

  if (!questions.length) {
    return (
      <div className={cn(BLOCK_CONTENT_SHELL, 'items-center justify-center py-8 text-center text-sm', surfaceMutedClass())}>
        This survey has no questions yet.
      </div>
    );
  }

  return (
    // Full-bleed rounded card: clip to rounded-2xl and drop the flex gap so the
    // gradient header attaches flush to the body. Clipping here (not relying on the
    // parent cell) fixes the header's top-corner "notch" in the editor canvas, whose
    // block cell is intentionally overflow-visible for resize handles/toolbar.
    <div className={cn(BLOCK_CONTENT_SHELL, '-m-4 @md:-m-5 gap-0 sm:gap-0 overflow-hidden rounded-2xl')}>
      <div
        className="px-6 py-5 text-white shrink-0 text-center"
        style={{ backgroundImage: `linear-gradient(to right, ${theme.gradientStart}, ${theme.gradientEnd})` }}
      >
        <div className="flex items-center justify-center gap-2 mb-1">
          <ClipboardList className="h-5 w-5 opacity-90" />
          <h3 className="text-lg font-bold">{title}</h3>
        </div>
        {description && <p className="text-sm text-white/85 leading-relaxed">{description}</p>}
      </div>

      <div className="p-6 space-y-6 flex-1">
        {questions.map((question, index) => (
          <div key={question.id} className="space-y-3">
            <div className="flex items-start gap-2">
              <span className="shrink-0 flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold bg-[color:var(--surface-inset-bg)] text-[color:var(--surface-text-muted)]">
                {index + 1}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold leading-snug text-[color:var(--surface-text)]">
                  {question.question || 'Untitled question'}
                  {question.required && <span className="text-red-500 ml-1">*</span>}
                </p>
              </div>
            </div>
            <div className="pl-8">
              <QuestionField
                question={question}
                value={answers[question.id]}
                onChange={(v) => setAnswer(question.id, v)}
                disabled={submitted && !previewMode}
                accent={theme.accent}
              />
              {errors[question.id] && (
                <p className="text-xs text-red-500 mt-1.5 font-medium">{errors[question.id]}</p>
              )}
            </div>
          </div>
        ))}

        {submitted && !previewMode ? (
          <div className="rounded-xl bg-green-50 border border-green-200 px-4 py-4 flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-green-800 text-sm">Response saved</p>
              <p className="text-xs text-green-700 mt-0.5">
                You can update your answers anytime by editing and submitting again.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => setSubmitted(false)}
              >
                Edit responses
              </Button>
            </div>
          </div>
        ) : (
          <div className="pt-2 border-t border-current/10">
            <Button
              onClick={handleSubmit}
              disabled={submitting}
              style={{ backgroundColor: theme.accent }}
              className="w-full sm:w-auto font-bold text-white hover:opacity-90"
            >
              {submitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <ClipboardList className="mr-2 h-4 w-4" />
              )}
              {existingId ? 'Update' : submit_label}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export { formatAnswer };
