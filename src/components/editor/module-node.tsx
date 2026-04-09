'use client';

import { useState, useMemo } from 'react';
import { ChevronRight, ChevronDown, Plus, Trash2, FileText } from 'lucide-react';
import { LessonNode } from './lesson-node';
import { AddEntityDialog } from './add-entity-dialog';
import { useEditorStore } from './editor-store-context';
import type { ModuleData, LessonData } from '@/lib/stores/editor-store';

const EMPTY_LESSONS: LessonData[] = [];

interface ModuleNodeProps {
  module: ModuleData;
  onAddSlide: (lessonId: string) => void;
  onAddLesson?: (moduleId: string, title: string) => void;
  onDeleteLesson?: (lessonId: string) => void;
  onDeleteModule?: (moduleId: string) => void;
  onMoveSlide?: (slideId: string, fromLessonId: string, toLessonId: string) => void;
  onDuplicateSlide?: (slideId: string, lessonId: string) => void;
}

export function ModuleNode({ module, onAddSlide, onAddLesson, onDeleteLesson, onDeleteModule, onMoveSlide, onDuplicateSlide }: ModuleNodeProps) {
  const [expanded, setExpanded] = useState(true);
  const [showAddLesson, setShowAddLesson] = useState(false);
  const selectedEntity = useEditorStore((s) => s.selectedEntity);
  const selectEntity = useEditorStore((s) => s.selectEntity);
  const lessons = useEditorStore((s) => s.lessons.get(module.id) ?? EMPTY_LESSONS);
  const isSelected = selectedEntity?.type === 'module' && selectedEntity.id === module.id;

  function handleAddLesson(title: string) {
    if (onAddLesson) {
      onAddLesson(module.id, title);
    }
    setShowAddLesson(false);
  }

  function handleDelete(e: React.MouseEvent) {
    e.stopPropagation();
    if (onDeleteModule) {
      onDeleteModule(module.id);
    }
  }

  return (
    <div>
      <div
        className={`flex items-center gap-1 px-2 py-2 rounded cursor-pointer group transition-colors ${
          isSelected ? 'bg-[#0F172A] text-white' : 'hover:bg-gray-100 text-gray-800'
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
            <ChevronDown className="w-3.5 h-3.5" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5" />
          )}
        </button>
        <span
          className="text-sm font-medium truncate flex-1 min-w-0"
          onClick={() => selectEntity({ type: 'module', id: module.id })}
        >
          {module.title}
        </span>
        <span className={`text-xs shrink-0 ${isSelected ? 'text-gray-300' : 'text-gray-400'}`}>
          {lessons.length}
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowAddLesson(true);
          }}
          className={`p-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity ${
            isSelected ? 'hover:bg-gray-700' : 'hover:bg-gray-200'
          }`}
          title="Add lesson"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={handleDelete}
          className={`p-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity ${
            isSelected ? 'hover:bg-gray-700' : 'hover:bg-gray-200'
          }`}
          title="Delete module"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>

      {expanded && (
        <div className="space-y-0.5 mt-0.5">
          {lessons.length === 0 ? (
            <div className="ml-4 py-2 px-2">
              <div className="flex items-center gap-2.5 p-2.5 rounded-lg border border-dashed border-gray-200 bg-gray-50/50">
                <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                  <FileText className="w-3.5 h-3.5 text-blue-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] text-gray-400">No lessons yet</p>
                  <button
                    onClick={() => setShowAddLesson(true)}
                    className="text-[11px] text-[#1E3A5F] font-medium hover:underline"
                  >
                    + Add a lesson
                  </button>
                </div>
              </div>
            </div>
          ) : (
            lessons.map((lesson) => (
              <LessonNode key={lesson.id} lesson={lesson} onAddSlide={onAddSlide} onDeleteLesson={onDeleteLesson} onMoveSlide={onMoveSlide} onDuplicateSlide={onDuplicateSlide} />
            ))
          )}
        </div>
      )}

      {showAddLesson && (
        <AddEntityDialog
          entityType="lesson"
          onAdd={handleAddLesson}
          onClose={() => setShowAddLesson(false)}
        />
      )}
    </div>
  );
}
