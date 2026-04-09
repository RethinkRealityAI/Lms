'use client';

import { Suspense, useRef, useState, useEffect, useCallback } from 'react';
import type { CSSProperties } from 'react';
import { GripVertical, Trash2, X, Copy, CopyPlus, Move, ChevronUp, ChevronDown, Layers } from 'lucide-react';
import { useDroppable } from '@dnd-kit/core';
import RGL from 'react-grid-layout';
const ReactGridLayout = RGL as any;
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import { LessonBlockRenderer } from '@/components/lesson-block-renderer';
import { SlideFrame, SlideContentArea } from '@/components/shared/slide-frame';
import { TitleSlide } from '@/components/shared/title-slide';
import { useEditorStore } from './editor-store-context';
import {
  GRID_COLS, GRID_MARGIN, GRID_CONTAINER_PADDING,
  RESIZE_HANDLES, computeRowHeight, getBlockGridLayout,
} from '@/lib/content/gridConstants';
import { CopyBlockDialog } from './copy-block-dialog';
import { MultiSelectToolbar } from './multi-select-toolbar';
import { AlignmentGuides, computeAlignmentGuides } from './alignment-guides';
import type { Slide } from '@/types';

interface SlidePreviewProps {
  slide: Slide;
  onSelectBlock: (blockId: string) => void;
  onDeleteBlock?: (blockId: string) => void;
  onUpdateBlock?: (blockId: string, data: Record<string, unknown>) => void;
  onDuplicateBlock?: (blockId: string, slideId: string) => void;
  onCopyBlockToSlide?: (blockId: string, sourceSlideId: string, targetSlideId: string, targetLessonId: string) => void;
  onMoveBlockToSlide?: (blockId: string, sourceSlideId: string, targetSlideId: string, targetLessonId: string) => void;
  onMoveBlockUp?: (blockId: string, slideId: string) => void;
  onMoveBlockDown?: (blockId: string, slideId: string) => void;
  selectedBlockId?: string;
  /** Lesson title for the header */
  lessonTitle?: string;
  /** Lesson description for title slide */
  lessonDescription?: string | null;
  /** Title image URL for title slide background */
  titleImageUrl?: string | null;
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
  onDuplicateBlock,
  onCopyBlockToSlide,
  onMoveBlockToSlide,
  onMoveBlockUp,
  onMoveBlockDown,
  selectedBlockId,
  lessonTitle = 'Untitled Lesson',
  lessonDescription,
  titleImageUrl,
  slideNumber = 1,
  totalSlides = 1,
}: SlidePreviewProps) {
  const blocks = useEditorStore((s) => s.blocks.get(slide.id) ?? []);
  const { setNodeRef: setDropRef, isOver } = useDroppable({ id: 'slide-canvas' });

  // Canvas size measurement for react-grid-layout
  const canvasRef = useRef<HTMLDivElement>(null);
  const [canvasSize, setCanvasSize] = useState<{ width: number; height: number }>({ width: 600, height: 400 });

  useEffect(() => {
    if (!canvasRef.current) return;
    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        setCanvasSize({ width: entry.contentRect.width, height: entry.contentRect.height });
      }
    });
    observer.observe(canvasRef.current);
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
  // Multi-select
  const selectedBlockIds = useEditorStore((s) => s.selectedBlockIds);
  const toggleBlockSelection = useEditorStore((s) => s.toggleBlockSelection);
  const clearBlockSelection = useEditorStore((s) => s.clearBlockSelection);
  const deleteSelectedBlocks = useEditorStore((s) => s.deleteSelectedBlocks);
  const duplicateSelectedBlocks = useEditorStore((s) => s.duplicateSelectedBlocks);
  const alignBlocks = useEditorStore((s) => s.alignBlocks);
  // Alignment guides
  const [activeGuides, setActiveGuides] = useState<Array<{ type: 'vertical' | 'horizontal'; position: number }>>([]);

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
        const currentGrid = getBlockGridLayout((block.data ?? {}) as Record<string, unknown>);
        if (
          currentGrid.gridX !== item.x ||
          currentGrid.gridY !== item.y ||
          currentGrid.gridW !== item.w ||
          currentGrid.gridH !== item.h
        ) {
          onUpdateBlock(block.id, {
            ...(block.data as Record<string, unknown>),
            gridX: item.x,
            gridY: item.y,
            gridW: item.w,
            gridH: item.h,
          });
        }
      }
    },
    [blocks, onUpdateBlock],
  );

  const isTitle = slide.slide_type === 'title';
  const settings = slide.settings as Record<string, unknown>;
  const bgStyle = getSlideBackground(settings);
  const backgroundImage = typeof settings?.background_image === 'string' ? settings.background_image : null;

  return (
    <SlideFrame
      lessonTitle={lessonTitle}
      slideTitle={slide.title}
      slideTitleColor={(slide.settings as Record<string, unknown>)?.title_color as string | undefined}
      currentSlide={slideNumber}
      totalSlides={totalSlides}
    >
      {/* TITLE SLIDE */}
      {isTitle && (
        <TitleSlide
          lessonTitle={lessonTitle}
          lessonDescription={lessonDescription}
          titleImageUrl={titleImageUrl}
        />
      )}

      {/* CONTENT SLIDE — blocks with react-grid-layout canvas */}
      {!isTitle && (
        <div
          ref={(node) => { setDropRef(node); (canvasRef as any).current = node; }}
          className={`relative flex-1 overflow-y-auto transition-all duration-200 ${
            isOver ? 'ring-2 ring-inset ring-blue-300 rounded-b-xl' : ''
          }`}
          style={bgStyle}
        >
          {/* Background image layer */}
          {backgroundImage && (
            <div
              className="absolute inset-0 bg-cover bg-center bg-no-repeat"
              style={{ backgroundImage: `url(${backgroundImage})` }}
            >
              <div className="absolute inset-0 bg-black/20" />
            </div>
          )}

          <div className="relative z-10">
            {blocks.length === 0 ? (
              <SlideContentArea>
                <div className={`flex flex-col items-center justify-center py-16 border-2 border-dashed rounded-xl text-sm transition-all duration-200 ${
                  isOver
                    ? 'border-blue-400 bg-blue-50/60 text-blue-500 scale-[1.01]'
                    : 'border-gray-200 text-gray-400'
                }`}>
                  <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center mb-3">
                    <Layers className="w-6 h-6 text-gray-300" />
                  </div>
                  <p className="font-medium text-gray-500">
                    {isOver ? 'Drop here to add' : 'Empty slide'}
                  </p>
                  <p className="text-xs mt-1.5 max-w-[220px] text-center leading-relaxed text-gray-400">
                    {isOver
                      ? 'Release to place the block'
                      : 'Drag components from the right panel, or click one to add it here'}
                  </p>
                </div>
              </SlideContentArea>
            ) : (
              <ReactGridLayout
                layout={blocks.map((block) => {
                  const grid = getBlockGridLayout((block.data ?? {}) as Record<string, unknown>);
                  return {
                    i: block.id,
                    x: grid.gridX,
                    y: grid.gridY,
                    w: grid.gridW,
                    h: grid.gridH,
                  };
                })}
                cols={GRID_COLS}
                rowHeight={computeRowHeight(canvasSize.height)}
                width={canvasSize.width}
                compactType="vertical"
                isResizable={true}
                isDraggable={true}
                resizeHandles={RESIZE_HANDLES as any}
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
              >
                {blocks.map(block => (
                  <div
                    key={block.id}
                    className={`relative overflow-hidden rounded-lg transition-all cursor-default group ${
                      selectedBlockId === block.id || selectedBlockIds.has(block.id)
                        ? 'ring-2 ring-[#1E3A5F]'
                        : 'ring-1 ring-slate-200 hover:ring-slate-300'
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
                    ) : (
                    <div className="absolute inset-0 overflow-hidden pointer-events-none">
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
                        />
                      </Suspense>
                    </div>
                    )}

                    {/* Block toolbar — drag handle + reorder arrows + label */}
                    <div
                      className={`absolute top-1 left-1 z-10 inline-flex items-center gap-0.5 rounded backdrop-blur-sm transition-opacity ${
                        selectedBlockId === block.id
                          ? 'opacity-100 bg-[#1E3A5F]/80 text-white'
                          : 'opacity-0 group-hover:opacity-100 bg-black/50 text-white/80'
                      }`}
                    >
                      <div className="block-drag-handle inline-flex items-center gap-0.5 px-1.5 py-0.5 cursor-grab active:cursor-grabbing text-[10px] font-medium">
                        <GripVertical className="w-3 h-3" />
                        <span className="capitalize">{block.block_type.replace('_', ' ')}</span>
                      </div>
                      {blocks.length > 1 && (
                        <>
                          <button
                            onClick={(e) => { e.stopPropagation(); onMoveBlockUp?.(block.id, slide.id); }}
                            disabled={blocks.indexOf(block) === 0}
                            className="p-0.5 rounded hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed"
                            title="Move up"
                          >
                            <ChevronUp className="w-3 h-3" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); onMoveBlockDown?.(block.id, slide.id); }}
                            disabled={blocks.indexOf(block) === blocks.length - 1}
                            className="p-0.5 rounded hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed"
                            title="Move down"
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
                          selectedBlockId === block.id
                            ? 'opacity-100'
                            : 'opacity-0 group-hover:opacity-100'
                        }`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ))}
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
                const map = new Map<string, { id: string; order_index: number }[]>();
                for (const [lessonId, slideList] of allSlides) {
                  map.set(lessonId, slideList.map(s => ({ id: s.id, order_index: s.order_index })));
                }
                return map;
              })()}
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
      )}
    </SlideFrame>
  );
}

/** Resolve slide background from settings — supports color, gradient, and image */
export function getSlideBackground(settings: Record<string, unknown>): CSSProperties {
  const bg = settings?.background;
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
