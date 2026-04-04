'use client';

import { Suspense } from 'react';
import type { CSSProperties } from 'react';
import { Trash2 } from 'lucide-react';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { LessonBlockRenderer } from '@/components/lesson-block-renderer';
import { SlideFrame, SlideContentArea } from '@/components/shared/slide-frame';
import { TitleSlide } from '@/components/shared/title-slide';
import { useEditorStore } from './editor-store-context';
import { SortableBlock } from './dnd/sortable-block';
import type { Slide } from '@/types';

interface SlidePreviewProps {
  slide: Slide;
  onSelectBlock: (blockId: string) => void;
  onDeleteBlock?: (blockId: string) => void;
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
  selectedBlockId,
  lessonTitle = 'Untitled Lesson',
  lessonDescription,
  titleImageUrl,
  slideNumber = 1,
  totalSlides = 1,
}: SlidePreviewProps) {
  const blocks = useEditorStore((s) => s.blocks.get(slide.id) ?? []);
  const { setNodeRef: setDropRef, isOver } = useDroppable({ id: 'slide-canvas' });

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

      {/* CONTENT SLIDE — blocks with background + sortable DnD */}
      {!isTitle && (
        <div
          ref={setDropRef}
          className={`relative flex-1 overflow-y-auto transition-all duration-200 ${
            isOver ? 'ring-2 ring-inset ring-blue-300 rounded-b-xl' : ''
          }`}
          style={bgStyle}
        >
          {/* Background image layer (behind content) */}
          {backgroundImage && (
            <div
              className="absolute inset-0 bg-cover bg-center bg-no-repeat"
              style={{ backgroundImage: `url(${backgroundImage})` }}
            >
              <div className="absolute inset-0 bg-black/20" />
            </div>
          )}

          <div className="relative z-10">
            <SlideContentArea>
              {blocks.length === 0 ? (
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
              ) : (
                <SortableContext items={blocks.map(b => b.id)} strategy={verticalListSortingStrategy}>
                  {blocks.map((block) => (
                    <SortableBlock
                      key={block.id}
                      id={block.id}
                      blockType={block.block_type}
                      label={block.block_type.replace('_', ' ')}
                    >
                      <div
                        onClick={() => onSelectBlock(block.id)}
                        className={`relative group/block cursor-pointer rounded-xl transition-all duration-150 ${
                          selectedBlockId === block.id
                            ? 'ring-2 ring-[#1E3A5F] ring-offset-2 shadow-sm'
                            : 'hover:ring-2 hover:ring-blue-200 hover:ring-offset-1'
                        }`}
                      >
                        {/* Block type label + delete */}
                        <div
                          className={`absolute -top-6 left-0 flex items-center gap-1.5 transition-all duration-150 z-10 ${
                            selectedBlockId === block.id
                              ? 'opacity-100'
                              : 'opacity-0 group-hover/block:opacity-100'
                          }`}
                        >
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full tracking-wide uppercase ${
                            selectedBlockId === block.id
                              ? 'bg-[#1E3A5F] text-white'
                              : 'bg-gray-600 text-white'
                          }`}>
                            {block.block_type.replace('_', ' ')}
                          </span>
                          {onDeleteBlock && (
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); onDeleteBlock(block.id); }}
                              title="Delete block"
                              className="p-0.5 rounded-full bg-red-500 hover:bg-red-600 text-white transition-colors shadow-sm"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>

                        {/* Block content — rendered identically to student view */}
                        <div className="pointer-events-none">
                          <Suspense fallback={<div className="animate-pulse bg-gray-100 rounded-xl h-16" />}>
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
                      </div>
                    </SortableBlock>
                  ))}
                </SortableContext>
              )}
            </SlideContentArea>
          </div>
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
