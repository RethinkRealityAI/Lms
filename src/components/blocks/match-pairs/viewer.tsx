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
import type { MatchPairsData, MatchSide } from '@/lib/content/blocks/match-pairs/schema';
import { normalizeMatchPairsData } from '@/lib/content/blocks/match-pairs/schema';
import { BLOCK_CONTENT_SHELL } from '@/lib/content/block-surface-tokens';

// Cards grow to fit their content but never collapse below this — keeps the two
// columns roughly aligned while letting long text wrap instead of overflowing.
const CARD_MIN_H = 'min-h-[4.25rem]';
const TITLE = 'text-[10px] font-bold uppercase tracking-wider text-[color:var(--surface-text-muted)] px-1 mb-1.5';

function isImg(s: MatchSide) { return s.type === 'image' && !!s.image_url; }

/** Resolved colour theme for the cards (props → glass defaults). */
interface MatchTheme {
  accent: string;
  itemStyle: CSSProperties;
  matchStyle: CSSProperties;
  textStyle: CSSProperties;
  usesGlassItem: boolean;
  usesGlassMatch: boolean;
  // Concrete (non-CSS-var) styles for the drag overlay, which is portaled to <body>
  // and therefore can't read the surface's --surface-* CSS variables.
  overlayItemStyle: CSSProperties;
  overlayTextStyle: CSSProperties;
}

function CardInner({ side, compact, textStyle }: { side: MatchSide; compact?: boolean; textStyle: CSSProperties }) {
  if (isImg(side)) {
    return <img src={side.image_url} alt={side.text ?? ''} className={cn('object-contain', compact ? 'max-h-10 max-w-full' : 'max-h-full max-w-full')} />;
  }
  return (
    <span
      style={textStyle}
      className={cn('font-semibold text-center break-words hyphens-auto leading-snug', compact ? 'text-[11px]' : 'text-sm')}
    >
      {side.text || '—'}
    </span>
  );
}

function itemCardClass(theme: MatchTheme, size: 'full' | 'thumb', extra?: string) {
  const thumb = size === 'thumb';
  return cn(
    'rounded-lg border flex items-center justify-center overflow-hidden transition-all',
    theme.usesGlassItem && 'backdrop-blur-md',
    thumb ? 'max-w-[46%] min-w-0 shrink-0 px-2 py-1.5 self-stretch' : cn('w-full p-2', CARD_MIN_H),
    extra,
  );
}

// Presentational item card — used by the drag overlay (no dnd id, no listeners).
// Uses CONCRETE colours (not surface CSS vars) because it's portaled to <body>.
function ItemCard({ side, theme, size = 'full' }: { side: MatchSide; theme: MatchTheme; size?: 'full' | 'thumb' }) {
  const thumb = size === 'thumb';
  return (
    <div
      style={theme.overlayItemStyle}
      className={cn(
        'rounded-lg border flex items-center justify-center overflow-hidden cursor-grabbing shadow-2xl scale-105 ring-2 ring-black/5',
        thumb ? 'max-w-[46%] min-w-0 shrink-0 px-2 py-1.5 self-stretch' : cn('w-full p-2', CARD_MIN_H),
      )}
    >
      <CardInner side={side} compact={thumb} textStyle={theme.overlayTextStyle} />
    </div>
  );
}

