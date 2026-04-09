'use client';

import { Suspense, useRef, useState, useEffect, useCallback } from 'react';
import type { CSSProperties } from 'react';
import { GripVertical, Trash2, X } from 'lucide-react';
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
import type { Slide } from '@/types';

interface SlidePreviewProps {
  slide: Slide;
  onSelectBlock: (blockId: string) => void;
  onDeleteBlock?: (blockId: string) => void;
  onUpdateBlock?: (blockId: string, data: Record<string, unknown>) => void;
  onDuplicateBlock?: (blockId: string, slideId: string) => void;
  onCopyBlockTo?: (blockId: string, slideId: string) => void;
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
  onCopyBlockTo,
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

  useEffect(() => {
    if (!blockContextMenu) return;
    const close = () => setBlockContextMenu(null);
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
    return () => {
      document.removeEventListener('mousedown', close);
    };
  }, [blockContextMenu]);

  const handleLayoutChange = useCallback((newLayout: Array<{ i: string; x: number; y: number; w: number; h: number }>) => {
    if (!onUpdateBlock) return;
    for (const item of newLayout) {
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
  }, [blocks, onUpdateBlock]);

  const isTitle = slide.slide_type === 'title';
  const settings = slide.settings as Record<string, unknown>;
  const bgStyle = getSlideBackground(settings);
  const backgroundImage = typeof settings?.background_image === 'string' ? settings.background_image : null;

  return (
    <SlideFrame
      lessonTitle={lessonTitle}
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
                <div className={`flex items-center justify-center h-40 border-2 border-dashed rounded-xl text-sm transition-all duration-200 ${
                  isOver
                    ? 'border-blue-400 bg-blue-50/60 text-blue-500 scale-[1.01]'
                    : 'border-gray-200 text-gray-400'
                }`}>
                  <div className="text-center">
                    <p className="font-medium">{isOver ? 'Drop here to add' : 'No blocks on this slide'}</p>
                    <p className="text-xs mt-1 opacity-70">
                      {isOver ? 'Release to place the block' : 'Drag components from the panel or click to add'}
                    </p>
                  </div>
                </div>
              </SlideContentArea>
            ) : (
              <ReactGridLayout
                layout={blocks.map((block, index) => {
                  const grid = getBlockGridLayout((block.data ?? {}) as Record<string, unknown>);
                  return {
                    i: block.id,
                    x: grid.gridX,
                    y: grid.gridY === 0 && index > 0 ? index * 2 : grid.gridY,
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
                onLayoutChange={handleLayoutChange as any}
              >
                {blocks.map(block => (
                  <div
                    key={block.id}
                    className={`relative overflow-hidden rounded-lg transition-all cursor-default group ${
                      selectedBlockId === block.id
                        ? 'ring-2 ring-[#1E3A5F]'
                        : 'ring-1 ring-slate-200 hover:ring-slate-300'
                    }`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectBlock(block.id);
                    }}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setBlockContextMenu({ x: e.clientX, y: e.clientY, blockId: block.id });
                    }}
                  >
                    {/* Block content */}
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

                    {/* Drag handle */}
                    <div
                      className={`block-drag-handle absolute top-1 left-1 z-10 inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium cursor-grab active:cursor-grabbing backdrop-blur-sm transition-opacity ${
                        selectedBlockId === block.id
                          ? 'opacity-100 bg-[#1E3A5F]/80 text-white'
                          : 'opacity-0 group-hover:opacity-100 bg-black/50 text-white/80'
                      }`}
                    >
                      <GripVertical className="w-3 h-3" />
                      <span className="capitalize">{block.block_type.replace('_', ' ')}</span>
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
          </div>

          {/* Block context menu */}
          {blockContextMenu && (
            <div
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
                  Duplicate
                </button>
              )}
              {onCopyBlockTo && (
                <button
                  onClick={() => {
                    onCopyBlockTo(blockContextMenu.blockId, slide.id);
                    setBlockContextMenu(null);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
                >
                  Copy to...
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
                  Delete
                </button>
              )}
            </div>
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
