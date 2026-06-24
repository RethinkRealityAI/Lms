'use client';

import { Trash2, MousePointerClick, Strikethrough, AlignLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { BlockEditorProps } from '@/lib/content/block-registry';
import type { FillBlankData, FillBlankMode, FillBlankToken } from '@/lib/content/blocks/fill-blank/schema';
import { tokenizeFillBlank, spliceText } from '@/lib/content/blocks/fill-blank/schema';

const inputClass =
  'w-full px-2.5 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent';

export function FillBlankEditor({ data, onChange }: BlockEditorProps<FillBlankData>) {
  const mode: FillBlankMode = data.mode ?? 'word_bank';
  const text = data.text ?? '';
  const distractors = data.distractors ?? [];
  const tokens = tokenizeFillBlank(text);
  const blanks = tokens.filter((t) => t.kind === 'blank');

  const setText = (t: string) => onChange({ ...data, text: t });

  // ── Click-to-select handlers (position-based splices on the raw text) ──
  const markBlank = (tok: FillBlankToken) =>
    setText(spliceText(text, tok.start, tok.end, mode === 'strikeout' ? `[${tok.text}|]` : `[${tok.text}]`));
  const unmarkBlank = (tok: FillBlankToken) => {
    const display = mode === 'strikeout' ? (tok.wrong ?? tok.correct ?? '') : (tok.correct ?? '');
    setText(spliceText(text, tok.start, tok.end, display));
  };
  const setCorrection = (tok: FillBlankToken, value: string) => {
    const wrong = tok.wrong ?? tok.correct ?? '';
    setText(spliceText(text, tok.start, tok.end, `[${wrong}|${value}]`));
  };

  // ── Distractor handlers (word-bank only) ──
  const setDistractor = (i: number, value: string) =>
    onChange({ ...data, distractors: distractors.map((d, idx) => (idx === i ? value : d)) });
  const addDistractor = () => onChange({ ...data, distractors: [...distractors, ''] });
  const removeDistractor = (i: number) => onChange({ ...data, distractors: distractors.filter((_, idx) => idx !== i) });

  return (
    <div className="space-y-4">
      {/* Mode toggle */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Mode</label>
        <div className="flex gap-1.5">
          {([
            { value: 'word_bank' as const, label: 'Word bank', icon: AlignLeft, hint: 'Fill blanks from a word bank' },
            { value: 'strikeout' as const, label: 'Strike out', icon: Strikethrough, hint: 'Tap the wrong word to correct it' },
          ]).map((opt) => {
            const Icon = opt.icon;
            const active = mode === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => onChange({ ...data, mode: opt.value })}
                className={cn(
                  'flex-1 flex items-center justify-center gap-1.5 px-2.5 py-2 text-xs font-semibold rounded-lg border transition-all',
                  active ? 'bg-[#1A3C6E] text-white border-[#1A3C6E]' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400',
                )}
                title={opt.hint}
              >
                <Icon className="w-3.5 h-3.5" />
                {opt.label}
              </button>
            );
          })}
        </div>
        <p className="mt-1 text-[11px] text-gray-400 leading-snug">
          {mode === 'strikeout'
            ? 'Tap a word below to mark it as the wrong word, then enter its correction. Learners tap it to strike it out and reveal the correction.'
            : 'Tap words below to turn them into blanks. Learners fill them from a word bank.'}
        </p>
      </div>

      {/* Instructions */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Instructions (optional)</label>
        <input
          type="text"
          value={data.instructions ?? ''}
          placeholder={mode === 'strikeout' ? 'e.g. Tap the incorrect word to correct it' : 'e.g. Drag each word into the correct blank'}
          onChange={(e) => onChange({ ...data, instructions: e.target.value || undefined })}
          className={inputClass}
        />
      </div>

      {/* Passage text */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Passage</label>
        <textarea
          value={text}
          placeholder={mode === 'strikeout' ? 'The mitochondria is the stomach of the cell.' : 'Water is made of hydrogen and oxygen.'}
          onChange={(e) => setText(e.target.value)}
          rows={3}
          className={`${inputClass} resize-y leading-relaxed`}
        />

        {/* Click-to-select interactive passage */}
        <div className="mt-2">
          <p className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-500 mb-1">
            <MousePointerClick className="w-3 h-3" />
            {mode === 'strikeout' ? 'Tap a word to mark it wrong' : 'Tap a word to make it a blank'}
          </p>
          <div className="rounded-lg border border-gray-200 bg-gray-50/70 px-3 py-2.5 text-sm leading-loose min-h-[2.75rem]">
            {tokens.length === 0 ? (
              <span className="text-gray-400 italic text-xs">Type a sentence above, then tap its words here.</span>
            ) : (
              tokens.map((t, i) => {
                if (t.kind === 'sep') return <span key={i} className="whitespace-pre-wrap text-gray-700">{t.text}</span>;
                if (t.kind === 'word') {
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => markBlank(t)}
                      className="rounded px-1 -mx-0.5 text-gray-700 hover:bg-[#1A3C6E]/10 hover:text-[#1A3C6E] transition-colors"
                      title={mode === 'strikeout' ? 'Mark as the wrong word' : 'Make this a blank'}
                    >
                      {t.text}
                    </button>
                  );
                }
                // marked blank — click to unmark
                const needsCorrection = mode === 'strikeout' && !(t.wrong && t.correct);
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => unmarkBlank(t)}
                    className={cn(
                      'rounded px-1 -mx-0.5 border transition-colors font-medium',
                      mode === 'strikeout'
                        ? cn('line-through', needsCorrection
                            ? 'bg-amber-100 border-amber-300 text-amber-800'
                            : 'bg-rose-100 border-rose-300 text-rose-800')
                        : 'bg-emerald-100 border-emerald-300 text-emerald-800',
                    )}
                    title="Tap to unmark"
                  >
                    {mode === 'strikeout' ? (t.wrong ?? t.correct) : t.correct}
                  </button>
                );
              })
            )}
          </div>
          <p className="mt-1 text-[10px] text-gray-400 leading-snug">
            You can also wrap words in <code className="px-1 rounded bg-gray-100 text-gray-600">[brackets]</code> directly
            {mode === 'strikeout' ? <> (use <code className="px-1 rounded bg-gray-100 text-gray-600">[wrong|correct]</code>).</> : '.'}
          </p>
        </div>

        {/* Strikeout: corrections list */}
        {mode === 'strikeout' && blanks.length > 0 && (
          <div className="mt-3 space-y-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Corrections ({blanks.length})</p>
            {blanks.map((t, i) => {
              const wrong = t.wrong ?? t.correct ?? '';
              const correct = t.wrong ? (t.correct ?? '') : '';
              return (
                <div key={i} className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 shrink-0">
                    <span className="text-[9px] font-bold text-gray-400">{i + 1}</span>
                    <span className="line-through text-rose-600 text-xs font-medium max-w-[7rem] truncate">{wrong}</span>
                    <span className="text-gray-300">→</span>
                  </span>
                  <input
                    type="text"
                    value={correct}
                    placeholder="correct word"
                    onChange={(e) => setCorrection(t, e.target.value)}
                    className={cn(inputClass, 'flex-1', !correct && 'ring-1 ring-amber-300')}
                  />
                </div>
              );
            })}
            {blanks.some((t) => !(t.wrong && t.correct)) && (
              <p className="text-[10px] text-amber-700">Enter a correction for each marked word so it can be revealed.</p>
            )}
          </div>
        )}

        {/* Word-bank: detected blanks preview */}
        {mode === 'word_bank' && (
          <div className="mt-2">
            {blanks.length === 0 ? (
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1.5">
                No blanks yet — tap a word above (or wrap one in <code className="px-1 rounded bg-amber-100">[brackets]</code>).
              </p>
            ) : (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Blanks ({blanks.length}):</span>
                {blanks.map((t, i) => (
                  <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-xs font-medium text-emerald-700">
                    <span className="text-[9px] font-bold opacity-60">{i + 1}</span>{t.correct}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Distractors (word-bank only) */}
      {mode === 'word_bank' && (
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
      )}

      {/* Options */}
      <div className="space-y-2.5">
        {mode === 'word_bank' && (
          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-xs text-gray-600">Shuffle the word bank</span>
            <input
              type="checkbox"
              checked={data.shuffle ?? true}
              onChange={(e) => onChange({ ...data, shuffle: e.target.checked })}
              className="accent-[#1A3C6E] w-4 h-4"
            />
          </label>
        )}
        <label className="flex items-center justify-between cursor-pointer">
          <span className="text-xs text-gray-600">Show feedback{mode === 'strikeout' ? ' when complete' : ' on check'}</span>
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
            <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
              {mode === 'strikeout' ? 'Completion message' : 'Correct message'}
            </label>
            <input
              type="text"
              value={data.feedback_correct ?? ''}
              placeholder={mode === 'strikeout' ? 'Nice — every correction found!' : 'All blanks correct — nice work!'}
              onChange={(e) => onChange({ ...data, feedback_correct: e.target.value || undefined })}
              className={inputClass}
            />
          </div>
          {mode === 'word_bank' && (
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
          )}
        </div>
      )}

      {/* Appearance */}
      <div className="space-y-2 pt-1 border-t border-gray-100">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Appearance</p>
        {([
          { key: 'accent_color', label: 'Accent', fallback: '#1E3A5F', hint: mode === 'strikeout' ? 'Revealed correction + highlights' : 'Highlights + Check Answer button' },
          { key: 'chip_color', label: 'Word chip', fallback: '#FFFFFF', hint: 'Bank words (blank = glass)' },
          { key: 'text_color', label: 'Text', fallback: '#1E293B', hint: 'Passage + chip text colour' },
        ] as const)
          .filter((row) => !(mode === 'strikeout' && row.key === 'chip_color'))
          .map((row) => {
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
