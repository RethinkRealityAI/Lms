'use client';

import { useCanvasBlock } from '@/lib/canvas/canvas-utils';
import { LessonBlockRenderer } from '@/components/lesson-block-renderer';

export function LmsShapeContent({
  blockId,
  width,
  height,
}: {
  blockId: string;
  width: number;
  height: number;
}) {
  const { block, onQuizCorrect } = useCanvasBlock(blockId);

  if (!block) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-100 text-gray-400 text-sm rounded border border-dashed">
        Block not found
      </div>
    );
  }

  return (
    <div style={{ width, height }} className="overflow-auto">
      <LessonBlockRenderer
        block={block}
        lessonTitle={block.title ?? ''}
        onQuizCorrect={onQuizCorrect ? () => onQuizCorrect(block.id) : undefined}
      />
    </div>
  );
}
