'use client';

import { Plus, Trash2 } from 'lucide-react';
import type { BlockEditorProps } from '@/lib/content/block-registry';
import type { FillBlankData } from '@/lib/content/blocks/fill-blank/schema';
import { getFillBlankAnswers } from '@/lib/content/blocks/fill-blank/schema';

const inputClass =
  'w-full px-2.5 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent';

export function FillBlankEditor({ data, onChange }: BlockEditorProps<FillBlankData>) {
  const distractors = data.distractors ?? [];
  const answers = getFillBlankAnswers(data.text ?? '');

  const setDistractor = (i: number, value: string) =>
    onChange({ ...data, distractors: distractors.map((d, idx) => (idx === i ? value : d)) });
  const addDistractor = () => onChange({ ...data, distractors: [...distractors, ''] });
  const removeDistractor = (i: number) => onChange({ ...data, distractors: distractors.filter((_, idx) => idx !== i) });

  return (
    <div className="space-y-4">
      {/* Instructions */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Instructions (optional)</label>
        <input
          type="text"
          value={data.instructions ?? ''}
          placeholder="e.g. Drag each word into the correct blank"
          onChange={(e) => onChange({ ...data, instructions: e.target.value || undefined })}
          className={inputClass}
        />
      </div>

      {/* Passage */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Passage</label>
        <textarea
          value={data.text ?? ''}
          placeholder="Water is made of [hydrogen] and [oxygen]."
          onChange={(e) => onChange({ ...data, text: e.target.value })}
          rows={4}
          className={`${inputClass} resize-y leading-relaxed`}
        />
        <p className="mt-1 text-[11px] text-gray-400 leading-snug">
          Wrap each answer in <code className="px-1 rounded bg-gray-100 text-gray-600">[square brackets]</code> to turn it
          into a blank. The bracketed words are added to the word bank automatically.
        </p>

        {/* Detected blanks preview */}
        <div className="mt-2">
          {answers.length === 0 ? (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1.5">
              No blanks yet — add at least one <code className="px-1 rounded bg-amber-100">[answer]</code>.
            </p>
          ) : (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Blanks ({answers.length}):</span>
              {answers.map((a, i) => (
                <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-xs font-medium text-emerald-700">
                  <span className="text-[9px] font-bold opacity-60">{i + 1}</span>{a}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Distractors */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-gray-600">Distractor words ({distractors.length})</label>
          <button
            type="button"
            onClick={addDistractor}
            className="px-2 py-1 text-xs bg-[#1E3A5F] text-white rounded-lg hover:bg-[#162d4a] transition-colors"
          >
            + Add word
          </button>
        </div>
        <p className="text-[11px] text-gray-400">Optional wrong words mixed into the bank to make it harder.</p>
        {distractors.length === 0 && (
          <p className="text-xs text-gray-400 italic">No distractors — the bank holds only the correct answers.</p>
        )}
        {distractors.map((d, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              type="text"
              value={d}
              placeholder={`Distractor ${i + 1}`}
              onChange={(e) => setDistractor(i, e.target.value)}
              className={`${inputClass} flex-1`}
            />
            <button
              type="button"
              onClick={() => removeDistractor(i)}
              className="p-1 rounded hover:bg-red-50 text-gray-300 hover:text-red-500 transition-colors"
              aria-label={`Remove distractor ${i + 1}`}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>

      {/* Options */}
      <div className="space-y-2.5">
        <label className="flex items-center justify-between cursor-pointer">
          <span className="text-xs text-gray-600">Shuffle the word bank</span>
          <input
            type="checkbox"
            checked={data.shuffle ?? true}
            onChange={(e) => onChange({ ...data, shuffle: e.target.checked })}
            className="accent-[#1A3C6E] w-4 h-4"
          />
        </label>
        <label className="flex items-center justify-between cursor-pointer">
          <span className="text-xs text-gray-600">Show feedback on check</span>
          <input
            type="checkbox"
            checked={data.show_feedback ?? true}
            onChange={(e) => onChange({ ...data, show_feedback: e.target.checked })}
            className="accent-[#1A3C6E] w-4 h-4"
          />
        </label>
      </div>

      {/* Feedback messages */}
      {(data.show_feedback ?? true) && (
        <div className="space-y-2 pl-1">
          <div>
            <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Correct message</label>
            <input
              type="text"
              value={data.feedback_correct ?? ''}
              placeholder="All blanks correct — nice work!"
              onChange={(e) => onChange({ ...data, feedback_correct: e.target.value || undefined })}
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Incorrect message</label>
            <input
              type="text"
              value={data.feedback_incorrect ?? ''}
              placeholder="Not quite — fix the red blanks and try again."
              onChange={(e) => onChange({ ...data, feedback_incorrect: e.target.value || undefined })}
              className={inputClass}
            />
          </div>
        </div>
      )}

      {/* Appearance */}
      <div className="space-y-2 pt-1 border-t border-gray-100">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Appearance</p>
        {([
          { key: 'accent_color', label: 'Accent', fallback: '#1E3A5F', hint: 'Highlights + Check Answer button' },
          { key: 'chip_color', label: 'Word chip', fallback: '#FFFFFF', hint: 'Bank words (blank = glass)' },
          { key: 'text_color', label: 'Text', fallback: '#1E293B', hint: 'Passage + chip text colour' },
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
                <button type="button" onClick={() => onChange({ ...data, [row.key]: undefined })}
                  className="text-[10px] font-medium text-gray-400 hover:text-red-500 shrink-0">
                  Reset
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
