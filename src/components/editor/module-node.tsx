'use client';

import { useState } from 'react';
import { ChevronRight, ChevronDown, Plus, Trash2 } from 'lucide-react';
import { LessonNode } from './lesson-node';
import { AddEntityDialog } from './add-entity-dialog';
import { useEditorStore } from './editor-store-context';
import type { ModuleData } from '@/lib/stores/editor-store';

interface ModuleNodeProps {
  module: ModuleData;
  onAddSlide: (lessonId: string) => void;
}

export function ModuleNode({ module, onAddSlide }: ModuleNodeProps) {
  const [expanded, setExpanded] = useState(true);
  const [showAddLesson, setShowAddLesson] = useState(false);
  const selectedEntity = useEditorStore((s) => s.selectedEntity);
  const selectEntity = useEditorStore((s) => s.selectEntity);
  const lessons = useEditorStore((s) => s.lessons.get(module.id) ?? []);
  const removeModule = useEditorStore((s) => s.removeModule);
  const isSelected = selectedEntity?.type === 'module' && selectedEntity.id === module.id;

  function handleAddLesson(_title: string) {
    // Lesson creation will be wired to DB in Task 2.1 expansion
    // For now, just close the dialog — full implementation in Task 2.5
    setShowAddLesson(false);
  }

  function handleDelete(e: React.MouseEvent) {
    e.stopPropagation();
    if (confirm(`Delete module "${module.title}" and all its content?`)) {
      removeModule(module.id);
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
            <div
              className="ml-4 px-2 py-1.5 text-xs text-gray-400 cursor-pointer hover:text-[#1E3A5F]"
              onClick={() => setShowAddLesson(true)}
            >
              + Add first lesson
            </div>
          ) : (
            lessons.map((lesson) => (
              <LessonNode key={lesson.id} lesson={lesson} onAddSlide={onAddSlide} />
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
