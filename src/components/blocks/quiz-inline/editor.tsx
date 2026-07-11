'use client';

import { useRef } from 'react';
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Plus, Trash2, AlertTriangle } from 'lucide-react';
import type { BlockEditorProps } from '@/lib/content/block-registry';
import type { QuizInlineData } from '@/lib/content/blocks/quiz-inline/schema';
import { getQuizConfigError, isGatedQuizType } from '@/lib/content/blocks/quiz-inline/validation';
import {
  assignItemToCategory,
  getCategorizeOptionPool,
  getCategorizePlayItems,
} from '@/lib/content/blocks/quiz-inline/categorize-utils';

const inputClass =
  'w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent';

type QuestionType = QuizInlineData['question_type'];

const QUESTION_TYPES: { value: QuestionType; label: string }[] = [
  { value: 'multiple_choice', label: 'Multiple Choice' },
  { value: 'true_false', label: 'True / False' },
  { value: 'select_all', label: 'Select All That Apply' },
  { value: 'categorize', label: 'Categorize' },
  { value: 'swipe', label: 'Swipe' },
];

const TRUE_FALSE_OPTIONS = ['True', 'False'];

/** Per-type cache so switching types doesn't lose work */
interface TypeCache {
  multiple_choice?: { options: string[]; correct_answer?: string };
  select_all?: { options: string[]; correct_answer?: string };
  categorize?: { categories: Array<{ name: string; items: string[] }>; options?: string[] };
  swipe?: { options: string[]; swipe_cards?: Array<{ question: string; correct: 'left' | 'right' }> };
}

function parseSelectAllCorrect(correct?: string): Set<string> {
  return new Set((correct ?? '').split('; ').map(s => s.trim()).filter(Boolean));
}

function encodeSelectAllCorrect(selected: Set<string>): string {
  return [...selected].join('; ');
}

