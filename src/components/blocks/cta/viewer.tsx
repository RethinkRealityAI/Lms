'use client';

import { Button } from '@/components/ui/button';
import { CheckCircle } from 'lucide-react';
import type { BlockViewerProps } from '@/lib/content/block-registry';
import type { CtaData } from '@/lib/content/blocks/cta/schema';

interface Props extends BlockViewerProps<CtaData> {
  onComplete?: () => void;
}

export default function CtaViewer({ data, onComplete }: Props) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-xl border bg-muted/30 p-8 text-center">
      <CheckCircle className="h-12 w-12 text-green-500" />
      {data.text && <p className="text-lg font-medium">{data.text}</p>}
      <Button onClick={onComplete} size="lg">
        {data.button_label ?? 'Continue'}
      </Button>
    </div>
  );
}
