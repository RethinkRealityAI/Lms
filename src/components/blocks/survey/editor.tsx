'use client';

import { ChevronUp, ChevronDown, Plus, Trash2, GripVertical } from 'lucide-react';
import type { BlockEditorProps } from '@/lib/content/block-registry';
import {
  createDefaultQuestion,
  questionTypeLabel,
  surveyQuestionTypes,
  type SurveyData,
  type SurveyQuestion,
  type SurveyQuestionType,
} from '@/lib/content/blocks/survey/schema';
import { SurveyTemplateToolbar } from './survey-template-toolbar';

const inputClass =
  'w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent';

const labelClass = 'block text-xs font-medium text-gray-700 mb-1';

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs font-medium text-gray-700">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={[
          'relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent',
          'transition-colors duration-200 cursor-pointer focus:outline-none',
          checked ? 'bg-[#1A3C6E]' : 'bg-gray-200',
        ].join(' ')}
      >
        <span
          className={[
            'pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm',
            'transform transition-transform duration-200',
            checked ? 'translate-x-4' : 'translate-x-0',
          ].join(' ')}
        />
      </button>
    </div>
  );
}

function QuestionEditor({
  question,
  index,
  total,
  onChange,
  onRemove,
  onMoveUp,
  onMoveDown,
}: {
  question: SurveyQuestion;
  index: number;
  total: number;
  onChange: (q: SurveyQuestion) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const options = question.options ?? [];

  const updateOption = (i: number, value: string) => {
    const next = options.map((o, idx) => (idx === i ? value : o));
    onChange({ ...question, options: next });
  };

  const addOption = () => onChange({ ...question, options: [...options, ''] });
  const removeOption = (i: number) =>
    onChange({ ...question, options: options.filter((_, idx) => idx !== i) });

  const handleTypeChange = (type: SurveyQuestionType) => {
    const next = createDefaultQuestion(type);
    onChange({ ...next, id: question.id, question: question.question, required: question.required });
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
          <GripVertical className="h-4 w-4" />
          Question {index + 1}
        </div>
        <div className="flex items-center gap-1">
          <button type="button" onClick={onMoveUp} disabled={index === 0} className="p-1 rounded hover:bg-gray-200 disabled:opacity-30">
            <ChevronUp className="h-4 w-4" />
          </button>
          <button type="button" onClick={onMoveDown} disabled={index >= total - 1} className="p-1 rounded hover:bg-gray-200 disabled:opacity-30">
            <ChevronDown className="h-4 w-4" />
          </button>
          <button type="button" onClick={onRemove} className="p-1 rounded hover:bg-red-100 text-red-600 ml-1">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Question type</label>
          <select
            value={question.type}
            onChange={(e) => handleTypeChange(e.target.value as SurveyQuestionType)}
            className={inputClass}
          >
            {surveyQuestionTypes.map((t) => (
              <option key={t} value={t}>{questionTypeLabel(t)}</option>
            ))}
          </select>
        </div>
        <div className="flex items-end pb-1">
          <Toggle
            checked={question.required ?? false}
            onChange={(required) => onChange({ ...question, required })}
            label="Required"
          />
        </div>
      </div>

      <div>
        <label className={labelClass}>Question text</label>
        <input
          type="text"
          value={question.question}
          onChange={(e) => onChange({ ...question, question: e.target.value })}
          placeholder="Enter your question..."
          className={inputClass}
        />
      </div>

      {(question.type === 'multiple_choice' ||
        question.type === 'multi_select' ||
        question.type === 'true_false') && (
        <div className="space-y-2">
          <label className={labelClass}>Options</label>
          {options.map((opt, i) => (
            <div key={i} className="flex gap-2">
              <input
                type="text"
                value={opt}
                onChange={(e) => updateOption(i, e.target.value)}
                className={inputClass}
                disabled={question.type === 'true_false'}
              />
              {question.type !== 'true_false' && (
                <button type="button" onClick={() => removeOption(i)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg">
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
          {question.type !== 'true_false' && (
            <button type="button" onClick={addOption} className="text-xs font-medium text-[#1A3C6E] hover:underline flex items-center gap-1">
              <Plus className="h-3 w-3" /> Add option
            </button>
          )}
        </div>
      )}

      {question.type === 'scale' && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Min value</label>
            <input
              type="number"
              value={question.min_value ?? 1}
              onChange={(e) => onChange({ ...question, min_value: Number(e.target.value) })}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Max value</label>
            <input
              type="number"
              value={question.max_value ?? 10}
              onChange={(e) => onChange({ ...question, max_value: Number(e.target.value) })}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Min label (optional)</label>
            <input
              type="text"
              value={question.min_label ?? ''}
              onChange={(e) => onChange({ ...question, min_label: e.target.value || undefined })}
              className={inputClass}
              placeholder="Strongly disagree"
            />
          </div>
          <div>
            <label className={labelClass}>Max label (optional)</label>
            <input
              type="text"
              value={question.max_label ?? ''}
              onChange={(e) => onChange({ ...question, max_label: e.target.value || undefined })}
              className={inputClass}
              placeholder="Strongly agree"
            />
          </div>
        </div>
      )}
    </div>
  );
}

export function SurveyEditor({ data, onChange }: BlockEditorProps<SurveyData>) {
  const questions = data.questions ?? [];

  const updateQuestion = (index: number, q: SurveyQuestion) => {
    const next = questions.map((item, i) => (i === index ? q : item));
    onChange({ ...data, questions: next });
  };

  const addQuestion = () => {
    onChange({ ...data, questions: [...questions, createDefaultQuestion()] });
  };

  const removeQuestion = (index: number) => {
    onChange({ ...data, questions: questions.filter((_, i) => i !== index) });
  };

  const moveQuestion = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= questions.length) return;
    const next = [...questions];
    [next[index], next[target]] = [next[target], next[index]];
    onChange({ ...data, questions: next });
  };

  return (
    <div className="space-y-5">
      <SurveyTemplateToolbar data={data} onApply={onChange} />
      <div className="space-y-3 pb-3 border-b border-gray-100">
        <div>
          <label className={labelClass}>Survey title</label>
          <input
            type="text"
            value={data.title ?? 'Survey'}
            onChange={(e) => onChange({ ...data, title: e.target.value })}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Description (optional)</label>
          <textarea
            value={data.description ?? ''}
            onChange={(e) => onChange({ ...data, description: e.target.value || undefined })}
            rows={2}
            className={inputClass}
            placeholder="Brief instructions for respondents..."
          />
        </div>
        <div>
          <label className={labelClass}>Submit button label</label>
          <input
            type="text"
            value={data.submit_label ?? 'Submit Survey'}
            onChange={(e) => onChange({ ...data, submit_label: e.target.value })}
            className={inputClass}
          />
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Questions</p>
          <span className="text-xs text-gray-400">{questions.length} question{questions.length !== 1 ? 's' : ''}</span>
        </div>

        {questions.map((q, i) => (
          <QuestionEditor
            key={q.id}
            question={q}
            index={i}
            total={questions.length}
            onChange={(updated) => updateQuestion(i, updated)}
            onRemove={() => removeQuestion(i)}
            onMoveUp={() => moveQuestion(i, -1)}
            onMoveDown={() => moveQuestion(i, 1)}
          />
        ))}

        <button
          type="button"
          onClick={addQuestion}
          className="w-full py-3 border-2 border-dashed border-gray-200 rounded-xl text-sm font-medium text-[#1A3C6E] hover:border-[#1A3C6E]/40 hover:bg-[#1A3C6E]/5 transition-colors flex items-center justify-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Add question
        </button>
      </div>
    </div>
  );
}
