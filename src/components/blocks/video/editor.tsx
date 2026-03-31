'use client';

import type { BlockEditorProps } from '@/lib/content/block-registry';
import type { VideoData } from '@/lib/content/blocks/video/schema';

const inputClass =
  'w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent';

export function VideoEditor({ data, onChange }: BlockEditorProps<VideoData>) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">
          Video URL <span className="text-red-500">*</span>
        </label>
        <input
          type="url"
          value={data.url}
          onChange={(e) => onChange({ ...data, url: e.target.value })}
          placeholder="https://example.com/video.mp4"
          className={inputClass}
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">
          Poster Image URL
        </label>
        <input
          type="url"
          value={data.poster ?? ''}
          onChange={(e) =>
            onChange({ ...data, poster: e.target.value || undefined })
          }
          placeholder="https://example.com/poster.jpg"
          className={inputClass}
        />
        <p className="mt-1 text-xs text-gray-500">
          Thumbnail shown before the video plays.
        </p>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">
          Caption
        </label>
        <input
          type="text"
          value={data.caption ?? ''}
          onChange={(e) =>
            onChange({ ...data, caption: e.target.value || undefined })
          }
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
        <label htmlFor="video-autoplay" className="text-sm text-gray-700">
          Autoplay
        </label>
      </div>
    </div>
  );
}
