'use client';

import { useState, useEffect, useCallback, useContext } from 'react';
import { toast } from 'sonner';
import { createEditorStore } from '@/lib/stores/editor-store';
import { EditorStoreContext, useEditorStore } from './editor-store-context';
import { EditorToolbar } from './editor-toolbar';
import { StructurePanel } from './structure-panel';
import { PreviewPanel } from './preview-panel';
import { PropertiesPanel } from './properties-panel';
import { EditorStatusBar } from './editor-status-bar';
import { EditorDndContext } from './dnd/editor-dnd-context';
import { DeleteConfirmDialog } from './delete-confirm-dialog';
import { createClient } from '@/lib/supabase/client';
import { loadEditorCourseData } from '@/lib/db/editor';
import { getUserInstitutionId } from '@/lib/db/users';
import { updateSlide as dbUpdateSlide, deleteSlide as dbDeleteSlide } from '@/lib/db/slides';
import { updateBlock as dbUpdateBlock, createBlock as dbCreateBlock, deleteBlock as dbDeleteBlock } from '@/lib/db/blocks';
import { createModule as dbCreateModule, deleteModule as dbDeleteModule, updateModule as dbUpdateModule } from '@/lib/db/modules';
import { createLesson as dbCreateLesson, deleteLesson as dbDeleteLesson, updateLesson as dbUpdateLesson } from '@/lib/db/lessons';
import { useAutoSave } from '@/lib/hooks/use-auto-save';
import { useKeyboardShortcuts } from '@/lib/hooks/use-keyboard-shortcuts';
import type { ModuleData, LessonData, BlockData } from '@/lib/stores/editor-store';

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
  const addBlock = useEditorStore((s) => s.addBlock);

  const selectedEntity = useEditorStore((s) => s.selectedEntity);
  const selectEntity = useEditorStore((s) => s.selectEntity);
  const removeModule = useEditorStore((s) => s.removeModule);
  const removeLesson = useEditorStore((s) => s.removeLesson);
  const removeSlide = useEditorStore((s) => s.removeSlide);
  const removeBlock = useEditorStore((s) => s.removeBlock);
  const blocks = useEditorStore((s) => s.blocks);
  const slides = useEditorStore((s) => s.slides);
  const reorderBlocks = useEditorStore((s) => s.reorderBlocks);

  const previewSlideIndex = useEditorStore((s) => s.previewSlideIndex);
  const setPreviewSlideIndex = useEditorStore((s) => s.setPreviewSlideIndex);
  const selectedLessonSlides = useEditorStore((s) => {
    if (!s.selectedEntity) return 0;
    const type = s.selectedEntity.type;
    if (type === 'lesson') return s.slides.get(s.selectedEntity.id)?.length ?? 0;
    return 0;
  });

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [structureCollapsed, setStructureCollapsed] = useState(false);
  const [propertiesCollapsed, setPropertiesCollapsed] = useState(false);

  // ── Persistence: save ──────────────────────────────────────────────────────

  const handleSave = useCallback(async () => {
    if (!institutionId || !store) return;
    const supabase = createClient();
    const state = store.getState();
    let failCount = 0;

    const tracked = <T,>(promise: Promise<T>, label: string): Promise<void> =>
      promise.then(() => undefined).catch((err) => {
        failCount++;
        console.error(`Failed to save ${label}:`, err);
      });

    const slidePromises: Promise<void>[] = [];
    for (const slideList of state.slides.values()) {
      for (const slide of slideList) {
        slidePromises.push(
          tracked(
            dbUpdateSlide(supabase, slide.id, {
              title: slide.title,
              slide_type: slide.slide_type,
              order_index: slide.order_index,
              status: slide.status,
              settings: slide.settings,
            }, institutionId),
            `slide ${slide.id}`,
          ),
        );
      }
    }

    const blockPromises: Promise<void>[] = [];
    for (const blockList of state.blocks.values()) {
      for (const block of blockList) {
        blockPromises.push(
          tracked(
            dbUpdateBlock(supabase, block.id, { data: block.data }, institutionId),
            `block ${block.id}`,
          ),
        );
      }
    }

    const modulePromises: Promise<void>[] = state.modules.map((mod) =>
      tracked(
        dbUpdateModule(supabase, mod.id, { title: mod.title, description: mod.description }),
        `module ${mod.id}`,
      ),
    );

    const lessonPromises: Promise<void>[] = [];
    for (const lessonList of state.lessons.values()) {
      for (const lesson of lessonList) {
        lessonPromises.push(
          tracked(
            dbUpdateLesson(supabase, lesson.id, { title: lesson.title, description: lesson.description, title_image_url: lesson.title_image_url ?? null }),
            `lesson ${lesson.id}`,
          ),
        );
      }
    }

    await Promise.all([...slidePromises, ...blockPromises, ...modulePromises, ...lessonPromises]);

    if (failCount > 0) {
      toast.error('Some changes failed to save', {
        description: `${failCount} item(s) could not be saved. Your changes are preserved locally — try saving again.`,
        duration: 6000,
      });
      // Keep isDirty = true so auto-save will retry
    } else {
      markSaved();
    }
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
      const msg = err instanceof Error ? err.message : (err as any)?.message ?? JSON.stringify(err);
      console.error('Failed to add module:', msg, err);
    }
  }, [courseId, institutionId, addModule]);

  // ── Persistence: add lesson ────────────────────────────────────────────────

  const handleAddLesson = useCallback(async (moduleId: string, title: string) => {
    if (!institutionId) return;
    try {
      const supabase = createClient();
      // Resolve course_id: prefer the module's stored course_id, fall back to shell prop
      const state = store?.getState();
      const mod = state?.modules.find((m) => m.id === moduleId);
      const resolvedCourseId = mod?.course_id ?? courseId;
      const newLesson = await dbCreateLesson(supabase, {
        moduleId,
        courseId: resolvedCourseId,
        title,
        institutionId,
      });
      const lessonData: LessonData = {
        id: newLesson.id,
        title: newLesson.title,
        module_id: newLesson.module_id,
        course_id: newLesson.course_id ?? resolvedCourseId,
        order_index: newLesson.order_index,
      };
      addLesson(moduleId, lessonData);
    } catch (err) {
      const msg = err instanceof Error ? err.message : (err as any)?.message ?? JSON.stringify(err);
      console.error('Failed to add lesson:', msg, err);
    }
  }, [courseId, institutionId, store, addLesson]);

  // ── Delete request handlers (select entity + open dialog; actual delete in handleDeleteConfirm) ──

  const handleRequestDeleteLesson = useCallback((lessonId: string) => {
    selectEntity({ type: 'lesson', id: lessonId });
    setDeleteDialogOpen(true);
  }, [selectEntity]);

  const handleRequestDeleteModule = useCallback((moduleId: string) => {
    selectEntity({ type: 'module', id: moduleId });
    setDeleteDialogOpen(true);
  }, [selectEntity]);

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

      // Select the new slide immediately
      selectEntity({ type: 'slide', id: slide.id });

      // Auto-add appropriate block based on slide type
      let defaultBlockType = null;
      switch (slide.slide_type) {
        case 'interactive':
        case 'quiz':
          defaultBlockType = 'quiz_inline';
          break;
        case 'media':
          defaultBlockType = 'video';
          break;
        case 'content':
        case 'title':
        case 'disclaimer':
          defaultBlockType = 'rich_text';
          break;
        case 'cta':
          defaultBlockType = 'cta';
          break;
      }

      if (defaultBlockType) {
        // We do this immediately so by the time the user sees it, the block is already there.
        const defaultData = getDefaultBlockData(defaultBlockType);
        const { createBlock: dbCreateBlock } = await import('@/lib/db/blocks');
        const blockResult = await dbCreateBlock(supabase, {
          lesson_id: lessonId,
          slide_id: slide.id,
          block_type: defaultBlockType,
          data: defaultData,
          order_index: 0,
          institution_id: institutionId,
        });
        addBlock(slide.id, {
          id: blockResult.id,
          slide_id: blockResult.slide_id,
          block_type: blockResult.block_type,
          data: blockResult.data,
          order_index: blockResult.order_index,
          is_visible: blockResult.is_visible,
        });
        // Select the newly created block inside the slide!
        selectEntity({ type: 'block', id: blockResult.id });
      }

    } catch (err) {
      const msg = err instanceof Error ? err.message : (err as any)?.message ?? JSON.stringify(err);
      console.error('Failed to add slide:', msg, err);
    }
  }, [institutionId, store, addSlide, addBlock, selectEntity]);

  // ── Persistence: add block to a slide (DB-first) ──────────────────────────

  const handleAddBlock = useCallback(async (slideId: string, blockType: string, insertIndex?: number) => {
    if (!institutionId) return;
    try {
      const state = store!.getState();
      let lessonId: string | undefined;
      for (const [lId, slideList] of state.slides) {
        if (slideList.some(s => s.id === slideId)) {
          lessonId = lId;
          break;
        }
      }
      if (!lessonId) throw new Error('Could not resolve lesson_id for block insertion.');

      const supabase = createClient();
      const existingBlocks = state.blocks.get(slideId) ?? [];
      const orderIndex = insertIndex != null ? insertIndex : existingBlocks.length;

      // If inserting in the middle, shift subsequent blocks' order_index
      if (insertIndex != null && insertIndex < existingBlocks.length) {
        const blocksToShift = existingBlocks.filter(b => b.order_index >= insertIndex);
        for (const b of blocksToShift) {
          await supabase
            .from('lesson_blocks')
            .update({ order_index: b.order_index + 1 })
            .eq('id', b.id);
        }
      }

      const defaultData = getDefaultBlockData(blockType);
      const result = await dbCreateBlock(supabase, {
        lesson_id: lessonId,
        slide_id: slideId,
        block_type: blockType,
        data: defaultData,
        order_index: orderIndex,
        institution_id: institutionId,
      });
      const blockData: BlockData = {
        id: result.id,
        slide_id: result.slide_id,
        block_type: result.block_type,
        data: result.data,
        order_index: result.order_index,
        is_visible: result.is_visible,
      };
      addBlock(slideId, blockData);
      // Select the new block for editing
      selectEntity({ type: 'block', id: result.id });
    } catch (err) {
      const msg = err instanceof Error ? err.message : (err as any)?.message ?? JSON.stringify(err);
      console.error('Failed to add block:', msg, err);
    }
  }, [institutionId, store, addBlock, selectEntity]);

  const handleReorderBlocks = useCallback((slideId: string, blockIds: string[]) => {
    reorderBlocks(slideId, blockIds);
  }, [reorderBlocks]);

  const getSlideBlocks = useCallback((slideId: string) => {
    const state = store?.getState();
    return state?.blocks.get(slideId) ?? [];
  }, [store]);

  const activeSlideId = (() => {
    if (!selectedEntity) return null;
    if (selectedEntity.type === 'slide') return selectedEntity.id;
    if (selectedEntity.type === 'block') {
      const state = store?.getState();
      if (!state) return null;
      for (const [slideId, blockList] of state.blocks) {
        if (blockList.some(b => b.id === selectedEntity.id)) return slideId;
      }
    }
    return null;
  })();

  // ── Persistence: delete ────────────────────────────────────────────────────

  const handleDeleteKey = useCallback(() => {
    if (
      selectedEntity?.type === 'module' ||
      selectedEntity?.type === 'lesson' ||
      selectedEntity?.type === 'slide' ||
      selectedEntity?.type === 'block'
    ) {
      setDeleteDialogOpen(true);
    }
  }, [selectedEntity]);

  const handleDeleteConfirm = useCallback(async () => {
    setDeleteDialogOpen(false);
    if (!selectedEntity || !institutionId) return;
    const supabase = createClient();
    if (selectedEntity.type === 'module') {
      try {
        await dbDeleteModule(supabase, selectedEntity.id, institutionId);
        removeModule(selectedEntity.id);
        selectEntity(null);
      } catch (err) {
        console.error('Failed to delete module:', err);
      }
      return;
    }
    if (selectedEntity.type === 'lesson') {
      const state = store!.getState();
      let owningModuleId: string | null = null;
      for (const [mId, lessonList] of state.lessons) {
        if (lessonList.some((l) => l.id === selectedEntity.id)) {
          owningModuleId = mId;
          break;
        }
      }
      if (owningModuleId) {
        try {
          await dbDeleteLesson(supabase, selectedEntity.id);
          removeLesson(owningModuleId, selectedEntity.id);
          // Select parent module
          selectEntity({ type: 'module', id: owningModuleId });
        } catch (err) {
          console.error('Failed to delete lesson:', err);
        }
      }
      return;
    }
    if (selectedEntity.type === 'slide') {
      for (const [lessonId, slideList] of slides) {
        if (slideList.some((s) => s.id === selectedEntity.id)) {
          try {
            await dbDeleteSlide(supabase, selectedEntity.id, institutionId);
            removeSlide(lessonId, selectedEntity.id);
            // Select parent lesson
            selectEntity({ type: 'lesson', id: lessonId });
          } catch (err) {
            console.error('Failed to delete slide:', err);
          }
          break;
        }
      }
      return;
    }
    if (selectedEntity.type === 'block') {
      // Find which slide owns this block
      for (const [slideId, blockList] of blocks) {
        if (blockList.some((b) => b.id === selectedEntity.id)) {
          try {
            await dbDeleteBlock(supabase, selectedEntity.id);
            removeBlock(slideId, selectedEntity.id);
            // Stay on the parent slide instead of clearing selection
            selectEntity({ type: 'slide', id: slideId });
          } catch (err) {
            console.error('Failed to delete block:', err);
          }
          break;
        }
      }
      return;
    }
  }, [selectedEntity, institutionId, store, removeModule, removeLesson, removeSlide, removeBlock, blocks, slides, selectEntity]);

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
    selectedEntity?.type === 'module' ||
    selectedEntity?.type === 'lesson' ||
    selectedEntity?.type === 'slide' ||
    selectedEntity?.type === 'block'
      ? selectedEntity.type
      : null;

  return (
    <>
      <EditorToolbar onSave={saveNow} courseId={courseId} />
      <EditorDndContext
        onAddBlock={handleAddBlock}
        onReorderBlocks={handleReorderBlocks}
        getSlideBlocks={getSlideBlocks}
        activeSlideId={activeSlideId}
      >
        <div className="flex flex-1 min-h-0">
          <StructurePanel
            collapsed={structureCollapsed}
            onToggleCollapse={() => setStructureCollapsed((c) => !c)}
            onAddModule={handleAddModule}
            onAddLesson={handleAddLesson}
            onDeleteLesson={handleRequestDeleteLesson}
            onDeleteModule={handleRequestDeleteModule}
            onAddSlide={handleAddSlide}
          />
          <PreviewPanel
            onAddBlock={handleAddBlock}
            onDeleteBlock={(blockId) => {
              selectEntity({ type: 'block', id: blockId });
              setDeleteDialogOpen(true);
            }}
          />
          <PropertiesPanel
            collapsed={propertiesCollapsed}
            onToggleCollapse={() => setPropertiesCollapsed((c) => !c)}
            onAddBlock={handleAddBlock}
            onDeleteBlock={handleDeleteKey}
          />
        </div>
      </EditorDndContext>
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

/** Default data payloads for each block type */
function getDefaultBlockData(blockType: string): Record<string, unknown> {
  switch (blockType) {
    case 'rich_text':
      return { html: '<p>Enter your text here...</p>' };
    case 'image_gallery':
      return { images: [] };
    case 'callout':
      return { style: 'info', title: 'Note', body: 'Enter callout text...' };
    case 'video':
      return { url: '', caption: '' };
    case 'cta':
      return { text: 'Click here', url: '', style: 'primary' };
    case 'quiz_inline':
      return { question: 'Enter your question', options: [], correct_index: 0 };
    case 'pdf':
      return { url: '' };
    case 'iframe':
      return { url: '', height: 400 };
    case 'h5p':
      return { content_id: '' };
    default:
      return {};
  }
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
      <div className="fixed inset-x-0 bottom-0 top-24 z-[40] flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[#1E3A5F] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500">Loading editor...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-x-0 bottom-0 top-24 z-[40] flex items-center justify-center bg-gray-100">
        <div className="text-center max-w-sm">
          <p className="text-red-600 font-medium mb-2">Failed to load course</p>
          <p className="text-sm text-gray-500">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <EditorStoreContext.Provider value={store}>
      {/* Fixed full-viewport overlay — covers admin layout nav + padding */}
      <div className="fixed inset-x-0 bottom-0 top-24 z-[40] flex flex-col bg-gray-100 overflow-hidden">
        <EditorContent courseId={courseId} />
      </div>
    </EditorStoreContext.Provider>
  );
}
