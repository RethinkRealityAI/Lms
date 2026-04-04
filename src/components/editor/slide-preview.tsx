'use client';

import { Suspense } from 'react';
import type { CSSProperties } from 'react';
import { Trash2 } from 'lucide-react';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { LessonBlockRenderer } from '@/components/lesson-block-renderer';
import { resolveTheme } from '@/lib/content/theme';
import { useEditorStore } from './editor-store-context';
import { SortableBlock } from './dnd/sortable-block';
import type { Slide } from '@/types';
import type { InstitutionTheme } from '@/types';

interface SlidePreviewProps {
  slide: Slide;
  onSelectBlock: (blockId: string) => void;
  onDeleteBlock?: (blockId: string) => void;
  selectedBlockId?: string;
}

export function SlidePreview({ slide, onSelectBlock, onDeleteBlock, selectedBlockId }: SlidePreviewProps) {
  const blocks = useEditorStore((s) => s.blocks.get(slide.id) ?? []);
  const courseTheme = useEditorStore((s) => s.courseTheme);
  const { setNodeRef: setDropRef, isOver } = useDroppable({ id: 'slide-canvas' });
  const resolvedTheme = resolveTheme({ course: courseTheme as Partial<InstitutionTheme> });

  const bgStyle = getSlideBackground(slide.settings);

  return (
    <div
      className="w-full min-h-full flex flex-col"
      style={{
        ...bgStyle,
        fontFamily: resolvedTheme.fontFamily,
        fontSize: `${resolvedTheme.fontScale}rem`,
        '--theme-primary': resolvedTheme.primaryColor,
        '--theme-accent': resolvedTheme.accentColor,
      } as React.CSSProperties}
    >
      {/* Slide title header if title exists and it's not a title slide */}
      {slide.title && slide.slide_type !== 'title' && (
        <div className="px-6 pt-6 pb-2">
          <h2 className="text-lg font-semibold text-gray-800">{slide.title}</h2>
        </div>
      )}

      {/* Blocks */}
      <div
        ref={setDropRef}
        className={`flex-1 p-6 pl-10 space-y-3 transition-all duration-200 min-h-[200px] ${
          isOver ? 'bg-blue-50/50 ring-2 ring-inset ring-blue-300 rounded-xl' : ''
        }`}
      >
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

                  {/* Block content */}
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
                        lessonTitle=""
                      />
                    </Suspense>
                  </div>
                </div>
              </SortableBlock>
            ))}
          </SortableContext>
        )}
      </div>
    </div>
  );
}

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
  return { backgroundColor: '#FFFFFF' };
}
