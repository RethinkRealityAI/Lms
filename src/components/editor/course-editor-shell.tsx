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
import { LessonPreviewDialog } from './lesson-preview-dialog';
import { KeyboardShortcutsDialog } from './keyboard-shortcuts-dialog';
import { CourseSettingsModal } from './course-settings-modal';
import { resolvePreviewTarget } from './preview-target';
import type { SlideTemplateConfig } from '@/lib/content/slide-templates';
import { createClient } from '@/lib/supabase/client';
import { loadEditorCourseData } from '@/lib/db/editor';
import { getUserInstitutionId } from '@/lib/db/users';
import { resolveInstitutionSlug } from '@/lib/tenant/path';
import { updateSlide as dbUpdateSlide, deleteSlide as dbDeleteSlide, moveSlideToLesson as dbMoveSlideToLesson, duplicateSlide as dbDuplicateSlide } from '@/lib/db/slides';
import { duplicateBlock as dbDuplicateBlock } from '@/lib/db/blocks';
import { updateBlock as dbUpdateBlock, createBlock as dbCreateBlock, deleteBlock as dbDeleteBlock } from '@/lib/db/blocks';
import { createModule as dbCreateModule, deleteModule as dbDeleteModule, updateModule as dbUpdateModule } from '@/lib/db/modules';
import { createLesson as dbCreateLesson, deleteLesson as dbDeleteLesson, updateLesson as dbUpdateLesson } from '@/lib/db/lessons';
import { useAutoSave } from '@/lib/hooks/use-auto-save';
import { useKeyboardShortcuts } from '@/lib/hooks/use-keyboard-shortcuts';
import {
  GRID_COLS, GRID_MARGIN, GRID_CONTAINER_PADDING,
  DEFAULT_BLOCK_LAYOUT, computeRowHeight,
  type DropPos,
} from '@/lib/content/gridConstants';
import type { ModuleData, LessonData, BlockData } from '@/lib/stores/editor-store';
import type { DevicePreview } from '@/lib/canvas/canvas-utils';

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
  const devicePreview = useEditorStore((s) => s.devicePreview) as DevicePreview;
  const setDevicePreview = useEditorStore((s) => s.setDevicePreview);
  const [lessonPreviewOpen, setLessonPreviewOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

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
              canvas_data: slide.canvas_data,
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
            dbUpdateLesson(supabase, lesson.id, {
              title: lesson.title,
              description: lesson.description,
              title_image_url: lesson.title_image_url ?? null,
              title_slide_settings: (lesson.title_slide_settings ?? {}) as Record<string, unknown>,
            }),
            `lesson ${lesson.id}`,
          ),
        );
      }
    }

    // Persist course-level theme settings (global course settings modal).
    // .select('id') so an RLS-filtered 0-row update counts as a failure
    // (keeps isDirty → auto-save retries + error toast) instead of a silent no-op.
    const courseThemePromise = tracked(
      (async () => {
        const { data, error } = await supabase
          .from('courses')
          .update({ theme_settings: state.themeSettings ?? {} })
          .eq('id', state.courseId ?? courseId)
          .eq('institution_id', institutionId)
          .select('id');
        if (error) throw error;
        if (!data || data.length === 0) {
          throw new Error('Course theme update affected 0 rows (blocked by RLS or course not found)');
        }
      })(),
      'course theme',
    );

    await Promise.all([...slidePromises, ...blockPromises, ...modulePromises, ...lessonPromises, courseThemePromise]);

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

  // ── Publish (save-first) ───────────────────────────────────────────────────
  // The Publish button promises "Save & publish changes" when dirty — honour it:
  // run the save first and only publish if every write succeeded (handleSave
  // keeps isDirty=true on any failure, so a failed save aborts the publish).
  const handlePublish = useCallback(async () => {
    if (!store) return;
    if (store.getState().isDirty) {
      await handleSave();
      if (store.getState().isDirty) {
        toast.error('Publish cancelled', {
          description: 'Your changes could not be saved. Fix the save error, then publish again.',
        });
        return;
      }
    }
    await store.getState().publishCourse();
  }, [store, handleSave]);

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

  const handleAddSlide = useCallback(async (lessonId: string, slideData: Parameters<typeof addSlide>[1], template?: SlideTemplateConfig) => {
    if (!institutionId) return;
    try {
      const { createSlide: dbCreateSlide } = await import('@/lib/db/slides');
      const supabase = createClient();
      const editorState = store?.getState();
      const existing = editorState?.slides.get(lessonId) ?? [];
      // No phantom drafts: slides added to an already-published course go live
      // immediately (matching publishCourse()'s cascade). Students only ever see
      // published slides, so leaving these as 'draft' silently hides finished
      // content. Draft courses keep 'draft' — nothing is visible until publish.
      const slideStatus =
        editorState?.courseStatus === 'published' ? 'published' : (slideData.status ?? 'draft');
      const slide = await dbCreateSlide(
        supabase,
        {
          lesson_id: lessonId,
          slide_type: slideData.slide_type,
          title: slideData.title ?? undefined,
          order_index: existing.length,
          status: slideStatus,
          settings: slideData.settings ?? {},
        },
        institutionId,
      );
      addSlide(lessonId, slide);

      // Select the new slide immediately
      selectEntity({ type: 'slide', id: slide.id });

      const templateBlocks = template?.defaultBlocks ?? [];
      if (templateBlocks.length > 0) {
        const { createBlock: dbCreateBlock } = await import('@/lib/db/blocks');
        let failures = 0;
        for (let i = 0; i < templateBlocks.length; i++) {
          const tb = templateBlocks[i];
          const blockData = { ...tb.data, gridX: 0, gridY: i * 3, gridW: 12, gridH: 3 };
          try {
            const blockResult = await dbCreateBlock(supabase, {
              lesson_id: lessonId,
              slide_id: slide.id,
              block_type: tb.block_type,
              data: blockData,
              order_index: i,
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
          } catch (blockErr) {
            failures++;
            console.error('Failed to add template block:', tb.block_type, blockErr);
          }
        }
        if (failures > 0) {
          toast.error(`Slide created but ${failures} block(s) failed to save`);
        }
        selectEntity({ type: 'slide', id: slide.id });
        return;
      }

      // Fallback: single default block by slide type (legacy path when no template passed)
      // Canvas slides start empty — the design frame is created by CanvasSlideEditor on mount.
      let defaultBlockType = null;
      switch (slide.slide_type) {
        case 'canvas':
          // No default block — canvas uses tldraw for free-form layout
          break;
        case 'interactive':
          defaultBlockType = 'iframe';
          break;
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
        // First block on a new slide — place at grid origin
        defaultData.gridX = 0;
        defaultData.gridY = 0;
        defaultData.gridW = 12;
        defaultData.gridH = 3;
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

  const handleAddBlock = useCallback(async (slideId: string, blockType: string, dropPos?: DropPos, presetData?: Record<string, unknown>) => {
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
      const orderIndex = existingBlocks.length;

      const defaultData = presetData ? { ...presetData } : getDefaultBlockData(blockType);
      const blockGridW = typeof defaultData.gridW === 'number' ? defaultData.gridW : GRID_COLS;
      const blockGridH = typeof defaultData.gridH === 'number' ? defaultData.gridH : DEFAULT_BLOCK_LAYOUT.gridH;

      if (dropPos) {
        // Place at the pointer's drop position within the canvas grid
        const colWidth = (dropPos.canvasWidth - GRID_CONTAINER_PADDING[0] * 2 - GRID_MARGIN[0] * (GRID_COLS - 1)) / GRID_COLS;
        const rowHeight = computeRowHeight(dropPos.canvasHeight);
        const rawCol = (dropPos.relX - GRID_CONTAINER_PADDING[0]) / (colWidth + GRID_MARGIN[0]);
        const rawRow = (dropPos.relY - GRID_CONTAINER_PADDING[1]) / (rowHeight + GRID_MARGIN[1]);
        defaultData.gridX = Math.max(0, Math.min(GRID_COLS - blockGridW, Math.floor(rawCol)));
        defaultData.gridY = Math.max(0, Math.floor(rawRow));
        defaultData.gridW = blockGridW;
        defaultData.gridH = blockGridH;
      } else {
        // Stack below all existing blocks (click-to-add path)
        let nextGridY = 0;
        for (const b of existingBlocks) {
          const d = (b.data ?? {}) as Record<string, unknown>;
          const bY = typeof d.gridY === 'number' ? d.gridY : 0;
          const bH = typeof d.gridH === 'number' ? d.gridH : DEFAULT_BLOCK_LAYOUT.gridH;
          nextGridY = Math.max(nextGridY, bY + bH);
        }
        defaultData.gridX = 0;
        defaultData.gridY = nextGridY;
        defaultData.gridW = blockGridW;
        defaultData.gridH = blockGridH;
      }

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
    onShowShortcuts: () => setShortcutsOpen((v) => !v),
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

  // Cross-lesson slide movement
  const handleMoveSlide = useCallback(async (slideId: string, fromLessonId: string, toLessonId: string) => {
    if (!institutionId) return;
    const supabase = createClient();
    const result = await dbMoveSlideToLesson(supabase, slideId, fromLessonId, toLessonId, institutionId);
    if (result.success) {
      store?.getState().moveSlideToLesson(slideId, fromLessonId, toLessonId);
      toast.success('Slide moved');
    } else {
      toast.error('Failed to move slide');
    }
  }, [institutionId, store]);

  // Block duplication
  const handleDuplicateBlock = useCallback(async (blockId: string, slideId: string) => {
    if (!institutionId || !store) return;
    const state = store.getState();
    const blockList = state.blocks.get(slideId);
    const sourceBlock = blockList?.find(b => b.id === blockId);
    if (!sourceBlock) return;

    // Find lesson ID for this slide
    let lessonId = '';
    for (const [lid, slideList] of state.slides.entries()) {
      if (slideList.some(s => s.id === slideId)) { lessonId = lid; break; }
    }

    if (!lessonId) {
      toast.error('Failed to duplicate block', { description: 'Could not resolve lesson for this slide.' });
      return;
    }

    try {
      const supabase = createClient();
      const data = await dbDuplicateBlock(supabase, {
        id: sourceBlock.id,
        slide_id: slideId,
        block_type: sourceBlock.block_type,
        data: (sourceBlock.data ?? {}) as Record<string, unknown>,
        order_index: sourceBlock.order_index,
      }, lessonId, institutionId);

      state.duplicateBlock(slideId, blockId, data.id, (data.data ?? {}) as Record<string, unknown>);
      toast.success('Block duplicated');
    } catch (err) {
      const msg = err instanceof Error ? err.message : (err as any)?.message ?? JSON.stringify(err);
      console.error('Failed to duplicate block:', msg, err);
      toast.error('Failed to duplicate block', { description: msg });
    }
  }, [institutionId, store]);

  // Slide duplication
  const handleDuplicateSlide = useCallback(async (slideId: string, lessonId: string) => {
    if (!institutionId || !store) return;
    try {
      const supabase = createClient();
      const { slide: newSlide, blocks: newBlocks } = await dbDuplicateSlide(supabase, slideId, lessonId, institutionId);
      // Add to store — insert directly after the source slide (not at the end) and
      // reindex order_index so the local order matches what the DB just persisted.
      const state = store.getState();
      const existingSlides = [...(state.slides.get(lessonId) ?? [])];
      const srcIndex = existingSlides.findIndex((s) => s.id === slideId);
      const insertAt = srcIndex >= 0 ? srcIndex + 1 : existingSlides.length;
      existingSlides.splice(insertAt, 0, newSlide);
      const reindexed = existingSlides.map((s, i) => (s.order_index === i ? s : { ...s, order_index: i }));
      const nextSlides = new Map(state.slides);
      nextSlides.set(lessonId, reindexed);

      const nextBlocks = new Map(state.blocks);
      nextBlocks.set(newSlide.id, newBlocks.map(b => ({
        id: b.id,
        slide_id: b.slide_id,
        block_type: b.block_type,
        data: b.data,
        order_index: b.order_index,
        is_visible: b.is_visible,
      })));

      state.selectEntity({ type: 'slide', id: newSlide.id });
      // Use set via the store's internal mechanism — update slides and blocks directly
      store.setState({ slides: nextSlides, blocks: nextBlocks, isDirty: true });
      toast.success('Slide duplicated');
    } catch {
      toast.error('Failed to duplicate slide');
    }
  }, [institutionId, store]);

  // Copy block to a different slide
  const handleCopyBlockToSlide = useCallback(async (blockId: string, sourceSlideId: string, targetSlideId: string, targetLessonId: string) => {
    if (!institutionId || !store) return;
    const state = store.getState();
    const blockList = state.blocks.get(sourceSlideId);
    const sourceBlock = blockList?.find(b => b.id === blockId);
    if (!sourceBlock) return;

    let lessonId = '';
    for (const [lid, slideList] of state.slides.entries()) {
      if (slideList.some(s => s.id === sourceSlideId)) { lessonId = lid; break; }
    }

    try {
      const supabase = createClient();
      const data = await dbDuplicateBlock(supabase, {
        id: sourceBlock.id,
        slide_id: sourceSlideId,
        block_type: sourceBlock.block_type,
        data: (sourceBlock.data ?? {}) as Record<string, unknown>,
        order_index: sourceBlock.order_index,
      }, lessonId, institutionId, targetSlideId, targetLessonId);

      // Add to target slide in store
      const targetBlocks = [...(state.blocks.get(targetSlideId) ?? []), {
        id: data.id,
        slide_id: data.slide_id,
        block_type: data.block_type,
        data: data.data,
        order_index: data.order_index,
        is_visible: data.is_visible,
      }];
      const newBlocks = new Map(state.blocks);
      newBlocks.set(targetSlideId, targetBlocks);
      store.setState({ blocks: newBlocks, isDirty: true });
      toast.success('Block copied');
    } catch {
      toast.error('Failed to copy block');
    }
  }, [institutionId, store]);

  // Move block to a different slide (copy + delete from source)
  const handleMoveBlockToSlide = useCallback(async (blockId: string, sourceSlideId: string, targetSlideId: string, targetLessonId: string) => {
    if (!institutionId || !store) return;
    const state = store.getState();
    const blockList = state.blocks.get(sourceSlideId);
    const sourceBlock = blockList?.find(b => b.id === blockId);
    if (!sourceBlock) return;

    let lessonId = '';
    for (const [lid, slideList] of state.slides.entries()) {
      if (slideList.some(s => s.id === sourceSlideId)) { lessonId = lid; break; }
    }

    try {
      const supabase = createClient();
      // 1. Create in target
      const data = await dbDuplicateBlock(supabase, {
        id: sourceBlock.id,
        slide_id: sourceSlideId,
        block_type: sourceBlock.block_type,
        data: (sourceBlock.data ?? {}) as Record<string, unknown>,
        order_index: sourceBlock.order_index,
      }, lessonId, institutionId, targetSlideId, targetLessonId);

      // 2. Delete from source
      await dbDeleteBlock(supabase, blockId);

      // 3. Update store: remove from source, add to target
      const newBlocks = new Map(state.blocks);
      const sourceBlocks = (newBlocks.get(sourceSlideId) ?? []).filter(b => b.id !== blockId);
      newBlocks.set(sourceSlideId, sourceBlocks);
      const targetBlocks = [...(newBlocks.get(targetSlideId) ?? []), {
        id: data.id,
        slide_id: data.slide_id,
        block_type: data.block_type,
        data: data.data,
        order_index: data.order_index,
        is_visible: data.is_visible,
      }];
      newBlocks.set(targetSlideId, targetBlocks);
      store.setState({ blocks: newBlocks, isDirty: true });
      toast.success('Block moved');
    } catch {
      toast.error('Failed to move block');
    }
  }, [institutionId, store]);

  const deleteEntityType =
    selectedEntity?.type === 'module' ||
    selectedEntity?.type === 'lesson' ||
    selectedEntity?.type === 'slide' ||
    selectedEntity?.type === 'block'
      ? selectedEntity.type
      : null;

  // Resolve which lesson/slide a preview should open on, from the current selection
  const previewTarget = resolvePreviewTarget(selectedEntity, slides, blocks);

  return (
    <>
      <EditorToolbar
        onSave={saveNow}
        onPublish={handlePublish}
        courseId={courseId}
        devicePreview={devicePreview}
        onDevicePreviewChange={setDevicePreview}
        onPreviewLesson={() => setLessonPreviewOpen(true)}
        onShowShortcuts={() => setShortcutsOpen(true)}
        onOpenSettings={() => setSettingsOpen(true)}
      />
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
            onMoveSlide={handleMoveSlide}
            onDuplicateSlide={handleDuplicateSlide}
          />
          <PreviewPanel
            devicePreview={devicePreview}
            onDeleteBlock={(blockId) => {
              selectEntity({ type: 'block', id: blockId });
              setDeleteDialogOpen(true);
            }}
            onDuplicateBlock={handleDuplicateBlock}
            onCopyBlockToSlide={handleCopyBlockToSlide}
            onMoveBlockToSlide={handleMoveBlockToSlide}
          />
          <PropertiesPanel
            collapsed={propertiesCollapsed}
            onToggleCollapse={() => setPropertiesCollapsed((c) => !c)}
            onAddBlock={handleAddBlock}
            onDeleteBlock={handleDeleteKey}
            onOpenCourseSettings={() => setSettingsOpen(true)}
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
      {lessonPreviewOpen && (
        <LessonPreviewDialog
          courseId={courseId}
          onClose={(lastDevice) => {
            setLessonPreviewOpen(false);
            if (lastDevice) setDevicePreview(lastDevice);
          }}
          initialLessonId={previewTarget.lessonId}
          initialSlideId={previewTarget.slideId}
          initialDevice={devicePreview}
        />
      )}
      {shortcutsOpen && (
        <KeyboardShortcutsDialog onClose={() => setShortcutsOpen(false)} />
      )}
      <CourseSettingsModal open={settingsOpen} onOpenChange={setSettingsOpen} />
    </>
  );
}

/** Default data payloads for each block type */
function getDefaultBlockData(blockType: string): Record<string, unknown> {
  switch (blockType) {
    case 'rich_text':
      return { html: '' };
    case 'image_gallery':
      return { images: [], mode: 'single', objectFit: 'contain', displaySize: 'md' };
    case 'callout':
      return { style: 'info', title: 'Note', body: 'Enter callout text...' };
    case 'video':
      return { url: '', caption: '' };
    case 'cta':
      return { text: 'Learn more', button_label: 'Visit Link', url: 'https://example.com' };
    case 'quiz_inline':
      return {
        question_type: 'multiple_choice',
        question: 'Enter your question',
        options: ['Option A', 'Option B', 'Option C', 'Option D'],
        correct_answer: 'Option A',
        show_feedback: true,
      };
    case 'content_list':
      return {
        items: [{ html: '<p></p>', animation: 'none' }],
        bullet_style: 'disc',
        font_size: 'auto',
        enable_animations: false,
      };
    case 'scratch_reveal':
      return {
        before: { type: 'text', text: 'Scratch to reveal!', bg_color: '#1A3C6E', text_color: '#FFFFFF' },
        after: { type: 'text', text: 'Surprise! 🎉', bg_color: '#FFFFFF', text_color: '#0F172A' },
        brush_size: 42, reveal_threshold: 55, animation: 'confetti', aspect: '16/9', fit: 'contain',
      };
    case 'image_compare':
      return {
        before: { url: '' },
        after: { url: '' },
        initial_position: 50,
        direction: 'horizontal',
        aspect: '16/9',
        fit: 'cover',
        handle_style: 'circle',
        handle_color: '#FFFFFF',
        divider_color: '#FFFFFF',
        show_labels: 'always',
        require_interaction: false,
      };
    case 'match_pairs':
      return {
        pairs: [
          { id: 'p1', prompt: { type: 'text', text: 'Term A' }, match: { type: 'text', text: 'Definition A' } },
          { id: 'p2', prompt: { type: 'text', text: 'Term B' }, match: { type: 'text', text: 'Definition B' } },
        ],
        prompt_side: 'left', shuffle: true, show_feedback: true,
      };
    case 'survey':
      return { title: 'Survey', submit_label: 'Submit Survey', questions: [] };
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

        // Get current user's institution — prefer tenant context (cookie) over user profile
        // so platform_admin can edit courses in any tenant
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        let institutionId: string | null = null;

        // Try tenant context from cookie (set by middleware from URL slug)
        const tenantSlug = resolveInstitutionSlug();
        if (tenantSlug) {
          const { data: inst } = await supabase
            .from('institutions')
            .select('id')
            .eq('slug', tenantSlug)
            .maybeSingle();
          if (inst) institutionId = inst.id;
        }

        // Fall back to user's own institution
        if (!institutionId) {
          institutionId = await getUserInstitutionId(supabase, user.id);
        }
        if (!institutionId) throw new Error('No institution found for user');

        const data = await loadEditorCourseData(supabase, courseId, institutionId);

        store.getState().loadCourse({
          courseId,
          courseTitle: data.course.title,
          institutionId,
          courseStatus: data.course.status as import('@/types').CourseStatus,
          themeSettings: data.course.theme_settings ?? {},
          modules: data.modules,
          lessons: data.lessonsByModule,
          slides: data.slidesByLesson,
          blocks: data.blocksBySlide,
        });

        // Fetch institution theme (cascade layer below course settings) — fire-and-forget.
        supabase.from('institutions').select('theme').eq('id', institutionId).maybeSingle()
          .then(({ data: instData }) => {
            if (instData?.theme && typeof instData.theme === 'object') {
              store.getState().setInstitutionTheme(instData.theme as import('@/lib/tenant/institution-theme').InstitutionTheme);
            }
          });

        // Resume on the slide the admin was viewing in preview (?lesson=&slide=).
        // Uses window.location to avoid a Suspense boundary for useSearchParams.
        try {
          const sp = new URLSearchParams(window.location.search);
          const slideParam = sp.get('slide');
          const lessonParam = sp.get('lesson');
          let slideExists = false;
          if (slideParam) {
            for (const list of data.slidesByLesson.values()) {
              if (list.some((s) => s.id === slideParam)) { slideExists = true; break; }
            }
          }
          if (slideParam && slideExists) {
            store.getState().selectEntity({ type: 'slide', id: slideParam });
          } else if (lessonParam) {
            store.getState().selectEntity({ type: 'lesson', id: lessonParam });
          }
        } catch { /* no-op: selection is best-effort */ }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load course');
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [courseId, store]);

  // Re-fetch the institution (global) theme when the editor tab regains focus, so a
  // global theme change saved in another tab applies in the preview without reloading.
  useEffect(() => {
    const refetch = () => {
      const instId = store.getState().institutionId;
      if (!instId) return;
      const supabase = createClient();
      supabase.from('institutions').select('theme').eq('id', instId).maybeSingle()
        .then(({ data }) => {
          if (data?.theme && typeof data.theme === 'object') {
            store.getState().setInstitutionTheme(data.theme as import('@/lib/tenant/institution-theme').InstitutionTheme);
          }
        });
    };
    const onVisible = () => { if (document.visibilityState === 'visible') refetch(); };
    window.addEventListener('focus', refetch);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.removeEventListener('focus', refetch);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [store]);

  if (isLoading) {
    return (
      <div className="fixed inset-x-0 bottom-0 top-12 z-[40] flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[#1E3A5F] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500">Loading editor...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-x-0 bottom-0 top-12 z-[40] flex items-center justify-center bg-gray-100">
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
      <div className="fixed inset-x-0 bottom-0 top-12 z-[40] flex flex-col bg-gray-100 overflow-hidden">
        <EditorContent courseId={courseId} />
      </div>
    </EditorStoreContext.Provider>
  );
}
