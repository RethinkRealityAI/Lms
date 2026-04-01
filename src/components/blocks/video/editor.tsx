'use client';

import { useState, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Loader2, Upload, Link } from 'lucide-react';
import type { BlockEditorProps } from '@/lib/content/block-registry';
import type { VideoData } from '@/lib/content/blocks/video/schema';

const inputClass =
  'w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent';

export function VideoEditor({ data, onChange }: BlockEditorProps<VideoData>) {
  const [mode, setMode] = useState<'url' | 'upload'>('url');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFileUpload(file: File) {
    setUploading(true);
    setUploadError(null);
    try {
      const supabase = createClient();
      const ext = file.name.split('.').pop();
      const path = `videos/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from('block-media')
        .upload(path, file, { cacheControl: '3600', upsert: false });
      if (uploadErr) throw uploadErr;
      const { data: urlData } = supabase.storage.from('block-media').getPublicUrl(path);
      onChange({ ...data, url: urlData.publicUrl });
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
    <div className="space-y-4">
      {/* Mode toggle */}
      <div className="flex rounded-lg border border-gray-200 overflow-hidden">
        <button
          type="button"
          onClick={() => setMode('url')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium transition-colors ${
            mode === 'url' ? 'bg-[#1E3A5F] text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
          }`}
        >
          <Link className="w-3.5 h-3.5" />URL
        </button>
        <button
          type="button"
          onClick={() => setMode('upload')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium transition-colors ${
            mode === 'upload' ? 'bg-[#1E3A5F] text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
          }`}
        >
          <Upload className="w-3.5 h-3.5" />Upload
        </button>
      </div>

      {/* URL / Upload source */}
      {mode === 'url' ? (
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Video URL <span className="text-red-500">*</span>
          </label>
          <input
            type="url"
            value={data.url}
            onChange={(e) => onChange({ ...data, url: e.target.value })}
            placeholder="YouTube, Vimeo, or direct .mp4 URL"
            className={inputClass}
          />
          <p className="mt-1 text-xs text-gray-500">
            Supports YouTube, Vimeo, and direct video file URLs (.mp4, .webm, .mov).
          </p>
        </div>
      ) : (
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Video File</label>
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileUpload(file);
            }}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="w-full flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-200 rounded-lg py-6 hover:border-[#1E3A5F] hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            {uploading ? (
              <Loader2 className="w-5 h-5 text-[#1E3A5F] animate-spin" />
            ) : (
              <Upload className="w-5 h-5 text-gray-400" />
            )}
            <span className="text-xs text-gray-500">
              {uploading ? 'Uploading…' : 'Click to upload a video file'}
            </span>
          </button>
          {uploadError && <p className="mt-1 text-xs text-red-600">{uploadError}</p>}
          {data.url && !uploadError && (
            <p className="mt-1 text-xs text-green-700 truncate">Uploaded: {data.url}</p>
          )}
        </div>
      )}

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Poster Image URL</label>
        <input
          type="url"
          value={data.poster ?? ''}
          onChange={(e) => onChange({ ...data, poster: e.target.value || undefined })}
          placeholder="https://example.com/poster.jpg"
          className={inputClass}
        />
        <p className="mt-1 text-xs text-gray-500">Thumbnail shown before the video plays.</p>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Caption</label>
        <input
          type="text"
          value={data.caption ?? ''}
          onChange={(e) => onChange({ ...data, caption: e.target.value || undefined })}
          placeholder="Optional caption displayed below the video"
          className={inputClass}
        />
      </div>

      <div className="flex items-center gap-2">
        <input
          id="video-autoplay"
          type="checkbox"
          checked={data.autoplay ?? false}
          onChange={(e) => onChange({ ...data, autoplay: e.target.checked })}
          className="h-4 w-4 rounded border-gray-300 text-[#1E3A5F] focus:ring-[#1E3A5F]"
        />
        <label htmlFor="video-autoplay" className="text-sm text-gray-700">Autoplay</label>
      </div>
    </div>
  );
}
