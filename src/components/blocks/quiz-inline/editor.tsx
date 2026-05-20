'use client';

import { useRef } from 'react';
import { ChevronUp, ChevronDown, AlertTriangle } from 'lucide-react';
import type { BlockEditorProps } from '@/lib/content/block-registry';
import type { QuizInlineData } from '@/lib/content/blocks/quiz-inline/schema';

/** Validate quiz config — returns issues that would cause the quiz to be
 *  skipped by the completion gate (so it won't block students, but also
 *  won't count as a real quiz). Mirrors course-viewer gate logic. */
function getQuizIssues(data: QuizInlineData): string[] {
  const issues: string[] = [];
  const qt = data.question_type;
  if (!qt) {
    issues.push('Question type is not set');
    return issues;
  }
  if (!data.question || !data.question.trim()) {
    issues.push('Question text is empty');
  }
  if (qt === 'multiple_choice' || qt === 'select_all') {
    const opts = data.options ?? [];
    if (opts.length === 0) issues.push('No answer options added');
    else if (opts.some((o) => !o.trim())) issues.push('One or more answer options are blank');
    if (!data.correct_answer) {
      issues.push(qt === 'select_all'
        ? 'Correct answers not selected'
        : 'Correct answer not selected');
    } else if (qt === 'multiple_choice' && opts.length > 0 && !opts.includes(data.correct_answer)) {
      issues.push('Correct answer no longer matches any option');
    }
  } else if (qt === 'true_false') {
    if (!data.correct_answer) issues.push('Correct answer not selected (True or False)');
  } else if (qt === 'categorize') {
    const cats = data.categories ?? [];
    if (cats.length === 0) issues.push('No categories added');
    else {
      if (cats.some((c) => !c.name.trim())) issues.push('One or more categories have no name');
      if (cats.some((c) => c.items.length === 0)) issues.push('One or more categories have no items');
      if (cats.some((c) => c.items.some((it) => !it.trim()))) issues.push('One or more category items are blank');
    }
  }
  return issues;
}

const inputClass =
  'w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent';

type QuestionType = QuizInlineData['question_type'];

const QUESTION_TYPES: { value: QuestionType; label: string }[] = [
  { value: 'multiple_choice', label: 'Multiple Choice' },
  { value: 'true_false', label: 'True / False' },
  { value: 'categorize', label: 'Categorize' },
];

const TRUE_FALSE_OPTIONS = ['True', 'False'];

/** Per-type cache so switching types doesn't lose work */
interface TypeCache {
  multiple_choice?: { options: string[]; correct_answer?: string };
  categorize?: { categories: Array<{ name: string; items: string[] }> };
}

