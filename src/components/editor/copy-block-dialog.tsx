'use client';

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronRight, FolderOpen, FileText, Layers } from 'lucide-react';

interface CopyBlockDialogProps {
  modules: { id: string; title: string }[];
  lessons: Map<string, { id: string; title: string }[]>;
  slides: Map<string, { id: string; order_index: number }[]>;
  onCopy: (targetSlideId: string, targetLessonId: string) => void;
  onClose: () => void;
}

export function CopyBlockDialog({
  modules,
  lessons,
  slides,
  onCopy,
  onClose,
}: CopyBlockDialogProps) {
  const [expandedModule, setExpandedModule] = useState<string | null>(null);
  const [expandedLesson, setExpandedLesson] = useState<string | null>(null);

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-2xl w-80 max-h-[28rem] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-4 py-3 border-b border-slate-100">
          <h3 className="text-sm font-bold text-slate-900">Copy block to...</h3>
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
                <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform ${expandedModule === mod.id ? 'rotate-90' : ''}`} />
              </button>
              {expandedModule === mod.id && (lessons.get(mod.id) ?? []).map(lesson => (
                <div key={lesson.id} className="ml-4">
                  <button
                    onClick={() => setExpandedLesson(expandedLesson === lesson.id ? null : lesson.id)}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50 rounded-lg"
                  >
                    <FileText className="w-3.5 h-3.5 text-slate-400" />
                    <span className="flex-1 text-left truncate">{lesson.title}</span>
                    <ChevronRight className={`w-3.5 h-3.5 text-slate-400 transition-transform ${expandedLesson === lesson.id ? 'rotate-90' : ''}`} />
                  </button>
                  {expandedLesson === lesson.id && (slides.get(lesson.id) ?? []).map((slide, idx) => (
                    <button
                      key={slide.id}
                      onClick={() => {
                        onCopy(slide.id, lesson.id);
                        onClose();
                      }}
                      className="w-full flex items-center gap-2 px-3 py-1 text-sm text-slate-500 hover:bg-blue-50 hover:text-[#1E3A5F] rounded-lg ml-4"
                    >
                      <Layers className="w-3 h-3 text-slate-400" />
                      <span>Slide {idx + 1}</span>
                    </button>
                  ))}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>,
    document.body,
  );
}
