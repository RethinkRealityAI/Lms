'use client';

import type { BlockEditorProps } from '@/lib/content/block-registry';
import type { CalloutData } from '@/lib/content/blocks/callout/schema';

const inputClass =
  'w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent';

type CalloutVariant = CalloutData['variant'];

const VARIANTS: { value: CalloutVariant; label: string; color: string }[] = [
  { value: 'info', label: 'Info', color: 'bg-blue-100 text-blue-800 border-blue-300' },
  { value: 'warning', label: 'Warning', color: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
  { value: 'tip', label: 'Tip', color: 'bg-green-100 text-green-800 border-green-300' },
  { value: 'success', label: 'Success', color: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
];

export function CalloutEditor({ data, onChange }: BlockEditorProps<CalloutData>) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-2">Variant</label>
        <div className="flex flex-wrap gap-2">
          {VARIANTS.map(({ value, label, color }) => (
            <button
              key={value}
              type="button"
              onClick={() => onChange({ ...data, variant: value })}
              className={`px-3 py-1.5 text-xs rounded-lg border transition-all ${
                data.variant === value
                  ? `${color} font-semibold ring-2 ring-offset-1 ring-[#1E3A5F]`
                  : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Title</label>
        <input
          type="text"
          value={data.title ?? ''}
          onChange={(e) => onChange({ ...data, title: e.target.value || undefined })}
          placeholder="Optional callout title"
          className={inputClass}
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Content (HTML)</label>
        <textarea
          value={data.html}
          onChange={(e) => onChange({ ...data, html: e.target.value })}
          placeholder="<p>Your callout content here...</p>"
          rows={5}
          className={`${inputClass} resize-y font-mono text-xs`}
        />
        <p className="mt-1 text-xs text-gray-500">HTML is supported (e.g. &lt;p&gt;, &lt;strong&gt;, &lt;ul&gt;).</p>
      </div>
    </div>
  );
}
