'use client';

import { X } from 'lucide-react';
import { TemplateCard } from './template-card';
import { SLIDE_TEMPLATES, type SlideTemplateConfig } from '@/lib/content/slide-templates';
import { useEditorStore } from './editor-store-context';
import type { Slide } from '@/types';

interface SlideTemplatePickerProps {
  lessonId: string;
  onClose: () => void;
  /** When provided, called instead of writing directly to the store — allows DB-first creation */
  onAddSlide?: (lessonId: string, slideData: Slide) => void;
}

export function SlideTemplatePicker({ lessonId, onClose, onAddSlide }: SlideTemplatePickerProps) {
  const slides = useEditorStore((s) => s.slides.get(lessonId) ?? []);
  const addSlide = useEditorStore((s) => s.addSlide);

  function handleSelect(template: SlideTemplateConfig) {
    const slideData: Slide = {
      id: crypto.randomUUID(),
      lesson_id: lessonId,
      slide_type: template.type,
      title: template.name,
      order_index: slides.length,
      status: 'draft',
      settings: template.defaultSettings,
      canvas_data: null,
      deleted_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    if (onAddSlide) {
      onAddSlide(lessonId, slideData);
    } else {
      addSlide(lessonId, slideData);
    }
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Choose a slide template</h2>
            <p className="text-xs text-gray-500 mt-0.5">Pick a starting point — you can always add or remove blocks</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto grid grid-cols-3 gap-3">
          {SLIDE_TEMPLATES.map((template) => (
            <TemplateCard
              key={template.type}
              template={template}
              onSelect={handleSelect}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
