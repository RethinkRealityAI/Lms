'use client';

import { useState } from 'react';
import { Monitor, Tablet, Smartphone, ChevronLeft, ChevronRight } from 'lucide-react';
import { SlidePreview } from './slide-preview';
import { useEditorStore } from './editor-store-context';
import type { Slide } from '@/types';

type DeviceMode = 'desktop' | 'tablet' | 'mobile';

const DEVICE_WIDTHS: Record<DeviceMode, string> = {
  desktop: '100%',
  tablet: '768px',
  mobile: '375px',
};

export interface PreviewPanelProps {
  onAddBlock?: (slideId: string, blockType: string) => void;
  onDeleteBlock?: (blockId: string) => void;
}

export function PreviewPanel({ onAddBlock, onDeleteBlock }: PreviewPanelProps) {
  const [device, setDevice] = useState<DeviceMode>('desktop');
  const selectedEntity = useEditorStore((s) => s.selectedEntity);
  const slides = useEditorStore((s) => s.slides);
  const blocks = useEditorStore((s) => s.blocks);
  const selectEntity = useEditorStore((s) => s.selectEntity);

  // Find the currently selected slide
  let selectedSlide: Slide | null = null;
  let siblingSlides: Slide[] = [];

  if (selectedEntity?.type === 'slide') {
    for (const [, slideList] of slides) {
      const found = slideList.find((s) => s.id === selectedEntity.id);
      if (found) {
        selectedSlide = found;
        siblingSlides = slideList;
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
      for (const [, slideList] of slides) {
        const found = slideList.find((s) => s.id === parentSlideId);
        if (found) {
          selectedSlide = found;
          siblingSlides = slideList;
          break;
        }
      }
    }
  }

  const slideIndex = selectedSlide ? siblingSlides.indexOf(selectedSlide) : -1;

  function goToPrevSlide() {
    if (slideIndex > 0) {
      selectEntity({ type: 'slide', id: siblingSlides[slideIndex - 1].id });
    }
  }

  function goToNextSlide() {
    if (slideIndex < siblingSlides.length - 1) {
      selectEntity({ type: 'slide', id: siblingSlides[slideIndex + 1].id });
    }
  }

  const selectedBlockId = selectedEntity?.type === 'block' ? selectedEntity.id : undefined;

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-gray-100">
      {/* Device toggle toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-white border-b border-gray-200 shrink-0">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Preview</span>
        <div className="flex items-center gap-0.5">
          {(['desktop', 'tablet', 'mobile'] as DeviceMode[]).map((d) => (
            <button
              key={d}
              onClick={() => setDevice(d)}
              title={d.charAt(0).toUpperCase() + d.slice(1)}
              className={`p-1.5 rounded transition-colors ${
                device === d ? 'bg-gray-200 text-gray-700' : 'hover:bg-gray-100 text-gray-400'
              }`}
            >
              {d === 'desktop' && <Monitor className="w-4 h-4" />}
              {d === 'tablet' && <Tablet className="w-4 h-4" />}
              {d === 'mobile' && <Smartphone className="w-4 h-4" />}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 flex items-start justify-center p-6 overflow-auto">
        <div
          className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden transition-all duration-300 flex flex-col"
          style={{ width: DEVICE_WIDTHS[device], maxWidth: '100%', minHeight: '500px' }}
          onDragOver={(e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
          }}
          onDrop={(e) => {
            e.preventDefault();
            const blockType = e.dataTransfer.getData('application/x-block-type');
            if (blockType && selectedSlide && onAddBlock) {
              onAddBlock(selectedSlide.id, blockType);
            }
          }}
        >
          {selectedSlide ? (
            <SlidePreview
              slide={selectedSlide}
              selectedBlockId={selectedBlockId}
              onSelectBlock={(blockId) => selectEntity({ type: 'block', id: blockId })}
              onDeleteBlock={onDeleteBlock}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-400 text-sm p-12">
              <div className="text-center">
                <Monitor className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                <p>Select a slide to preview</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Slide navigation */}
      <div className="flex items-center justify-center gap-3 py-3 bg-white border-t border-gray-200 shrink-0">
        <button
          onClick={goToPrevSlide}
          disabled={slideIndex <= 0}
          className="p-1 rounded hover:bg-gray-100 text-gray-400 disabled:opacity-30"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-xs text-gray-500 min-w-[80px] text-center">
          {selectedSlide
            ? `Slide ${slideIndex + 1} of ${siblingSlides.length}`
            : 'No slide selected'
          }
        </span>
        <button
          onClick={goToNextSlide}
          disabled={slideIndex < 0 || slideIndex >= siblingSlides.length - 1}
          className="p-1 rounded hover:bg-gray-100 text-gray-400 disabled:opacity-30"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
