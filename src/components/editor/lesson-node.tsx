'use client';

import { useState } from 'react';
import { ChevronRight, ChevronDown, Plus, Trash2 } from 'lucide-react';
import { SortableSlideList } from './sortable-slide-list';
import { useEditorStore } from './editor-store-context';
import type { LessonData } from '@/lib/stores/editor-store';
import type { Slide } from '@/types';

const EMPTY_SLIDES: Slide[] = [];

interface LessonNodeProps {
  lesson: LessonData;
  onAddSlide: (lessonId: string) => void;
  onDeleteLesson?: (lessonId: string) => void;
  onMoveSlide?: (slideId: string, fromLessonId: string, toLessonId: string) => void;
}

export function LessonNode({ lesson, onAddSlide, onDeleteLesson, onMoveSlide }: LessonNodeProps) {
  const [expanded, setExpanded] = useState(false);
  const selectedEntity = useEditorStore((s) => s.selectedEntity);
  const selectEntity = useEditorStore((s) => s.selectEntity);
  const slides = useEditorStore((s) => s.slides.get(lesson.id) ?? EMPTY_SLIDES);
  const isSelected = selectedEntity?.type === 'lesson' && selectedEntity.id === lesson.id;

  function handleDelete(e: React.MouseEvent) {
    e.stopPropagation();
    if (onDeleteLesson) {
      onDeleteLesson(lesson.id);
    }
  }

  return (
    <div>
      <div
        className={`flex items-center gap-1 px-2 py-1.5 ml-4 rounded cursor-pointer group transition-colors ${
          isSelected ? 'bg-[#1E3A5F] text-white' : 'hover:bg-gray-50 text-gray-700'
        }`}
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            setExpanded(!expanded);
          }}
          className="p-0.5 shrink-0"
        >
          {expanded ? (
            <ChevronDown className="w-3 h-3" />
          ) : (
            <ChevronRight className="w-3 h-3" />
          )}
        </button>
        <span
          className="text-xs truncate flex-1 min-w-0"
          onClick={() => selectEntity({ type: 'lesson', id: lesson.id })}
        >
          {lesson.title}
        </span>
        <span className={`text-xs shrink-0 ${isSelected ? 'text-blue-200' : 'text-gray-400'}`}>
          {slides.length}
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onAddSlide(lesson.id);
          }}
          className={`p-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity ${
            isSelected ? 'hover:bg-blue-800' : 'hover:bg-gray-200'
          }`}
          title="Add slide"
        >
          <Plus className="w-3 h-3" />
        </button>
        {onDeleteLesson && (
          <button
            onClick={handleDelete}
            className={`p-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity ${
              isSelected ? 'hover:bg-blue-800' : 'hover:bg-gray-200'
            }`}
            title="Delete lesson"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        )}
      </div>
      {expanded && (
        <div className="space-y-0.5">
          {slides.length === 0 ? (
            <div
              className="ml-8 px-2 py-1.5 text-xs text-gray-400 cursor-pointer hover:text-[#1E3A5F]"
              onClick={() => onAddSlide(lesson.id)}
            >
              + Add first slide
            </div>
          ) : (
            <SortableSlideList lessonId={lesson.id} slides={slides} onMoveSlide={onMoveSlide} />
          )}
        </div>
      )}
    </div>
  );
}
