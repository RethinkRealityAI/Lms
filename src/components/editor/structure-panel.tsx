'use client';

import { useState, useCallback } from 'react';
import { Plus, PanelLeftClose, PanelLeftOpen, FolderPlus } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  DragOverlay,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { ModuleNode } from './module-node';
import { AddEntityDialog } from './add-entity-dialog';
import { SlideTemplatePicker } from './slide-template-picker';
import { useEditorStore } from './editor-store-context';
import type { Slide } from '@/types';

interface StructurePanelProps {
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  onAddModule?: (title: string) => void;
  onAddLesson?: (moduleId: string, title: string) => void;
  onDeleteLesson?: (lessonId: string) => void;
  onDeleteModule?: (moduleId: string) => void;
  onAddSlide?: (lessonId: string, slideData: Slide) => void;
  onMoveSlide?: (slideId: string, fromLessonId: string, toLessonId: string) => void;
  onDuplicateSlide?: (slideId: string, lessonId: string) => void;
}

export function StructurePanel({
  collapsed,
  onToggleCollapse,
  onAddModule,
  onAddLesson,
  onDeleteLesson,
  onDeleteModule,
  onAddSlide,
  onMoveSlide,
  onDuplicateSlide,
}: StructurePanelProps) {
  const [showAddModule, setShowAddModule] = useState(false);
  const [addSlideForLesson, setAddSlideForLesson] = useState<string | null>(null);
  const modules = useEditorStore((s) => s.modules);
  const slides = useEditorStore((s) => s.slides);
  const reorderSlides = useEditorStore((s) => s.reorderSlides);

  // DnD sensors — shared across all lessons for cross-lesson slide dragging
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeData = active.data.current as { lessonId?: string } | undefined;
    const overData = over.data.current as { lessonId?: string; type?: string } | undefined;

    const fromLessonId = activeData?.lessonId;
    if (!fromLessonId) return;

    // Case 1: Dropped on a lesson drop zone (cross-lesson move)
    if (overData?.type === 'lesson-drop') {
      const toLessonId = overData.lessonId;
      if (toLessonId && toLessonId !== fromLessonId) {
        onMoveSlide?.(active.id as string, fromLessonId, toLessonId);
        return;
      }
    }

    // Case 2: Dropped on another slide — check if same or different lesson
    const overLessonId = overData?.lessonId;

    if (overLessonId && overLessonId !== fromLessonId) {
      // Cross-lesson: move slide to the target lesson
      onMoveSlide?.(active.id as string, fromLessonId, overLessonId);
      return;
    }

    // Case 3: Same lesson reorder
    if (active.id === over.id) return;
    const lessonSlides = slides.get(fromLessonId) ?? [];
    const oldIndex = lessonSlides.findIndex((s) => s.id === active.id);
    const newIndex = lessonSlides.findIndex((s) => s.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = [...lessonSlides];
    const [moved] = reordered.splice(oldIndex, 1);
    reordered.splice(newIndex, 0, moved);
    reorderSlides(fromLessonId, reordered.map((s) => s.id));
  }, [slides, reorderSlides, onMoveSlide]);

  function handleAddModule(title: string) {
    if (onAddModule) {
      onAddModule(title);
    }
  }

  return (
    <div className={`shrink-0 bg-white border-r border-gray-200 flex flex-col overflow-hidden transition-all duration-300 ${collapsed ? 'w-12' : 'w-[260px]'}`}>
      <div className={`flex items-center px-3 py-2.5 border-b border-gray-100 shrink-0 ${collapsed ? 'justify-center' : 'justify-between'}`}>
        {!collapsed && (
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest overflow-hidden whitespace-nowrap">
            Structure
          </span>
        )}
        <div className="flex items-center gap-0.5">
          {!collapsed && (
            <button
              onClick={() => setShowAddModule(true)}
              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-all"
              title="Add Module"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={onToggleCollapse}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-all"
            title={collapsed ? 'Expand Structure' : 'Collapse Structure'}
          >
            {collapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          {modules.length === 0 ? (
            <div className="text-center py-12 px-5">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#1E3A5F]/10 to-[#2563EB]/10 flex items-center justify-center mx-auto mb-4">
                <FolderPlus className="w-7 h-7 text-[#1E3A5F]" />
              </div>
              <p className="text-sm font-semibold text-gray-700 mb-1">Start building your course</p>
              <p className="text-xs text-gray-400 mb-4 leading-relaxed">
                Modules organize your course into sections.<br />
                Each module contains lessons with slides.
              </p>
              <button
                onClick={() => setShowAddModule(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-[#1E3A5F] rounded-lg hover:bg-[#162d4a] transition-colors shadow-sm"
              >
                <Plus className="w-4 h-4" />
                Add first module
              </button>
            </div>
          ) : (
            modules.map((mod) => (
              <ModuleNode
                key={mod.id}
                module={mod}
                onAddSlide={(lessonId) => setAddSlideForLesson(lessonId)}
                onAddLesson={onAddLesson}
                onDeleteLesson={onDeleteLesson}
                onDeleteModule={onDeleteModule}
                onMoveSlide={onMoveSlide}
                onDuplicateSlide={onDuplicateSlide}
              />
            ))
          )}
        </DndContext>
      </div>

      {showAddModule && (
        <AddEntityDialog
          entityType="module"
          onAdd={handleAddModule}
          onClose={() => setShowAddModule(false)}
        />
      )}
      {addSlideForLesson && (
        <SlideTemplatePicker
          lessonId={addSlideForLesson}
          onAddSlide={onAddSlide}
          onClose={() => setAddSlideForLesson(null)}
        />
      )}
    </div>
  );
}
