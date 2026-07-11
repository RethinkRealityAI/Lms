'use client';

import { useState, useRef, useEffect, useMemo, useCallback, type CSSProperties } from 'react';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, RotateCcw, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import type { BlockViewerProps } from '@/lib/content/block-registry';
import type { QuizInlineData } from '@/lib/content/blocks/quiz-inline/schema';
import {
  BLOCK_CONTENT_SHELL,
  SURFACE_ACTIONS,
  SURFACE_HEADING,
  surfaceFeedbackClass,
  surfaceInsetClass,
  surfaceLabelClass,
  surfaceMutedClass,
  surfaceOptionClass,
  surfacePoolClass,
  surfaceChipClass,
  surfacePrimaryButtonClass,
  surfaceOutlineButtonClass,
} from '@/lib/content/block-surface-tokens';
import { formatQuizText } from '@/lib/content/format-quiz-text';

/** Called by each sub-viewer at the moment correctness is determined. */
type OnAnswered = (answer: unknown, isCorrect: boolean) => void;

export default function QuizInlineViewer({ data, block, context, onComplete }: BlockViewerProps<QuizInlineData>) {
  const [submitted, setSubmitted] = useState(false);

  // Persist the student's answer to quiz_block_responses (fire-and-forget).
  // Skipped entirely in preview/editor mode or when scoping context is missing.
  const blockId = block?.id;
  const questionType = data.question_type;
  const persistAnswer = useCallback<OnAnswered>((answer, isCorrect) => {
    if (!context || context.previewMode || context.editing) return;
    const { courseId, lessonId, institutionId } = context;
    if (!courseId || !lessonId || !institutionId || !blockId) return;
    void (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: existing } = await supabase
        .from('quiz_block_responses')
        .select('attempt_count, is_correct')
        .eq('block_id', blockId)
        .eq('user_id', user.id)
        .maybeSingle();
      // Never DOWNGRADE a previously-correct answer to incorrect on a later re-attempt.
      // The lesson-completion gate (correctQuizBlocks) and the certificate treat
      // "answered correctly at least once" as satisfied and never revert; if the
      // persisted flag downgraded, a learner who passed then re-explored the quiz
      // would be silently blocked from their certificate (progress shows 100%, but
      // issue_course_certificate refuses on the stale is_correct=false).
      const stickyCorrect = isCorrect || existing?.is_correct === true;
      const { error } = await supabase
        .from('quiz_block_responses')
        .upsert({
          institution_id: institutionId,
          course_id: courseId,
          lesson_id: lessonId,
          block_id: blockId,
          user_id: user.id,
          response: { question_type: questionType, answer },
          is_correct: stickyCorrect,
          attempt_count: ((existing?.attempt_count as number | undefined) ?? 0) + 1,
          answered_at: new Date().toISOString(),
        }, { onConflict: 'block_id,user_id' });
      if (error) throw error;
    })().catch(console.error);
  }, [context, blockId, questionType]);

  if (data.question_type === 'swipe') {
    return <SwipeQuizViewer data={data} onCorrect={() => onComplete?.()} onAnswered={persistAnswer} />;
  }

  if (data.question_type === 'multiple_choice' || data.question_type === 'true_false') {
    return (
      <MultipleChoiceViewer
        data={data}
        submitted={submitted}
        onSubmit={() => setSubmitted(true)}
        onRetry={() => setSubmitted(false)}
        onCorrect={() => onComplete?.()}
        onAnswered={persistAnswer}
      />
    );
  }

  if (data.question_type === 'categorize' && data.categories) {
    return <CategorizeViewer data={data} onCorrect={() => onComplete?.()} onAnswered={persistAnswer} />;
  }

  if (data.question_type === 'select_all') {
    return <SelectAllViewer data={data} onCorrect={() => onComplete?.()} onAnswered={persistAnswer} />;
  }

  return (
    <div className="rounded-lg border p-4 text-sm text-muted-foreground">
      Interactive question (type: {data.question_type})
    </div>
  );
}

// ─── Multiple Choice / True-False ────────────────────────────────────────────

