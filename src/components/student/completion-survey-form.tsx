'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Star, Loader2, Send } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SurveyData, SurveyQuestion, SurveyAnswers, SurveyAnswerValue } from '@/lib/content/blocks/survey/schema';

function withAlpha(hex: string, alpha: string): string {
  return /^#[0-9a-fA-F]{6}$/.test(hex) ? `${hex}${alpha}` : hex;
}

function isEmpty(v: SurveyAnswerValue | undefined): boolean {
  if (v === undefined || v === null) return true;
  if (typeof v === 'string') return v.trim().length === 0;
  if (Array.isArray(v)) return v.length === 0;
  return false;
}

/**
 * Light-themed, accent-branded completion-survey form for the dedicated
 * end-of-course survey page. Standalone (no glass surface), so it uses explicit
 * readable colors rather than surface tokens.
 */
function Field({
  question,
  value,
  onChange,
  disabled,
  accent,
}: {
  question: SurveyQuestion;
  value: SurveyAnswerValue | undefined;
  onChange: (v: SurveyAnswerValue) => void;
  disabled?: boolean;
  accent: string;
}) {
  const options = question.options ?? [];
  const selectedStyle = { borderColor: accent, backgroundColor: withAlpha(accent, '1A'), color: accent };

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
                  'w-full text-left px-4 py-3 rounded-lg border text-sm transition-all',
                  selected ? 'font-semibold' : 'border-slate-200 bg-white text-slate-800 hover:bg-slate-50',
                  disabled && 'opacity-60 cursor-not-allowed',
                )}
              >
                {question.type === 'multiple_choice' && (
                  <span className={cn('mr-2', !selected && 'text-slate-400')}>{String.fromCharCode(65 + i)}.</span>
                )}
                {option}
              </button>
            );
          })}
        </div>
      );

    case 'multi_select': {
      const selected = Array.isArray(value) ? value : [];
      const toggle = (o: string) =>
        onChange(selected.includes(o) ? selected.filter((x) => x !== o) : [...selected, o]);
      return (
        <div className="space-y-2">
          {options.map((option, i) => {
            const checked = selected.includes(option);
            return (
              <label
                key={i}
                style={checked ? { borderColor: accent, backgroundColor: withAlpha(accent, '1A') } : undefined}
                className={cn(
                  'flex items-center gap-3 px-4 py-3 rounded-lg border cursor-pointer transition-all text-slate-800',
                  !checked && 'border-slate-200 bg-white hover:bg-slate-50',
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
          className="bg-white text-slate-900 placeholder:text-slate-400"
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
          className="bg-white text-slate-900 placeholder:text-slate-400 resize-y min-h-[100px]"
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
              <Star className={cn('h-8 w-8', star <= rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300')} />
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
            style={{ background: `linear-gradient(to right, ${accent} 0%, ${accent} ${pct}%, #e2e8f0 ${pct}%, #e2e8f0 100%)` }}
          />
          {(question.min_label || question.max_label) && (
            <div className="flex justify-between text-xs text-slate-500">
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

export function CompletionSurveyForm({
  surveyData,
  accent,
  submitting,
  onSubmit,
}: {
  surveyData: SurveyData;
  accent: string;
  submitting: boolean;
  onSubmit: (answers: SurveyAnswers) => void;
}) {
  const { questions = [], submit_label = 'Submit Survey' } = surveyData;
  const [answers, setAnswers] = useState<SurveyAnswers>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const setAnswer = (id: string, v: SurveyAnswerValue) => {
    setAnswers((p) => ({ ...p, [id]: v }));
    setErrors((p) => {
      if (!p[id]) return p;
      const n = { ...p };
      delete n[id];
      return n;
    });
  };

  const handleSubmit = () => {
    const next: Record<string, string> = {};
    for (const q of questions) {
      if (q.required && isEmpty(answers[q.id])) next[q.id] = 'This question is required';
    }
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    onSubmit(answers);
  };

  return (
    <div className="space-y-6">
      {questions.map((question, index) => (
        <div key={question.id} className="space-y-2">
          <div className="flex items-start gap-2.5">
            <span
              className="shrink-0 flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-white"
              style={{ backgroundColor: accent }}
            >
              {index + 1}
            </span>
            <p className="text-sm font-semibold leading-snug text-slate-900 pt-0.5">
              {question.question || 'Untitled question'}
              {question.required && <span className="text-red-500 ml-1">*</span>}
            </p>
          </div>
          <div className="pl-[2.125rem]">
            <Field
              question={question}
              value={answers[question.id]}
              onChange={(v) => setAnswer(question.id, v)}
              disabled={submitting}
              accent={accent}
            />
            {errors[question.id] && <p className="text-xs text-red-500 mt-1.5 font-medium">{errors[question.id]}</p>}
          </div>
        </div>
      ))}

      <div className="pt-4 border-t border-slate-100">
        <Button
          onClick={handleSubmit}
          disabled={submitting}
          style={{ backgroundColor: accent }}
          className="w-full sm:w-auto font-bold text-white hover:opacity-90"
        >
          {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
          {submit_label}
        </Button>
      </div>
    </div>
  );
}
