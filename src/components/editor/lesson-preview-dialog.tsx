'use client';

import { createPortal } from 'react-dom';
import { X, Play } from 'lucide-react';
import CourseViewer from '@/components/student/course-viewer';

interface LessonPreviewDialogProps {
  courseId: string;
  onClose: () => void;
}

export function LessonPreviewDialog({ courseId, onClose }: LessonPreviewDialogProps) {
  return createPortal(
    <div className="fixed inset-0 z-[100] flex flex-col bg-white">
      {/* Banner */}
      <div className="shrink-0 h-12 bg-[#1E3A5F] flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <Play className="h-4 w-4 text-white/70" />
          <span className="text-white text-sm font-semibold">Lesson Preview</span>
          <span className="text-white/50 text-xs">Student view — no progress is saved</span>
        </div>
        <button
          onClick={onClose}
          className="flex items-center gap-2 text-white/80 hover:text-white text-sm transition-colors"
        >
          <span>Back to Editor</span>
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Course viewer */}
      <div className="flex-1 min-h-0">
        <CourseViewer courseId={courseId} previewMode />
      </div>
    </div>,
    document.body,
  );
}
