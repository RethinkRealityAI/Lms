'use client';

import React, { useState } from 'react';
import { ChevronRight, FolderOpen, FileText } from 'lucide-react';

interface MoveSlideDialogProps {
  modules: { id: string; title: string }[];
  lessons: Map<string, { id: string; title: string }[]>;
  currentLessonId: string;
  onMove: (targetLessonId: string) => void;
  onClose: () => void;
}

export function MoveSlideDialog({
  modules,
  lessons,
  currentLessonId,
  onMove,
  onClose,
}: MoveSlideDialogProps) {
  const [expandedModule, setExpandedModule] = useState<string | null>(null);

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-2xl w-80 max-h-96 flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-4 py-3 border-b border-slate-100">
          <h3 className="text-sm font-bold text-slate-900">Move slide to...</h3>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {modules.map(mod => (
            <div key={mod.id}>
              <button
                onClick={() => setExpandedModule(expandedModule === mod.id ? null : mod.id)}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-lg"
              >
                <FolderOpen className="w-4 h-4 text-slate-400" />
                <span className="flex-1 text-left truncate">{mod.title}</span>
                <ChevronRight
                  className={`w-4 h-4 text-slate-400 transition-transform ${
                    expandedModule === mod.id ? 'rotate-90' : ''
                  }`}
                />
              </button>
              {expandedModule === mod.id && (
                <div className="ml-4">
                  {(lessons.get(mod.id) ?? []).map(lesson => (
                    <button
                      key={lesson.id}
                      disabled={lesson.id === currentLessonId}
                      onClick={() => {
                        onMove(lesson.id);
                        onClose();
                      }}
                      className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg ${
                        lesson.id === currentLessonId
                          ? 'text-slate-300 cursor-not-allowed'
                          : 'text-slate-600 hover:bg-blue-50 hover:text-[#1E3A5F]'
                      }`}
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span className="truncate">{lesson.title}</span>
                      {lesson.id === currentLessonId && (
                        <span className="text-xs text-slate-300 ml-auto">(current)</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
