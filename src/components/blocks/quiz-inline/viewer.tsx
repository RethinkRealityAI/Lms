'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { BlockViewerProps } from '@/lib/content/block-registry';
import type { QuizInlineData } from '@/lib/content/blocks/quiz-inline/schema';

export default function QuizInlineViewer({ data }: BlockViewerProps<QuizInlineData>) {
  const [submitted, setSubmitted] = useState(false);

  if (data.question_type === 'categorize' && data.categories) {
    return <CategorizeViewer data={data} submitted={submitted} onSubmit={() => setSubmitted(true)} />;
  }

  return (
    <div className="rounded-lg border p-4 text-sm text-muted-foreground">
      Interactive question (type: {data.question_type})
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
