'use client';

import type { BlockEditorProps } from '@/lib/content/block-registry';
import type { CtaData } from '@/lib/content/blocks/cta/schema';

const inputClass =
  'w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent';

export function CTAEditor({ data, onChange }: BlockEditorProps<CtaData>) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">
          Description Text
        </label>
        <textarea
          value={data.text}
          onChange={(e) => onChange({ ...data, text: e.target.value })}
          placeholder="Optional text displayed above the button"
          rows={3}
          className={`${inputClass} resize-y`}
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Button Label</label>
        <input
          type="text"
          value={data.button_label || ''}
          onChange={(e) => onChange({ ...data, button_label: e.target.value })}
          placeholder="Click Here"
          className={inputClass}
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">URL</label>
        <input
          type="url"
          value={data.url ?? ''}
          onChange={(e) => onChange({ ...data, url: e.target.value || undefined })}
          placeholder="https://example.com"
          className={inputClass}
        />
      </div>
    </div>
  );
}
