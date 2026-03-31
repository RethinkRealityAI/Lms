'use client';

import type { BlockEditorProps } from '@/lib/content/block-registry';
import type { ImageGalleryData } from '@/lib/content/blocks/image-gallery/schema';

const inputClass =
  'w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent';

type ImageEntry = ImageGalleryData['images'][number];

export function ImageGalleryEditor({ data, onChange }: BlockEditorProps<ImageGalleryData>) {
  function updateImage(index: number, patch: Partial<ImageEntry>) {
    const updated = data.images.map((img, i) => (i === index ? { ...img, ...patch } : img));
    onChange({ ...data, images: updated });
  }

  function addImage() {
    onChange({ ...data, images: [...data.images, { url: '', caption: '', alt: '' }] });
  }

  function removeImage(index: number) {
    onChange({ ...data, images: data.images.filter((_, i) => i !== index) });
  }

  const modes: ImageGalleryData['mode'][] = ['gallery', 'slider', 'carousel'];

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Display Mode</label>
        <div className="flex gap-2">
          {modes.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => onChange({ ...data, mode: m })}
              className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                data.mode === m
                  ? 'bg-[#1E3A5F] text-white border-[#1E3A5F]'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-[#1E3A5F]'
              }`}
            >
              {m.charAt(0).toUpperCase() + m.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-medium text-gray-700">
            Images ({data.images.length})
          </label>
          <button
            type="button"
            onClick={addImage}
            className="px-2 py-1 text-xs bg-[#1E3A5F] text-white rounded-lg hover:bg-[#162d4a] transition-colors"
          >
            + Add Image
          </button>
        </div>

        {data.images.length === 0 && (
          <p className="text-xs text-gray-400 italic py-2">No images yet. Click &quot;Add Image&quot; to get started.</p>
        )}

        <div className="space-y-3">
          {data.images.map((img, i) => (
            <div key={i} className="p-3 border border-gray-200 rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-600">Image {i + 1}</span>
                <button
                  type="button"
                  onClick={() => removeImage(i)}
                  className="text-xs text-red-500 hover:text-red-700 transition-colors"
                >
                  Remove
                </button>
              </div>
              <input
                type="url"
                value={img.url}
                onChange={(e) => updateImage(i, { url: e.target.value })}
                placeholder="Image URL *"
                className={inputClass}
              />
              <input
                type="text"
                value={img.alt ?? ''}
                onChange={(e) => updateImage(i, { alt: e.target.value || undefined })}
                placeholder="Alt text (for accessibility)"
                className={inputClass}
              />
              <input
                type="text"
                value={img.caption ?? ''}
                onChange={(e) => updateImage(i, { caption: e.target.value || null })}
                placeholder="Caption (optional)"
                className={inputClass}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
