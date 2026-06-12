'use client';

import type { BlockEditorProps } from '@/lib/content/block-registry';
import type { AudioData } from '@/lib/content/blocks/audio/schema';
import { DropZoneUploader } from '@/components/editor/drop-zone-uploader';

const inputClass =
  'w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent';
const labelClass = 'block text-xs font-medium text-gray-600 mb-1';

export function AudioEditor({ data, onChange }: BlockEditorProps<AudioData>) {
  return (
    <div className="space-y-3">
      <DropZoneUploader
        bucket="block-media"
        pathPrefix="blocks/audio/"
        accept="audio/*"
        label="Drop audio or click to upload"
        hint="MP3, M4A, WAV, OGG"
        currentUrl={data.url || undefined}
        onUpload={(url) => onChange({ ...data, url })}
        onRemove={() => onChange({ ...data, url: '' })}
        previewMode="filename"
      />
      <div>
        <label className={labelClass}>…or paste an audio URL</label>
        <input
          type="url"
          value={data.url ?? ''}
          placeholder="https://…/clip.mp3"
          onChange={(e) => onChange({ ...data, url: e.target.value })}
          className={inputClass}
        />
      </div>
      {data.url && (
        <audio controls preload="metadata" className="w-full" src={data.url}>
          Your browser does not support the audio element.
        </audio>
      )}
      <div>
        <label className={labelClass}>Title (optional)</label>
        <input
          type="text"
          value={data.title ?? ''}
          placeholder="e.g. Patient reflection — Audio clip 1"
          onChange={(e) => onChange({ ...data, title: e.target.value || undefined })}
          className={inputClass}
        />
      </div>
      <div>
        <label className={labelClass}>Caption (optional)</label>
        <textarea
          value={data.caption ?? ''}
          placeholder="Short description or transcript note"
          rows={2}
          onChange={(e) => onChange({ ...data, caption: e.target.value || undefined })}
          className={`${inputClass} resize-y`}
        />
      </div>
      <div>
        <label className={labelClass}>Credit (optional)</label>
        <input
          type="text"
          value={data.credit ?? ''}
          placeholder="e.g. SCAGO, 2024"
          onChange={(e) => onChange({ ...data, credit: e.target.value || undefined })}
          className={inputClass}
        />
      </div>
    </div>
  );
}
