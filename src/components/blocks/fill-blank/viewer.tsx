'use client';

import React, { useMemo, useRef, useState, useEffect, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import {
  DndContext, DragOverlay, PointerSensor, TouchSensor, KeyboardSensor,
  useSensor, useSensors, useDraggable, useDroppable, closestCenter,
  type DragStartEvent, type DragEndEvent,
} from '@dnd-kit/core';
import { CheckCircle, XCircle, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { BlockViewerProps } from '@/lib/content/block-registry';
import type { FillBlankData } from '@/lib/content/blocks/fill-blank/schema';
import { parseFillBlank, getFillBlankAnswers } from '@/lib/content/blocks/fill-blank/schema';
import { BLOCK_CONTENT_SHELL, SURFACE_ACTIONS } from '@/lib/content/block-surface-tokens';

interface Chip { id: string; value: string }

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

/** Resolved colour theme (props → frosted-glass surface-token defaults). */
interface FillTheme {
  accent: string;
  chipStyle: CSSProperties;
  textStyle: CSSProperties;
  usesGlassChip: boolean;
  /** Concrete (non-CSS-var) chip styles for the portaled drag overlay. */
  overlayChipStyle: CSSProperties;
  overlayTextStyle: CSSProperties;
}

const CHIP_BASE = 'rounded-lg border px-2.5 py-1.5 text-sm font-semibold leading-snug whitespace-normal break-words text-center transition-all';

// A word-bank chip: draggable AND tappable (tap-to-select for mobile / a11y).
function BankChip({ chip, theme, selected, onSelect }: {
  chip: Chip; theme: FillTheme; selected: boolean; onSelect: () => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: `c-${chip.id}`, data: { chipId: chip.id } });
  return (
    <button
      ref={setNodeRef} {...listeners} {...attributes}
      type="button"
      onClick={onSelect}
      style={selected ? { backgroundColor: theme.accent, borderColor: theme.accent } : theme.chipStyle}
      className={cn(
        CHIP_BASE, 'touch-none cursor-grab active:cursor-grabbing',
        theme.usesGlassChip && !selected && 'backdrop-blur-md',
        selected ? 'text-white shadow-md scale-105' : 'shadow-sm hover:brightness-105',
        isDragging && 'opacity-30 scale-95',
      )}
    >
      <span style={selected ? undefined : theme.textStyle}>{chip.value}</span>
    </button>
  );
}

// An inline blank: a drop target that also responds to tap-to-place / tap-to-clear.
function Blank({ index, filled, theme, state, isTargeting, hasSelection, disabled, onPlace, onClear }: {
  index: number; filled: Chip | null; theme: FillTheme;
  state: 'correct' | 'wrong' | null; isTargeting: boolean; hasSelection: boolean; disabled: boolean;
  onPlace: () => void; onClear: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `blank-${index}`, data: { blankIndex: index } });
  // useDraggable is always called (hooks rule); it's only wired to a filled chip.
  const draggable = useDraggable({ id: filled ? `c-${filled.id}` : `blank-empty-${index}`, data: { chipId: filled?.id }, disabled: !filled || disabled });

  // One click handler for the whole blank: a selected word lands here (replacing
  // anything already in it); otherwise clicking a filled blank empties it.
  function handleClick(e: React.MouseEvent) {
    e.stopPropagation();
    if (disabled) return;
    if (hasSelection) onPlace();
    else if (filled) onClear();
  }

  return (
    <span
      ref={setNodeRef}
      onClick={handleClick}
      role="button"
      tabIndex={disabled ? -1 : 0}
      className={cn(
        'inline-flex items-center justify-center align-middle mx-0.5 my-0.5 min-h-[2rem] rounded-lg border-2 px-1.5 transition-all',
        !disabled && (hasSelection || filled) && 'cursor-pointer',
        filled ? 'min-w-[3rem]' : 'min-w-[4.5rem]',
        state === 'correct' ? 'border-green-400 bg-green-400/10'
          : state === 'wrong' ? 'border-red-400 bg-red-400/10'
          : filled ? 'border-transparent' : 'border-dashed border-[color:var(--surface-inset-border)]',
      )}
      style={(isOver || isTargeting) && !state ? { borderColor: theme.accent, backgroundColor: `${theme.accent}14` } : undefined}
    >
      {filled ? (
        <span
          ref={draggable.setNodeRef} {...draggable.listeners} {...draggable.attributes}
          style={theme.chipStyle}
          className={cn(
            CHIP_BASE, 'border-transparent touch-none',
            disabled ? '' : 'cursor-grab active:cursor-grabbing',
            theme.usesGlassChip && 'backdrop-blur-md',
            draggable.isDragging && 'opacity-30',
          )}
        >
          <span style={theme.textStyle}>{filled.value}</span>
        </span>
      ) : (
        <span className="text-xs font-bold text-[color:var(--surface-text-subtle)] select-none">{index + 1}</span>
      )}
      {state === 'correct' && <CheckCircle className="w-3.5 h-3.5 text-green-500 ml-1 shrink-0" />}
      {state === 'wrong' && <XCircle className="w-3.5 h-3.5 text-red-500 ml-1 shrink-0" />}
    </span>
  );
}

