'use client';
// cache-bust: 2026-06-02
import { Suspense, useRef, useState, useEffect, useCallback, useMemo } from 'react';
import type { CSSProperties } from 'react';
import { usePathname } from 'next/navigation';
import { GripVertical, Trash2, X, Copy, CopyPlus, Move, ChevronUp, ChevronDown, Layers } from 'lucide-react';
import { useDroppable } from '@dnd-kit/core';
// react-grid-layout v2 ships a v1-compatible wrapper at `/legacy`. The default
// root export is the NEW v2 `GridLayout` whose flat props (rowHeight, margin,
// cols, isResizable, draggableHandle, …) are IGNORED — it only reads `gridConfig`.
// Importing the legacy wrapper restores the v1 flat-prop API this code relies on.
// Without it, RGL silently falls back to defaults (rowHeight=150, margin=[10,10]),
// which is what produced the oversized cells / huge gaps.
import { ReactGridLayout as RGL } from 'react-grid-layout/legacy';
const ReactGridLayout = RGL as any;
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import { LessonBlockRenderer } from '@/components/lesson-block-renderer';
import { SlideFrame, SlideContentArea } from '@/components/shared/slide-frame';
import type { CourseThemeSettings } from '@/lib/content/course-theme';
import { TitleSlide } from '@/components/shared/title-slide';
import { useEditorStore } from './editor-store-context';
import {
  GRID_COLS, GRID_MARGIN, GRID_CONTAINER_PADDING,
  computeRowHeight, getBlockGridLayout,
  blockUsesAutoHeight, getBlockRglLayout, resolvePersistedGridH,
} from '@/lib/content/gridConstants';
import { resolveSlideBackgroundFit, slideBackgroundImageStyle } from '@/lib/content/slide-background';
import { CopyBlockDialog } from './copy-block-dialog';
import { MultiSelectToolbar } from './multi-select-toolbar';
import { AlignmentGuides, computeAlignmentGuides } from './alignment-guides';
import { renderBlockResizeHandle } from './block-resize-handle';
import { BlockContentAutosize } from './block-content-autosize';
import { resolveInstitutionSlug } from '@/lib/tenant/path';
import { resolveEffectiveTheme } from '@/lib/tenant/institution-theme';
import { getInstitutionBranding } from '@/lib/tenant/branding';
import type { Slide } from '@/types';

interface SlidePreviewProps {
  slide: Slide;
  onSelectBlock: (blockId: string) => void;
  onDeleteBlock?: (blockId: string) => void;
  onUpdateBlock?: (blockId: string, data: Record<string, unknown>) => void;
  /** Auto-fit a block's height to its content (reflows blocks below) */
  onFitHeight?: (blockId: string, gridH: number) => void;
  onDuplicateBlock?: (blockId: string, slideId: string) => void;
  onCopyBlockToSlide?: (blockId: string, sourceSlideId: string, targetSlideId: string, targetLessonId: string) => void;
  onMoveBlockToSlide?: (blockId: string, sourceSlideId: string, targetSlideId: string, targetLessonId: string) => void;
  onMoveBlockUp?: (blockId: string, slideId: string) => void;
  onMoveBlockDown?: (blockId: string, slideId: string) => void;
  selectedBlockId?: string;
  /** Lesson title for the header */
  lessonTitle?: string;
  /** Module / course name shown as the title-slide eyebrow */
  moduleName?: string | null;
  /** Lesson description for title slide */
  lessonDescription?: string | null;
  /** Title image URL for title slide background */
  titleImageUrl?: string | null;
  /** Per-lesson title slide overrides (size, colour, footer, logo) */
  titleSlideSettings?: import('@/lib/content/title-slide-settings').TitleSlideSettings | null;
  /** Current slide index (1-based) */
  slideNumber?: number;
  /** Total slides in this lesson */
  totalSlides?: number;
}

