'use client';

import { useCallback, useContext, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import { Monitor, ChevronLeft, ChevronRight, BookOpen } from 'lucide-react';
import { SlidePreview } from './slide-preview';
import { TitleSlide } from '@/components/shared/title-slide';
import { EditorStoreContext, useEditorStore } from './editor-store-context';
import { createClient } from '@/lib/supabase/client';
import { createBlock as dbCreateBlock } from '@/lib/db/blocks';
import { resolveInstitutionSlug } from '@/lib/tenant/path';
import { resolveEffectiveTheme } from '@/lib/tenant/institution-theme';
import { getInstitutionBranding } from '@/lib/tenant/branding';
import type { DevicePreview } from '@/lib/canvas/canvas-utils';
import type { Slide, LessonBlock } from '@/types';

const DEVICE_WIDTHS: Record<DevicePreview, string> = {
  desktop: '100%',
  tablet: '768px',
  mobile: '375px',
};

const CanvasSlideEditor = dynamic(
  () => import('./canvas-slide-editor'),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-full text-gray-400">
        Loading canvas editor...
      </div>
    ),
  },
);

export interface PreviewPanelProps {
  devicePreview: DevicePreview;
  onDeleteBlock?: (blockId: string) => void;
  onDuplicateBlock?: (blockId: string, slideId: string) => void;
  onCopyBlockToSlide?: (blockId: string, sourceSlideId: string, targetSlideId: string, targetLessonId: string) => void;
  onMoveBlockToSlide?: (blockId: string, sourceSlideId: string, targetSlideId: string, targetLessonId: string) => void;
}

