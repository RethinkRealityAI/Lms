'use client';

import { useRef, useCallback } from 'react';
import type { BlockViewerProps } from '@/lib/content/block-registry';
import type { ImageCompareData } from '@/lib/content/blocks/image-compare/schema';
import { CompareSlider } from './compare-slider';

export default function ImageCompareViewer({ data, context, onComplete }: BlockViewerProps<ImageCompareData>) {
  const isEditing = context?.editing === true;
  const completed = useRef(false);

  const handleFirstInteract = useCallback(() => {
    if (completed.current) return;
    if (!data.require_interaction) return;
    completed.current = true;
    onComplete?.();
  }, [data.require_interaction, onComplete]);

  return (
    <div className="w-full flex flex-col gap-2">
      {data.prompt && (
        <p className="text-sm font-medium text-center [color:inherit] opacity-90">{data.prompt}</p>
      )}
      <CompareSlider data={data} interactive={!isEditing} onFirstInteract={handleFirstInteract} />
      {data.caption && (
        <p className="text-sm text-center italic opacity-80 [color:inherit]">{data.caption}</p>
      )}
    </div>
  );
}
