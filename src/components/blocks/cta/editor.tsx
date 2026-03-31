'use client';

import type { BlockEditorProps } from '@/lib/content/block-registry';
import type { CtaData } from '@/lib/content/blocks/cta/schema';

const inputClass =
  'w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent';

type CtaAction = CtaData['action'];

const ACTIONS: { value: CtaAction; label: string; description: string }[] = [
  {
    value: 'complete_lesson',
    label: 'Complete Lesson',
    description: 'Marks the current lesson as complete',
  },
  {
    value: 'next_lesson',
    label: 'Next Lesson',
    description: 'Navigates to the next lesson in the module',
  },
  {
    value: 'external_url',
    label: 'External URL',
    description: 'Opens an external link in a new tab',
  },
];

export function CTAEditor({ data, onChange }: BlockEditorProps<CtaData>) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-2">Action</label>
        <div className="space-y-2">
          {ACTIONS.map(({ value, label, description }) => (
            <button
              key={value}
              type="button"
              onClick={() => onChange({ ...data, action: value })}
              className={`w-full text-left px-3 py-2.5 rounded-lg border transition-colors ${
                data.action === value
                  ? 'bg-[#1E3A5F] text-white border-[#1E3A5F]'
                  : 'bg-white text-gray-700 border-gray-200 hover:border-[#1E3A5F]'
              }`}
            >
              <div className="text-sm font-medium">{label}</div>
              <div className={`text-xs mt-0.5 ${data.action === value ? 'text-blue-200' : 'text-gray-500'}`}>
                {description}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Button Label</label>
        <input
          type="text"
          value={data.button_label}
          onChange={(e) => onChange({ ...data, button_label: e.target.value })}
          placeholder="Continue"
          className={inputClass}
        />
      </div>

      {data.action === 'external_url' && (
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            URL <span className="text-red-500">*</span>
          </label>
          <input
            type="url"
            value={data.url ?? ''}
            onChange={(e) => onChange({ ...data, url: e.target.value || undefined })}
            placeholder="https://example.com"
            className={inputClass}
          />
        </div>
      )}

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
    </div>
  );
}
