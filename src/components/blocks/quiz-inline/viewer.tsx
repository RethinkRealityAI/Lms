'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { BlockViewerProps } from '@/lib/content/block-registry';
import type { QuizInlineData } from '@/lib/content/blocks/quiz-inline/schema';

export default function QuizInlineViewer({ data, block, onComplete }: BlockViewerProps<QuizInlineData>) {
  const [submitted, setSubmitted] = useState(false);

  if (data.question_type === 'multiple_choice' || data.question_type === 'true_false') {
    return <MultipleChoiceViewer data={data} submitted={submitted} onSubmit={() => setSubmitted(true)} onRetry={() => setSubmitted(false)} onCorrect={() => onComplete?.()} />;
  }

  if (data.question_type === 'categorize' && data.categories) {
    return <CategorizeViewer data={data} submitted={submitted} onSubmit={() => setSubmitted(true)} />;
  }

  return (
    <div className="rounded-lg border p-4 text-sm text-muted-foreground">
      Interactive question (type: {data.question_type})
    </div>
  );
}

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

  // Fire onCorrect once when user gets the right answer
  useEffect(() => {
    if (isCorrect && !correctFiredRef.current) {
      correctFiredRef.current = true;
      onCorrect?.();
    }
  }, [isCorrect]);

  const handleSubmit = () => {
    if (selected !== null) onSubmit();
  };

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
                submitted && !isSelected && !isCorrectOption && 'opacity-40',
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

      {submitted && data.show_feedback && (
        <div className={cn(
          'flex items-start gap-2 text-sm sm:text-base font-medium rounded-lg px-3 py-2.5 sm:px-5 sm:py-3.5',
          isCorrect ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        )}>
          {isCorrect ? (
            <><CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 mt-0.5 shrink-0" /> Correct!</>
          ) : (
            <><XCircle className="h-4 w-4 sm:h-5 sm:w-5 mt-0.5 shrink-0" /><span>Incorrect. Try again!</span></>
          )}
        </div>
      )}

      {!submitted ? (
        <Button onClick={handleSubmit} disabled={selected === null} className="w-full sm:w-auto bg-[#1E3A5F] hover:bg-[#0F172A] text-white">
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

function CategorizeViewer({
  data,
  submitted,
  onSubmit,
}: {
  data: QuizInlineData;
  submitted: boolean;
  onSubmit: () => void;
}) {
  return (
    <div className="space-y-4 rounded-xl border p-6">
      {data.instructions && (
        <p className="text-sm font-medium text-muted-foreground">{data.instructions}</p>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        {(data.categories ?? []).map((cat) => (
          <div key={cat.name} className="rounded-lg border bg-muted/30 p-4">
            <h4 className="mb-3 font-semibold">{cat.name}</h4>
            <div className="flex flex-wrap gap-2">
              {cat.items.map((item) => (
                <Badge key={item} variant="secondary">{item}</Badge>
              ))}
            </div>
          </div>
        ))}
      </div>
      {!submitted && (
        <Button onClick={onSubmit} className="w-full">Check Answer</Button>
      )}
    </div>
  );
}
