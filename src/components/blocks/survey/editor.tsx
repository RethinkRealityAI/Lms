'use client';

import { useId } from 'react';
import { Plus, Trash2, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { BlockEditorProps } from '@/lib/content/block-registry';
import { type SurveyData, type SurveyQuestion, LIKERT_SCALES } from '@/lib/content/blocks/survey/schema';

const inputClass =
  'w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent';

const SCALE_LABELS: Record<keyof typeof LIKERT_SCALES, string> = {
  likelihood: 'Likelihood (Very Likely → Very Unlikely)',
  agreement: 'Agreement (Strongly Agree → Strongly Disagree)',
  satisfaction: 'Satisfaction (Very Satisfied → Very Dissatisfied)',
};

function generateId() {
  return Math.random().toString(36).slice(2, 10);
}

function QuestionEditor({
  question,
  index,
  onChange,
  onRemove,
}: {
  question: SurveyQuestion;
  index: number;
  onChange: (q: SurveyQuestion) => void;
  onRemove: () => void;
}) {
  return (
    <div className="border border-gray-200 rounded-lg p-3 space-y-3 bg-gray-50">
      <div className="flex items-center gap-2">
        <GripVertical className="h-4 w-4 text-gray-400 shrink-0" />
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex-1">
          Question {index + 1}
        </span>
        <button
          type="button"
          onClick={onRemove}
          className="p-1 text-gray-400 hover:text-red-500 transition-colors"
          title="Remove question"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Question text</label>
        <textarea
          value={question.question}
          onChange={(e) => onChange({ ...question, question: e.target.value })}
          rows={2}
          className={`${inputClass} resize-y`}
          placeholder="Enter your question…"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Type</label>
        <div className="flex gap-2">
          {(['likert', 'free_text'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => onChange({ ...question, type: t })}
              className={`px-3 py-1.5 text-xs rounded-lg border transition-all ${
                question.type === t
                  ? 'border-[#1E3A5F] bg-[#1E3A5F] text-white font-semibold'
                  : 'border-gray-200 text-gray-600 hover:border-gray-400'
              }`}
            >
              {t === 'likert' ? 'Likert Scale' : 'Free Text'}
            </button>
          ))}
        </div>
      </div>

      {question.type === 'likert' && (
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Scale</label>
          <select
            value={question.scale ?? 'likelihood'}
            onChange={(e) =>
              onChange({ ...question, scale: e.target.value as SurveyQuestion['scale'] })
            }
            className={inputClass}
          >
            {Object.entries(SCALE_LABELS).map(([k, label]) => (
              <option key={k} value={k}>
                {label}
              </option>
            ))}
          </select>
        </div>
      )}

      {question.type === 'free_text' && (
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Placeholder text</label>
          <input
            type="text"
            value={question.placeholder ?? ''}
            onChange={(e) => onChange({ ...question, placeholder: e.target.value || undefined })}
            placeholder="Share your thoughts…"
            className={inputClass}
          />
        </div>
      )}

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id={`req-${question.id}`}
          checked={question.required !== false}
          onChange={(e) => onChange({ ...question, required: e.target.checked })}
          className="rounded border-gray-300"
        />
        <label htmlFor={`req-${question.id}`} className="text-xs text-gray-600">
          Required
        </label>
      </div>
    </div>
  );
}

export function SurveyEditor({ data, onChange }: BlockEditorProps<SurveyData>) {
  const baseId = useId();

  function updateQuestion(index: number, q: SurveyQuestion) {
    const questions = [...(data.questions ?? [])];
    questions[index] = q;
    onChange({ ...data, questions });
  }

  function removeQuestion(index: number) {
    const questions = [...(data.questions ?? [])];
    questions.splice(index, 1);
    onChange({ ...data, questions });
  }

  function addQuestion(type: SurveyQuestion['type']) {
    const q: SurveyQuestion = {
      id: generateId(),
      type,
      question: '',
      ...(type === 'likert' ? { scale: 'likelihood' as const } : {}),
      required: true,
    };
    onChange({ ...data, questions: [...(data.questions ?? []), q] });
  }

  return (
    <div className="space-y-5">
      {/* Header fields */}
      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Survey title</label>
          <input
            type="text"
            value={data.title ?? ''}
            onChange={(e) => onChange({ ...data, title: e.target.value || undefined })}
            placeholder="Course Feedback"
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Intro text</label>
          <textarea
            value={data.intro ?? ''}
            onChange={(e) => onChange({ ...data, intro: e.target.value || undefined })}
            rows={2}
            placeholder="Please take a moment to rate your experience…"
            className={`${inputClass} resize-y`}
          />
        </div>
      </div>

      {/* Questions */}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-2">
          Questions ({(data.questions ?? []).length})
        </label>
        <div className="space-y-2">
          {(data.questions ?? []).map((q, i) => (
            <QuestionEditor
              key={q.id}
              question={q}
              index={i}
              onChange={(updated) => updateQuestion(i, updated)}
              onRemove={() => removeQuestion(i)}
            />
          ))}
        </div>

        <div className="flex gap-2 mt-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => addQuestion('likert')}
            className="gap-1.5 text-xs border-dashed"
          >
            <Plus className="h-3.5 w-3.5" />
            Likert Question
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => addQuestion('free_text')}
            className="gap-1.5 text-xs border-dashed"
          >
            <Plus className="h-3.5 w-3.5" />
            Free Text
          </Button>
        </div>
      </div>

      {/* Footer fields */}
      <div className="space-y-3 border-t border-gray-100 pt-4">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Submit button label</label>
          <input
            type="text"
            value={data.submit_label ?? ''}
            onChange={(e) => onChange({ ...data, submit_label: e.target.value || undefined })}
            placeholder="Submit Feedback"
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Thank-you message</label>
          <input
            type="text"
            value={data.thank_you_message ?? ''}
            onChange={(e) => onChange({ ...data, thank_you_message: e.target.value || undefined })}
            placeholder="Thank you for your feedback!"
            className={inputClass}
          />
        </div>
      </div>
    </div>
  );
}