export default function FillBlankViewer({ data, onComplete }: BlockViewerProps<FillBlankData>) {
  const text = data.text ?? '';
  const segments = useMemo(() => parseFillBlank(text), [text]);
  const answers = useMemo(() => getFillBlankAnswers(text), [text]);
  const showFeedback = data.show_feedback ?? true;

  const theme = useMemo<FillTheme>(() => {
    const accent = (data.accent_color || '').trim() || '#1E3A5F';
    const textColor = (data.text_color || '').trim();
    const chipColor = (data.chip_color || '').trim();
    const textStyle: CSSProperties = textColor ? { color: textColor } : { color: 'var(--surface-text)' };
    const chipStyle: CSSProperties = chipColor
      ? { backgroundColor: chipColor, borderColor: 'rgba(0,0,0,0.08)' }
      : { backgroundColor: 'var(--surface-chip-bg)', borderColor: 'var(--surface-chip-border)' };
    return {
      accent, chipStyle, textStyle, usesGlassChip: !chipColor,
      overlayChipStyle: chipColor ? { backgroundColor: chipColor, borderColor: 'rgba(0,0,0,0.12)' } : { backgroundColor: '#ffffff', borderColor: 'rgba(0,0,0,0.12)' },
      overlayTextStyle: { color: textColor || '#1e293b' },
    };
  }, [data.accent_color, data.chip_color, data.text_color]);

  // Word bank = one chip per blank answer + distractors. Rebuilt when the set of
  // words changes (so the editor preview stays in sync while authoring) but stable
  // for a student, whose data never changes — so the shuffle happens once for them.
  const distractorWords = (data.distractors ?? []).filter(Boolean);
  const chipsKey = `${answers.join('')}|${distractorWords.join('')}|${data.shuffle !== false}`;
  const allChips = useMemo<Chip[]>(() => {
    const base: Chip[] = [
      ...answers.map((value, i) => ({ id: `a${i}`, value })),
      ...distractorWords.map((value, i) => ({ id: `d${i}`, value })),
    ];
    return data.shuffle === false ? base : shuffle(base);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chipsKey]);

  const [placements, setPlacements] = useState<Record<number, string>>({}); // blankIndex -> chipId
  const [selectedChipId, setSelectedChipId] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [activeChipId, setActiveChipId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const firedRef = useRef(false);
  useEffect(() => { setMounted(true); }, []);

  const chipById = useMemo(() => Object.fromEntries(allChips.map(c => [c.id, c])), [allChips]);
  const usedChipIds = useMemo(() => new Set(Object.values(placements)), [placements]);
  const bankChips = useMemo(() => allChips.filter(c => !usedChipIds.has(c.id)), [allChips, usedChipIds]);

  const allFilled = answers.length > 0 && answers.every((_, i) => placements[i] !== undefined);
  const correctCount = answers.filter((ans, i) => {
    const chip = placements[i] != null ? chipById[placements[i]] : null;
    return chip?.value === ans;
  }).length;
  const allCorrect = submitted && correctCount === answers.length;

  useEffect(() => { if (allCorrect && !firedRef.current) { firedRef.current = true; onComplete?.(); } }, [allCorrect, onComplete]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 120, tolerance: 6 } }),
    useSensor(KeyboardSensor),
  );

  function place(blankIndex: number, chipId: string) {
    setPlacements(prev => {
      const next: Record<number, string> = {};
      // Drop the chip from any blank it currently occupies (move, not copy).
      for (const [k, v] of Object.entries(prev)) if (v !== chipId) next[Number(k)] = v;
      next[blankIndex] = chipId; // overwrites any chip already in this blank → it returns to the bank
      return next;
    });
  }
  function clearBlank(blankIndex: number) {
    setPlacements(prev => {
      const next = { ...prev };
      delete next[blankIndex];
      return next;
    });
  }

  function handleDragStart(e: DragStartEvent) { setActiveChipId((e.active.data.current?.chipId as string) ?? null); }
  function handleDragEnd(e: DragEndEvent) {
    setActiveChipId(null);
    if (submitted) return;
    const chipId = e.active.data.current?.chipId as string | undefined;
    if (!chipId) return;
    const overId = e.over?.id as string | undefined;
    if (overId?.startsWith('blank-') && /^blank-\d+$/.test(overId)) {
      place(Number(overId.slice('blank-'.length)), chipId);
    } else {
      // Dropped on the bank / nowhere → unplace it.
      setPlacements(prev => {
        const next: Record<number, string> = {};
        for (const [k, v] of Object.entries(prev)) if (v !== chipId) next[Number(k)] = v;
        return next;
      });
    }
    setSelectedChipId(null);
  }

  // Tap flow: select a chip, then tap a blank.
  function tapBlank(blankIndex: number) {
    if (submitted || !selectedChipId) return;
    place(blankIndex, selectedChipId);
    setSelectedChipId(null);
  }

  function reset() {
    setPlacements({});
    setSelectedChipId(null);
    setSubmitted(false);
    firedRef.current = false;
  }

  if (answers.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-400">
        Add a passage with at least one [blank] in the editor.
      </div>
    );
  }

  const isTargeting = !submitted && !!selectedChipId;

  return (
    <div className={cn(BLOCK_CONTENT_SHELL, 'gap-4')}>
      {data.instructions && (
        <p className="text-sm font-semibold text-[color:var(--surface-text)]">{data.instructions}</p>
      )}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        {/* Passage with inline blanks */}
        <p className="text-base sm:text-lg leading-loose whitespace-pre-wrap text-[color:var(--surface-text)]" style={theme.textStyle}>
          {segments.map((seg, i) => {
            if (seg.kind === 'text') return <span key={i}>{seg.value}</span>;
            const bi = seg.blankIndex!;
            const chip = placements[bi] != null ? chipById[placements[bi]] : null;
            const state = submitted && chip ? (chip.value === answers[bi] ? 'correct' : 'wrong') : null;
            return (
              <Blank
                key={i}
                index={bi}
                filled={chip ?? null}
                theme={theme}
                state={state}
                isTargeting={isTargeting}
                hasSelection={isTargeting}
                disabled={submitted}
                onPlace={() => tapBlank(bi)}
                onClear={() => clearBlank(bi)}
              />
            );
          })}
        </p>

        {/* Word bank */}
        <div className="space-y-1.5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[color:var(--surface-text-subtle)]">
            Word bank{bankChips.length === 0 ? ' — all placed' : ''}
          </p>
          <div className="flex flex-wrap gap-2 rounded-xl border p-3 min-h-[3.25rem] bg-[color:var(--surface-inset-bg)] border-[color:var(--surface-inset-border)]">
            {bankChips.length === 0 && (
              <span className="text-xs italic text-[color:var(--surface-text-muted)] self-center">Every word is placed — check your answer or drag one back.</span>
            )}
            {bankChips.map(chip => (
              <BankChip
                key={chip.id}
                chip={chip}
                theme={theme}
                selected={selectedChipId === chip.id}
                onSelect={() => !submitted && setSelectedChipId(prev => (prev === chip.id ? null : chip.id))}
              />
            ))}
          </div>
          {isTargeting && (
            <p className="text-xs text-[color:var(--surface-text-muted)]">Now tap a blank to drop “{chipById[selectedChipId!]?.value}”.</p>
          )}
        </div>

        {mounted && createPortal(
          <DragOverlay dropAnimation={null} zIndex={9999}>
            {activeChipId ? (
              <div style={theme.overlayChipStyle} className={cn(CHIP_BASE, 'cursor-grabbing shadow-2xl scale-105 ring-2 ring-black/5')}>
                <span style={theme.overlayTextStyle}>{chipById[activeChipId]?.value}</span>
              </div>
            ) : null}
          </DragOverlay>,
          document.body,
        )}
      </DndContext>

      {submitted && showFeedback && (
        <div className={cn('flex items-start gap-2 text-sm font-medium rounded-lg px-3 py-2.5',
          allCorrect ? 'bg-green-100 text-green-800' : 'bg-amber-50 text-amber-800')}>
          {allCorrect
            ? <><CheckCircle className="h-4 w-4 mt-0.5 shrink-0" /><span>{data.feedback_correct || 'All blanks correct — nice work!'}</span></>
            : <><XCircle className="h-4 w-4 mt-0.5 shrink-0" /><span>{data.feedback_incorrect || `${correctCount} of ${answers.length} correct — fix the red ones and try again.`}</span></>}
        </div>
      )}

      <div className={cn(SURFACE_ACTIONS, 'flex-row flex-wrap')}>
        {!submitted ? (
          <button onClick={() => setSubmitted(true)} disabled={!allFilled}
            style={{ backgroundColor: theme.accent }}
            className="px-4 py-2 text-sm font-semibold text-white rounded-lg shadow-sm hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
            Check Answer
          </button>
        ) : !allCorrect ? (
          <button onClick={() => setSubmitted(false)}
            style={{ borderColor: theme.accent, color: theme.accent }}
            className="px-4 py-2 text-sm font-semibold border-2 rounded-lg hover:bg-black/5 transition-colors">
            Try Again
          </button>
        ) : null}
        <button onClick={reset}
          className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold rounded-lg border-2 border-[color:var(--surface-inset-border)] bg-[color:var(--surface-chip-bg)] text-[color:var(--surface-text)] hover:brightness-110 active:scale-95 transition-all">
          <RotateCcw className="w-3.5 h-3.5" /> Reset
        </button>
      </div>
    </div>
  );
}
