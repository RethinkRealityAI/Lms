'use client';

import React, { Suspense } from 'react';
import type { LessonBlock, Lesson } from '@/types';
import { getBlockType } from '@/lib/content/block-registry';
import { BlockErrorBoundary } from '@/components/blocks/block-error-boundary';
import { Skeleton } from '@/components/ui/skeleton';

interface LessonBlockRendererProps {
  block: LessonBlock;
  lessonTitle: string;
  onComplete?: () => void;
}

export function LessonBlockRenderer({ block, lessonTitle, onComplete }: LessonBlockRendererProps) {
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

  return (
    <BlockErrorBoundary blockType={block.block_type}>
      <Suspense fallback={<Skeleton className="h-32 w-full rounded-lg" />}>
        <Viewer
          data={block.data}
          block={{
            id: block.id,
            title: block.title ?? lessonTitle,
            is_visible: block.is_visible,
          }}
          onComplete={onComplete}
        />
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