function MultipleChoiceViewer({
  data,
  submitted,
  onSubmit,
  onRetry,
  onCorrect,
  onAnswered,
}: {
  data: QuizInlineData;
  submitted: boolean;
  onSubmit: () => void;
  onRetry: () => void;
  onCorrect?: () => void;
  onAnswered?: OnAnswered;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const isCorrect = submitted && selected === data.correct_answer;
  const correctFiredRef = useRef(false);

  useEffect(() => {
    if (isCorrect && !correctFiredRef.current) {
      correctFiredRef.current = true;
      onCorrect?.();
    }
  }, [isCorrect, onCorrect]);

  const handleRetry = () => {
    setSelected(null);
    onRetry();
  };

  return (
    <div className={BLOCK_CONTENT_SHELL}>
      {data.question && (
        <p className={SURFACE_HEADING}>{formatQuizText(data.question)}</p>
      )}

      <div className="flex flex-col gap-2.5 sm:gap-3">
        {(data.options ?? []).map((option, i) => {
          const isSelected = selected === option;
          const isCorrectOption = option === data.correct_answer;
          const showCorrect = submitted && isCorrectOption && isSelected;
          const showWrong = submitted && isSelected && !isCorrectOption;

          return (
            <button
              key={i}
              type="button"
              disabled={submitted}
              onClick={() => !submitted && setSelected(option)}
              className={surfaceOptionClass({
                submitted,
                isSelected: !submitted && isSelected,
                isCorrect: showCorrect,
                isWrong: showWrong,
                dimmed: submitted && !isSelected,
              })}
            >
              <span className="flex items-center justify-between gap-2">
                <span>{String.fromCharCode(65 + i)}. {option}</span>
                {showCorrect && <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 shrink-0" />}
                {showWrong && <XCircle className="h-4 w-4 sm:h-5 sm:w-5 text-red-600 shrink-0" />}
              </span>
            </button>
          );
        })}
      </div>

      {!submitted && data.hint && (
        <p className={cn('text-sm italic', surfaceMutedClass())}>{data.hint}</p>
      )}

      {submitted && data.show_feedback && (
        <div className={surfaceFeedbackClass(isCorrect)}>
          {isCorrect ? (
            <><CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 mt-0.5 shrink-0" /> {data.feedback_correct || "That's correct!"}</>
          ) : (
            <><XCircle className="h-4 w-4 sm:h-5 sm:w-5 mt-0.5 shrink-0" /><span>{data.feedback_incorrect || 'Not quite...'}</span></>
          )}
        </div>
      )}

      {submitted && data.explanation && (
        <div className={surfaceInsetClass()}>
          {data.explanation}
        </div>
      )}

      <div className={SURFACE_ACTIONS}>
      {!submitted ? (
        <Button
          onClick={() => {
            if (selected === null) return;
            onAnswered?.(selected, selected === data.correct_answer);
            onSubmit();
          }}
          disabled={selected === null}
          className={surfacePrimaryButtonClass()}
        >
          Check Answer
        </Button>
      ) : !isCorrect ? (
        <Button variant="outline" onClick={handleRetry} className={surfaceOutlineButtonClass()}>
          Try Again
        </Button>
      ) : null}
      </div>
    </div>
  );
}

// ─── Swipe Deck (Tinder-style stack of question cards) ────────────────────────

type SwipeCard = { question: string; correct: 'left' | 'right' };

/** Convert a #rrggbb hex to an rgba() string. Returns the input untouched if not a 6-digit hex. */
function hexA(hex: string, alpha: number): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

function SwipeQuizViewer({ data, onCorrect, onAnswered }: { data: QuizInlineData; onCorrect?: () => void; onAnswered?: OnAnswered }) {
  const leftLabel = ((data.options?.[0] ?? '').trim()) || 'Left';
  const rightLabel = ((data.options?.[1] ?? '').trim()) || 'Right';

  // Theme props (all optional — fall back to glassmorphic defaults / brand navy).
  const accent = (data.swipe_accent_color || '').trim() || '#1E3A5F';
  const cardColor = (data.swipe_card_color || '').trim();
  const cardText = (data.swipe_card_text_color || '').trim();
  const showFeedback = data.show_feedback !== false;

  // Deck of cards. New blocks store `swipe_cards`; a legacy single-question swipe
  // (no swipe_cards) is treated as a one-card deck.
  const cards = useMemo<SwipeCard[]>(() => {
    const cs = (data.swipe_cards ?? []).filter((c) => (c.question ?? '').trim().length > 0);
    if (cs.length > 0) return cs;
    if (data.swipe_cards == null && data.question) {
      const correct: 'left' | 'right' =
        data.correct_answer && data.options?.[1] === data.correct_answer ? 'right' : 'left';
      return [{ question: data.question, correct }];
    }
    return [];
  }, [data.swipe_cards, data.question, data.correct_answer, data.options]);

  const total = cards.length;
  const deckPrompt = (data.swipe_cards && data.swipe_cards.length > 0) ? (data.question ?? '').trim() : '';

  // phase: 'card' = interactive card on top · 'feedback' = result panel awaiting Next
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [phase, setPhase] = useState<'card' | 'feedback'>('card');
  const [flyOff, setFlyOff] = useState(false);
  const [lastCorrect, setLastCorrect] = useState<boolean | null>(null);
  const [finished, setFinished] = useState(false);

  const startXRef = useRef(0);
  const cardRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const completeFiredRef = useRef(false);

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  useEffect(() => {
    if (finished && total > 0 && score === total && !completeFiredRef.current) {
      completeFiredRef.current = true;
      onCorrect?.();
    }
  }, [finished, score, total, onCorrect]);

  // Record the deck result once per run (correctness is determined at deck completion)
  const answeredFiredRef = useRef(false);
  useEffect(() => {
    if (finished && total > 0 && !answeredFiredRef.current) {
      answeredFiredRef.current = true;
      onAnswered?.({ score, total }, score === total);
    }
  }, [finished, score, total, onAnswered]);

  const THRESHOLD = 80;
  const current = cards[index];

  // Swipe committed → fly the card off, then reveal the feedback panel.
  function commit(dir: 'left' | 'right') {
    if (phase !== 'card' || flyOff || finished || !current) return;
    const correct = current.correct === dir;
    setLastCorrect(correct);
    if (correct) setScore((s) => s + 1);
    setFlyOff(true);
    setDragging(false);
    setDragX(dir === 'left' ? -700 : 700);
    timerRef.current = setTimeout(() => setPhase('feedback'), 300);
  }

  // Advance from the feedback panel to the next card (or the summary).
  function next() {
    const ni = index + 1;
    setPhase('card');
    setFlyOff(false);
    setDragX(0);
    setLastCorrect(null);
    if (ni >= total) {
      setFinished(true);
    } else {
      setIndex(ni);
    }
  }

  function handlePointerDown(e: React.PointerEvent) {
    if (phase !== 'card' || flyOff || finished || !current) return;
    e.stopPropagation();
    setDragging(true);
    startXRef.current = e.clientX - dragX;
    try { cardRef.current?.setPointerCapture(e.pointerId); } catch { /* ignore */ }
  }
  function handlePointerMove(e: React.PointerEvent) {
    if (!dragging || flyOff) return;
    setDragX(e.clientX - startXRef.current);
  }
  function handlePointerUp(e: React.PointerEvent) {
    if (!dragging || flyOff) return;
    setDragging(false);
    try { cardRef.current?.releasePointerCapture(e.pointerId); } catch { /* ignore */ }
    if (dragX <= -THRESHOLD) commit('left');
    else if (dragX >= THRESHOLD) commit('right');
    else setDragX(0);
  }
  function handleKeyDown(e: React.KeyboardEvent) {
    if (phase !== 'card' || flyOff || finished) return;
    if (e.key === 'ArrowLeft') { e.preventDefault(); commit('left'); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); commit('right'); }
  }

  function restart() {
    if (timerRef.current) clearTimeout(timerRef.current);
    completeFiredRef.current = false;
    answeredFiredRef.current = false;
    setIndex(0); setScore(0); setDragX(0); setDragging(false);
    setPhase('card'); setFlyOff(false); setLastCorrect(null); setFinished(false);
  }

  if (total === 0) {
    return (
      <div className={BLOCK_CONTENT_SHELL}>
        <p className={cn('text-sm', surfaceMutedClass())}>No swipe questions yet.</p>
      </div>
    );
  }

  const rotate = Math.max(-14, Math.min(14, dragX * 0.06));
  const leftActive = dragX <= -THRESHOLD * 0.5;
  const rightActive = dragX >= THRESHOLD * 0.5;
  const leftHint = Math.min(1, Math.max(0, -dragX / THRESHOLD));
  const rightHint = Math.min(1, Math.max(0, dragX / THRESHOLD));
  const pct = Math.round((score / total) * 100);

  // Card surface — solid colour if configured, otherwise frosted glass.
  const cardStyle: CSSProperties = cardColor
    ? { backgroundColor: cardColor, color: cardText || undefined, borderColor: hexA(cardText || '#0f172a', 0.12) }
    : { backgroundColor: 'rgba(255,255,255,0.82)', color: cardText || '#1e293b', borderColor: 'rgba(255,255,255,0.7)' };
  const feedbackMsg = lastCorrect
    ? (data.feedback_correct || '').trim()
    : (data.feedback_incorrect || '').trim();

  // Shrink the question font as the text grows so long statements stay inside the
  // fixed-height card instead of spilling out the top/bottom.
  const qLen = (current?.question ?? '').length;
  const cardFontClass =
    qLen > 260 ? 'text-[11px] leading-snug'
    : qLen > 180 ? 'text-xs leading-snug'
    : qLen > 110 ? 'text-sm leading-snug'
    : qLen > 60 ? 'text-[15px] sm:text-base leading-snug'
    : 'text-base sm:text-lg leading-snug';

  return (
    <div className={BLOCK_CONTENT_SHELL}>
      {/* Header: progress + score */}
      <div className="flex items-center justify-between gap-2">
        <span className={cn('text-xs font-semibold uppercase tracking-wide', surfaceMutedClass())}>
          {finished ? 'Complete' : `Card ${Math.min(index + 1, total)} of ${total}`}
        </span>
        <span
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold tabular-nums text-white shadow-sm"
          style={{ backgroundColor: accent }}
        >
          Score {score}/{total}
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 rounded-full bg-[color:var(--surface-inset-bg)] overflow-hidden">
        <div
          className="h-full transition-all duration-300"
          style={{ width: `${(Math.min(index + (phase === 'feedback' ? 1 : 0), total) / total) * 100}%`, backgroundColor: accent }}
        />
      </div>

      {/* Deck prompt */}
      {deckPrompt && !finished && (
        <p className={SURFACE_HEADING}>{formatQuizText(deckPrompt)}</p>
      )}

      {finished ? (
        /* Summary */
        <div className="relative h-[230px] flex items-center justify-center">
          <div
            className="w-full max-w-xs rounded-2xl border-2 backdrop-blur-md shadow-xl flex flex-col items-center justify-center gap-2 p-5 text-center animate-in fade-in zoom-in-95 duration-300"
            style={{ borderColor: hexA(accent, 0.25), backgroundColor: hexA(accent, 0.06) }}
          >
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center animate-in zoom-in-50 duration-500"
              style={{ backgroundColor: pct === 100 ? hexA(accent, 0.14) : pct >= 50 ? 'rgba(245,158,11,0.15)' : 'rgba(239,68,68,0.12)' }}
            >
              {pct === 100
                ? <CheckCircle className="w-8 h-8" style={{ color: accent }} />
                : <span className="text-lg font-black text-[color:var(--surface-text)]">{pct}%</span>}
            </div>
            <p className="text-base font-bold text-[color:var(--surface-text)]">You scored {score} / {total}</p>
            <p className="text-xs text-[color:var(--surface-text-muted)]">
              {pct === 100 ? 'Perfect — every card correct!' : pct >= 50 ? 'Nice work!' : 'Keep practicing!'}
            </p>
          </div>
        </div>
      ) : phase === 'feedback' ? (
        /* Per-card feedback panel */
        <div className="relative min-h-[230px] flex items-center justify-center">
          <div
            className={cn(
              'w-full rounded-2xl border-2 backdrop-blur-md shadow-xl flex flex-col items-center justify-center gap-2.5 p-6 text-center animate-in fade-in zoom-in-95 duration-300',
              lastCorrect ? 'border-emerald-300/70' : 'border-rose-300/70',
            )}
            style={{ backgroundColor: lastCorrect ? 'rgba(16,185,129,0.10)' : 'rgba(244,63,94,0.10)' }}
          >
            <div
              className={cn(
                'w-14 h-14 rounded-full flex items-center justify-center animate-in zoom-in-50 duration-500',
                lastCorrect ? 'bg-emerald-100' : 'bg-rose-100',
              )}
            >
              {lastCorrect
                ? <CheckCircle className="w-8 h-8 text-emerald-500" />
                : <XCircle className="w-8 h-8 text-rose-500" />}
            </div>
            <p className={cn('text-base font-bold', lastCorrect ? 'text-emerald-700' : 'text-rose-700')}>
              {lastCorrect ? 'Correct!' : 'Not quite'}
            </p>
            {showFeedback && feedbackMsg && (
              <p className="text-sm text-[color:var(--surface-text)] leading-snug max-w-prose">{feedbackMsg}</p>
            )}
            {data.explanation && (
              <p className="text-xs italic text-[color:var(--surface-text-muted)] leading-snug max-w-prose">
                {data.explanation}
              </p>
            )}
            <button
              type="button"
              onClick={next}
              autoFocus
              className="mt-1.5 inline-flex items-center gap-1.5 px-5 py-2 rounded-xl text-white text-sm font-semibold shadow-md transition-transform hover:scale-[1.03] focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1"
              style={{ backgroundColor: accent }}
            >
              {index + 1 >= total ? 'See results' : 'Next card'}
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        <div className="relative h-[230px] select-none touch-none">
          {/* Left edge */}
          <button
            type="button"
            tabIndex={-1}
            onClick={() => commit('left')}
            className={cn(
              'absolute left-0 top-1/2 -translate-y-1/2 z-0 flex flex-col items-center gap-1 w-14 sm:w-20 py-3 rounded-r-xl border-2 backdrop-blur-sm transition-all duration-150 cursor-pointer',
              leftActive ? 'border-rose-400 bg-rose-50 scale-105' : 'border-[color:var(--surface-inset-border)] bg-[color:var(--surface-inset-bg)]',
            )}
          >
            <ChevronLeft className={cn('w-5 h-5', leftActive ? 'text-rose-500' : 'text-[color:var(--surface-text-muted)]')} />
            <span className="text-[11px] font-semibold leading-tight px-1 break-words text-center text-[color:var(--surface-text)]">{leftLabel}</span>
          </button>

          {/* Right edge */}
          <button
            type="button"
            tabIndex={-1}
            onClick={() => commit('right')}
            className={cn(
              'absolute right-0 top-1/2 -translate-y-1/2 z-0 flex flex-col items-center gap-1 w-14 sm:w-20 py-3 rounded-l-xl border-2 backdrop-blur-sm transition-all duration-150 cursor-pointer',
              rightActive ? 'border-emerald-400 bg-emerald-50 scale-105' : 'border-[color:var(--surface-inset-border)] bg-[color:var(--surface-inset-bg)]',
            )}
          >
            <ChevronRight className={cn('w-5 h-5', rightActive ? 'text-emerald-500' : 'text-[color:var(--surface-text-muted)]')} />
            <span className="text-[11px] font-semibold leading-tight px-1 break-words text-center text-[color:var(--surface-text)]">{rightLabel}</span>
          </button>

          {/* Background cards (the rest of the deck) for depth */}
          {[2, 1].map((depth) => {
            const ci = index + depth;
            if (ci >= total) return null;
            return (
              <div
                key={`bg-${ci}`}
                aria-hidden="true"
                className="absolute inset-x-[4.5rem] sm:inset-x-24 top-2 bottom-2 rounded-2xl border backdrop-blur-md shadow-md"
                style={{ ...cardStyle, transform: `scale(${1 - depth * 0.04}) translateY(${depth * 8}px)`, zIndex: 5 - depth, opacity: 1 - depth * 0.18 }}
              />
            );
          })}

          {/* Current draggable card */}
          <div
            key={index}
            ref={cardRef}
            role="group"
            aria-label="Swipe to answer the question"
            tabIndex={0}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onKeyDown={handleKeyDown}
            style={{
              ...cardStyle,
              transform: `translateX(${dragX}px) rotate(${rotate}deg)`,
              transition: dragging ? 'none' : 'transform 0.32s cubic-bezier(0.22,1,0.36,1), opacity 0.3s ease',
              opacity: flyOff ? 0 : 1,
              cursor: dragging ? 'grabbing' : 'grab',
              touchAction: 'none',
              borderColor: leftActive ? '#fb7185' : rightActive ? '#34d399' : cardStyle.borderColor,
            }}
            className="absolute inset-x-[4.5rem] sm:inset-x-24 top-2 bottom-2 z-10 rounded-2xl border-2 backdrop-blur-xl shadow-xl flex items-center justify-center p-4 text-center overflow-hidden focus:outline-none focus-visible:ring-2"
          >
            <div className="max-h-full w-full overflow-y-auto overflow-x-hidden flex items-center justify-center pointer-events-none">
              <p className={cn('font-semibold break-words hyphens-auto', cardFontClass)}>
                {formatQuizText(current.question)}
              </p>
            </div>
            <span style={{ opacity: leftHint }} className="absolute top-3 right-3 px-2 py-1 rounded-lg bg-rose-500 text-white text-[11px] font-bold rotate-12 shadow pointer-events-none">{leftLabel}</span>
            <span style={{ opacity: rightHint }} className="absolute top-3 left-3 px-2 py-1 rounded-lg bg-emerald-500 text-white text-[11px] font-bold -rotate-12 shadow pointer-events-none">{rightLabel}</span>
          </div>
        </div>
      )}

      {/* Hint */}
      {!finished && phase === 'card' && (
        <p className={cn('text-center text-xs', surfaceMutedClass())}>
          Drag the card — or use the ← → arrow keys{data.hint ? ` · ${data.hint}` : ''}
        </p>
      )}

      {/* Restart */}
      {finished && (
        <div className={SURFACE_ACTIONS}>
          <Button variant="outline" onClick={restart} className={surfaceOutlineButtonClass()}>
            <RotateCcw className="w-4 h-4 mr-1.5" /> Restart
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── Select All ───────────────────────────────────────────────────────────────

function SelectAllViewer({ data, onCorrect, onAnswered }: { data: QuizInlineData; onCorrect?: () => void; onAnswered?: OnAnswered }) {
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [submitted, setSubmitted] = useState(false);
  const correctFiredRef = useRef(false);

  // correct_answer is normally semicolon+space separated ("Option A; Option B; Option C"),
  // but tolerate a legacy/imported array shape too so a bad value never crashes the slide.
  const correctSet = useMemo(() => {
    const ca = data.correct_answer as unknown;
    const parts = Array.isArray(ca)
      ? ca.map(v => String(v))
      : String(ca ?? '').split('; ');
    return new Set(parts.map(s => s.trim()).filter(Boolean));
  }, [data.correct_answer]);

  const isFullyCorrect = submitted &&
    checked.size === correctSet.size &&
    [...checked].every(c => correctSet.has(c));

  useEffect(() => {
    if (isFullyCorrect && !correctFiredRef.current) {
      correctFiredRef.current = true;
      onCorrect?.();
    }
  }, [isFullyCorrect, onCorrect]);

  function toggle(option: string) {
    if (submitted) return;
    setChecked(prev => {
      const next = new Set(prev);
      next.has(option) ? next.delete(option) : next.add(option);
      return next;
    });
  }

  return (
    <div className={BLOCK_CONTENT_SHELL}>
      {data.question && (
        <p className={SURFACE_HEADING}>{formatQuizText(data.question)}</p>
      )}
      <p className={cn('text-xs font-medium', surfaceMutedClass())}>{data.instructions || 'Select all that apply'}</p>

      <div className="flex flex-col gap-2.5 sm:gap-3">
        {(data.options ?? []).map((opt, i) => {
          const isChecked = checked.has(opt);
          const isCorrectOpt = correctSet.has(opt);
          const showGreen = submitted && isChecked && isCorrectOpt;
          const showRed = submitted && isChecked && !isCorrectOpt;
          const showMissed = submitted && !isChecked && isCorrectOpt;

          return (
            <button
              key={i}
              type="button"
              disabled={submitted}
              onClick={() => toggle(opt)}
              className={cn(
                surfaceOptionClass({
                  submitted,
                  isSelected: !submitted && isChecked,
                  isCorrect: showGreen,
                  isWrong: showRed || showMissed,
                  dimmed: submitted && !isChecked && !showMissed,
                }),
                'flex items-center gap-3',
              )}
            >
              <span className={cn(
                'w-4 h-4 rounded border-2 shrink-0 flex items-center justify-center text-[10px] font-bold text-white',
                !submitted && isChecked ? 'bg-[#1E3A5F] border-[#1E3A5F]' : 'border-slate-300',
                showGreen && 'bg-green-500 border-green-500',
                showRed && 'bg-red-400 border-red-400',
                showMissed && 'bg-amber-400 border-amber-400',
              )}>
                {(isChecked || showMissed) && '✓'}
              </span>
              <span className="flex-1">{opt}</span>
              {showGreen && <CheckCircle className="h-4 w-4 text-green-600 shrink-0" />}
              {showRed && <XCircle className="h-4 w-4 text-red-500 shrink-0" />}
            </button>
          );
        })}
      </div>

      {submitted && (
        <div className={surfaceFeedbackClass(isFullyCorrect)}>
          {isFullyCorrect
            ? <><CheckCircle className="h-4 w-4 mt-0.5 shrink-0" /> {data.feedback_correct || "That's correct!"}</>
            : <><XCircle className="h-4 w-4 mt-0.5 shrink-0" /><span>{data.feedback_incorrect || 'Not quite — check the highlighted options and try again.'}</span></>
          }
        </div>
      )}

      {submitted && data.explanation && (
        <div className={surfaceInsetClass()}>
          {data.explanation}
        </div>
      )}

      <div className={SURFACE_ACTIONS}>
      {!submitted ? (
        <Button
          onClick={() => {
            const correct =
              checked.size === correctSet.size && [...checked].every(c => correctSet.has(c));
            onAnswered?.([...checked], correct);
            setSubmitted(true);
          }}
          disabled={checked.size === 0}
          className={surfacePrimaryButtonClass()}
        >
          Check Answer
        </Button>
      ) : !isFullyCorrect ? (
        <Button variant="outline" onClick={() => { setChecked(new Set()); setSubmitted(false); }}
          className={surfaceOutlineButtonClass()}>
          Try Again
        </Button>
      ) : null}
      </div>
    </div>
  );
}

// ─── Categorize (Mix & Match) ─────────────────────────────────────────────────

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function CategorizeViewer({
  data,
  onCorrect,
  onAnswered,
}: {
  data: QuizInlineData;
  onCorrect?: () => void;
  onAnswered?: OnAnswered;
}) {
  const categories = data.categories ?? [];

  // Build the shuffled pool once on mount.
  // Union of the authoring pool (`options`) AND every category item, so EVERY answer
  // option appears to be sorted — including ones the author hasn't assigned yet — while
  // legacy blocks (which only stored assignments in categories, with empty `options`)
  // still surface all their items. Using the union (not options-only) also protects
  // against a partial `options` list that would otherwise hide some category items.
  const initialPool = useMemo(() => {
    const fromOptions = (data.options ?? []).filter(Boolean);
    const fromCategories = categories.flatMap((c) => c.items.filter(Boolean));
    return shuffleArray([...new Set([...fromOptions, ...fromCategories])]);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // pool: items not yet placed; placements: item → category name
  const [pool, setPool] = useState<string[]>(initialPool);
  const [placements, setPlacements] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const correctFiredRef = useRef(false);

  useEffect(() => {
    if (isCorrect && !correctFiredRef.current) {
      correctFiredRef.current = true;
      onCorrect?.();
    }
  }, [isCorrect, onCorrect]);

  function handleSelectPoolItem(item: string) {
    if (submitted) return;
    setSelected((prev) => (prev === item ? null : item));
  }

  function handleSelectCategoryItem(item: string, catName: string) {
    if (submitted) return;
    if (selected === item) {
      // Deselect: move back to pool
      const { [item]: _, ...rest } = placements;
      setPlacements(rest);
      setPool((p) => [...p, item]);
      setSelected(null);
    } else {
      // Select an already-placed item to move it
      setSelected(item);
    }
  }

  function handleDropIntoCategory(catName: string) {
    if (submitted || !selected) return;
    const isFromPool = pool.includes(selected);
    const wasInCat = placements[selected];

    if (!isFromPool && wasInCat === catName) {
      // Clicking the same category the item is already in → deselect
      setSelected(null);
      return;
    }

    // Move selected item into this category
    setPlacements((prev) => ({ ...prev, [selected]: catName }));
    if (isFromPool) {
      setPool((p) => p.filter((i) => i !== selected));
    }
    setSelected(null);
  }

  function handleCheckAnswer() {
    // Verify every item is placed and placed correctly
    const allPlaced = initialPool.every((item) => placements[item] !== undefined);
    if (!allPlaced) return; // don't submit until all items placed

    const correct = categories.every((cat) => {
      const placedInCat = Object.entries(placements)
        .filter(([, cn]) => cn === cat.name)
        .map(([item]) => item);
      return (
        placedInCat.length === cat.items.length &&
        cat.items.every((item) => placedInCat.includes(item))
      );
    });

    onAnswered?.(placements, correct);
    setSubmitted(true);
    setIsCorrect(correct);
  }

  function handleReset() {
    setPool(shuffleArray(initialPool));
    setPlacements({});
    setSelected(null);
    setSubmitted(false);
    setIsCorrect(false);
    correctFiredRef.current = false;
  }

  const allPlaced = pool.length === 0;

  // Determine per-category result after submission
  function getCategoryResult(cat: (typeof categories)[number]) {
    const placedInCat = Object.entries(placements)
      .filter(([, cn]) => cn === cat.name)
      .map(([item]) => item);
    return (
      placedInCat.length === cat.items.length &&
      cat.items.every((item) => placedInCat.includes(item))
    );
  }

  return (
    <div className={BLOCK_CONTENT_SHELL}>
      {data.question && (
        <p className={SURFACE_HEADING}>{formatQuizText(data.question)}</p>
      )}

      <p className={cn('text-xs sm:text-sm', surfaceMutedClass())}>
        {data.instructions || 'Click an item to select it, then click a category to place it there.'}
      </p>

      {pool.length > 0 && (
        <div className="space-y-1.5">
          <p className={surfaceLabelClass()}>
            Items to sort ({pool.length} remaining)
          </p>
          <div className={cn('flex flex-wrap gap-2', surfacePoolClass())}>
            {pool.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => handleSelectPoolItem(item)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-sm font-medium border transition-all duration-150',
                  selected === item
                    ? 'bg-[#1E3A5F] text-white border-[#1E3A5F] scale-105 shadow-sm'
                    : surfaceChipClass(),
                )}
              >
                {item}
              </button>
            ))}
          </div>
        </div>
      )}

      {pool.length === 0 && !submitted && initialPool.length > 0 && (
        <div className="flex items-center gap-2 text-xs text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
          <CheckCircle className="w-3.5 h-3.5 shrink-0" />
          All items placed — check your answer or rearrange as needed
        </div>
      )}

      {/* Category buckets */}
      <div className="grid gap-3 sm:grid-cols-2">
        {categories.map((cat, index) => {
          const placedItems = Object.entries(placements)
            .filter(([, cn]) => cn === cat.name)
            .map(([item]) => item);
          const catCorrect = submitted ? getCategoryResult(cat) : null;
          const isActive = !!selected && !placements[selected];
          const isActiveMove = !!selected && !!placements[selected] && placements[selected] !== cat.name;

          return (
            <div
              // Index-based key: new/unnamed categories share an empty `cat.name`,
              // which would collide as a React key. cat.name is still the source of
              // truth for placements/scoring — this only affects DOM reconciliation.
              key={`cat-${index}-${cat.name}`}
              onClick={() => handleDropIntoCategory(cat.name)}
              className={cn(
                'rounded-xl border-2 p-3 transition-all duration-150',
                submitted && catCorrect === true && 'border-green-400 bg-green-50',
                submitted && catCorrect === false && 'border-red-400 bg-red-50',
                !submitted && (isActive || isActiveMove) && 'border-[#1E3A5F] bg-[#1E3A5F]/5 cursor-pointer',
                !submitted && !isActive && !isActiveMove && 'border-[color:var(--surface-inset-border)] bg-[color:var(--surface-inset-bg)]',
              )}
            >
              {/* Category header */}
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-semibold text-[color:var(--surface-text)]">{cat.name}</h4>
                {submitted && catCorrect !== null && (
                  catCorrect
                    ? <CheckCircle className="w-4 h-4 text-green-600" />
                    : <XCircle className="w-4 h-4 text-red-500" />
                )}
              </div>

              {/* Items in this category */}
              <div className="flex flex-wrap gap-1.5 min-h-[32px]">
                {placedItems.length === 0 && !submitted && (
                  <span className="text-xs text-slate-400 italic">
                    {isActive || isActiveMove ? 'Click to place here' : 'Empty — select an item first'}
                  </span>
                )}
                {placedItems.map((item) => {
                  const itemCorrect = submitted ? cat.items.includes(item) : null;
                  return (
                    <button
                      key={item}
                      type="button"
                      disabled={submitted}
                      onClick={(e) => { e.stopPropagation(); handleSelectCategoryItem(item, cat.name); }}
                      className={cn(
                        'px-2.5 py-1 rounded-lg text-xs font-medium border transition-all duration-150',
                        submitted && itemCorrect === true && 'bg-green-100 text-green-800 border-green-300',
                        submitted && itemCorrect === false && 'bg-red-100 text-red-800 border-red-300',
                        !submitted && selected === item && 'bg-[#1E3A5F] text-white border-[#1E3A5F]',
                        !submitted && selected !== item && 'bg-white text-slate-700 border-slate-200 hover:border-slate-400',
                      )}
                    >
                      {item}
                      {!submitted && <span className="ml-1 opacity-50 text-[10px]">×</span>}
                    </button>
                  );
                })}

                {/* After submission: show missing correct items */}
                {submitted && catCorrect === false &&
                  cat.items
                    .filter((item) => !placedItems.includes(item))
                    .map((item) => (
                      <span
                        key={`missing-${item}`}
                        className="px-2.5 py-1 rounded-lg text-xs font-medium border border-dashed border-green-400 text-green-700 bg-green-50"
                        title="Correct answer"
                      >
                        {item} ✓
                      </span>
                    ))
                }
              </div>
            </div>
          );
        })}
      </div>

      {/* Hint */}
      {!submitted && data.hint && (
        <p className={cn('text-sm italic', surfaceMutedClass())}>{data.hint}</p>
      )}

      {submitted && data.show_feedback && (
        <div className={surfaceFeedbackClass(isCorrect)}>
          {isCorrect
            ? <><CheckCircle className="h-4 w-4 mt-0.5 shrink-0" />{data.feedback_correct || "That's correct!"}</>
            : <><XCircle className="h-4 w-4 mt-0.5 shrink-0" /><span>{data.feedback_incorrect || 'Not quite — review the correct categories above.'}</span></>
          }
        </div>
      )}

      {submitted && data.explanation && (
        <div className={surfaceInsetClass()}>
          {data.explanation}
        </div>
      )}

      <div className={cn(SURFACE_ACTIONS, 'flex-row flex-wrap gap-2')}>
        {!submitted && (
          <Button
            onClick={handleCheckAnswer}
            disabled={!allPlaced}
            className={surfacePrimaryButtonClass()}
          >
            Check Answer
          </Button>
        )}
        {(submitted || pool.length > 0) && (
          <Button
            variant="outline"
            onClick={handleReset}
            className={surfaceOutlineButtonClass()}
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1.5" /> Reset
          </Button>
        )}
      </div>
    </div>
  );
}
