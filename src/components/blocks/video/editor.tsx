'use client';

import { useState } from 'react';
import { Link, Upload } from 'lucide-react';
import { DropZoneUploader } from '@/components/editor/drop-zone-uploader';
import type { BlockEditorProps } from '@/lib/content/block-registry';
import type { VideoData } from '@/lib/content/blocks/video/schema';

const inputClass =
  'w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent';

export function VideoEditor({ data, onChange }: BlockEditorProps<VideoData>) {
  const [mode, setMode] = useState<'url' | 'upload'>('url');

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
            onChange={(e) => {
              const url = e.target.value;
              // Auto-capture a start time from a pasted YouTube link (?t=90 / &start=90 / ?t=1m30s)
              const next: VideoData = { ...data, url };
              const tMatch = url.match(/[?&#](?:t|start)=([0-9hms]+)/i);
              if (tMatch) {
                const raw = tMatch[1];
                let secs = 0;
                if (/^\d+$/.test(raw)) secs = Number(raw);
                else {
                  const h = raw.match(/(\d+)h/), m = raw.match(/(\d+)m/), s = raw.match(/(\d+)s/);
                  secs = (h ? +h[1] * 3600 : 0) + (m ? +m[1] * 60 : 0) + (s ? +s[1] : 0);
                }
                if (secs > 0) next.start = secs;
              }
              onChange(next);
            }}
            placeholder="YouTube, Vimeo, or direct .mp4 URL"
            className={inputClass}
          />
          <p className="mt-1 text-xs text-gray-500">
            Supports YouTube, Vimeo, and direct video file URLs (.mp4, .webm, .mov). YouTube links get a clean custom player.
          </p>
        </div>
      ) : (
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Video File</label>
          <DropZoneUploader
            bucket="block-media"
            pathPrefix="videos/"
            accept="video/*"
            label="Drop video or click to upload"
            hint=".mp4, .webm, .mov"
            currentUrl={data.url || undefined}
            onUpload={(url) => onChange({ ...data, url })}
            previewMode="filename"
          />
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
        <label className="block text-xs font-medium text-gray-700 mb-1">Title</label>
        <input
          type="text"
          value={data.title ?? ''}
          onChange={(e) => onChange({ ...data, title: e.target.value || undefined })}
          placeholder="Shown in the player's top bar (defaults to the video's own title)"
          className={inputClass}
        />
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

      {/* Trim — start / end in seconds */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Start time (sec)</label>
          <input
            type="number"
            min={0}
            value={data.start ?? ''}
            onChange={(e) => onChange({ ...data, start: e.target.value === '' ? undefined : Math.max(0, Number(e.target.value)) })}
            placeholder="0"
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">End time (sec)</label>
          <input
            type="number"
            min={0}
            value={data.end ?? ''}
            onChange={(e) => onChange({ ...data, end: e.target.value === '' ? undefined : Math.max(0, Number(e.target.value)) })}
            placeholder="end of video"
            className={inputClass}
          />
        </div>
      </div>

      {/* Playback behaviour */}
      <div className="space-y-2.5 pt-3 border-t border-gray-100">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Playback</p>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={data.autoplay ?? false}
            onChange={(e) => onChange({ ...data, autoplay: e.target.checked })}
            className="h-4 w-4 rounded border-gray-300 text-[#1E3A5F] focus:ring-[#1E3A5F]"
          />
          <span className="text-sm text-gray-700">Autoplay when the slide opens</span>
        </label>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={data.auto_progress ?? false}
            onChange={(e) => onChange({ ...data, auto_progress: e.target.checked })}
            className="h-4 w-4 rounded border-gray-300 text-[#1E3A5F] focus:ring-[#1E3A5F]"
          />
          <span className="text-sm text-gray-700">Auto-advance to the next slide when the video ends</span>
        </label>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={data.show_skip ?? false}
            onChange={(e) => onChange({ ...data, show_skip: e.target.checked })}
            className="h-4 w-4 rounded border-gray-300 text-[#1E3A5F] focus:ring-[#1E3A5F]"
          />
          <span className="text-sm text-gray-700">Show a &quot;Skip&quot; button</span>
        </label>
      </div>
    </div>
  );
}