export function QuizInlineEditor({ data, onChange }: BlockEditorProps<QuizInlineData>) {
  const options = data.options ?? [];
  const categories = data.categories ?? [];
  const typeCacheRef = useRef<TypeCache>({});

  function updateOption(index: number, value: string) {
    const previous = options[index];
    const updated = options.map((o, i) => (i === index ? value : o));
    let correct_answer = data.correct_answer;
    if (data.question_type === 'multiple_choice' && correct_answer === previous) {
      correct_answer = value;
    }
    onChange({ ...data, options: updated, correct_answer });
  }

  function addOption() {
    onChange({ ...data, options: [...options, ''] });
  }

  function removeOption(index: number) {
    const removed = options[index];
    const updated = options.filter((_, i) => i !== index);
    let newCorrect = data.correct_answer;
    if (data.question_type === 'select_all') {
      const set = parseSelectAllCorrect(data.correct_answer);
      set.delete(removed);
      newCorrect = encodeSelectAllCorrect(set);
    } else if (data.correct_answer === removed) {
      newCorrect = undefined;
    }
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

  // ── Swipe deck: shared left/right labels (options) + a list of cards ──
  function setSwipeLabel(side: 0 | 1, value: string) {
    const next = [...(data.options ?? ['', ''])];
    while (next.length < 2) next.push('');
    next[side] = value;
    onChange({ ...data, options: next });
  }
  function addSwipeCard() {
    const cards = data.swipe_cards ?? [];
    onChange({ ...data, swipe_cards: [...cards, { question: '', correct: 'right' }] });
  }
  function updateSwipeCard(i: number, question: string) {
    const cards = (data.swipe_cards ?? []).map((c, idx) => (idx === i ? { ...c, question } : c));
    onChange({ ...data, swipe_cards: cards });
  }
  function setSwipeCardCorrect(i: number, correct: 'left' | 'right') {
    const cards = (data.swipe_cards ?? []).map((c, idx) => (idx === i ? { ...c, correct } : c));
    onChange({ ...data, swipe_cards: cards });
  }
  function removeSwipeCard(i: number) {
    const cards = (data.swipe_cards ?? []).filter((_, idx) => idx !== i);
    onChange({ ...data, swipe_cards: cards });
  }
  function moveSwipeCard(i: number, dir: -1 | 1) {
    const cards = [...(data.swipe_cards ?? [])];
    const j = i + dir;
    if (j < 0 || j >= cards.length) return;
    [cards[i], cards[j]] = [cards[j], cards[i]];
    onChange({ ...data, swipe_cards: cards });
  }

  function updateCategoryName(catIndex: number, name: string) {
    const updated = categories.map((c, i) => (i === catIndex ? { ...c, name } : c));
    onChange({ ...data, categories: updated });
  }

  function toggleSelectAllCorrect(option: string) {
    const set = parseSelectAllCorrect(data.correct_answer);
    if (set.has(option)) set.delete(option);
    else set.add(option);
    onChange({ ...data, correct_answer: encodeSelectAllCorrect(set) });
  }

  function toggleCategoryOption(catIndex: number, option: string) {
    const has = categories[catIndex]?.items.includes(option);
    const updatedCategories = assignItemToCategory(categories, catIndex, option, !has);
    // Keep the full authoring pool intact — assigning an item to a category only
    // changes its category membership. Previously we rebuilt `options` from the
    // category items (syncCategorizeOptions), which silently DROPPED every option
    // that hadn't been assigned to a category yet. Now unassigned options persist
    // and the amber "assign every option" warning nudges the author instead.
    onChange({
      ...data,
      categories: updatedCategories,
    });
  }

  function addCategorizeOption(value = '') {
    const pool = getCategorizeOptionPool(data, categories);
    onChange({ ...data, options: [...pool, value] });
  }

  function updateCategorizeOption(index: number, value: string) {
    const pool = getCategorizeOptionPool(data, categories);
    const old = pool[index];
    // `old` may be an empty string (a freshly-added blank option being typed into),
    // so guard on out-of-bounds only — NOT on falsiness, which would block editing it.
    if (old === undefined) return;
    const newPool = pool.map((o, i) => (i === index ? value : o));
    const updatedCategories = categories.map((c) => ({
      ...c,
      // Only rename real (non-empty) items that match; an empty `old` has no
      // category assignment yet, so nothing to rename.
      items: old ? c.items.map((item) => (item === old ? value : item)) : c.items,
    }));
    onChange({
      ...data,
      options: newPool,
      categories: updatedCategories,
    });
  }

  function removeCategorizeOption(index: number) {
    const pool = getCategorizeOptionPool(data, categories);
    const removed = pool[index];
    const newPool = pool.filter((_, i) => i !== index);
    const updatedCategories = categories.map((c) => ({
      ...c,
      items: c.items.filter((item) => item !== removed),
    }));
    onChange({
      ...data,
      options: newPool,
      categories: updatedCategories,
    });
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
    } else if (currentType === 'select_all') {
      typeCacheRef.current.select_all = {
        options: [...options],
        correct_answer: data.correct_answer,
      };
    } else if (currentType === 'categorize') {
      typeCacheRef.current.categorize = {
        categories: categories.map((c) => ({ ...c, items: [...c.items] })),
        options: data.options ? [...data.options] : undefined,
      };
    } else if (currentType === 'swipe') {
      typeCacheRef.current.swipe = {
        options: [...options],
        swipe_cards: data.swipe_cards ? data.swipe_cards.map((c) => ({ ...c })) : undefined,
      };
    }

    const patch: Partial<QuizInlineData> = { question_type: newType };
    if (newType === 'true_false') {
      patch.options = ['True', 'False'];
      patch.correct_answer = undefined;
      patch.categories = undefined;
    } else if (newType === 'multiple_choice') {
      const cached = typeCacheRef.current.multiple_choice;
      patch.options = cached?.options ?? [];
      patch.correct_answer = cached?.correct_answer;
      patch.categories = undefined;
    } else if (newType === 'select_all') {
      const cached = typeCacheRef.current.select_all;
      patch.options = cached?.options ?? [];
      patch.correct_answer = cached?.correct_answer ?? '';
      patch.categories = undefined;
    } else if (newType === 'categorize') {
      const cached = typeCacheRef.current.categorize;
      patch.categories = cached?.categories ?? [];
      patch.options = cached?.options ?? [];
      patch.correct_answer = undefined;
    } else if (newType === 'swipe') {
      const cached = typeCacheRef.current.swipe;
      // Swipe uses two shared side labels (options[0]=left, [1]=right) + a deck of cards.
      patch.options = cached?.options ?? (options.filter(Boolean).length >= 2 ? options.slice(0, 2) : ['False', 'True']);
      patch.swipe_cards = cached?.swipe_cards ?? [{ question: '', correct: 'right' }];
      patch.correct_answer = undefined;
      patch.categories = undefined;
    }
    onChange({ ...data, ...patch });
  }

  const displayOptions = data.question_type === 'true_false' ? TRUE_FALSE_OPTIONS : options;
  const selectAllCorrect = parseSelectAllCorrect(data.correct_answer);
  const categorizePool = getCategorizeOptionPool(data, categories);
  const categorizePlayItems = getCategorizePlayItems(categories);
  const unassignedCategorizeOptions = categorizePool.filter(
    (opt) => opt && !categorizePlayItems.includes(opt),
  );

  const configError = getQuizConfigError(data);

  return (
    <div className="space-y-4">
      {/* Misconfiguration warning — a gated quiz whose correct answer matches no
          option can never be passed and would block lesson completion if it gated.
          The student viewer now skips such quizzes in the completion gate, but the
          author still needs to fix it so learners are graded correctly. */}
      {configError && isGatedQuizType(data.question_type) && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>
            <strong className="font-semibold">This question can&apos;t be answered correctly:</strong>{' '}
            {configError} Learners won&apos;t be graded on it and it won&apos;t block lesson completion until fixed.
          </span>
        </div>
      )}

      {/* Question type selector */}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-2">Question Type</label>
        <div className="flex flex-wrap gap-2">
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

      {/* Question text — hidden for swipe (it uses a per-card list + optional prompt) */}
      {data.question_type !== 'swipe' && (
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
      )}

      {/* Swipe deck — shared side answers + a stack of question cards */}
      {data.question_type === 'swipe' && (() => {
        const swipeOpts = data.options ?? ['', ''];
        const left = swipeOpts[0] ?? '';
        const right = swipeOpts[1] ?? '';
        const cards = data.swipe_cards ?? [];
        const leftName = left.trim() || 'Left';
        const rightName = right.trim() || 'Right';
        return (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Prompt (optional)</label>
              <input
                type="text"
                value={data.question ?? ''}
                onChange={(e) => onChange({ ...data, question: e.target.value || undefined })}
                placeholder="e.g. True or false?"
                className={inputClass}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Swipe answers (shared by every card)</label>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-rose-500"><ChevronLeft className="w-3.5 h-3.5" /> Swipe left</div>
                  <input type="text" value={left} onChange={(e) => setSwipeLabel(0, e.target.value)} placeholder="e.g. False" className={inputClass} />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-end gap-1 text-[10px] font-bold uppercase tracking-wider text-emerald-500">Swipe right <ChevronRight className="w-3.5 h-3.5" /></div>
                  <input type="text" value={right} onChange={(e) => setSwipeLabel(1, e.target.value)} placeholder="e.g. True" className={inputClass} />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium text-gray-700">Cards ({cards.length})</p>
              {cards.length === 0 && <p className="text-xs text-gray-400 italic">No cards yet — add one below.</p>}
              {cards.map((card, i) => (
                <div key={i} className="rounded-xl border border-gray-200 bg-gray-50/50 p-2.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Card {i + 1}</span>
                    <div className="flex items-center gap-0.5">
                      <button type="button" onClick={() => moveSwipeCard(i, -1)} disabled={i === 0} className="p-1 rounded hover:bg-gray-200 disabled:opacity-30" aria-label="Move card up"><ChevronUp className="w-3.5 h-3.5" /></button>
                      <button type="button" onClick={() => moveSwipeCard(i, 1)} disabled={i === cards.length - 1} className="p-1 rounded hover:bg-gray-200 disabled:opacity-30" aria-label="Move card down"><ChevronDown className="w-3.5 h-3.5" /></button>
                      <button type="button" onClick={() => removeSwipeCard(i)} className="p-1 rounded hover:bg-red-100 text-red-600 ml-0.5" aria-label="Remove card"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                  <input type="text" value={card.question} onChange={(e) => updateSwipeCard(i, e.target.value)} placeholder="Statement or question for this card" className={inputClass} />
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-gray-500 shrink-0">Correct:</span>
                    <button type="button" onClick={() => setSwipeCardCorrect(i, 'left')} className={`flex-1 px-2 py-1 text-xs font-semibold rounded-lg border transition-all ${card.correct === 'left' ? 'bg-[#1E3A5F] text-white border-[#1E3A5F]' : 'bg-white text-gray-600 border-gray-200 hover:border-[#1E3A5F]'}`}>← {leftName}</button>
                    <button type="button" onClick={() => setSwipeCardCorrect(i, 'right')} className={`flex-1 px-2 py-1 text-xs font-semibold rounded-lg border transition-all ${card.correct === 'right' ? 'bg-[#1E3A5F] text-white border-[#1E3A5F]' : 'bg-white text-gray-600 border-gray-200 hover:border-[#1E3A5F]'}`}>{rightName} →</button>
                  </div>
                </div>
              ))}
              <button type="button" onClick={addSwipeCard} className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium text-[#1A3C6E] border-2 border-dashed border-gray-200 rounded-xl hover:border-[#1A3C6E] hover:bg-[#1A3C6E]/5 transition-all">
                <Plus className="w-4 h-4" /> Add card
              </button>
            </div>

            {/* Appearance — deck colours */}
            <div className="space-y-2 pt-2 border-t border-gray-100">
              <p className="text-xs font-medium text-gray-700">Appearance</p>
              {([
                { key: 'swipe_accent_color', label: 'Accent', fallback: '#1E3A5F', hint: 'Progress bar, score pill, buttons' },
                { key: 'swipe_card_color', label: 'Card', fallback: '#FFFFFF', hint: 'Card background (blank = frosted glass)' },
                { key: 'swipe_card_text_color', label: 'Card text', fallback: '#1E293B', hint: 'Question text colour' },
              ] as const).map((row) => {
                const val = (data[row.key] as string | undefined) ?? '';
                return (
                  <div key={row.key} className="flex items-center gap-2">
                    <input
                      type="color"
                      value={val || row.fallback}
                      onChange={(e) => onChange({ ...data, [row.key]: e.target.value })}
                      className="h-8 w-9 shrink-0 rounded border border-gray-200 cursor-pointer bg-white p-0.5"
                      aria-label={`${row.label} colour`}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-gray-700 leading-tight">{row.label}</p>
                      <p className="text-[10px] text-gray-400 leading-tight truncate">{row.hint}</p>
                    </div>
                    {val && (
                      <button
                        type="button"
                        onClick={() => onChange({ ...data, [row.key]: undefined })}
                        className="text-[10px] font-medium text-gray-400 hover:text-red-500 shrink-0"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

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

      {/* Select all options */}
      {data.question_type === 'select_all' && (
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
          <p className="text-xs text-gray-500 mb-2">Check every correct answer — students must select all of them.</p>
          {options.length === 0 && (
            <p className="text-xs text-gray-400 italic py-1">No options yet.</p>
          )}
          <div className="space-y-2">
            {options.map((opt, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selectAllCorrect.has(opt) && Boolean(opt)}
                  onChange={() => toggleSelectAllCorrect(opt)}
                  disabled={!opt.trim()}
                  className="h-4 w-4 rounded border-gray-300 text-[#1E3A5F] focus:ring-[#1E3A5F] shrink-0"
                  aria-label={`Mark option ${i + 1} as correct`}
                />
                <input
                  type="text"
                  value={opt}
                  onChange={(e) => {
                    const newVal = e.target.value;
                    const updated = options.map((o, j) => (j === i ? newVal : o));
                    const set = parseSelectAllCorrect(data.correct_answer);
                    if (set.has(opt)) {
                      set.delete(opt);
                      if (newVal.trim()) set.add(newVal);
                    }
                    onChange({ ...data, options: updated, correct_answer: encodeSelectAllCorrect(set) });
                  }}
                  placeholder={`Option ${i + 1}`}
                  className={`${inputClass} flex-1`}
                />
                <button
                  type="button"
                  onClick={() => removeOption(i)}
                  className="text-xs text-red-500 hover:text-red-700 shrink-0"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
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
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-gray-700">Answer Options</label>
              <button
                type="button"
                onClick={() => addCategorizeOption('')}
                className="px-2 py-1 text-xs bg-[#1E3A5F] text-white rounded-lg hover:bg-[#162d4a] transition-colors"
              >
                + Add Option
              </button>
            </div>
            <p className="text-xs text-gray-500 mb-2">Define all items students will sort into categories.</p>
            {unassignedCategorizeOptions.length > 0 && (
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1.5 mb-2">
                Assign every option to a category — unassigned options are not shown to students:{' '}
                {unassignedCategorizeOptions.join(', ')}
              </p>
            )}
            <div className="space-y-2">
              {categorizePool.map((opt, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={opt}
                    onChange={(e) => updateCategorizeOption(i, e.target.value)}
                    placeholder={`Option ${i + 1}`}
                    className={`${inputClass} flex-1`}
                  />
                  <button
                    type="button"
                    onClick={() => removeCategorizeOption(i)}
                    className="text-xs text-red-500 hover:text-red-700 shrink-0"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>

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
                  {categorizePool.length === 0 ? (
                    <p className="text-xs text-gray-400 pl-1">Add options above first.</p>
                  ) : (
                    <div className="pl-1 space-y-1.5">
                      <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Correct items for this category</p>
                      {categorizePool.filter(Boolean).map((opt) => (
                        <label key={opt} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={cat.items.includes(opt)}
                            onChange={() => toggleCategoryOption(catI, opt)}
                            className="h-4 w-4 rounded border-gray-300 text-[#1E3A5F] focus:ring-[#1E3A5F]"
                          />
                          <span className="truncate">{opt}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Feedback & Options ──────────────────────────────────────── */}
      <div className="border-t border-gray-100 pt-4 space-y-3">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Feedback & Options</p>

        {/* Required-to-continue toggle */}
        <div className="flex items-start gap-2">
          <input
            id="quiz-required"
            type="checkbox"
            checked={data.required ?? true}
            onChange={(e) => onChange({ ...data, required: e.target.checked })}
            className="mt-0.5 h-4 w-4 rounded border-gray-300 text-[#1E3A5F] focus:ring-[#1E3A5F]"
          />
          <label htmlFor="quiz-required" className="text-sm text-gray-700">
            Required to continue
            <span className="block text-xs text-gray-400">
              Students must answer correctly before the Next button unlocks on this slide.
              Unchecked = practice quiz; never blocks progress.
            </span>
          </label>
        </div>

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
