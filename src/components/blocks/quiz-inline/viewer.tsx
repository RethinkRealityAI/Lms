'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, RotateCcw, Shuffle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { BlockViewerProps } from '@/lib/content/block-registry';
import type { QuizInlineData } from '@/lib/content/blocks/quiz-inline/schema';

export default function QuizInlineViewer({ data, onComplete }: BlockViewerProps<QuizInlineData>) {
  const [submitted, setSubmitted] = useState(false);

  if (data.question_type === 'multiple_choice' || data.question_type === 'true_false') {
    return (
      <MultipleChoiceViewer
        data={data}
        submitted={submitted}
        onSubmit={() => setSubmitted(true)}
        onRetry={() => setSubmitted(false)}
        onCorrect={() => onComplete?.()}
      />
    );
  }

  if (data.question_type === 'categorize' && data.categories) {
    return <CategorizeViewer data={data} onCorrect={() => onComplete?.()} />;
  }

  if (data.question_type === 'select_all') {
    return <SelectAllViewer data={data} onCorrect={() => onComplete?.()} />;
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
}: {
  data: QuizInlineData;
  submitted: boolean;
  onSubmit: () => void;
  onRetry: () => void;
  onCorrect?: () => void;
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
    <div className="rounded-xl border bg-card px-4 py-4 sm:px-7 sm:py-6 space-y-3 sm:space-y-5 flex flex-col">
      {data.question && (
        <p className="font-bold text-sm sm:text-lg leading-snug text-slate-900">{data.question}</p>
      )}

      <div className="space-y-2 sm:space-y-2.5">
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
              className={cn(
                'w-full text-left px-3 py-2.5 sm:px-5 sm:py-3.5 rounded-lg border text-sm sm:text-base transition-all',
                !submitted && !isSelected && 'hover:bg-slate-50 border-border',
                !submitted && isSelected && 'border-[#1E3A5F] bg-[#1E3A5F]/10 font-medium text-[#1E3A5F]',
                showCorrect && 'border-green-500 bg-green-100 text-green-900 font-medium',
                showWrong && 'border-red-500 bg-red-100 text-red-900 font-medium',
                submitted && !isSelected && 'opacity-40',
              )}
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
        <p className="text-sm text-slate-500 italic px-1">{data.hint}</p>
      )}

      {submitted && data.show_feedback && (
        <div className={cn(
          'flex items-start gap-2 text-sm sm:text-base font-medium rounded-lg px-3 py-2.5 sm:px-5 sm:py-3.5',
          isCorrect ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        )}>
          {isCorrect ? (
            <><CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 mt-0.5 shrink-0" /> {data.feedback_correct || "That's correct!"}</>
          ) : (
            <><XCircle className="h-4 w-4 sm:h-5 sm:w-5 mt-0.5 shrink-0" /><span>{data.feedback_incorrect || 'Not quite...'}</span></>
          )}
        </div>
      )}

      {submitted && data.explanation && (
        <div className="text-sm text-slate-600 bg-slate-50 rounded-lg px-3 py-2.5 sm:px-5 sm:py-3.5 border border-slate-100">
          {data.explanation}
        </div>
      )}

      {!submitted ? (
        <Button
          onClick={() => selected !== null && onSubmit()}
          disabled={selected === null}
          className="w-full sm:w-auto bg-[#1E3A5F] hover:bg-[#0F172A] text-white"
        >
          Check Answer
        </Button>
      ) : !isCorrect ? (
        <Button variant="outline" onClick={handleRetry} className="w-full sm:w-auto border-[#1E3A5F] text-[#1E3A5F] hover:bg-[#1E3A5F]/10">
          Try Again
        </Button>
      ) : null}
    </div>
  );
}

// ─── Select All ───────────────────────────────────────────────────────────────

