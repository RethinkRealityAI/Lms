'use client';

import { useState, useEffect, useCallback, useContext } from 'react';
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
import { updateSlide as dbUpdateSlide, deleteSlide as dbDeleteSlide } from '@/lib/db/slides';
import { createModule as dbCreateModule, deleteModule as dbDeleteModule } from '@/lib/db/modules';
import { createLesson as dbCreateLesson } from '@/lib/db/lessons';
import { useAutoSave } from '@/lib/hooks/use-auto-save';
import { useKeyboardShortcuts } from '@/lib/hooks/use-keyboard-shortcuts';
import type { ModuleData, LessonData } from '@/lib/stores/editor-store';

interface CourseEditorShellProps {
  courseId: string;
}

// Inner component — has access to editor store via context
function EditorContent({ courseId }: { courseId: string }) {
  const store = useContext(EditorStoreContext);

  const isDirty = useEditorStore((s) => s.isDirty);
  const undo = useEditorStore((s) => s.undo);
  const redo = useEditorStore((s) => s.redo);
  const markSaved = useEditorStore((s) => s.markSaved);
  const institutionId = useEditorStore((s) => s.institutionId);
  const addModule = useEditorStore((s) => s.addModule);
  const addLesson = useEditorStore((s) => s.addLesson);
  const addSlide = useEditorStore((s) => s.addSlide);

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

  // ── Persistence: save ──────────────────────────────────────────────────────

  const handleSave = useCallback(async () => {
    if (!institutionId || !store) return;
    const supabase = createClient();
    const state = store.getState();
    const slidePromises: Promise<void>[] = [];
    for (const slideList of state.slides.values()) {
      for (const slide of slideList) {
        slidePromises.push(
          dbUpdateSlide(
            supabase,
            slide.id,
            {
              title: slide.title,
              slide_type: slide.slide_type,
              order_index: slide.order_index,
              status: slide.status,
              settings: slide.settings,
            },
            institutionId,
          ).then(() => undefined).catch((err) => {
            console.warn('Failed to save slide', slide.id, err);
          }),
        );
      }
    }
    await Promise.all(slidePromises);
    markSaved();
  }, [institutionId, store, markSaved]);

  const { saveNow } = useAutoSave(isDirty, handleSave);

  // ── Persistence: add module ────────────────────────────────────────────────

  const handleAddModule = useCallback(async (title: string) => {
    if (!courseId || !institutionId) return;
    try {
      const supabase = createClient();
      const newModule = await dbCreateModule(supabase, { courseId, title, institutionId });
      const moduleData: ModuleData = {
        id: newModule.id,
        title: newModule.title,
        course_id: newModule.course_id,
        order_index: newModule.order_index,
      };
      addModule(moduleData);
    } catch (err) {
      console.error('Failed to add module:', err);
    }
  }, [courseId, institutionId, addModule]);

  // ── Persistence: add lesson ────────────────────────────────────────────────

  const handleAddLesson = useCallback(async (moduleId: string, title: string) => {
    if (!institutionId) return;
    try {
      const supabase = createClient();
      const newLesson = await dbCreateLesson(supabase, { moduleId, title, institutionId });
      // course_id comes from the module — look it up from current state
      const state = store?.getState();
      const mod = state?.modules.find((m) => m.id === moduleId);
      const lessonData: LessonData = {
        id: newLesson.id,
        title: newLesson.title,
        module_id: newLesson.module_id,
        course_id: mod?.course_id ?? courseId,
        order_index: newLesson.order_index,
      };
      addLesson(moduleId, lessonData);
    } catch (err) {
      console.error('Failed to add lesson:', err);
    }
  }, [courseId, institutionId, store, addLesson]);

  // ── Persistence: add slide (DB-first) ─────────────────────────────────────

  const handleAddSlide = useCallback(async (lessonId: string, slideData: Parameters<typeof addSlide>[1]) => {
    if (!institutionId) return;
    try {
      const { createSlide: dbCreateSlide } = await import('@/lib/db/slides');
      const supabase = createClient();
      const existing = store?.getState().slides.get(lessonId) ?? [];
      const slide = await dbCreateSlide(
        supabase,
        {
          lesson_id: lessonId,
          slide_type: slideData.slide_type,
          title: slideData.title ?? undefined,
          order_index: existing.length,
          status: slideData.status ?? 'draft',
          settings: slideData.settings ?? {},
        },
        institutionId,
      );
      addSlide(lessonId, slide);
    } catch (err) {
      console.error('Failed to add slide:', err);
    }
  }, [institutionId, store, addSlide]);

  // ── Persistence: delete ────────────────────────────────────────────────────

  const handleDeleteKey = useCallback(() => {
    if (selectedEntity?.type === 'module' || selectedEntity?.type === 'slide') {
      setDeleteDialogOpen(true);
    }
    // lesson: removeLesson not yet implemented — skip for now
  }, [selectedEntity]);

  const handleDeleteConfirm = useCallback(async () => {
    setDeleteDialogOpen(false);
    if (!selectedEntity || !institutionId) return;
    const supabase = createClient();
    if (selectedEntity.type === 'module') {
      try {
        await dbDeleteModule(supabase, selectedEntity.id, institutionId);
        removeModule(selectedEntity.id);
      } catch (err) {
        console.error('Failed to delete module:', err);
        // Don't remove from store — DB delete failed
      }
      return;
    }
    if (selectedEntity.type === 'slide') {
      for (const [lessonId, slideList] of slides) {
        if (slideList.some((s) => s.id === selectedEntity.id)) {
          try {
            await dbDeleteSlide(supabase, selectedEntity.id, institutionId);
            removeSlide(lessonId, selectedEntity.id);
          } catch (err) {
            console.error('Failed to delete slide:', err);
            // Don't remove from store — DB delete failed
          }
          break;
        }
      }
      return;
    }
    // lesson: removeLesson not yet implemented — dialog will not open for lessons (see handleDeleteKey)
  }, [selectedEntity, institutionId, removeModule, removeSlide, slides]);

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
        <StructurePanel
          onAddModule={handleAddModule}
          onAddLesson={handleAddLesson}
          onAddSlide={handleAddSlide}
        />
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