// Draggable item (lives in the ITEMS column, or docked inside a MATCHES card).
// Also TAP-selectable: `onTap` picks it up without dragging (mouse click, touch
// tap, or Enter/Space) so the block is completable without a drag gesture.
function DraggableItem({ id, side, theme, size = 'full', onTap, selected }: {
  id: string; side: MatchSide; theme: MatchTheme; size?: 'full' | 'thumb';
  onTap?: () => void; selected?: boolean;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: `p-${id}`, data: { promptId: id } });
  return (
    <div
      ref={setNodeRef} {...listeners} {...attributes}
      onClick={onTap}
      onKeyDown={onTap ? (e) => { if (e.key === 'Enter') { e.preventDefault(); onTap(); } } : undefined}
      aria-pressed={onTap ? !!selected : undefined}
      style={{ ...theme.itemStyle, ...(selected ? { boxShadow: `0 0 0 2px ${theme.accent}` } : null) }}
      className={itemCardClass(theme, size, cn('touch-none cursor-grab active:cursor-grabbing',
        isDragging ? 'opacity-30 scale-95' : 'shadow-sm hover:brightness-105'))}
    >
      <CardInner side={side} compact={size === 'thumb'} textStyle={theme.textStyle} />
    </div>
  );
}

// A MATCHES card = a drop target. When matched, the item docks at the left.
function MatchCard({ answerId, answer, dockedSide, dockedId, state, theme, onTap, highlight }: {
  answerId: string; answer: MatchSide; dockedSide: MatchSide | null; dockedId: string | null;
  state: 'correct' | 'wrong' | null; theme: MatchTheme; onTap?: () => void; highlight?: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `a-${answerId}`, data: { answerId } });
  return (
    <div
      ref={setNodeRef}
      onClick={onTap}
      onKeyDown={onTap ? (e) => { if (e.key === 'Enter') { e.preventDefault(); onTap(); } } : undefined}
      role={onTap ? 'button' : undefined}
      tabIndex={onTap && !state ? 0 : undefined}
      style={state ? undefined : { ...theme.matchStyle, ...(highlight ? { boxShadow: `0 0 0 2px ${theme.accent}` } : null) }}
      className={cn(
        'rounded-xl border-2 flex items-center gap-2 overflow-hidden p-2', CARD_MIN_H,
        onTap && !state && 'cursor-pointer',
        theme.usesGlassMatch && !state && 'backdrop-blur-md',
        isOver && !state && 'ring-2 ring-offset-0 brightness-105',
        state === 'correct' ? 'border-green-400 bg-green-50' : state === 'wrong' ? 'border-red-400 bg-red-50' : '',
      )}
    >
      {dockedSide && dockedId
        ? <DraggableItem id={dockedId} side={dockedSide} size="thumb" theme={theme} />
        : <span className="shrink-0 w-7 h-7 rounded-lg border border-dashed border-[color:var(--surface-inset-border)] text-[color:var(--surface-text-muted)] flex items-center justify-center text-xs" aria-hidden>?</span>}
      <div className="flex-1 min-w-0 flex items-center justify-center">
        <CardInner side={answer} textStyle={theme.textStyle} />
      </div>
      {state === 'correct' && <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />}
      {state === 'wrong' && <XCircle className="w-4 h-4 text-red-500 shrink-0" />}
    </div>
  );
}

