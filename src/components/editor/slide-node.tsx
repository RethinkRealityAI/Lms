'use client';

import { Trash2 } from 'lucide-react';
import { SlideTypeIcon } from './slide-type-icon';
import { useEditorStore } from './editor-store-context';
import type { Slide } from '@/types';

interface SlideNodeProps {
  slide: Slide;
  lessonId: string;
}

export function SlideNode({ slide, lessonId }: SlideNodeProps) {
  const selectedEntity = useEditorStore((s) => s.selectedEntity);
  const selectEntity = useEditorStore((s) => s.selectEntity);
  const removeSlide = useEditorStore((s) => s.removeSlide);
  const isSelected = selectedEntity?.type === 'slide' && selectedEntity.id === slide.id;

  function handleDelete(e: React.MouseEvent) {
    e.stopPropagation();
    if (confirm(`Delete slide "${slide.title ?? slide.slide_type}"?`)) {
      removeSlide(lessonId, slide.id);
    }
  }

  return (
    <div
      onClick={() => selectEntity({ type: 'slide', id: slide.id })}
      className={`flex items-center gap-1.5 px-2 py-1.5 ml-8 rounded cursor-pointer group transition-colors ${
        isSelected ? 'bg-[#DC2626] text-white' : 'hover:bg-gray-50 text-gray-600'
      }`}
    >
      <SlideTypeIcon
        type={slide.slide_type}
        className={`w-3 h-3 shrink-0 ${isSelected ? 'text-white' : 'text-gray-400'}`}
      />
      <span className="text-xs truncate flex-1 min-w-0">
        {slide.title || slide.slide_type}
      </span>
      <button
        onClick={handleDelete}
        className={`p-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity ${
          isSelected ? 'hover:bg-red-700' : 'hover:bg-gray-200'
        }`}
      >
        <Trash2 className="w-3 h-3" />
      </button>
    </div>
  );
}
