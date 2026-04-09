'use client';

import { Save, Undo2, Redo2, Eye, Play, Send, CheckCircle, Loader2, Monitor, Tablet, Smartphone, Keyboard } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useEditorStore } from './editor-store-context';
import type { DevicePreview } from '@/lib/canvas/canvas-utils';

interface EditorToolbarProps {
  onSave?: () => void;
  courseId?: string;
  devicePreview: DevicePreview;
  onDevicePreviewChange: (device: DevicePreview) => void;
  onPreviewLesson?: () => void;
  onShowShortcuts?: () => void;
}

const ACTION_LABELS: Record<string, string> = {
  addModule: 'add module', removeModule: 'delete module', updateModule: 'module edit',
  addLesson: 'add lesson', removeLesson: 'delete lesson', updateLesson: 'lesson edit',
  addSlide: 'add slide', removeSlide: 'delete slide', updateSlide: 'slide edit',
  addBlock: 'add block', removeBlock: 'delete block', updateBlock: 'block edit',
  reorderBlocks: 'reorder blocks', duplicateBlock: 'duplicate block',
  switchBlockType: 'change block type', deleteSelectedBlocks: 'delete blocks',
  reorderSlides: 'reorder slides',
};

export function EditorToolbar({ onSave, courseId, devicePreview, onDevicePreviewChange, onPreviewLesson, onShowShortcuts }: EditorToolbarProps) {
  const router = useRouter();
  const isDirty = useEditorStore((s) => s.isDirty);
  const isSaving = useEditorStore((s) => s.isSaving);
  const undo = useEditorStore((s) => s.undo);
  const redo = useEditorStore((s) => s.redo);
  const undoCount = useEditorStore((s) => s.undoStack.length);
  const redoCount = useEditorStore((s) => s.redoStack.length);
  const lastUndoAction = useEditorStore((s) => s.undoStack.at(-1));
  const lastRedoAction = useEditorStore((s) => s.redoStack.at(-1));
  const courseStatus = useEditorStore((s) => s.courseStatus);
  const lastSaveError = useEditorStore((s) => s.lastSaveError);
  const isPublishing = useEditorStore((s) => s.isPublishing);
  const publishError = useEditorStore((s) => s.publishError);
  const publishCourse = useEditorStore((s) => s.publishCourse);

  const isPublished = courseStatus === 'published';

  function handleUndo() {
    const action = lastUndoAction;
    undo();
    if (action) toast('Undone', { description: ACTION_LABELS[action.type] ?? action.type, duration: 1500, position: 'bottom-center' });
  }

  function handleRedo() {
    const action = lastRedoAction;
    redo();
    if (action) toast('Redone', { description: ACTION_LABELS[action.type] ?? action.type, duration: 1500, position: 'bottom-center' });
  }

  return (
    <div className="flex items-center justify-between px-4 py-2 bg-white/95 backdrop-blur-sm border-b border-gray-100 shrink-0 h-12">
      <div className="flex items-center gap-3">
        <span className="text-sm font-semibold text-gray-800 tracking-tight">Course Editor</span>
        {isSaving ? (
          <div className="flex items-center gap-1.5 bg-yellow-50 border border-yellow-200 text-yellow-600 text-[10px] font-semibold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
            <Loader2 className="w-2.5 h-2.5 animate-spin" />
            Saving
          </div>
        ) : lastSaveError ? (
          <div className="flex items-center gap-1.5 bg-red-50 border border-red-200 text-red-600 text-[10px] font-semibold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
            Save failed
          </div>
        ) : isDirty ? (
          <div className="flex items-center gap-1.5 bg-orange-50 border border-orange-200 text-orange-600 text-[10px] font-semibold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />
            Unsaved changes
          </div>
        ) : (
          <div className="flex items-center gap-1.5 bg-green-50 border border-green-200 text-green-600 text-[10px] font-semibold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
            Saved
          </div>
        )}
        {courseStatus === 'draft' && !isDirty && !isSaving && (
          <div className="bg-amber-50 border border-amber-200 text-amber-700 text-[10px] font-semibold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
            Draft
          </div>
        )}
      </div>
      <div className="flex items-center gap-2">
        {publishError && (
          <span className="text-red-500 text-xs">{publishError}</span>
        )}
        <div className="flex items-center gap-1">
        <button
          onClick={handleUndo}
          disabled={undoCount === 0}
          className="p-2 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors relative"
          title={`Undo (Ctrl+Z) — ${undoCount} action${undoCount !== 1 ? 's' : ''}`}
        >
          <Undo2 className="w-4 h-4 text-gray-600" />
          {undoCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[14px] h-[14px] flex items-center justify-center bg-[#1E3A5F] text-white text-[9px] font-bold rounded-full px-0.5">
              {undoCount}
            </span>
          )}
        </button>
        <button
          onClick={handleRedo}
          disabled={redoCount === 0}
          className="p-2 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          title="Redo (Ctrl+Shift+Z)"
        >
          <Redo2 className="w-4 h-4 text-gray-600" />
        </button>
        <div className="w-px h-5 bg-gray-200 mx-1" />
        <button
          onClick={onPreviewLesson}
          className="p-2 rounded hover:bg-gray-100 transition-colors"
          title="Preview lesson"
        >
          <Play className="w-4 h-4 text-gray-600" />
        </button>
        <button
          onClick={() => courseId && router.push(`/admin/courses/${courseId}/preview`)}
          className="p-2 rounded hover:bg-gray-100 transition-colors"
          title="Preview full course"
        >
          <Eye className="w-4 h-4 text-gray-600" />
        </button>
        <button
          onClick={onShowShortcuts}
          className="p-2 rounded hover:bg-gray-100 transition-colors"
          title="Keyboard shortcuts (?)"
        >
          <Keyboard className="w-4 h-4 text-gray-600" />
        </button>
        <div className="w-px h-5 bg-gray-200 mx-1" />
        <div className="flex items-center gap-0.5 bg-gray-50 rounded-lg p-0.5">
          <button
            onClick={() => onDevicePreviewChange('desktop')}
            className={`p-1.5 rounded-md transition-all duration-150 ${
              devicePreview === 'desktop'
                ? 'bg-white text-gray-700 shadow-sm'
                : 'text-gray-400 hover:text-gray-500'
            }`}
            title="Desktop preview"
          >
            <Monitor className="h-4 w-4" />
          </button>
          <button
            onClick={() => onDevicePreviewChange('tablet')}
            className={`p-1.5 rounded-md transition-all duration-150 ${
              devicePreview === 'tablet'
                ? 'bg-white text-gray-700 shadow-sm'
                : 'text-gray-400 hover:text-gray-500'
            }`}
            title="Tablet preview"
          >
            <Tablet className="h-4 w-4" />
          </button>
          <button
            onClick={() => onDevicePreviewChange('mobile')}
            className={`p-1.5 rounded-md transition-all duration-150 ${
              devicePreview === 'mobile'
                ? 'bg-white text-gray-700 shadow-sm'
                : 'text-gray-400 hover:text-gray-500'
            }`}
            title="Mobile preview"
          >
            <Smartphone className="h-4 w-4" />
          </button>
        </div>
        <div className="w-px h-5 bg-gray-200 mx-1" />
        <button
          onClick={onSave}
          disabled={!isDirty || isSaving}
          className="flex items-center gap-1.5 px-3.5 py-1.5 text-sm font-medium text-white bg-[#1E3A5F] rounded-lg hover:bg-[#162d4a] disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150 shadow-sm hover:shadow"
        >
          <Save className="w-3.5 h-3.5" />
          {isSaving ? 'Saving...' : 'Save'}
        </button>
        <button
          onClick={isPublished && !isDirty ? undefined : publishCourse}
          disabled={(isPublished && !isDirty) || isPublishing}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white rounded-lg transition-colors disabled:cursor-not-allowed ${
            isPublished && !isDirty
              ? 'bg-green-600 opacity-80'
              : 'bg-green-600 hover:bg-green-700'
          }`}
          title={isPublished && !isDirty ? 'Course is published' : isDirty ? 'Save & publish changes' : 'Publish course'}
        >
          {isPublishing ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : isPublished && !isDirty ? (
            <CheckCircle className="w-3.5 h-3.5" />
          ) : (
            <Send className="w-3.5 h-3.5" />
          )}
          {isPublished && !isDirty ? 'Published' : isPublishing ? 'Publishing...' : 'Publish'}
        </button>
        </div>
      </div>
    </div>
  );
}