export function PreviewPanel({ devicePreview, onDeleteBlock, onDuplicateBlock, onCopyBlockToSlide, onMoveBlockToSlide }: PreviewPanelProps) {
  const store = useContext(EditorStoreContext);
  const selectedEntity = useEditorStore((s) => s.selectedEntity);
  const slides = useEditorStore((s) => s.slides);
  const blocks = useEditorStore((s) => s.blocks);
  const lessons = useEditorStore((s) => s.lessons);
  const modules = useEditorStore((s) => s.modules);
  const courseTitle = useEditorStore((s) => s.courseTitle);
  const selectEntity = useEditorStore((s) => s.selectEntity);
  const updateSlide = useEditorStore((s) => s.updateSlide);
  const addBlock = useEditorStore((s) => s.addBlock);
  const institutionId = useEditorStore((s) => s.institutionId);

  const pathname = usePathname();
  const institutionSlug = resolveInstitutionSlug(pathname);

  // Resolved theme cascade (course → institution → branding) — the title slide
  // must render with the SAME gradient/logo/background the student viewer uses
  // (mirrors slide-preview.tsx's resolution).
  const themeSettings = useEditorStore((s) => s.themeSettings);
  const institutionTheme = useEditorStore((s) => s.institutionTheme);
  const effectiveTheme = useMemo(
    () => resolveEffectiveTheme({ course: themeSettings, institution: institutionTheme, branding: getInstitutionBranding(institutionSlug) }),
    [themeSettings, institutionTheme, institutionSlug],
  );

  // Find the currently selected slide and its owning lesson
  let selectedSlide: Slide | null = null;
  let siblingSlides: Slide[] = [];
  let owningLessonId: string | null = null;

  if (selectedEntity?.type === 'slide') {
    for (const [lessonId, slideList] of slides) {
      const found = slideList.find((s) => s.id === selectedEntity.id);
      if (found) {
        selectedSlide = found;
        siblingSlides = slideList;
        owningLessonId = lessonId;
        break;
      }
    }
  } else if (selectedEntity?.type === 'block') {
    let parentSlideId: string | null = null;
    for (const [slideId, blockList] of blocks) {
      if (blockList.some((b) => b.id === selectedEntity.id)) {
        parentSlideId = slideId;
        break;
      }
    }
    if (parentSlideId) {
      for (const [lessonId, slideList] of slides) {
        const found = slideList.find((s) => s.id === parentSlideId);
        if (found) {
          selectedSlide = found;
          siblingSlides = slideList;
          owningLessonId = lessonId;
          break;
        }
      }
    }
  } else if (selectedEntity?.type === 'lesson') {
    // Lesson selected → show the title slide. Resolve lesson data and sibling slides
    // so the → arrow can step into slide 1 and the title slide rerenders reactively
    // when the lesson title / description / image changes in the properties panel.
    owningLessonId = selectedEntity.id;
    siblingSlides = slides.get(selectedEntity.id) ?? [];
  }

  const isLessonSelected = selectedEntity?.type === 'lesson';
  const slideIndex = selectedSlide ? siblingSlides.indexOf(selectedSlide) : -1;

  // Title-slide eyebrow: the course (module) title — matches the learner view exactly.
  // Falls back to the owning module's title if the course title isn't loaded yet.
  let moduleName: string | null = courseTitle;
  if (!moduleName && owningLessonId) {
    for (const [moduleId, lessonList] of lessons) {
      if (lessonList.some((l) => l.id === owningLessonId)) {
        moduleName = modules.find((m) => m.id === moduleId)?.title ?? null;
        break;
      }
    }
  }

  // Resolve lesson context for WYSIWYG header (and for the title slide preview)
  let lessonTitle = 'Untitled Lesson';
  let lessonDescription: string | null = null;
  let titleImageUrl: string | null = null;
  let titleSlideSettings = null as import('@/lib/content/title-slide-settings').TitleSlideSettings | null | undefined;

  if (owningLessonId) {
    for (const lessonList of lessons.values()) {
      const lesson = lessonList.find(l => l.id === owningLessonId);
      if (lesson) {
        lessonTitle = lesson.title;
        lessonDescription = lesson.description ?? null;
        titleImageUrl = lesson.title_image_url ?? null;
        titleSlideSettings = lesson.title_slide_settings;
        break;
      }
    }
  }

  function goToPrevSlide() {
    // From a real slide: go to previous slide, or back to the lesson (title slide)
    if (selectedSlide) {
      if (slideIndex > 0) {
        selectEntity({ type: 'slide', id: siblingSlides[slideIndex - 1].id });
      } else if (owningLessonId) {
        selectEntity({ type: 'lesson', id: owningLessonId });
      }
    }
  }

  function goToNextSlide() {
    // From the title slide: step into slide 1
    if (isLessonSelected) {
      if (siblingSlides.length > 0) {
        selectEntity({ type: 'slide', id: siblingSlides[0].id });
      }
      return;
    }
    if (slideIndex < siblingSlides.length - 1) {
      selectEntity({ type: 'slide', id: siblingSlides[slideIndex + 1].id });
    }
  }

  const selectedBlockId = selectedEntity?.type === 'block' ? selectedEntity.id : undefined;
  const updateBlock = useEditorStore((s) => s.updateBlock);
  const fitBlockHeight = useEditorStore((s) => s.fitBlockHeight);

  // Stable callback — avoids recreating BCA's measure() on every PreviewPanel re-render
  const handleFitHeight = useCallback(
    (blockId: string, gridH: number) => {
      if (selectedSlide) fitBlockHeight(selectedSlide.id, blockId, gridH);
    },
    [selectedSlide, fitBlockHeight],
  );

  // --- Block reorder by arrow buttons ---
  // Delegated to the store's moveBlockVertical: it swaps the block with its visual
  // neighbour and vertically compacts, so the move is gap-free, can't overlap, and
  // can always reach the very bottom (the old manual gridY swap couldn't). Keeping
  // order_index in sync with visual order is handled inside the store action.
  const moveBlockVertical = useEditorStore((s) => s.moveBlockVertical);

  const handleMoveBlockUp = useCallback(
    (blockId: string, slideId: string) => moveBlockVertical(slideId, blockId, -1),
    [moveBlockVertical],
  );
  const handleMoveBlockDown = useCallback(
    (blockId: string, slideId: string) => moveBlockVertical(slideId, blockId, 1),
    [moveBlockVertical],
  );

  // --- Canvas slide handlers ---

  const handleCanvasChange = useCallback(
    (canvasData: Record<string, unknown>) => {
      if (!selectedSlide || !owningLessonId) return;
      updateSlide(owningLessonId, selectedSlide.id, { canvas_data: canvasData });
    },
    [selectedSlide, owningLessonId, updateSlide],
  );

  const handleAddCanvasBlock = useCallback(
    async (blockType: string): Promise<LessonBlock | null> => {
      if (!selectedSlide || !owningLessonId || !institutionId) return null;
      try {
        const supabase = createClient();
        const existingBlocks = store?.getState().blocks.get(selectedSlide.id) ?? [];
        const defaultData = getDefaultCanvasBlockData(blockType);
        const result = await dbCreateBlock(supabase, {
          lesson_id: owningLessonId,
          slide_id: selectedSlide.id,
          block_type: blockType,
          data: defaultData,
          order_index: existingBlocks.length,
          institution_id: institutionId,
        });
        const blockData = {
          id: result.id,
          slide_id: result.slide_id,
          block_type: result.block_type,
          data: result.data,
          order_index: result.order_index,
          is_visible: result.is_visible,
        };
        addBlock(selectedSlide.id, blockData);
        return result as LessonBlock;
      } catch (err) {
        console.error('Failed to add canvas block:', err);
        return null;
      }
    },
    [selectedSlide, owningLessonId, institutionId, store, addBlock],
  );

  const handleSelectCanvasBlock = useCallback(
    (blockId: string | null) => {
      if (blockId) {
        selectEntity({ type: 'block', id: blockId });
      } else {
        if (selectedSlide) {
          selectEntity({ type: 'slide', id: selectedSlide.id });
        }
      }
    },
    [selectEntity, selectedSlide],
  );

  // Resolve blocks for the selected canvas slide
  const selectedSlideBlocks = selectedSlide
    ? (blocks.get(selectedSlide.id) ?? []).map((b) => ({
        ...b,
        institution_id: institutionId ?? '',
        lesson_id: owningLessonId ?? '',
        created_at: '',
      } as LessonBlock))
    : [];

  const isCanvasSlide = selectedSlide?.slide_type === 'canvas';

  // The editor canvas is ALWAYS editable, at every device width. The device toggle
  // just narrows the card (content stays responsive via container queries) and, for
  // tablet/mobile, frames it as a device. Exact device rendering is the Preview
  // dialog (Play button) which embeds the real viewer in a device-sized iframe.
  const isDeviceFramed = devicePreview !== 'desktop';

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-gray-50">
      <div className="flex-1 flex items-stretch justify-center p-6 overflow-auto">
        {selectedSlide && isCanvasSlide ? (
          <div className="w-full h-full">
            <CanvasSlideEditor
              slide={selectedSlide}
              blocks={selectedSlideBlocks}
              onCanvasChange={handleCanvasChange}
              onAddBlock={handleAddCanvasBlock}
              onSelectBlock={handleSelectCanvasBlock}
            />
          </div>
        ) : (
          <div
            className={`bg-white overflow-hidden transition-all duration-300 flex flex-col ${
              isDeviceFramed
                ? 'rounded-[2rem] border-[10px] border-slate-900 shadow-2xl ring-1 ring-black/10'  // editable, framed as a device
                : 'rounded-2xl border-none shadow-[0_8px_30px_rgb(0,0,0,0.06)]'
            }`}
            style={{ width: DEVICE_WIDTHS[devicePreview], maxWidth: '100%', height: '100%', minHeight: '500px' }}
          >
            {selectedSlide ? (
              <SlidePreview
                slide={selectedSlide}
                selectedBlockId={selectedBlockId}
                onSelectBlock={(blockId) => selectEntity({ type: 'block', id: blockId })}
                onDeleteBlock={onDeleteBlock}
                onUpdateBlock={(blockId, data) => {
                  if (selectedSlide) updateBlock(selectedSlide.id, blockId, { data });
                }}
                onFitHeight={handleFitHeight}
                onDuplicateBlock={onDuplicateBlock}
                onCopyBlockToSlide={onCopyBlockToSlide}
                onMoveBlockToSlide={onMoveBlockToSlide}
                onMoveBlockUp={handleMoveBlockUp}
                onMoveBlockDown={handleMoveBlockDown}
                lessonTitle={lessonTitle}
                lessonDescription={lessonDescription}
                moduleName={moduleName}
                titleImageUrl={titleImageUrl}
                titleSlideSettings={titleSlideSettings}
                slideNumber={slideIndex + 1}
                totalSlides={siblingSlides.length}
              />
            ) : isLessonSelected ? (
              <div className="flex flex-col flex-1 min-h-0">
                {/* Title slide header strip */}
                <div className="shrink-0 flex items-center justify-between gap-3 px-4 py-2.5 bg-gray-900 border-b border-white/10">
                  <span className="text-xs font-semibold text-white/50 truncate">{lessonTitle}</span>
                  <span className="shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 text-white/80 text-[10px] font-bold uppercase tracking-wider">
                    <BookOpen className="w-2.5 h-2.5" />
                    Title Slide
                  </span>
                </div>
                {/* Title slide content — rerenders live as lesson props change */}
                <div className="flex-1 min-h-0 flex flex-col">
                  <TitleSlide
                    lessonTitle={lessonTitle}
                    lessonDescription={lessonDescription ?? undefined}
                    moduleName={moduleName}
                    titleImageUrl={titleImageUrl ?? undefined}
                    institutionSlug={institutionSlug}
                    titleSlideSettings={titleSlideSettings}
                    titleLogoUrl={effectiveTheme.titleLogoUrl}
                    gradientFrom={effectiveTheme.titleGradientFrom}
                    gradientTo={effectiveTheme.titleGradientTo}
                    defaultBackgroundImageUrl={effectiveTheme.defaultTitleBackgroundUrl}
                  />
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-400 text-sm p-12">
                <div className="text-center space-y-3">
                  <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center mx-auto">
                    <Monitor className="w-7 h-7 text-gray-200" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-500">No slide selected</p>
                    <p className="text-xs text-gray-400 mt-1">Select a slide from the structure panel</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Slide navigation */}
      <div className="flex items-center justify-center gap-4 py-2.5 bg-white/95 backdrop-blur-sm border-t border-gray-100 shrink-0">
        <button
          onClick={goToPrevSlide}
          disabled={isLessonSelected || (slideIndex <= 0 && !owningLessonId)}
          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 disabled:opacity-20 transition-all"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span
          className="text-xs font-medium text-gray-500 min-w-[100px] text-center truncate max-w-[260px]"
          title={isLessonSelected ? 'Title Slide' : selectedSlide?.title ?? undefined}
        >
          {isLessonSelected
            ? `Title Slide${siblingSlides.length > 0 ? ` — ${siblingSlides.length} slide${siblingSlides.length !== 1 ? 's' : ''}` : ''}`
            : selectedSlide
            ? `${slideIndex + 1}/${siblingSlides.length} — ${selectedSlide.title || selectedSlide.slide_type}`
            : 'No slide selected'
          }
        </span>
        <button
          onClick={goToNextSlide}
          disabled={!isLessonSelected && (slideIndex < 0 || slideIndex >= siblingSlides.length - 1)}
          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 disabled:opacity-20 transition-all"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

/** Default data payloads for canvas block types */
function getDefaultCanvasBlockData(blockType: string): Record<string, unknown> {
  switch (blockType) {
    case 'quiz_inline':
      return { question_type: 'multiple_choice', question: 'Enter your question', options: ['Option A', 'Option B'], correct_answer: 'Option A' };
    case 'callout':
      return { variant: 'info', title: 'Note', html: '<p>Enter callout text...</p>' };
    case 'cta':
      return { text: 'Learn more', button_label: 'Visit Link', url: 'https://example.com' };
    case 'video':
      return { url: 'https://example.com/video.mp4', caption: '' };
    default:
      return {};
  }
}
