'use client';

import { useState } from 'react';
import { createEditorStore } from '@/lib/stores/editor-store';
import { EditorStoreContext } from './editor-store-context';
import { EditorToolbar } from './editor-toolbar';
import { StructurePanel } from './structure-panel';
import { PreviewPanel } from './preview-panel';
import { PropertiesPanel } from './properties-panel';
import { EditorStatusBar } from './editor-status-bar';

interface CourseEditorShellProps {
  courseId: string;
}

export function CourseEditorShell({ courseId }: CourseEditorShellProps) {
  const [store] = useState(() => createEditorStore());

  return (
    <EditorStoreContext.Provider value={store}>
      <div className="flex flex-col h-screen bg-gray-100 overflow-hidden">
        <EditorToolbar />
        <div className="flex flex-1 min-h-0">
          <StructurePanel />
          <PreviewPanel />
          <PropertiesPanel />
        </div>
        <EditorStatusBar />
      </div>
    </EditorStoreContext.Provider>
  );
}
