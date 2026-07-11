'use client';

import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { Plus } from 'lucide-react';
import { SortableItem } from './sortable-item';
import { SlideNode } from './slide-node';
import { DropIndicator } from './dnd/drop-indicator';
import type { Slide } from '@/types';

interface SortableSlideListProps {
  lessonId: string;
  slides: Slide[];
  activeDragId?: string | null;
  overId?: string | null;
  isTargetLesson?: boolean;
  onMoveSlide?: (slideId: string, fromLessonId: string, toLessonId: string) => void;
  onDuplicateSlide?: (slideId: string, lessonId: string) => void;
  onAddSlide?: (lessonId: string) => void;
}

/**
 * Renders slides within a lesson as sortable items.
 * DndContext is lifted to StructurePanel for cross-lesson support.
 * Each lesson is also a droppable zone for receiving slides from other lessons.
 */
export function SortableSlideList({
  lessonId,
  slides,
  activeDragId,
  overId,
  isTargetLesson,
  onMoveSlide,
  onDuplicateSlide,
  onAddSlide,
}: SortableSlideListProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `lesson-drop-${lessonId}`,
    data: { type: 'lesson-drop', lessonId },
  });

  const showLessonHighlight = isOver || isTargetLesson;

  return (
    <div
      ref={setNodeRef}
      className={`space-y-0.5 transition-colors rounded-md ${
        showLessonHighlight ? 'bg-blue-50 ring-2 ring-blue-400 ring-inset' : ''
      }`}
    >
      {slides.length === 0 ? (
        <div
          className={`ml-5 px-3 py-2 text-xs rounded-md border border-dashed transition-colors ${
            showLessonHighlight
              ? 'border-blue-400 text-blue-600 bg-blue-50/80'
              : 'border-gray-200 text-gray-400'
          }`}
        >
          {showLessonHighlight ? 'Drop slide here' : 'No slides — drag here or add one'}
        </div>
      ) : (
        <SortableContext
          items={slides.map((s) => s.id)}
          strategy={verticalListSortingStrategy}
        >
          {slides.map((slide, index) => (
            <div key={slide.id}>
              <DropIndicator
                id={`slide-drop-before-${slide.id}`}
                lessonId={lessonId}
                isOver={overId === `slide-drop-before-${slide.id}` && activeDragId !== slide.id}
              />
              <SortableItem id={slide.id} data={{ lessonId, slideIndex: index }}>
                <SlideNode
                  slide={slide}
                  lessonId={lessonId}
                  slideIndex={index}
                  onMoveSlide={onMoveSlide}
                  onDuplicateSlide={onDuplicateSlide}
                />
              </SortableItem>
            </div>
          ))}
          <DropIndicator
            id={`slide-drop-after-${slides[slides.length - 1].id}`}
            lessonId={lessonId}
            isOver={
              overId === `slide-drop-after-${slides[slides.length - 1].id}` &&
              activeDragId !== slides[slides.length - 1].id
            }
          />
        </SortableContext>
      )}

      {onAddSlide && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onAddSlide(lessonId);
          }}
          className="ml-5 mt-0.5 w-[calc(100%-1.25rem)] flex items-center justify-center gap-1.5 px-2 py-1.5 text-[11px] font-medium text-gray-400 border border-dashed border-gray-200 rounded-md hover:border-[#1E3A5F] hover:text-[#1E3A5F] hover:bg-[#1E3A5F]/5 transition-all"
          title="Add a new slide to this lesson"
        >
          <Plus className="w-3 h-3" /> Add slide
        </button>
      )}
    </div>
  );
}
