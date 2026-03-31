'use client';

import { useState, useEffect } from 'react';
import { createEditorStore } from '@/lib/stores/editor-store';
import { EditorStoreContext } from './editor-store-context';
import { EditorToolbar } from './editor-toolbar';
import { StructurePanel } from './structure-panel';
import { PreviewPanel } from './preview-panel';
import { PropertiesPanel } from './properties-panel';
import { EditorStatusBar } from './editor-status-bar';
import { createClient } from '@/lib/supabase/client';
import { loadEditorCourseData } from '@/lib/db/editor';

interface CourseEditorShellProps {
  courseId: string;
}

export function CourseEditorShell({ courseId }: CourseEditorShellProps) {
  const [store] = useState(() => createEditorStore());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        setIsLoading(true);
        const supabase = createClient();

        // Get current user's institution
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        const { data: userData } = await supabase
          .from('users')
          .select('institution_id')
          .eq('id', user.id)
          .single();

        if (!userData?.institution_id) throw new Error('No institution found for user');

        const data = await loadEditorCourseData(supabase, courseId, userData.institution_id);

        store.getState().loadCourse({
          courseId,
          modules: data.modules,
          lessons: data.lessonsByModule,
          slides: data.slidesByLesson,
          blocks: data.blocksBySlide,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load course');
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [courseId, store]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[#1E3A5F] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500">Loading editor...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <div className="text-center max-w-sm">
          <p className="text-red-600 font-medium mb-2">Failed to load course</p>
          <p className="text-sm text-gray-500">{error}</p>
        </div>
      </div>
    );
  }

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
