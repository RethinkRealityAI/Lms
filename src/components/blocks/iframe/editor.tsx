'use client';

import type { BlockEditorProps } from '@/lib/content/block-registry';

type IframeData = {
  url: string;
  height?: number;
};

const inputClass =
  'w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent';

export function IframeEditor({ data, onChange }: BlockEditorProps<IframeData>) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">
          Embed URL <span className="text-red-500">*</span>
        </label>
        <input
          type="url"
          value={data.url}
          onChange={(e) => onChange({ ...data, url: e.target.value })}
          placeholder="https://example.com/embed"
          className={inputClass}
        />
        <p className="mt-1 text-xs text-gray-500">
          Must be an HTTPS URL that allows embedding (no X-Frame-Options: DENY).
        </p>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Height (px)</label>
        <input
          type="number"
          value={data.height ?? 600}
          min={100}
          max={2000}
          step={50}
          onChange={(e) => {
            const val = parseInt(e.target.value, 10);
            onChange({ ...data, height: isNaN(val) ? undefined : val });
          }}
          className={inputClass}
        />
        <p className="mt-1 text-xs text-gray-500">Default: 600px</p>
      </div>
    </div>
  );
}