function SelectAllViewer({ data, onCorrect }: { data: QuizInlineData; onCorrect?: () => void }) {
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [submitted, setSubmitted] = useState(false);
  const correctFiredRef = useRef(false);

  // correct_answer is semicolon+space separated: "Option A; Option B; Option C"
  const correctSet = useMemo(
    () => new Set((data.correct_answer ?? '').split('; ').map(s => s.trim()).filter(Boolean)),
    [data.correct_answer],
  );

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
    <div className="rounded-xl border bg-card px-4 py-4 sm:px-7 sm:py-6 space-y-3 sm:space-y-5 flex flex-col">
      {data.question && (
        <p className="font-bold text-sm sm:text-lg leading-snug text-slate-900">{data.question}</p>
      )}
      <p className="text-xs text-slate-400 font-medium">{data.instructions || 'Select all that apply'}</p>

      <div className="space-y-2 sm:space-y-2.5">
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
                'w-full text-left px-3 py-2.5 sm:px-5 sm:py-3.5 rounded-lg border text-sm sm:text-base transition-all flex items-center gap-3',
                !submitted && !isChecked && 'hover:bg-slate-50 border-border',
                !submitted && isChecked && 'border-[#1E3A5F] bg-[#1E3A5F]/10 font-medium text-[#1E3A5F]',
                showGreen && 'border-green-500 bg-green-50 text-green-900',
                showRed && 'border-red-400 bg-red-50 text-red-900',
                showMissed && 'border-amber-400 bg-amber-50 text-amber-900',
                submitted && !isChecked && !showMissed && 'opacity-40',
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
        <div className={cn(
          'flex items-start gap-2 text-sm font-medium rounded-lg px-3 py-2.5 sm:px-5 sm:py-3',
          isFullyCorrect ? 'bg-green-100 text-green-800' : 'bg-amber-50 text-amber-800',
        )}>
          {isFullyCorrect
            ? <><CheckCircle className="h-4 w-4 mt-0.5 shrink-0" /> {data.feedback_correct || "That's correct!"}</>
            : <><XCircle className="h-4 w-4 mt-0.5 shrink-0" /><span>{data.feedback_incorrect || 'Not quite — check the highlighted options and try again.'}</span></>
          }
        </div>
      )}

      {submitted && data.explanation && (
        <div className="text-sm text-slate-600 bg-slate-50 rounded-lg px-3 py-2.5 sm:px-5 sm:py-3.5 border border-slate-100">
          {data.explanation}
        </div>
      )}

      {!submitted ? (
        <Button
          onClick={() => setSubmitted(true)}
          disabled={checked.size === 0}
          className="w-full sm:w-auto bg-[#1E3A5F] hover:bg-[#0F172A] text-white"
        >
          Check Answer
        </Button>
      ) : !isFullyCorrect ? (
        <Button variant="outline" onClick={() => { setChecked(new Set()); setSubmitted(false); }}
          className="w-full sm:w-auto border-[#1E3A5F] text-[#1E3A5F] hover:bg-[#1E3A5F]/10">
          Try Again
        </Button>
      ) : null}
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
}: {
  data: QuizInlineData;
  onCorrect?: () => void;
}) {
  const categories = data.categories ?? [];

  // Build the shuffled pool once on mount
  const initialPool = useMemo(() => {
    const allItems = categories.flatMap((c) => c.items);
    return shuffleArray(allItems);
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
    <div className="rounded-xl border bg-card px-4 py-4 sm:px-6 sm:py-5 space-y-4">
      {/* Question */}
      {data.question && (
        <p className="font-bold text-sm sm:text-base leading-snug text-slate-900">{data.question}</p>
      )}

      {/* Instructions */}
      <p className="text-xs sm:text-sm text-slate-500">
        {data.instructions || 'Click an item to select it, then click a category to place it there.'}
      </p>

      {/* Item pool */}
      {pool.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            Items to sort ({pool.length} remaining)
          </p>
          <div className="flex flex-wrap gap-2 p-3 rounded-lg bg-slate-50 border border-slate-200 min-h-[48px]">
            {pool.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => handleSelectPoolItem(item)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-sm font-medium border transition-all duration-150',
                  selected === item
                    ? 'bg-[#1E3A5F] text-white border-[#1E3A5F] scale-105 shadow-sm'
                    : 'bg-white text-slate-700 border-slate-200 hover:border-[#1E3A5F] hover:text-[#1E3A5F]',
                )}
              >
                {item}
              </button>
            ))}
          </div>
        </div>
      )}

      {pool.length === 0 && !submitted && (
        <div className="flex items-center gap-2 text-xs text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
          <CheckCircle className="w-3.5 h-3.5 shrink-0" />
          All items placed — check your answer or rearrange as needed
        </div>
      )}

      {/* Category buckets */}
      <div className="grid gap-3 sm:grid-cols-2">
        {categories.map((cat) => {
          const placedItems = Object.entries(placements)
            .filter(([, cn]) => cn === cat.name)
            .map(([item]) => item);
          const catCorrect = submitted ? getCategoryResult(cat) : null;
          const isActive = !!selected && !placements[selected];
          const isActiveMove = !!selected && !!placements[selected] && placements[selected] !== cat.name;

          return (
            <div
              key={cat.name}
              onClick={() => handleDropIntoCategory(cat.name)}
              className={cn(
                'rounded-xl border-2 p-3 transition-all duration-150',
                submitted && catCorrect === true && 'border-green-400 bg-green-50',
                submitted && catCorrect === false && 'border-red-400 bg-red-50',
                !submitted && (isActive || isActiveMove) && 'border-[#1E3A5F] bg-[#1E3A5F]/5 cursor-pointer',
                !submitted && !isActive && !isActiveMove && 'border-slate-200 bg-slate-50/50',
              )}
            >
              {/* Category header */}
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-semibold text-slate-700">{cat.name}</h4>
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
        <p className="text-sm text-slate-500 italic">{data.hint}</p>
      )}

      {/* Feedback banner */}
      {submitted && data.show_feedback && (
        <div className={cn(
          'flex items-start gap-2 text-sm font-medium rounded-lg px-4 py-3',
          isCorrect ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800',
        )}>
          {isCorrect
            ? <><CheckCircle className="h-4 w-4 mt-0.5 shrink-0" />{data.feedback_correct || "That's correct!"}</>
            : <><XCircle className="h-4 w-4 mt-0.5 shrink-0" /><span>{data.feedback_incorrect || 'Not quite — review the correct categories above.'}</span></>
          }
        </div>
      )}

      {submitted && data.explanation && (
        <div className="text-sm text-slate-600 bg-slate-50 rounded-lg px-4 py-3 border border-slate-100">
          {data.explanation}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        {!submitted && (
          <Button
            onClick={handleCheckAnswer}
            disabled={!allPlaced}
            className="bg-[#1E3A5F] hover:bg-[#0F172A] text-white"
          >
            Check Answer
          </Button>
        )}
        {(submitted || pool.length > 0) && (
          <Button
            variant="outline"
            onClick={handleReset}
            className="gap-1.5 border-slate-200 text-slate-600 hover:border-slate-300"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset
          </Button>
        )}
        {!submitted && pool.length === initialPool.length && (
          <Button
            variant="ghost"
            onClick={() => setPool(shuffleArray(pool))}
            className="gap-1.5 text-slate-500 hover:text-slate-700"
            title="Shuffle items"
          >
            <Shuffle className="w-3.5 h-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}