export function QuizInlineEditor({ data, onChange }: BlockEditorProps<QuizInlineData>) {
  const options = data.options ?? [];
  const categories = data.categories ?? [];
  const typeCacheRef = useRef<TypeCache>({});

  function updateOption(index: number, value: string) {
    const updated = options.map((o, i) => (i === index ? value : o));
    onChange({ ...data, options: updated });
  }

  function addOption() {
    onChange({ ...data, options: [...options, ''] });
  }

  function removeOption(index: number) {
    const updated = options.filter((_, i) => i !== index);
    // If correct answer was this option, clear it
    const newCorrect = data.correct_answer === options[index] ? undefined : data.correct_answer;
    onChange({ ...data, options: updated, correct_answer: newCorrect });
  }

  function moveOptionUp(index: number) {
    if (index <= 0) return;
    const updated = [...options];
    [updated[index - 1], updated[index]] = [updated[index], updated[index - 1]];
    onChange({ ...data, options: updated });
  }

  function moveOptionDown(index: number) {
    if (index >= options.length - 1) return;
    const updated = [...options];
    [updated[index], updated[index + 1]] = [updated[index + 1], updated[index]];
    onChange({ ...data, options: updated });
  }

  function updateCategoryName(catIndex: number, name: string) {
    const updated = categories.map((c, i) => (i === catIndex ? { ...c, name } : c));
    onChange({ ...data, categories: updated });
  }

  function addCategoryItem(catIndex: number) {
    const updated = categories.map((c, i) =>
      i === catIndex ? { ...c, items: [...c.items, ''] } : c
    );
    onChange({ ...data, categories: updated });
  }

  function updateCategoryItem(catIndex: number, itemIndex: number, value: string) {
    const updated = categories.map((c, i) =>
      i === catIndex
        ? { ...c, items: c.items.map((item, j) => (j === itemIndex ? value : item)) }
        : c
    );
    onChange({ ...data, categories: updated });
  }

  function removeCategoryItem(catIndex: number, itemIndex: number) {
    const updated = categories.map((c, i) =>
      i === catIndex ? { ...c, items: c.items.filter((_, j) => j !== itemIndex) } : c
    );
    onChange({ ...data, categories: updated });
  }

  function addCategory() {
    onChange({ ...data, categories: [...categories, { name: '', items: [] }] });
  }

  function removeCategory(catIndex: number) {
    onChange({ ...data, categories: categories.filter((_, i) => i !== catIndex) });
  }

  function handleTypeChange(newType: QuestionType) {
    // Cache current type's state before switching
    const currentType = data.question_type;
    if (currentType === 'multiple_choice') {
      typeCacheRef.current.multiple_choice = {
        options: [...options],
        correct_answer: data.correct_answer,
      };
    } else if (currentType === 'categorize') {
      typeCacheRef.current.categorize = {
        categories: categories.map((c) => ({ ...c, items: [...c.items] })),
      };
    }

    // Restore from cache if available, otherwise use defaults
    const patch: Partial<QuizInlineData> = { question_type: newType };
    if (newType === 'true_false') {
      patch.options = ['True', 'False'];
    } else if (newType === 'multiple_choice') {
      const cached = typeCacheRef.current.multiple_choice;
      patch.options = cached?.options ?? [];
      patch.correct_answer = cached?.correct_answer;
    } else if (newType === 'categorize') {
      const cached = typeCacheRef.current.categorize;
      patch.categories = cached?.categories ?? [];
      patch.options = undefined;
      patch.correct_answer = undefined;
    }
    onChange({ ...data, ...patch });
  }

  const displayOptions = data.question_type === 'true_false' ? TRUE_FALSE_OPTIONS : options;
  const issues = getQuizIssues(data);

  return (
    <div className="space-y-4">
      {/* Incomplete-quiz warning — surfaces config that would cause the
          completion gate to skip this quiz (so it doesn't block students). */}
      {issues.length > 0 && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2.5 flex gap-2.5"
          role="alert"
          aria-live="polite">
          <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" aria-hidden="true" />
          <div className="text-xs text-amber-900 leading-relaxed">
            <p className="font-semibold mb-1">This quiz is incomplete and will not count toward lesson completion:</p>
            <ul className="list-disc list-inside space-y-0.5">
              {issues.map((issue) => (
                <li key={issue}>{issue}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Question type selector */}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-2">Question Type</label>
        <div className="flex gap-2">
          {QUESTION_TYPES.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => handleTypeChange(value)}
              className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                data.question_type === value
                  ? 'bg-[#1E3A5F] text-white border-[#1E3A5F]'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-[#1E3A5F]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Question text */}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Question</label>
        <textarea
          value={data.question ?? ''}
          onChange={(e) => onChange({ ...data, question: e.target.value || undefined })}
          placeholder="Enter your question here..."
          rows={3}
          className={`${inputClass} resize-y`}
        />
      </div>

      {/* Instructions (for categorize) */}
      {data.question_type === 'categorize' && (
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Instructions</label>
          <input
            type="text"
            value={data.instructions ?? ''}
            onChange={(e) => onChange({ ...data, instructions: e.target.value || undefined })}
            placeholder="e.g. Drag each item to the correct category"
            className={inputClass}
          />
        </div>
      )}

      {/* Multiple choice options */}
      {data.question_type === 'multiple_choice' && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-medium text-gray-700">
              Answer Options ({options.length})
            </label>
            <button
              type="button"
              onClick={addOption}
              className="px-2 py-1 text-xs bg-[#1E3A5F] text-white rounded-lg hover:bg-[#162d4a] transition-colors"
            >
              + Add Option
            </button>
          </div>
          {options.length === 0 && (
            <p className="text-xs text-gray-400 italic py-1">No options yet.</p>
          )}
          <div className="space-y-2">
            {options.map((opt, i) => (
              <div key={i} className="flex items-center gap-1.5">
                {/* Reorder arrows */}
                <div className="flex flex-col shrink-0">
                  <button
                    type="button"
                    onClick={() => moveOptionUp(i)}
                    disabled={i === 0}
                    className="p-0.5 text-gray-400 hover:text-gray-600 disabled:opacity-20 disabled:cursor-not-allowed"
                    aria-label={`Move option ${i + 1} up`}
                  >
                    <ChevronUp className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveOptionDown(i)}
                    disabled={i === options.length - 1}
                    className="p-0.5 text-gray-400 hover:text-gray-600 disabled:opacity-20 disabled:cursor-not-allowed"
                    aria-label={`Move option ${i + 1} down`}
                  >
                    <ChevronDown className="w-3 h-3" />
                  </button>
                </div>
                <input
                  type="radio"
                  name="correct_answer"
                  checked={data.correct_answer === opt}
                  onChange={() => onChange({ ...data, correct_answer: opt })}
                  className="h-4 w-4 text-[#1E3A5F] border-gray-300 focus:ring-[#1E3A5F] shrink-0"
                  aria-label={`Set option ${i + 1} as correct answer`}
                />
                <input
                  type="text"
                  value={opt}
                  onChange={(e) => updateOption(i, e.target.value)}
                  placeholder={`Option ${i + 1}`}
                  className={`${inputClass} flex-1`}
                />
                <button
                  type="button"
                  onClick={() => removeOption(i)}
                  className="text-xs text-red-500 hover:text-red-700 shrink-0"
                  aria-label={`Remove option ${i + 1}`}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
          {options.length > 0 && (
            <p className="mt-1 text-xs text-gray-500">
              Select the radio button next to the correct answer.
            </p>
          )}
        </div>
      )}

      {/* True / False correct answer */}
      {data.question_type === 'true_false' && (
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-2">Correct Answer</label>
          <div className="flex gap-3">
            {TRUE_FALSE_OPTIONS.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => onChange({ ...data, correct_answer: opt })}
                className={`px-4 py-2 text-sm rounded-lg border transition-colors ${
                  data.correct_answer === opt
                    ? 'bg-[#1E3A5F] text-white border-[#1E3A5F]'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-[#1E3A5F]'
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Categorize categories */}
      {data.question_type === 'categorize' && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-medium text-gray-700">Categories</label>
            <button
              type="button"
              onClick={addCategory}
              className="px-2 py-1 text-xs bg-[#1E3A5F] text-white rounded-lg hover:bg-[#162d4a] transition-colors"
            >
              + Add Category
            </button>
          </div>
          {categories.length === 0 && (
            <p className="text-xs text-gray-400 italic py-1">No categories yet.</p>
          )}
          <div className="space-y-3">
            {categories.map((cat, catI) => (
              <div key={catI} className="p-3 border border-gray-200 rounded-lg space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={cat.name}
                    onChange={(e) => updateCategoryName(catI, e.target.value)}
                    placeholder={`Category ${catI + 1} name`}
                    className={`${inputClass} flex-1`}
                  />
                  <button
                    type="button"
                    onClick={() => removeCategory(catI)}
                    className="text-xs text-red-500 hover:text-red-700 shrink-0"
                  >
                    Remove
                  </button>
                </div>
                <div className="pl-2 space-y-1">
                  {cat.items.map((item, itemI) => (
                    <div key={itemI} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={item}
                        onChange={(e) => updateCategoryItem(catI, itemI, e.target.value)}
                        placeholder={`Item ${itemI + 1}`}
                        className={`${inputClass} flex-1 text-xs`}
                      />
                      <button
                        type="button"
                        onClick={() => removeCategoryItem(catI, itemI)}
                        className="text-xs text-red-500 hover:text-red-700 shrink-0"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => addCategoryItem(catI)}
                    className="text-xs text-[#1E3A5F] hover:underline"
                  >
                    + Add item
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Feedback & Options ──────────────────────────────────────── */}
      <div className="border-t border-gray-100 pt-4 space-y-3">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Feedback & Options</p>

        {/* Show feedback toggle */}
        <div className="flex items-center gap-2">
          <input
            id="quiz-show-feedback"
            type="checkbox"
            checked={data.show_feedback ?? true}
            onChange={(e) => onChange({ ...data, show_feedback: e.target.checked })}
            className="h-4 w-4 rounded border-gray-300 text-[#1E3A5F] focus:ring-[#1E3A5F]"
          />
          <label htmlFor="quiz-show-feedback" className="text-sm text-gray-700">
            Show feedback after answer
          </label>
        </div>

        {/* Custom feedback messages — visible when feedback is enabled */}
        {(data.show_feedback ?? true) && (
          <div className="space-y-2 pl-6">
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">
                Correct Reinforcement
              </label>
              <input
                type="text"
                value={data.feedback_correct ?? ''}
                onChange={(e) => onChange({ ...data, feedback_correct: e.target.value || undefined })}
                placeholder="That's correct!"
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">
                Incorrect Reinforcement
              </label>
              <input
                type="text"
                value={data.feedback_incorrect ?? ''}
                onChange={(e) => onChange({ ...data, feedback_incorrect: e.target.value || undefined })}
                placeholder="Not quite..."
                className={inputClass}
              />
            </div>
          </div>
        )}

        {/* Explanation — shown after answering regardless of correctness */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Explanation (shown after answering)
          </label>
          <textarea
            value={data.explanation ?? ''}
            onChange={(e) => onChange({ ...data, explanation: e.target.value || undefined })}
            placeholder="Optional: explain why the correct answer is right..."
            rows={2}
            className={`${inputClass} resize-y`}
          />
        </div>

        {/* Hint */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Hint (shown before answering)
          </label>
          <input
            type="text"
            value={data.hint ?? ''}
            onChange={(e) => onChange({ ...data, hint: e.target.value || undefined })}
            placeholder="Optional: give students a nudge..."
            className={inputClass}
          />
        </div>

        {/* Shuffle options */}
        <div className="flex items-center gap-2">
          <input
            id="quiz-shuffle"
            type="checkbox"
            checked={data.shuffle_options ?? false}
            onChange={(e) => onChange({ ...data, shuffle_options: e.target.checked })}
            className="h-4 w-4 rounded border-gray-300 text-[#1E3A5F] focus:ring-[#1E3A5F]"
          />
          <label htmlFor="quiz-shuffle" className="text-sm text-gray-700">
            Shuffle answer order
          </label>
        </div>

        {/* Time limit */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Time Limit (seconds, 0 = none)
          </label>
          <input
            type="number"
            min={0}
            value={data.time_limit ?? 0}
            onChange={(e) => onChange({ ...data, time_limit: parseInt(e.target.value) || 0 })}
            className={`${inputClass} w-24`}
          />
        </div>
      </div>
    </div>
  );
}
