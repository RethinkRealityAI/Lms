'use client';

import { Save, Undo2, Redo2, Eye, Send } from 'lucide-react';
import { useEditorStore } from './editor-store-context';

interface EditorToolbarProps {
  onSave?: () => void;
}

export function EditorToolbar({ onSave }: EditorToolbarProps) {
  const isDirty = useEditorStore((s) => s.isDirty);
  const isSaving = useEditorStore((s) => s.isSaving);
  const undo = useEditorStore((s) => s.undo);
  const redo = useEditorStore((s) => s.redo);
  const undoCount = useEditorStore((s) => s.undoStack.length);
  const redoCount = useEditorStore((s) => s.redoStack.length);

  return (
    <div className="flex items-center justify-between px-4 py-2 bg-white border-b border-gray-200 shrink-0 h-12">
      <div className="flex items-center gap-3">
        <span className="text-sm font-semibold text-[#0F172A]">Course Editor</span>
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={undo}
          disabled={undoCount === 0}
          className="p-2 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          title="Undo (Ctrl+Z)"
        >
          <Undo2 className="w-4 h-4 text-gray-600" />
        </button>
        <button
          onClick={redo}
          disabled={redoCount === 0}
          className="p-2 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          title="Redo (Ctrl+Shift+Z)"
        >
          <Redo2 className="w-4 h-4 text-gray-600" />
        </button>
        <div className="w-px h-5 bg-gray-200 mx-1" />
        <button
          className="p-2 rounded hover:bg-gray-100 transition-colors"
          title="Preview"
        >
          <Eye className="w-4 h-4 text-gray-600" />
        </button>
        <div className="w-px h-5 bg-gray-200 mx-1" />
        <button
          onClick={onSave}
          disabled={!isDirty || isSaving}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-[#1E3A5F] rounded-lg hover:bg-[#162d4a] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Save className="w-3.5 h-3.5" />
          {isSaving ? 'Saving...' : 'Save'}
        </button>
        <button className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors">
          <Send className="w-3.5 h-3.5" />
          Publish
        </button>
      </div>
    </div>
  );
}
