'use client';

import React, { Suspense } from 'react';
import type { LessonBlock, Lesson } from '@/types';
import { getBlockType } from '@/lib/content/block-registry';
import '@/lib/content/blocks/register-all';
import { BlockErrorBoundary } from '@/components/blocks/block-error-boundary';
import { Skeleton } from '@/components/ui/skeleton';

import type { BlockViewerContext } from '@/lib/content/block-registry';
import { BlockSurface } from '@/components/shared/block-surface';
import { blockSurfaceFillCell, blockSurfaceFlush } from '@/lib/content/gridConstants';

interface LessonBlockRendererProps {
  block: LessonBlock;
  lessonTitle: string;
  context?: BlockViewerContext;
  onComplete?: () => void;
  onBlockComplete?: (blockId: string) => void;
  onQuizCorrect?: (blockId: string) => void;
}

export function LessonBlockRenderer({ block, lessonTitle, context, onComplete, onBlockComplete, onQuizCorrect }: LessonBlockRendererProps) {
  if (!block.is_visible) return null;

  const definition = getBlockType(block.block_type);

  if (!definition || !definition.ViewerComponent) {
    return (
      <div className="rounded-lg border border-dashed border-muted-foreground/30 p-4 text-sm text-muted-foreground">
        Content unavailable ({block.block_type})
      </div>
    );
  }

  const Viewer = definition.ViewerComponent;

  const handleComplete = block.block_type === 'quiz_inline' && onQuizCorrect
    ? () => onQuizCorrect(block.id)
    : onBlockComplete
      ? () => onBlockComplete(block.id)
      : onComplete;

  const viewer = (
    <Viewer
      data={block.data}
      block={{
        id: block.id,
        title: block.title ?? lessonTitle,
        is_visible: block.is_visible,
      }}
      context={context}
      onComplete={handleComplete}
    />
  );

  // Resolve a minimum surface height (rem). Only fill-cell interactive blocks honour
  // it — auto-height text blocks always hug their content. An explicit author height
  // (`block_min_h`) wins; otherwise a lone fill-cell block grows to fill more of the
  // slide instead of sitting tiny. The editor's auto-measure picks this up and grows
  // the persisted grid height, so the student view stays in sync.
  const fillCell = blockSurfaceFillCell(block.block_type);
  const explicitMinH = typeof (block.data as Record<string, unknown>)?.block_min_h === 'number'
    ? ((block.data as Record<string, unknown>).block_min_h as number)
    : undefined;
  // A lone fill-cell block grows to a comfortable minimum instead of sitting tiny
  // (the floor; in the student view the grid also stretches it to fill the slide).
  // Video is content-sized (aspect-video), not fill-cell, so it's untouched here.
  const minHeightRem = fillCell
    ? (explicitMinH ?? (context?.soleBlock ? 24 : undefined))
    : undefined;

  return (
    <BlockErrorBoundary blockType={block.block_type}>
      <Suspense fallback={<Skeleton className="h-32 w-full rounded-lg" />}>
        {context?.blockStyle !== undefined ? (
          <BlockSurface
            blockStyle={context.blockStyle}
            flush={blockSurfaceFlush(block.block_type)}
            fillCell={fillCell}
            minHeightRem={minHeightRem}
          >
            {viewer}
          </BlockSurface>
        ) : (
          viewer
        )}
      </Suspense>
    </BlockErrorBoundary>
  );
}

export function createFallbackBlockFromLesson(lesson: Lesson): LessonBlock {
  const blockType =
    lesson.content_type === '3d' ? 'model3d' :
    lesson.content_type === 'iframe' ? 'iframe' :
    lesson.content_type;

  return {
    id: `fallback-${lesson.id}`,
    institution_id: '',
    lesson_id: lesson.id,
    block_type: blockType,
    title: lesson.title,
    data: { url: lesson.content_url, title: lesson.title, description: lesson.description ?? '' },
    is_visible: true,
    settings: {},
    version: 1,
    order_index: 0,
    created_by: '',
    created_at: lesson.created_at,
    updated_at: lesson.created_at,
  };
}
