'use client';

import type { BlockEditorProps } from '@/lib/content/block-registry';
import type { PageBreakData } from '@/lib/content/blocks/page-break/schema';

export function PageBreakEditor({ data, onChange }: BlockEditorProps<PageBreakData>) {
  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Page Break</p>
      <p className="text-xs text-gray-400">
        Content after this block will appear on a new page in the student viewer.
        Students navigate pages within the slide before advancing.
      </p>
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Label (optional)</label>
        <input
          type="text"
          value={data.label ?? ''}
          onChange={(e) => onChange({ ...data, label: e.target.value || undefined })}
          placeholder="e.g. Page 2, Key Concepts..."
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent"
        />
      </div>
    </div>
  );
}
