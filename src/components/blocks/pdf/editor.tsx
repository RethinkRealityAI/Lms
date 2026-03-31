'use client';

import type { BlockEditorProps } from '@/lib/content/block-registry';

type PdfData = {
  url: string;
};

const inputClass =
  'w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent';

export function PDFEditor({ data, onChange }: BlockEditorProps<PdfData>) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">
          PDF File URL <span className="text-red-500">*</span>
        </label>
        <input
          type="url"
          value={data.url}
          onChange={(e) => onChange({ ...data, url: e.target.value })}
          placeholder="https://example.com/document.pdf"
          className={inputClass}
        />
        <p className="mt-1 text-xs text-gray-500">
          Link directly to a publicly accessible .pdf file.
        </p>
      </div>
    </div>
  );
}