export function SlidePreview({
  slide,
  onSelectBlock,
  onDeleteBlock,
  onUpdateBlock,
  onFitHeight,
  onDuplicateBlock,
  onCopyBlockToSlide,
  onMoveBlockToSlide,
  onMoveBlockUp,
  onMoveBlockDown,
  selectedBlockId,
  lessonTitle = 'Untitled Lesson',
  moduleName,
  lessonDescription,
  titleImageUrl,
  titleSlideSettings,
  slideNumber = 1,
  totalSlides = 1,
}: SlidePreviewProps) {
  const editorPathname = usePathname();
  const institutionSlug = resolveInstitutionSlug(editorPathname);
  const blocks = useEditorStore((s) => s.blocks.get(slide.id) ?? []);

  /** Visual top-to-bottom order on the canvas (grid Y/X), not order_index. */
  const visualBlockOrder = useMemo(
    () =>
      [...blocks]
        .map((b) => ({
          b,
          g: getBlockGridLayout((b.data ?? {}) as Record<string, unknown>),
        }))
        .sort((a, z) => a.g.gridY - z.g.gridY || a.g.gridX - z.g.gridX)
        .map(({ b }) => b),
    [blocks],
  );
  const visualIndexById = useMemo(
    () => new Map(visualBlockOrder.map((b, i) => [b.id, i])),
    [visualBlockOrder],
  );

  const { setNodeRef: setDropRef, isOver } = useDroppable({ id: 'slide-canvas' });

  // Canvas size measurement for react-grid-layout
  const canvasRef = useRef<HTMLDivElement>(null);
  const [canvasSize, setCanvasSize] = useState<{ width: number; height: number }>({ width: 600, height: 400 });

  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const update = () => {
      const width = el.clientWidth;
      const height = el.clientHeight;
      if (width <= 0 || height <= 0) return;
      setCanvasSize(prev => (prev.width === width && prev.height === height ? prev : { width, height }));
    };
    const observer = new ResizeObserver(update);
    observer.observe(el);
    update();
    return () => observer.disconnect();
  }, []);

  // Block context menu state
  const [blockContextMenu, setBlockContextMenu] = useState<{ x: number; y: number; blockId: string } | null>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);
  // Copy/Move block dialog
  const [copyMoveDialog, setCopyMoveDialog] = useState<{ blockId: string; mode: 'copy' | 'move' } | null>(null);
  const modules = useEditorStore((s) => s.modules);
  const allLessons = useEditorStore((s) => s.lessons);
  const allSlides = useEditorStore((s) => s.slides);
  const courseTheme = useEditorStore((s) => s.themeSettings);
  const institutionTheme = useEditorStore((s) => s.institutionTheme);
  const effectiveTheme = useMemo(
    () => resolveEffectiveTheme({ course: courseTheme, institution: institutionTheme, branding: getInstitutionBranding(institutionSlug) }),
    [courseTheme, institutionTheme, institutionSlug],
  );
  // Multi-select
  const selectedBlockIds = useEditorStore((s) => s.selectedBlockIds);
  const toggleBlockSelection = useEditorStore((s) => s.toggleBlockSelection);
  const clearBlockSelection = useEditorStore((s) => s.clearBlockSelection);
  const deleteSelectedBlocks = useEditorStore((s) => s.deleteSelectedBlocks);
  const duplicateSelectedBlocks = useEditorStore((s) => s.duplicateSelectedBlocks);
  const alignBlocks = useEditorStore((s) => s.alignBlocks);
  // Alignment guides
  const [activeGuides, setActiveGuides] = useState<Array<{ type: 'vertical' | 'horizontal'; position: number }>>([]);
  /** Measured content heights in grid row units — drives RGL item height for auto-height blocks. */
  const [measuredGridH, setMeasuredGridH] = useState<Record<string, number>>({});
  const registerMinHeight = useCallback((blockId: string, minH: number) => {
    setMeasuredGridH((prev) => (prev[blockId] === minH ? prev : { ...prev, [blockId]: minH }));
  }, []);

  // Fixed row height (px). Deriving it from the live canvas height created a feedback
  // loop (taller cell → taller canvas → bigger rowHeight → taller cell …). The editor
  // canvas height is effectively constant across device widths, so a fixed unit gives
  // fine-grained, predictable resizing. The student viewer ignores this (CSS auto-rows).
  // Must be declared BEFORE rglLayout and layoutHeightKey (which both reference it).
  const rowHeight = 14;

  const rglLayout = useMemo(
    () =>
      blocks.map((block) =>
        getBlockRglLayout(
          block.id,
          block.block_type,
          (block.data ?? {}) as Record<string, unknown>,
          measuredGridH[block.id],
        ),
      ),
    [blocks, measuredGridH],
  );

  // RGL remount key — STRUCTURAL ONLY: grid constants (rowHeight/margin) + the set of
  // block ids. It intentionally does NOT include per-block heights.
  //
  // react-grid-layout (legacy wrapper) applies height changes from the `layout` prop
  // reactively, so a remount on every height tweak is unnecessary — and harmful: it
  // unmounts/remounts every block, which resets child state. For the image gallery that
  // means `ImageWithFallback` loses its `loaded` flag, the <img>s flash back to
  // placeholders (and may re-fetch), the measured height changes, gridH updates, the key
  // would change again → an infinite remount→reset→re-measure loop (the "constant
  // flashing"). Keying on ids only breaks that loop while still forcing a clean remount
  // when blocks are added/removed or the grid unit changes.
  // Intentionally NOT a useMemo — the hook count must stay stable across HMR updates.
  const layoutHeightKey = `rh${rowHeight}m${GRID_MARGIN[1]}_` + rglLayout.map((l) => l.i).join('|');

  // Drop stale measurements when blocks are removed from the slide
  useEffect(() => {
    const ids = new Set(blocks.map((b) => b.id));
    setMeasuredGridH((prev) => {
      const next = Object.fromEntries(Object.entries(prev).filter(([id]) => ids.has(id)));
      return Object.keys(next).length === Object.keys(prev).length ? prev : next;
    });
  }, [blocks]);

  // Sync stored gridH down to measured content when a block's stored height drifts
  // above what its content needs (e.g. content was shortened). fitBlockHeight now
  // vertically compacts the whole slide, so blocks below settle automatically —
  // no manual per-block shifting here (that double-shifted against compaction).
  useEffect(() => {
    if (!onFitHeight) return;
    for (const block of blocks) {
      if (!blockUsesAutoHeight(block.block_type)) continue;
      const measured = measuredGridH[block.id];
      if (measured == null) continue;
      const storedGrid = getBlockGridLayout((block.data ?? {}) as Record<string, unknown>);
      if (storedGrid.gridH <= measured) continue; // only shrink here; growth comes from BCA
      onFitHeight(block.id, measured);
    }
  }, [blocks, measuredGridH, onFitHeight]);

  useEffect(() => {
    if (!blockContextMenu) return;
    const handleClose = (e: MouseEvent) => {
      // Don't close if clicking inside the context menu itself
      if (contextMenuRef.current?.contains(e.target as Node)) return;
      setBlockContextMenu(null);
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setBlockContextMenu(null);
    };
    // Use setTimeout to avoid the current right-click event triggering close
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClose);
      document.addEventListener('keydown', handleEsc);
    }, 0);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClose);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [blockContextMenu]);

  // Persist grid positions only on user-initiated drag/resize stop.
  // Using onLayoutChange causes a render loop: write → re-render → layout
  // recalculated → onLayoutChange fires again with compacted positions.
  const handleDragOrResizeStop = useCallback(
    (layout: Array<{ i: string; x: number; y: number; w: number; h: number }>) => {
      if (!onUpdateBlock) return;
      for (const item of layout) {
        const block = blocks.find(b => b.id === item.i);
        if (!block) continue;
        const measuredH = measuredGridH[item.i];
        const clampedH = resolvePersistedGridH(block.block_type, item.h, measuredH);
        const currentGrid = getBlockGridLayout((block.data ?? {}) as Record<string, unknown>);
        if (
          currentGrid.gridX !== item.x ||
          currentGrid.gridY !== item.y ||
          currentGrid.gridW !== item.w ||
          currentGrid.gridH !== clampedH
        ) {
          onUpdateBlock(block.id, {
            ...(block.data as Record<string, unknown>),
            gridX: item.x,
            gridY: item.y,
            gridW: item.w,
            gridH: clampedH,
          });
        }
      }
    },
    [blocks, onUpdateBlock],
  );

  const isTitle = slide.slide_type === 'title';
  const settings = slide.settings as Record<string, unknown>;
  const bgStyle = getSlideBackground(settings, effectiveTheme.defaultBackground);
  const backgroundImage = typeof settings?.background_image === 'string'
    ? settings.background_image
    : (courseTheme.default_background_image || null);
  const backgroundFit = resolveSlideBackgroundFit(settings?.background_fit);
  const blockStyle = (settings?.block_style as string | undefined) ?? effectiveTheme.defaultBlockStyle;
  // rowHeight moved below — declared earlier (before rglLayout) to avoid TDZ error

  return (
    <SlideFrame
      lessonTitle={lessonTitle}
      slideTitle={slide.title}
      slideTitleColor={((slide.settings as Record<string, unknown>)?.title_color as string | undefined) ?? effectiveTheme.slideTitleColor}
      lessonTitleColor={effectiveTheme.lessonTitleColor}
      numberColor={effectiveTheme.numberColor}
      progressColor={effectiveTheme.progressColor}
      progressTrackColor={effectiveTheme.progressTrackColor}
      currentSlide={slideNumber}
      totalSlides={totalSlides}
    >
      {/* UNIFIED CANVAS — title slides render TitleSlide as an absolute background so
          additional blocks (video, image, etc.) can be overlaid on top of the base structure. */}
      <div
        ref={(node) => { setDropRef(node); (canvasRef as any).current = node; }}
        className={`relative flex-1 min-h-0 overflow-y-auto transition-all duration-200 ${
          isOver ? 'ring-2 ring-inset ring-blue-300 rounded-b-xl' : ''
        }`}
        style={isTitle ? {} : bgStyle}
      >
        {/* Title slide: TitleSlide fills the background; blocks float above it */}
        {isTitle && (
          <div className="absolute inset-0 pointer-events-none">
            <TitleSlide
              lessonTitle={lessonTitle}
              lessonDescription={lessonDescription}
              moduleName={moduleName}
              titleImageUrl={titleImageUrl}
              institutionSlug={institutionSlug}
              titleSlideSettings={titleSlideSettings}
              titleLogoUrl={effectiveTheme.titleLogoUrl}
              gradientFrom={effectiveTheme.titleGradientFrom}
              gradientTo={effectiveTheme.titleGradientTo}
              defaultBackgroundImageUrl={effectiveTheme.defaultTitleBackgroundUrl}
            />
          </div>
        )}

        {/* Slide body wrapper grows with content so the background image covers the full height */}
        <div className="relative min-h-full">
        {/* Content slide: optional background image */}
        {!isTitle && backgroundImage && (
          <div
            className="absolute inset-0"
            style={slideBackgroundImageStyle(backgroundImage, backgroundFit)}
          >
            <div className="absolute inset-0 bg-black/20" />
          </div>
        )}

          <div className="slide-cq relative z-10">
            {blocks.length === 0 ? (
              isOver ? (
                // Drop-zone active: show for both title and content slides
                <SlideContentArea>
                  <div className="flex flex-col items-center justify-center py-16 border-2 border-dashed rounded-xl text-sm border-blue-400 bg-blue-50/60 text-blue-500 scale-[1.01] transition-all duration-200">
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center mb-3">
                      <Layers className="w-6 h-6 text-blue-400" />
                    </div>
                    <p className="font-medium">Drop here to add</p>
                    <p className="text-xs mt-1.5 max-w-[220px] text-center leading-relaxed">Release to place the block</p>
                  </div>
                </SlideContentArea>
              ) : isTitle ? (
                // Title slide with no extra blocks: show nothing — TitleSlide IS the content
                null
              ) : (
                // Content slide empty state
                <SlideContentArea>
                  <div className="flex flex-col items-center justify-center py-16 border-2 border-dashed rounded-xl text-sm border-gray-200 text-gray-400 transition-all duration-200">
                    <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center mb-3">
                      <Layers className="w-6 h-6 text-gray-300" />
                    </div>
                    <p className="font-medium text-gray-500">Empty slide</p>
                    <p className="text-xs mt-1.5 max-w-[220px] text-center leading-relaxed text-gray-400">
                      Drag components from the right panel, or click one to add it here
                    </p>
                  </div>
                </SlideContentArea>
              )
            ) : (
              <ReactGridLayout
                key={layoutHeightKey}
                layout={rglLayout}
                cols={GRID_COLS}
                rowHeight={rowHeight}
                width={canvasSize.width}
                // Vertical compaction: blocks always stack from the top with no
                // gaps, and dragging pushes neighbours out of the way instead of
                // overlapping. The store mirrors this exact algorithm
                // (compactBlocksVertical) so delete/resize/arrow-move and the
                // student CSS-grid viewer all stay in sync. We persist only on
                // drag/resize STOP (handleDragOrResizeStop) — never onLayoutChange,
                // which would feed back into a render loop.
                compactType="vertical"
                preventCollision={false}
                isResizable
                isDraggable
                resizeHandle={renderBlockResizeHandle}
                draggableHandle=".block-drag-handle"
                margin={GRID_MARGIN}
                containerPadding={GRID_CONTAINER_PADDING}
                onDrag={(_layout: any, _oldItem: any, newItem: any) => {
                  const currentLayout = blocks.map((b) => {
                    const g = getBlockGridLayout((b.data ?? {}) as Record<string, unknown>);
                    return { i: b.id, x: g.gridX, y: g.gridY, w: g.gridW, h: g.gridH };
                  });
                  const updated = currentLayout.map(l => l.i === newItem.i ? { ...l, x: newItem.x, y: newItem.y } : l);
                  setActiveGuides(computeAlignmentGuides(newItem.i, updated));
                }}
                onDragStop={(layout: any) => {
                  setActiveGuides([]);
                  handleDragOrResizeStop(layout);
                }}
                onResizeStop={(layout: any) => {
                  setActiveGuides([]);
                  handleDragOrResizeStop(layout);
                }}
                onResize={(_layout: any, _oldItem: any, newItem: any) => {
                  const block = blocks.find((b) => b.id === newItem.i);
                  if (!block) return;
                  const measuredH = measuredGridH[newItem.i];
                  if (blockUsesAutoHeight(block.block_type) && measuredH != null) {
                    newItem.h = measuredH;
                    newItem.minH = measuredH;
                    newItem.maxH = measuredH;
                    return;
                  }
                  const minH = measuredH ?? 1;
                  if (newItem.h < minH) newItem.h = minH;
                }}
              >
                {blocks.map(block => {
                  const isSelected = selectedBlockId === block.id || selectedBlockIds.has(block.id);
                  const visualIndex = visualIndexById.get(block.id) ?? 0;
                  const isFirstVisual = visualIndex === 0;
                  const isLastVisual = visualIndex >= visualBlockOrder.length - 1;
                  const autoHeightBlock = blockUsesAutoHeight(block.block_type);
                  return (
                  <div
                    key={block.id}
                    className={`relative overflow-visible rounded-2xl transition-all cursor-default group w-full ${
                      autoHeightBlock ? 'h-auto' : 'h-full'
                    } ${
                      isSelected
                        ? 'ring-2 ring-blue-500 shadow-[0_0_0_4px_rgba(59,130,246,0.18)]'
                        : 'hover:ring-2 hover:ring-blue-400/50'
                    }`}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (e.shiftKey) {
                        toggleBlockSelection(block.id);
                      } else {
                        clearBlockSelection();
                        onSelectBlock(block.id);
                      }
                    }}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setBlockContextMenu({ x: e.clientX, y: e.clientY, blockId: block.id });
                    }}
                  >
                    {/* Block content */}
                    {block.block_type === 'page_break' ? (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="flex items-center gap-2 w-full px-3">
                          <div className="flex-1 border-t-2 border-dashed border-slate-300" />
                          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">
                            {(block.data as any)?.label || 'Page Break'}
                          </span>
                          <div className="flex-1 border-t-2 border-dashed border-slate-300" />
                        </div>
                      </div>
                    ) : (() => {
                      const autoHeight = blockUsesAutoHeight(block.block_type);
                      // Exclude grid layout fields — moving/resizing a block shouldn't
                      // trigger BCA re-measurement, only content changes should.
                      const { gridX: _gx, gridY: _gy, gridW: _gw, gridH: _gh, ...contentData } = (block.data ?? {}) as Record<string, unknown>;
                      const contentKey = JSON.stringify(contentData);
                      const blockNode = (
                        <Suspense fallback={<div className="p-4 text-sm text-slate-400">Loading...</div>}>
                          <LessonBlockRenderer
                            block={{
                              id: block.id,
                              institution_id: '',
                              lesson_id: '',
                              block_type: block.block_type,
                              data: block.data,
                              order_index: block.order_index,
                              is_visible: block.is_visible,
                              settings: {},
                              version: 1,
                              title: undefined,
                              created_at: new Date().toISOString(),
                              updated_at: new Date().toISOString(),
                            }}
                            lessonTitle={lessonTitle}
                            context={{ editing: true, blockStyle, soleBlock: blocks.length === 1 }}
                          />
                        </Suspense>
                      );
                      return autoHeight && onFitHeight ? (
                        <BlockContentAutosize
                          blockId={block.id}
                          rowHeight={rowHeight}
                          enabled
                          contentKey={contentKey}
                          onFitHeight={onFitHeight}
                          onMinHeight={registerMinHeight}
                        >
                          {blockNode}
                        </BlockContentAutosize>
                      ) : (
                        <div className="w-full h-full">{blockNode}</div>
                      );
                    })()}

                    {/* Block toolbar — drag handle + reorder arrows + label */}
                    <div
                      className={`absolute top-1 left-1 z-10 inline-flex items-center gap-0.5 rounded backdrop-blur-sm transition-opacity ${
                        isSelected
                          ? 'opacity-100 bg-[#1E3A5F]/80 text-white'
                          : 'opacity-0 group-hover:opacity-100 bg-black/50 text-white/80'
                      }`}
                    >
                      <div
                        className="block-drag-handle inline-flex items-center gap-0.5 px-1.5 py-0.5 cursor-grab active:cursor-grabbing text-[10px] font-medium"
                        data-no-dnd="true"
                      >
                        <GripVertical className="w-3 h-3" />
                        <span className="capitalize">{block.block_type.replace('_', ' ')}</span>
                      </div>
                      {visualBlockOrder.length > 1 && (
                        <>
                          <button
                            onClick={(e) => { e.stopPropagation(); onMoveBlockUp?.(block.id, slide.id); }}
                            disabled={isFirstVisual}
                            className="p-0.5 rounded hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed disabled:pointer-events-none"
                            title="Move up"
                            aria-label="Move up"
                          >
                            <ChevronUp className="w-3 h-3" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); onMoveBlockDown?.(block.id, slide.id); }}
                            disabled={isLastVisual}
                            className="p-0.5 rounded hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed disabled:pointer-events-none"
                            title="Move down"
                            aria-label="Move down"
                          >
                            <ChevronDown className="w-3 h-3" />
                          </button>
                        </>
                      )}
                    </div>

                    {/* Delete button */}
                    {onDeleteBlock && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteBlock(block.id);
                        }}
                        className={`absolute top-1 right-1 z-10 w-5 h-5 rounded flex items-center justify-center transition-opacity backdrop-blur-sm text-white/60 hover:text-red-400 hover:bg-red-500/20 ${
                          isSelected
                            ? 'opacity-100'
                            : 'opacity-0 group-hover:opacity-100'
                        }`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  );
                })}
              </ReactGridLayout>
            )}

            {/* Alignment guides overlay */}
            <AlignmentGuides guides={activeGuides} />

            {/* Multi-select toolbar */}
            {selectedBlockIds.size > 1 && (
              <MultiSelectToolbar
                count={selectedBlockIds.size}
                onDeleteAll={() => deleteSelectedBlocks(slide.id)}
                onDuplicateAll={() => duplicateSelectedBlocks(slide.id)}
                onAlign={(alignment) => alignBlocks(slide.id, alignment)}
              />
            )}
          </div>
        </div>

          {/* Block context menu */}
          {blockContextMenu && (
            <div
              ref={contextMenuRef}
              className="fixed z-[90] bg-white rounded-lg shadow-xl border border-slate-200 py-1 min-w-[160px]"
              style={{ left: blockContextMenu.x, top: blockContextMenu.y }}
              onMouseDown={e => e.stopPropagation()}
            >
              {onDuplicateBlock && (
                <button
                  onClick={() => {
                    onDuplicateBlock(blockContextMenu.blockId, slide.id);
                    setBlockContextMenu(null);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
                >
                  <CopyPlus className="w-3.5 h-3.5" />
                  Duplicate
                </button>
              )}
              {onCopyBlockToSlide && (
                <button
                  onClick={() => {
                    setCopyMoveDialog({ blockId: blockContextMenu.blockId, mode: 'copy' });
                    setBlockContextMenu(null);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
                >
                  <Copy className="w-3.5 h-3.5" />
                  Copy to...
                </button>
              )}
              {onMoveBlockToSlide && (
                <button
                  onClick={() => {
                    setCopyMoveDialog({ blockId: blockContextMenu.blockId, mode: 'move' });
                    setBlockContextMenu(null);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
                >
                  <Move className="w-3.5 h-3.5" />
                  Move to...
                </button>
              )}
              {onDeleteBlock && (
                <button
                  onClick={() => {
                    onDeleteBlock(blockContextMenu.blockId);
                    setBlockContextMenu(null);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete
                </button>
              )}
            </div>
          )}

          {/* Copy/Move block dialog */}
          {copyMoveDialog && (
            <CopyBlockDialog
              modules={modules.map(m => ({ id: m.id, title: m.title }))}
              lessons={(() => {
                const map = new Map<string, { id: string; title: string }[]>();
                for (const mod of modules) {
                  const modLessons = allLessons.get(mod.id) ?? [];
                  map.set(mod.id, modLessons.map(l => ({ id: l.id, title: l.title })));
                }
                return map;
              })()}
              slides={(() => {
                const map = new Map<string, { id: string; order_index: number; title?: string | null; slide_type?: string }[]>();
                for (const [lessonId, slideList] of allSlides) {
                  map.set(lessonId, slideList.map(s => ({
                    id: s.id,
                    order_index: s.order_index,
                    title: s.title,
                    slide_type: s.slide_type,
                  })));
                }
                return map;
              })()}
              title={copyMoveDialog.mode === 'move' ? 'Move block to...' : 'Copy block to...'}
              onCopy={(targetSlideId, targetLessonId) => {
                if (copyMoveDialog.mode === 'copy') {
                  onCopyBlockToSlide?.(copyMoveDialog.blockId, slide.id, targetSlideId, targetLessonId);
                } else {
                  onMoveBlockToSlide?.(copyMoveDialog.blockId, slide.id, targetSlideId, targetLessonId);
                }
                setCopyMoveDialog(null);
              }}
              onClose={() => setCopyMoveDialog(null)}
            />
          )}
        </div>
    </SlideFrame>
  );
}

/** Resolve slide background from settings — supports color, gradient, and image */
export function getSlideBackground(settings: Record<string, unknown>, fallback?: string): CSSProperties {
  const bg = settings?.background ?? fallback;
  if (bg === 'gradient') {
    return {
      background: 'linear-gradient(135deg, #1E3A5F 0%, #2563EB 100%)',
    };
  }
  if (typeof bg === 'string' && bg.startsWith('#')) {
    return { backgroundColor: bg };
  }
  // background_image is handled separately via an absolute-positioned div
  return { backgroundColor: '#FFFFFF' };
}
