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
  DragOverlay,
  type DragEndEvent,
  type DragStartEvent,
  type DragOverEvent,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { ModuleNode } from './module-node';
import { AddEntityDialog } from './add-entity-dialog';
import { SlideTemplatePicker } from './slide-template-picker';
import { useEditorStore } from './editor-store-context';
import type { Slide } from '@/types';
import type { SlideTemplateConfig } from '@/lib/content/slide-templates';

interface StructurePanelProps {
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  onAddModule?: (title: string) => void;
  onAddLesson?: (moduleId: string, title: string) => void;
  onDeleteLesson?: (lessonId: string) => void;
  onDeleteModule?: (moduleId: string) => void;
  onAddSlide?: (lessonId: string, slideData: Slide, template?: SlideTemplateConfig) => void;
  onMoveSlide?: (slideId: string, fromLessonId: string, toLessonId: string) => void;
  onDuplicateSlide?: (slideId: string, lessonId: string) => void;
  /** Expanded width in px (from the shell's resizer). Ignored when collapsed. */
  width?: number;
  /** True while the panel is being drag-resized — suppresses the width transition. */
  resizing?: boolean;
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
  width,
  resizing,
}: StructurePanelProps) {
  const [showAddModule, setShowAddModule] = useState(false);
  const [addSlideForLesson, setAddSlideForLesson] = useState<string | null>(null);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [targetLessonId, setTargetLessonId] = useState<string | null>(null);

  const modules = useEditorStore((s) => s.modules);
  const slides = useEditorStore((s) => s.slides);
  const reorderSlides = useEditorStore((s) => s.reorderSlides);
  const selectedEntity = useEditorStore((s) => s.selectedEntity);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const activeSlide = activeDragId
    ? [...slides.values()].flat().find((s) => s.id === activeDragId)
    : null;

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveDragId(event.active.id as string);
  }, []);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const over = event.over;
    setOverId(over ? (over.id as string) : null);

    const overData = over?.data.current as { lessonId?: string; type?: string } | undefined;
    if (overData?.lessonId) {
      setTargetLessonId(overData.lessonId);
    } else if (typeof over?.id === 'string' && over.id.startsWith('lesson-drop-')) {
      setTargetLessonId(over.id.replace('lesson-drop-', ''));
    } else if (typeof over?.id === 'string' && over.id.startsWith('slide-drop-')) {
      const slideId = over.id.replace(/^slide-drop-(before|after)-/, '');
      for (const [lessonId, list] of slides) {
        if (list.some((s) => s.id === slideId)) {
          setTargetLessonId(lessonId);
          break;
        }
      }
    }
  }, [slides]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragId(null);
    setOverId(null);
    setTargetLessonId(null);

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

    // Case 2: Dropped on another slide or insertion slot — check if same or different lesson
    let overLessonId = overData?.lessonId;
    if (!overLessonId && typeof over.id === 'string' && over.id.startsWith('slide-drop-')) {
      const targetSlideId = (over.id as string).replace(/^slide-drop-(before|after)-/, '');
      for (const [lessonId, list] of slides) {
        if (list.some((s) => s.id === targetSlideId)) {
          overLessonId = lessonId;
          break;
        }
      }
    }

    if (overLessonId && overLessonId !== fromLessonId) {
      onMoveSlide?.(active.id as string, fromLessonId, overLessonId);
      return;
    }

    // Case 3: Same lesson reorder
    if (active.id === over.id) return;
    const lessonSlides = slides.get(fromLessonId) ?? [];
    const oldIndex = lessonSlides.findIndex((s) => s.id === active.id);
    let newIndex = lessonSlides.findIndex((s) => s.id === over.id);

    // Drop indicators: before/after a slide
    const overIdStr = over.id as string;
    if (overIdStr.startsWith('slide-drop-before-')) {
      const targetId = overIdStr.replace('slide-drop-before-', '');
      newIndex = lessonSlides.findIndex((s) => s.id === targetId);
    } else if (overIdStr.startsWith('slide-drop-after-')) {
      const targetId = overIdStr.replace('slide-drop-after-', '');
      newIndex = lessonSlides.findIndex((s) => s.id === targetId) + 1;
    }

    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = [...lessonSlides];
    const [moved] = reordered.splice(oldIndex, 1);
    const insertAt = oldIndex < newIndex ? newIndex - 1 : newIndex;
    reordered.splice(insertAt, 0, moved);
    reorderSlides(fromLessonId, reordered.map((s) => s.id));
  }, [slides, reorderSlides, onMoveSlide]);

  const handleDragCancel = useCallback(() => {
    setActiveDragId(null);
    setOverId(null);
    setTargetLessonId(null);
  }, []);

  function handleAddModule(title: string) {
    if (onAddModule) {
      onAddModule(title);
    }
  }

  const blocks = useEditorStore((s) => s.blocks);

  const selectedLessonId = (() => {
    if (!selectedEntity) return null;
    if (selectedEntity.type === 'lesson') return selectedEntity.id;
    if (selectedEntity.type === 'slide') {
      return [...slides.entries()].find(([, list]) => list.some((s) => s.id === selectedEntity.id))?.[0] ?? null;
    }
    if (selectedEntity.type === 'block') {
      for (const [slideId, blockList] of blocks) {
        if (blockList.some((b) => b.id === selectedEntity.id)) {
          for (const [lessonId, list] of slides) {
            if (list.some((s) => s.id === slideId)) return lessonId;
          }
        }
      }
    }
    return null;
  })();

  return (
    <div
      className={`shrink-0 bg-white border-r border-gray-200 flex flex-col overflow-hidden ${resizing ? '' : 'transition-all duration-300'} ${collapsed ? 'w-12' : width == null ? 'w-[325px]' : ''}`}
      style={collapsed || width == null ? undefined : { width }}
    >
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
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
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
                activeDragId={activeDragId}
                overId={overId}
                targetLessonId={targetLessonId}
                selectedLessonId={selectedLessonId}
              />
            ))
          )}

          <DragOverlay dropAnimation={null}>
            {activeSlide ? (
              <div className="flex items-center gap-2 px-3 py-2 ml-8 bg-white rounded-lg shadow-lg border border-blue-300 text-xs text-gray-700 max-w-[200px]">
                <span className="font-semibold text-blue-600 shrink-0">
                  {(() => {
                    for (const [, list] of slides) {
                      const idx = list.findIndex((s) => s.id === activeSlide.id);
                      if (idx >= 0) return idx + 1;
                    }
                    return '?';
                  })()}
                </span>
                <span className="truncate">{activeSlide.title || activeSlide.slide_type}</span>
              </div>
            ) : null}
          </DragOverlay>
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
