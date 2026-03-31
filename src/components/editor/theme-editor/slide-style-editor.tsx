'use client';

import { ColorSwatch } from './color-swatch';
import { useEditorStore } from '../editor-store-context';
import type { Slide } from '@/types';

interface SlideStyleEditorProps {
  slideId: string;
}

export function SlideStyleEditor({ slideId }: SlideStyleEditorProps) {
  const slides = useEditorStore((s) => s.slides);
  const updateSlide = useEditorStore((s) => s.updateSlide);

  let slide: Slide | undefined;
  let lessonId: string = '';
  for (const [lid, slideList] of slides) {
    const found = slideList.find((s) => s.id === slideId);
    if (found) { slide = found; lessonId = lid; break; }
  }

  if (!slide) return null;

  const settings = slide.settings as Record<string, unknown>;
  const bg = (settings.background as string) || '#FFFFFF';

  function updateSettings(changes: Record<string, unknown>) {
    updateSlide(lessonId, slideId, {
      settings: { ...settings, ...changes },
    });
  }

  const BG_PRESETS = [
    { label: 'White', value: '#FFFFFF' },
    { label: 'Light', value: '#F8FAFC' },
    { label: 'Navy', value: '#1E3A5F' },
    { label: 'Dark', value: '#0F172A' },
    { label: 'Gradient', value: 'gradient' },
  ];

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Slide Type</p>
        <p className="text-sm font-medium text-gray-700 capitalize">{slide.slide_type}</p>
      </div>

      <div className="border-t border-gray-100" />

      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Background</p>
        <div className="flex gap-1.5 flex-wrap">
          {BG_PRESETS.map((preset) => (
            <button
              key={preset.value}
              onClick={() => updateSettings({ background: preset.value })}
              className={`px-2 py-1 text-xs rounded-lg transition-colors border ${
                bg === preset.value
                  ? 'border-[#1E3A5F] text-[#1E3A5F] bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300 text-gray-600'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
        {bg !== 'gradient' && (
          <div className="mt-2">
            <ColorSwatch
              label="Custom"
              value={bg.startsWith('#') ? bg : '#FFFFFF'}
              onChange={(v) => updateSettings({ background: v })}
            />
          </div>
        )}
      </div>
    </div>
  );
}
