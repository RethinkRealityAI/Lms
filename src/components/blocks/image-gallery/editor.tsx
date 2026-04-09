'use client';

import { useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Loader2, Upload, Link } from 'lucide-react';
import type { BlockEditorProps } from '@/lib/content/block-registry';
import type { ImageGalleryData } from '@/lib/content/blocks/image-gallery/schema';

const inputClass =
  'w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent';

type ImageEntry = ImageGalleryData['images'][number];

function ImageEntryEditor({
  img,
  index,
  onUpdate,
  onRemove,
}: {
  img: ImageEntry;
  index: number;
  onUpdate: (patch: Partial<ImageEntry>) => void;
  onRemove: () => void;
}) {
  const [entryMode, setEntryMode] = useState<'url' | 'upload'>('url');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFileUpload(file: File) {
    setUploading(true);
    setUploadError(null);
    try {
      const supabase = createClient();
      const ext = file.name.split('.').pop();
      const path = `images/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from('block-media')
        .upload(path, file, { cacheControl: '3600', upsert: false });
      if (uploadErr) throw uploadErr;
      const { data: urlData } = supabase.storage.from('block-media').getPublicUrl(path);
      onUpdate({ url: urlData.publicUrl });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setUploadError(
        msg.includes('bucket') || msg.includes('not found')
          ? 'Storage bucket "block-media" not found. Create it in Supabase Storage or use URL mode.'
          : msg,
      );
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="p-3 border border-gray-200 rounded-lg space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-gray-600">Image {index + 1}</span>
        <button type="button" onClick={onRemove} className="text-xs text-red-500 hover:text-red-700 transition-colors">
          Remove
        </button>
      </div>

      {/* Mode toggle for this image */}
      <div className="flex rounded-md border border-gray-200 overflow-hidden">
        <button
          type="button"
          onClick={() => setEntryMode('url')}
          className={`flex-1 flex items-center justify-center gap-1 py-1 text-xs font-medium transition-colors ${
            entryMode === 'url' ? 'bg-[#1E3A5F] text-white' : 'bg-white text-gray-500 hover:bg-gray-50'
          }`}
        >
          <Link className="w-3 h-3" />URL
        </button>
        <button
          type="button"
          onClick={() => setEntryMode('upload')}
          className={`flex-1 flex items-center justify-center gap-1 py-1 text-xs font-medium transition-colors ${
            entryMode === 'upload' ? 'bg-[#1E3A5F] text-white' : 'bg-white text-gray-500 hover:bg-gray-50'
          }`}
        >
          <Upload className="w-3 h-3" />Upload
        </button>
      </div>

      {entryMode === 'url' ? (
        <input
          type="url"
          value={img.url}
          onChange={(e) => onUpdate({ url: e.target.value })}
          placeholder="Image URL *"
          className={inputClass}
        />
      ) : (
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileUpload(file);
            }}
          />
          {img.url ? (
            <div className="relative rounded-lg overflow-hidden border border-gray-200">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.url} alt={img.alt ?? ''} className="w-full h-24 object-cover" />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity text-white text-xs font-medium"
              >
                Replace
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="w-full flex flex-col items-center justify-center gap-1.5 border-2 border-dashed border-gray-200 rounded-lg py-4 hover:border-[#1E3A5F] hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              {uploading ? (
                <Loader2 className="w-4 h-4 text-[#1E3A5F] animate-spin" />
              ) : (
                <Upload className="w-4 h-4 text-gray-400" />
              )}
              <span className="text-xs text-gray-500">
                {uploading ? 'Uploading…' : 'Click to upload'}
              </span>
            </button>
          )}
          {uploadError && <p className="mt-1 text-xs text-red-600">{uploadError}</p>}
        </div>
      )}

      <input
        type="text"
        value={img.alt ?? ''}
        onChange={(e) => onUpdate({ alt: e.target.value || undefined })}
        placeholder="Alt text (for accessibility)"
        className={inputClass}
      />
      <input
        type="text"
        value={img.caption ?? ''}
        onChange={(e) => onUpdate({ caption: e.target.value || null })}
        placeholder="Caption (optional)"
        className={inputClass}
      />
    </div>
  );
}

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

      {/* Aspect Ratio */}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Aspect Ratio</label>
        <div className="flex gap-1.5 flex-wrap">
          {[
            { label: 'Original', value: 'original' },
            { label: '16:9', value: '16/9' },
            { label: '4:3', value: '4/3' },
            { label: '1:1', value: '1/1' },
          ].map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange({ ...data, aspectRatio: opt.value } as any)}
              className={`px-2.5 py-1 text-xs rounded-lg border transition-colors ${
                ((data as any).aspectRatio ?? 'original') === opt.value
                  ? 'bg-[#1E3A5F] text-white border-[#1E3A5F]'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-[#1E3A5F]'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Object Fit */}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Image Fit</label>
        <div className="flex gap-1.5">
          {[
            { label: 'Cover', value: 'cover' },
            { label: 'Contain', value: 'contain' },
          ].map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange({ ...data, objectFit: opt.value } as any)}
              className={`px-2.5 py-1 text-xs rounded-lg border transition-colors ${
                ((data as any).objectFit ?? 'cover') === opt.value
                  ? 'bg-[#1E3A5F] text-white border-[#1E3A5F]'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-[#1E3A5F]'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-medium text-gray-700">Images ({data.images.length})</label>
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
            <ImageEntryEditor
              key={i}
              img={img}
              index={i}
              onUpdate={(patch) => updateImage(i, patch)}
              onRemove={() => removeImage(i)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