export default function MatchPairsViewer({ data: rawData, onComplete }: BlockViewerProps<MatchPairsData>) {
  const data = useMemo(() => normalizeMatchPairsData(rawData), [rawData]);
  const pairs = useMemo(() => data.pairs.filter(p => p?.id), [data.pairs]);
  const promptSide = data.prompt_side ?? 'left';
  const showFeedback = data.show_feedback ?? true;

  // Portal the drag overlay to <body> so a transformed ancestor (react-grid-layout
  // items use CSS transforms) doesn't break the overlay's fixed positioning — that
  // was making the dragged card appear offset below the pointer/finger.
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  // Resolve the colour theme (props win; otherwise frosted-glass surface tokens).
  const theme = useMemo<MatchTheme>(() => {
    const accent = (data.accent_color || '').trim() || '#1E3A5F';
    const textColor = (data.text_color || '').trim();
    const textStyle: CSSProperties = textColor ? { color: textColor } : { color: 'var(--surface-text)' };
    const itemColor = (data.item_color || '').trim();
    const matchColor = (data.match_color || '').trim();
    const itemStyle: CSSProperties = itemColor
      ? { backgroundColor: itemColor, borderColor: 'rgba(0,0,0,0.08)' }
      : { backgroundColor: 'var(--surface-chip-bg)', borderColor: 'var(--surface-chip-border)' };
    const matchStyle: CSSProperties = matchColor
      ? { backgroundColor: matchColor, borderColor: 'rgba(0,0,0,0.08)' }
      : { backgroundColor: 'var(--surface-inset-bg)', borderColor: 'var(--surface-inset-border)' };
    // Overlay is portaled to <body> (no surface vars) → fall back to a solid white
    // card with dark text that reads on any slide background.
    const overlayItemStyle: CSSProperties = itemColor
      ? { backgroundColor: itemColor, borderColor: 'rgba(0,0,0,0.12)' }
      : { backgroundColor: '#ffffff', borderColor: 'rgba(0,0,0,0.12)' };
    const overlayTextStyle: CSSProperties = { color: textColor || '#1e293b' };
    return {
      accent, itemStyle, matchStyle, textStyle,
      usesGlassItem: !itemColor, usesGlassMatch: !matchColor,
      overlayItemStyle, overlayTextStyle,
    };
  }, [data.accent_color, data.item_color, data.match_color, data.text_color]);

  const order = useMemo(() => {
    const ids = pairs.map(p => p.id);
    if (!data.shuffle) return ids;
    const a = [...ids];
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pairs.length, data.shuffle]);

  const [placed, setPlaced] = useState<Record<string, string>>({}); // answerId -> promptId
  const [submitted, setSubmitted] = useState(false);
  const [activePromptId, setActivePromptId] = useState<string | null>(null);
  // Tap-to-match: the item the learner has "picked up" by tapping (no drag needed).
  const [selectedPromptId, setSelectedPromptId] = useState<string | null>(null);
  const firedRef = useRef(false);

  const pairById = useMemo(() => Object.fromEntries(pairs.map(p => [p.id, p])), [pairs]);
  const placedPromptIds = useMemo(() => new Set(Object.values(placed)), [placed]);

  const allPlaced = pairs.length > 0 && Object.keys(placed).length === pairs.length;
  const correctCount = pairs.filter(p => placed[p.id] === p.id).length;
  const allCorrect = submitted && correctCount === pairs.length;

  useEffect(() => { if (allCorrect && !firedRef.current) { firedRef.current = true; onComplete?.(); } }, [allCorrect, onComplete]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 120, tolerance: 6 } }),
    useSensor(KeyboardSensor),
  );

  function handleDragStart(e: DragStartEvent) { setActivePromptId((e.active.data.current?.promptId as string) ?? null); }
  function handleDragEnd(e: DragEndEvent) {
    setActivePromptId(null);
    if (submitted) return;
    const promptId = e.active.data.current?.promptId as string | undefined;
    if (!promptId) return;
    const overId = e.over?.id as string | undefined;
    setPlaced(prev => {
      const next = { ...prev };
      for (const k of Object.keys(next)) if (next[k] === promptId) delete next[k]; // pull from wherever it sat
      if (overId?.startsWith('a-')) next[overId.slice(2)] = promptId;               // dock onto this match
      return next;                                                                   // 'bank' / null → unmatched
    });
  }

  // Tap an item to pick it up / put it down (no drag).
  function tapItem(promptId: string) {
    if (submitted) return;
    setSelectedPromptId(prev => (prev === promptId ? null : promptId));
  }
  // Tap a match card: dock the picked-up item here, or (with nothing picked up)
  // send the card's docked item back to the bank.
  function tapMatch(answerId: string) {
    if (submitted) return;
    setPlaced(prev => {
      const next = { ...prev };
      if (selectedPromptId) {
        for (const k of Object.keys(next)) if (next[k] === selectedPromptId) delete next[k];
        next[answerId] = selectedPromptId;
      } else if (next[answerId]) {
        delete next[answerId];
      }
      return next;
    });
    setSelectedPromptId(null);
  }

  function reset() { setPlaced({}); setSubmitted(false); setSelectedPromptId(null); firedRef.current = false; }

  if (pairs.length === 0) {
    return <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-400">Add match pairs in the editor.</div>;
  }

  const ItemsCol = (
    <div>
      <p className={TITLE}>Items</p>
      <BankZone accent={theme.accent}>
        {pairs.map(p => {
          const isPlaced = placedPromptIds.has(p.id);
          // Placed items are shown faded & static here — the draggable copy lives in its match card (unique dnd id).
          return isPlaced
            ? <div key={p.id} style={theme.itemStyle} className={cn('rounded-lg border flex items-center justify-center overflow-hidden p-2 opacity-30', 'w-full', CARD_MIN_H)}>
                <CardInner side={p.prompt} textStyle={theme.textStyle} />
              </div>
            : <DraggableItem key={p.id} id={p.id} side={p.prompt} theme={theme}
                onTap={() => tapItem(p.id)} selected={selectedPromptId === p.id} />;
        })}
      </BankZone>
    </div>
  );

  const MatchesCol = (
    <div>
      <p className={TITLE}>Matches</p>
      <div className="p-2 space-y-2">
        {order.map(aid => {
          const promptId = placed[aid] ?? null;
          const state = submitted && promptId ? (promptId === aid ? 'correct' : 'wrong') : null;
          return (
            <MatchCard
              key={aid}
              answerId={aid}
              answer={pairById[aid].match}
              dockedSide={promptId ? pairById[promptId].prompt : null}
              dockedId={promptId}
              state={state}
              theme={theme}
              onTap={() => tapMatch(aid)}
              highlight={!!selectedPromptId && !promptId}
            />
          );
        })}
      </div>
    </div>
  );

  return (
    <div className={cn(BLOCK_CONTENT_SHELL, 'space-y-3')}>
      <p className="text-sm font-semibold text-[color:var(--surface-text)]">{data.instructions || 'Tap an item then tap its match — or drag it across.'}</p>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-2 gap-2.5 sm:gap-3 items-start">
          {promptSide === 'left' ? <>{ItemsCol}{MatchesCol}</> : <>{MatchesCol}{ItemsCol}</>}
        </div>
        {mounted && createPortal(
          <DragOverlay dropAnimation={null} zIndex={9999}>
            {activePromptId ? <ItemCard side={pairById[activePromptId]?.prompt ?? { type: 'text' }} theme={theme} /> : null}
          </DragOverlay>,
          document.body,
        )}
      </DndContext>

      {submitted && showFeedback && (
        <div className={cn('flex items-center gap-2 text-sm font-medium rounded-lg px-3 py-2.5',
          allCorrect ? 'bg-green-100 text-green-800' : 'bg-amber-50 text-amber-800')}>
          {allCorrect ? <><CheckCircle className="h-4 w-4" /> All matched correctly!</>
            : <><XCircle className="h-4 w-4" /> {correctCount} of {pairs.length} correct — fix the red ones.</>}
        </div>
      )}

      <div className="flex gap-2">
        {!submitted ? (
          <button onClick={() => setSubmitted(true)} disabled={!allPlaced}
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

// The ITEMS column container (also a drop zone — drag a docked item back here to unmatch).
function BankZone({ children, accent }: { children: React.ReactNode; accent: string }) {
  const { setNodeRef, isOver } = useDroppable({ id: 'bank' });
  return (
    <div ref={setNodeRef}
      style={isOver ? { borderColor: accent } : undefined}
      className={cn('p-2 space-y-2 rounded-xl border-2 transition-all',
        isOver ? 'bg-black/[0.03]' : 'border-[color:var(--surface-inset-border)] bg-[color:var(--surface-inset-bg)]')}>
      {children}
    </div>
  );
}
