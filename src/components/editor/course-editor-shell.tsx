'use client';

import { useState, useEffect, useCallback } from 'react';
import { createEditorStore } from '@/lib/stores/editor-store';
import { EditorStoreContext, useEditorStore } from './editor-store-context';
import { EditorToolbar } from './editor-toolbar';
import { StructurePanel } from './structure-panel';
import { PreviewPanel } from './preview-panel';
import { PropertiesPanel } from './properties-panel';
import { EditorStatusBar } from './editor-status-bar';
import { DeleteConfirmDialog } from './delete-confirm-dialog';
import { createClient } from '@/lib/supabase/client';
import { loadEditorCourseData } from '@/lib/db/editor';
import { getUserInstitutionId } from '@/lib/db/users';
import { useAutoSave } from '@/lib/hooks/use-auto-save';
import { useKeyboardShortcuts } from '@/lib/hooks/use-keyboard-shortcuts';

interface CourseEditorShellProps {
  courseId: string;
}

// Inner component — has access to editor store via context
function EditorContent({ courseId: _courseId }: { courseId: string }) {
  const isDirty = useEditorStore((s) => s.isDirty);
  const undo = useEditorStore((s) => s.undo);
  const redo = useEditorStore((s) => s.redo);
  const markSaved = useEditorStore((s) => s.markSaved);

  const selectedEntity = useEditorStore((s) => s.selectedEntity);
  const removeModule = useEditorStore((s) => s.removeModule);
  const removeSlide = useEditorStore((s) => s.removeSlide);
  const slides = useEditorStore((s) => s.slides);

  const previewSlideIndex = useEditorStore((s) => s.previewSlideIndex);
  const setPreviewSlideIndex = useEditorStore((s) => s.setPreviewSlideIndex);
  const selectedLessonSlides = useEditorStore((s) => {
    if (!s.selectedEntity) return 0;
    const type = s.selectedEntity.type;
    if (type === 'lesson') return s.slides.get(s.selectedEntity.id)?.length ?? 0;
    return 0;
  });

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const handleSave = useCallback(async () => {
    // TODO in Task 5: persist to DB; for now just mark clean
    markSaved();
  }, [markSaved]);

  const { saveNow } = useAutoSave(isDirty, handleSave);

  const handleDeleteKey = useCallback(() => {
    if (selectedEntity?.type === 'module' || selectedEntity?.type === 'slide') {
      setDeleteDialogOpen(true);
    }
    // lesson: removeLesson not yet implemented — skip for now
  }, [selectedEntity]);

  const handleDeleteConfirm = useCallback(() => {
    setDeleteDialogOpen(false);
    if (!selectedEntity) return;
    if (selectedEntity.type === 'module') {
      removeModule(selectedEntity.id);
      return;
    }
    if (selectedEntity.type === 'slide') {
      for (const [lessonId, slideList] of slides) {
        if (slideList.some((s) => s.id === selectedEntity.id)) {
          removeSlide(lessonId, selectedEntity.id);
          break;
        }
      }
      return;
    }
    // lesson: removeLesson not yet implemented — dialog will not open for lessons (see handleDeleteKey)
  }, [selectedEntity, removeModule, removeSlide, slides]);

  const handlePrevSlide = useCallback(() => {
    if (selectedLessonSlides === 0) return; // no lesson in context, can't navigate
    if (previewSlideIndex > 0) setPreviewSlideIndex(previewSlideIndex - 1);
  }, [previewSlideIndex, selectedLessonSlides, setPreviewSlideIndex]);

  const handleNextSlide = useCallback(() => {
    if (selectedLessonSlides === 0) return; // no lesson in context, can't navigate
    const maxIndex = selectedLessonSlides - 1;
    if (previewSlideIndex < maxIndex) setPreviewSlideIndex(previewSlideIndex + 1);
  }, [previewSlideIndex, selectedLessonSlides, setPreviewSlideIndex]);

  useKeyboardShortcuts({
    onSave: saveNow,
    onUndo: undo,
    onRedo: redo,
    onDelete: handleDeleteKey,
    onPrevSlide: handlePrevSlide,
    onNextSlide: handleNextSlide,
  });

  // Warn on unsaved changes
  useEffect(() => {
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      if (isDirty) {
        e.preventDefault();
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  const deleteEntityType =
    selectedEntity?.type === 'module' || selectedEntity?.type === 'slide'
      ? selectedEntity.type
      : null;

  return (
    <>
      <EditorToolbar onSave={saveNow} />
      <div className="flex flex-1 min-h-0">
        <StructurePanel />
        <PreviewPanel />
        <PropertiesPanel />
      </div>
      <EditorStatusBar />
      <DeleteConfirmDialog
        open={deleteDialogOpen}
        entityType={deleteEntityType}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteDialogOpen(false)}
      />
    </>
  );
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

        const institutionId = await getUserInstitutionId(supabase, user.id);
        if (!institutionId) throw new Error('No institution found for user');

        const data = await loadEditorCourseData(supabase, courseId, institutionId);

        store.getState().loadCourse({
          courseId,
          institutionId,
          courseStatus: data.course.status as import('@/types').CourseStatus,
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
        <EditorContent courseId={courseId} />
      </div>
    </EditorStoreContext.Provider>
  );
}
