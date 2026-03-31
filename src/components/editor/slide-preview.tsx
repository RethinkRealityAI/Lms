'use client';

import { Suspense } from 'react';
import type { CSSProperties } from 'react';
import { LessonBlockRenderer } from '@/components/lesson-block-renderer';
import { resolveTheme } from '@/lib/content/theme';
import { useEditorStore } from './editor-store-context';
import type { Slide } from '@/types';
import type { InstitutionTheme } from '@/types';

interface SlidePreviewProps {
  slide: Slide;
  onSelectBlock: (blockId: string) => void;
  selectedBlockId?: string;
}

export function SlidePreview({ slide, onSelectBlock, selectedBlockId }: SlidePreviewProps) {
  const blocks = useEditorStore((s) => s.blocks.get(slide.id) ?? []);
  const courseTheme = useEditorStore((s) => s.courseTheme);
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
      <div className="flex-1 p-6 space-y-4">
        {blocks.length === 0 ? (
          <div className="flex items-center justify-center h-32 border-2 border-dashed border-gray-200 rounded-lg text-gray-400 text-sm">
            No blocks on this slide. Add blocks from the properties panel.
          </div>
        ) : (
          blocks.map((block) => (
            <div
              key={block.id}
              onClick={() => onSelectBlock(block.id)}
              className={`relative group cursor-pointer rounded-lg transition-all ${
                selectedBlockId === block.id
                  ? 'ring-2 ring-[#1E3A5F] ring-offset-2'
                  : 'hover:ring-2 hover:ring-blue-300 hover:ring-offset-1'
              }`}
            >
              {/* Block type label (shown on hover/select) */}
              <div
                className={`absolute -top-5 left-0 text-xs px-2 py-0.5 rounded text-white transition-opacity z-10 ${
                  selectedBlockId === block.id
                    ? 'opacity-100 bg-[#1E3A5F]'
                    : 'opacity-0 group-hover:opacity-100 bg-gray-500'
                }`}
              >
                {block.block_type.replace('_', ' ')}
              </div>

              {/* Actual block rendered by student viewer */}
              <div className="pointer-events-none">
                <Suspense fallback={<div className="animate-pulse bg-gray-100 rounded-lg h-16" />}>
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
          ))
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
