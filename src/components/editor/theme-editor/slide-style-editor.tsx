'use client';

import { Image as ImageIcon, Paintbrush } from 'lucide-react';
import { ColorSwatch } from './color-swatch';
import { useEditorStore } from '../editor-store-context';
import { DropZoneUploader } from '../drop-zone-uploader';
import { CanvaDesignPicker } from '../canva-design-picker';
import { DEFAULT_BLOCK_STYLE } from '@/lib/content/gridConstants';
import { SLIDE_BACKGROUND_FITS, resolveSlideBackgroundFit } from '@/lib/content/slide-background';
import type { Slide } from '@/types';

const BLOCK_STYLES: { value: string; label: string; description: string; preview: string }[] = [
  {
    value: 'glass',
    label: 'Light Glass',
    description: 'Frosted glass — the default, transparent on light slides',
    preview: 'bg-white/25 border border-slate-200/60 shadow-md backdrop-blur-sm',
  },
  {
    value: 'glass-dark',
    label: 'Dark Glass',
    description: 'Smoked liquid glass — for dark or photo backgrounds',
    preview: 'bg-slate-900/55 border border-white/15 shadow-md backdrop-blur-sm',
  },
  {
    value: 'classic',
    label: 'Classic',
    description: 'Clean white card',
    preview: 'bg-white border border-gray-200 shadow-sm',
  },
  {
    value: 'none',
    label: 'None',
    description: 'No container — transparent blocks',
    preview: 'border-2 border-dashed border-gray-200',
  },
];

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
  const bgImage = typeof settings.background_image === 'string' ? settings.background_image : null;
  const blockStyle = (settings.block_style as string) ?? DEFAULT_BLOCK_STYLE;

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

      {/* Block Container Style */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Block Style</p>
        <p className="text-[10px] text-gray-400 mb-2.5">How component containers look on this slide</p>
        <div className="grid grid-cols-2 gap-2">
          {BLOCK_STYLES.map((s) => {
            const active = blockStyle === s.value;
            return (
              <button
                key={s.value}
                onClick={() => updateSettings({ block_style: s.value })}
                className={`flex flex-col items-start gap-1.5 p-2.5 rounded-xl border text-left transition-all ${
                  active
                    ? 'border-[#1E3A5F] bg-blue-50 ring-1 ring-[#1E3A5F]/30'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                {/* Mini preview swatch */}
                <div className={`w-full h-6 rounded-md ${s.preview}`} />
                <span className={`text-[11px] font-semibold leading-tight ${active ? 'text-[#1E3A5F]' : 'text-gray-700'}`}>
                  {s.label}
                </span>
                <span className="text-[9px] text-gray-400 leading-tight">{s.description}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="border-t border-gray-100" />

      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Background Color</p>
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

      {/* Slide Title Color */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Slide Title Color</p>
        <div className="flex gap-1.5 flex-wrap">
          {[
            { label: 'Slate', value: '#64748b' },
            { label: 'Navy', value: '#1E3A5F' },
            { label: 'Red', value: '#DC2626' },
            { label: 'Teal', value: '#0099CA' },
            { label: 'Black', value: '#0F172A' },
          ].map((preset) => (
            <button
              key={preset.value}
              onClick={() => updateSettings({ title_color: preset.value })}
              className={`px-2 py-1 text-xs rounded-lg transition-colors border ${
                ((settings.title_color as string) || '#64748b') === preset.value
                  ? 'border-[#1E3A5F] text-[#1E3A5F] bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300 text-gray-600'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
        <div className="mt-2">
          <ColorSwatch
            label="Custom"
            value={((settings.title_color as string) || '#64748b')}
            onChange={(v) => updateSettings({ title_color: v })}
          />
        </div>
        <p className="text-[10px] text-gray-400 mt-1">Color of the slide title shown under the lesson name</p>
      </div>

      <div className="border-t border-gray-100" />

      {/* Background Image */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
          <ImageIcon className="w-3 h-3 inline mr-1" />Background Image
        </p>
        <DropZoneUploader
          bucket="block-media"
          pathPrefix={`slides/${slideId}/`}
          accept="image/*"
          label="Drop image or click to upload"
          currentUrl={bgImage ?? undefined}
          onUpload={(url) => updateSettings({ background_image: url })}
          onRemove={() => updateSettings({ background_image: null })}
          previewMode="image"
        />
        <p className="text-[10px] text-gray-400 mt-1">Full-page background behind slide content</p>

        {bgImage && (
          <div className="mt-3">
            <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
              Image fit
            </label>
            <div className="flex gap-1.5">
              {SLIDE_BACKGROUND_FITS.map((f) => {
                const active = resolveSlideBackgroundFit(settings.background_fit) === f.value;
                return (
                  <button
                    key={f.value}
                    onClick={() => updateSettings({ background_fit: f.value })}
                    title={f.hint}
                    className={`flex-1 px-2 py-1.5 text-xs rounded-lg border font-medium transition-all ${
                      active
                        ? 'border-[#1E3A5F] text-[#1E3A5F] bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300 text-gray-600'
                    }`}
                  >
                    {f.label}
                  </button>
                );
              })}
            </div>
            <p className="text-[10px] text-gray-400 mt-1">
              Fills the whole slide even when it scrolls past the viewport.
            </p>
          </div>
        )}
      </div>

      {/* Canva Design as Background */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
          <Paintbrush className="w-3 h-3 inline mr-1" />Design with Canva
        </p>
        <CanvaDesignPicker
          entityType="slide"
          entityId={slideId}
          onSelect={(imageUrl) => {
            if (imageUrl) {
              updateSettings({ background_image: imageUrl, canva_design_url: imageUrl });
            }
          }}
        />
        <p className="text-[10px] text-gray-400 mt-1">Create or import a Canva design as slide background</p>
      </div>

      {/* Transition */}
      <div className="border-t border-gray-100" />
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1.5">Slide Transition</label>
        <select
          value={(settings.transition as string) || 'crossfade'}
          onChange={e => updateSettings({ transition: e.target.value })}
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent bg-white"
        >
          <option value="crossfade">Crossfade (default)</option>
          <option value="slide-horizontal">Horizontal Slide</option>
          <option value="fade-up">Fade Up</option>
        </select>
      </div>

      {/* Navigation Settings */}
      <div className="space-y-3 pt-4 border-t border-gray-100">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Navigation</p>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Button Label</label>
          <input
            type="text"
            value={(settings.nav_label as string) ?? ''}
            onChange={(e) => updateSettings({ nav_label: e.target.value || undefined })}
            placeholder="Auto (Next / Complete Lesson)"
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent"
          />
          <p className="mt-1 text-xs text-gray-400">Leave empty for automatic labels</p>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">External Link (optional)</label>
          <input
            type="url"
            value={(settings.nav_url as string) ?? ''}
            onChange={(e) => updateSettings({ nav_url: e.target.value || undefined })}
            placeholder="https://..."
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent"
          />
          <p className="mt-1 text-xs text-gray-400">If set, button opens this URL instead of navigating</p>
        </div>
      </div>
    </div>
  );
}
