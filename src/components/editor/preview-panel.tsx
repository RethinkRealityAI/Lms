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

export function PreviewPanel({ onDeleteBlock }: PreviewPanelProps) {
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
    <div className="flex-1 flex flex-col min-w-0 bg-gray-50">
      {/* Device toggle toolbar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-white/95 backdrop-blur-sm border-b border-gray-100 shrink-0">
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Preview</span>
        <div className="flex items-center gap-1 bg-gray-50 rounded-lg p-0.5">
          {(['desktop', 'tablet', 'mobile'] as DeviceMode[]).map((d) => (
            <button
              key={d}
              onClick={() => setDevice(d)}
              title={d.charAt(0).toUpperCase() + d.slice(1)}
              className={`p-1.5 rounded-md transition-all duration-150 ${
                device === d
                  ? 'bg-white text-gray-700 shadow-sm'
                  : 'text-gray-400 hover:text-gray-500'
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
          className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden transition-all duration-300 flex flex-col"
          style={{ width: DEVICE_WIDTHS[device], maxWidth: '100%', minHeight: '500px' }}
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
      </div>

      {/* Slide navigation */}
      <div className="flex items-center justify-center gap-4 py-2.5 bg-white/95 backdrop-blur-sm border-t border-gray-100 shrink-0">
        <button
          onClick={goToPrevSlide}
          disabled={slideIndex <= 0}
          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 disabled:opacity-20 transition-all"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-xs font-medium text-gray-500 min-w-[100px] text-center tabular-nums">
          {selectedSlide
            ? `Slide ${slideIndex + 1} of ${siblingSlides.length}`
            : 'No slide selected'
          }
        </span>
        <button
          onClick={goToNextSlide}
          disabled={slideIndex < 0 || slideIndex >= siblingSlides.length - 1}
          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 disabled:opacity-20 transition-all"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
