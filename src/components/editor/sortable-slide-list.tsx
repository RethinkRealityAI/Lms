'use client';

import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { SortableItem } from './sortable-item';
import { SlideNode } from './slide-node';
import type { Slide } from '@/types';

interface SortableSlideListProps {
  lessonId: string;
  slides: Slide[];
  onMoveSlide?: (slideId: string, fromLessonId: string, toLessonId: string) => void;
  onDuplicateSlide?: (slideId: string, lessonId: string) => void;
}

/**
 * Renders slides within a lesson as sortable items.
 * DndContext is now lifted to StructurePanel for cross-lesson support.
 * Each lesson is also a droppable zone for receiving slides from other lessons.
 */
export function SortableSlideList({ lessonId, slides, onMoveSlide, onDuplicateSlide }: SortableSlideListProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `lesson-drop-${lessonId}`,
    data: { type: 'lesson-drop', lessonId },
  });

  if (slides.length === 0) return null;

  return (
    <div
      ref={setNodeRef}
      className={`space-y-0.5 transition-colors rounded ${isOver ? 'bg-blue-50 ring-1 ring-blue-300' : ''}`}
    >
      <SortableContext
        items={slides.map((s) => s.id)}
        strategy={verticalListSortingStrategy}
      >
        {slides.map((slide) => (
          <SortableItem key={slide.id} id={slide.id} data={{ lessonId }}>
            <SlideNode
              slide={slide}
              lessonId={lessonId}
              onMoveSlide={onMoveSlide}
              onDuplicateSlide={onDuplicateSlide}
            />
          </SortableItem>
        ))}
      </SortableContext>
    </div>
  );
}
