'use client';

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { SortableItem } from './sortable-item';
import { SlideNode } from './slide-node';
import { useEditorStore } from './editor-store-context';
import type { Slide } from '@/types';

interface SortableSlideListProps {
  lessonId: string;
  slides: Slide[];
  onMoveSlide?: (slideId: string, fromLessonId: string, toLessonId: string) => void;
}

export function SortableSlideList({ lessonId, slides, onMoveSlide }: SortableSlideListProps) {
  const reorderSlides = useEditorStore((s) => s.reorderSlides);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = slides.findIndex((s) => s.id === active.id);
    const newIndex = slides.findIndex((s) => s.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = [...slides];
    const [moved] = reordered.splice(oldIndex, 1);
    reordered.splice(newIndex, 0, moved);

    reorderSlides(lessonId, reordered.map((s) => s.id));
  }

  if (slides.length === 0) return null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={slides.map((s) => s.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-0.5">
          {slides.map((slide) => (
            <SortableItem key={slide.id} id={slide.id}>
              <SlideNode slide={slide} lessonId={lessonId} onMoveSlide={onMoveSlide} />
            </SortableItem>
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
