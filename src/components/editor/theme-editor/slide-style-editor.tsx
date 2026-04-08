'use client';

import { useRef, useState } from 'react';
import { Upload, X, Loader2, Image as ImageIcon } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { ColorSwatch } from './color-swatch';
import { useEditorStore } from '../editor-store-context';
import type { Slide } from '@/types';

interface SlideStyleEditorProps {
  slideId: string;
}

export function SlideStyleEditor({ slideId }: SlideStyleEditorProps) {
  const slides = useEditorStore((s) => s.slides);
  const updateSlide = useEditorStore((s) => s.updateSlide);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

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

  function updateSettings(changes: Record<string, unknown>) {
    updateSlide(lessonId, slideId, {
      settings: { ...settings, ...changes },
    });
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const supabase = createClient();
      const ext = file.name.split('.').pop();
      const path = `slides/${slideId}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('block-media').upload(path, file, { cacheControl: '3600', upsert: false });
      if (error) throw error;
      const { data: urlData } = supabase.storage.from('block-media').getPublicUrl(path);
      updateSettings({ background_image: urlData.publicUrl });
      toast.success('Background image uploaded');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error('Upload failed', { description: msg });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
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

      <div className="border-t border-gray-100" />

      {/* Background Image */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
          <ImageIcon className="w-3 h-3 inline mr-1" />Background Image
        </p>
        {bgImage ? (
          <div className="relative rounded-lg overflow-hidden border border-gray-200">
            <img src={bgImage} alt="Slide background" className="w-full h-24 object-cover" />
            <button
              type="button"
              onClick={() => updateSettings({ background_image: null })}
              className="absolute top-1.5 right-1.5 bg-black/60 hover:bg-black/80 text-white rounded-full p-1 transition-colors"
              title="Remove background image"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="w-full h-16 border-2 border-dashed border-gray-200 rounded-lg flex flex-col items-center justify-center gap-1 text-gray-400 hover:border-gray-300 hover:text-gray-500 transition-colors"
          >
            {uploading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Upload className="w-4 h-4" />
                <span className="text-[10px] font-medium">Upload image</span>
              </>
            )}
          </button>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleImageUpload}
        />
        <p className="text-[10px] text-gray-400 mt-1">Full-page background behind slide content</p>
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
