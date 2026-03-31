'use client';

import { CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { useEditorStore } from './editor-store-context';

export function EditorStatusBar() {
  const isDirty = useEditorStore((s) => s.isDirty);
  const isSaving = useEditorStore((s) => s.isSaving);

  return (
    <div className="flex items-center justify-between px-4 py-1.5 bg-white border-t border-gray-200 shrink-0">
      <div className="flex items-center gap-1.5">
        {isSaving ? (
          <>
            <Clock className="w-3 h-3 text-amber-500" />
            <span className="text-xs text-amber-600">Saving...</span>
          </>
        ) : isDirty ? (
          <>
            <AlertCircle className="w-3 h-3 text-amber-500" />
            <span className="text-xs text-amber-600">Unsaved changes</span>
          </>
        ) : (
          <>
            <CheckCircle className="w-3 h-3 text-green-500" />
            <span className="text-xs text-green-600">All changes saved</span>
          </>
        )}
      </div>
    </div>
  );
}
