'use client';

import { useState } from 'react';
import { Eye, EyeOff, Image as ImageIcon } from 'lucide-react';
import type { BlockEditorProps } from '@/lib/content/block-registry';
import type { ImageCompareData, CompareImage } from '@/lib/content/blocks/image-compare/schema';
import { DropZoneUploader } from '@/components/editor/drop-zone-uploader';
import { CompareSlider } from './compare-slider';

const inputClass =
  'w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent';
const labelClass = 'block text-xs font-medium text-gray-600 mb-1';

function ColorRow({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs text-gray-600">{label}</span>
      <div className="flex items-center gap-1.5">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-7 h-7 rounded-md border border-gray-200 cursor-pointer bg-white"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-20 px-2 py-1 text-xs border border-gray-200 rounded-md font-mono"
        />
      </div>
    </div>
  );
}

function ImageSideEditor({
  side,
  mode,
  image,
  onChange,
}: {
  side: 'before' | 'after';
  mode: 'image' | 'text';
  image: CompareImage;
  onChange: (img: CompareImage) => void;
}) {
  if (mode === 'text') {
    return (
      <div className="space-y-3">
        <div>
          <label className={labelClass}>Heading (optional)</label>
          <input
            type="text"
            value={image.heading ?? ''}
            placeholder={side === 'before' ? 'Before panel heading' : 'After panel heading'}
            onChange={(e) => onChange({ ...image, heading: e.target.value || undefined })}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Panel text (supports HTML)</label>
          <textarea
            value={image.text ?? ''}
            placeholder={side === 'before' ? 'Text shown on the before panel' : 'Text shown on the after panel'}
            rows={4}
            onChange={(e) => onChange({ ...image, text: e.target.value || undefined })}
            className={`${inputClass} resize-y`}
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className={labelClass}>Background</label>
            <input
              type="color"
              value={image.bg_color || (side === 'before' ? '#1A3C6E' : '#0F172A')}
              onChange={(e) => onChange({ ...image, bg_color: e.target.value })}
              className="w-full h-9 rounded-md border border-gray-200 cursor-pointer bg-white"
            />
          </div>
          <div>
            <label className={labelClass}>Text color</label>
            <input
              type="color"
              value={image.text_color || '#FFFFFF'}
              onChange={(e) => onChange({ ...image, text_color: e.target.value })}
              className="w-full h-9 rounded-md border border-gray-200 cursor-pointer bg-white"
            />
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      <DropZoneUploader
        bucket="block-media"
        pathPrefix={`blocks/image-compare/${side}/`}
        accept="image/*"
        label="Drop image or click to upload"
        hint="JPG, PNG, WebP"
        currentUrl={image.url || undefined}
        onUpload={(url) => onChange({ ...image, url })}
        onRemove={() => onChange({ ...image, url: '' })}
        previewMode="image"
      />
      <div>
        <label className={labelClass}>…or paste an image URL</label>
        <input
          type="url"
          value={image.url ?? ''}
          placeholder="https://…"
          onChange={(e) => onChange({ ...image, url: e.target.value })}
          className={inputClass}
        />
      </div>
      <div>
        <label className={labelClass}>Alt text (accessibility)</label>
        <input
          type="text"
          value={image.alt ?? ''}
          placeholder={side === 'before' ? 'Describe the before image' : 'Describe the after image'}
          onChange={(e) => onChange({ ...image, alt: e.target.value || undefined })}
          className={inputClass}
        />
      </div>
    </div>
  );
}

export function ImageCompareEditor({ data, onChange }: BlockEditorProps<ImageCompareData>) {
  const [tab, setTab] = useState<'before' | 'after'>('before');
  const before = data.before ?? { url: '' };
  const after = data.after ?? { url: '' };
  const mode = data.mode ?? 'image';

  return (
    <div className="space-y-4">
      {/* Live preview */}
      <div className="rounded-xl border border-gray-200 overflow-hidden bg-slate-50 p-2">
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2 px-1">Preview</p>
        <CompareSlider data={data} interactive={false} />
      </div>

      {/* Compare mode: images vs text panels */}
      <div>
        <label className={labelClass}>Compare</label>
        <div className="flex gap-1.5">
          {([
            { value: 'image' as const, label: 'Two images' },
            { value: 'text' as const, label: 'Two text panels' },
          ]).map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange({ ...data, mode: opt.value })}
              className={`flex-1 px-2.5 py-1.5 text-xs rounded-lg border transition-all font-medium ${
                mode === opt.value
                  ? 'bg-[#1A3C6E] text-white border-[#1A3C6E]'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Before / After tabs */}
      <div className="flex rounded-xl overflow-hidden border border-gray-200">
        {([
          { value: 'before' as const, label: 'Before', icon: <EyeOff className="w-3.5 h-3.5" /> },
          { value: 'after' as const, label: 'After', icon: <Eye className="w-3.5 h-3.5" /> },
        ]).map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => setTab(t.value)}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold transition-all ${
              tab === t.value ? 'bg-[#1A3C6E] text-white' : 'bg-white text-gray-500 hover:bg-gray-50'
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'before' ? (
        <ImageSideEditor
          side="before"
          mode={mode}
          image={before}
          onChange={(img) => onChange({ ...data, before: img })}
        />
      ) : (
        <ImageSideEditor
          side="after"
          mode={mode}
          image={after}
          onChange={(img) => onChange({ ...data, after: img })}
        />
      )}

      <div className="border-t border-gray-100 pt-3 space-y-3">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Layout</p>

        <div>
          <label className={labelClass}>Starting position — {data.initial_position ?? 50}%</label>
          <input
            type="range"
            min={0}
            max={100}
            value={data.initial_position ?? 50}
            onChange={(e) => onChange({ ...data, initial_position: Number(e.target.value) })}
            className="w-full accent-[#1A3C6E]"
          />
          <p className="text-[10px] text-gray-400 mt-0.5">Where the divider starts (0 = all before, 100 = all after)</p>
        </div>

        <div>
          <label className={labelClass}>Direction</label>
          <div className="flex gap-1.5">
            {([
              { value: 'horizontal' as const, label: 'Left ↔ Right' },
              { value: 'vertical' as const, label: 'Top ↕ Bottom' },
            ]).map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => onChange({ ...data, direction: opt.value })}
                className={`flex-1 px-2.5 py-1.5 text-xs rounded-lg border transition-all font-medium ${
                  (data.direction ?? 'horizontal') === opt.value
                    ? 'bg-[#1A3C6E] text-white border-[#1A3C6E]'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className={labelClass}>Aspect ratio</label>
          <div className="flex flex-wrap gap-1.5">
            {(['16/9', '4/3', '3/2', '1/1'] as const).map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => onChange({ ...data, aspect: a })}
                className={`px-2.5 py-1.5 text-xs rounded-lg border transition-all font-medium ${
                  (data.aspect ?? '16/9') === a
                    ? 'bg-[#1A3C6E] text-white border-[#1A3C6E]'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                }`}
              >
                {a}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className={labelClass}>Image fit</label>
          <div className="flex gap-1.5">
            {([
              { value: 'cover' as const, label: 'Cover (fill)' },
              { value: 'contain' as const, label: 'Contain (whole image)' },
            ]).map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => onChange({ ...data, fit: opt.value })}
                className={`flex-1 px-2.5 py-1.5 text-xs rounded-lg border transition-all font-medium ${
                  (data.fit ?? 'cover') === opt.value
                    ? 'bg-[#1A3C6E] text-white border-[#1A3C6E]'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="border-t border-gray-100 pt-3 space-y-3">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Handle & labels</p>

        <div>
          <label className={labelClass}>Handle style</label>
          <div className="flex flex-wrap gap-1.5">
            {([
              { value: 'circle' as const, label: 'Circle' },
              { value: 'bar' as const, label: 'Bar' },
              { value: 'arrows' as const, label: 'Arrows' },
            ]).map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => onChange({ ...data, handle_style: opt.value })}
                className={`px-2.5 py-1.5 text-xs rounded-lg border transition-all font-medium ${
                  (data.handle_style ?? 'circle') === opt.value
                    ? 'bg-[#1A3C6E] text-white border-[#1A3C6E]'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <ColorRow
          label="Handle color"
          value={data.handle_color ?? '#FFFFFF'}
          onChange={(v) => onChange({ ...data, handle_color: v })}
        />
        <ColorRow
          label="Divider line"
          value={data.divider_color ?? '#FFFFFF'}
          onChange={(v) => onChange({ ...data, divider_color: v })}
        />

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className={labelClass}>Before label</label>
            <input
              type="text"
              value={data.before_label ?? ''}
              placeholder="Before"
              onChange={(e) => onChange({ ...data, before_label: e.target.value || undefined })}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>After label</label>
            <input
              type="text"
              value={data.after_label ?? ''}
              placeholder="After"
              onChange={(e) => onChange({ ...data, after_label: e.target.value || undefined })}
              className={inputClass}
            />
          </div>
        </div>

        <div>
          <label className={labelClass}>Show labels</label>
          <div className="flex flex-wrap gap-1.5">
            {([
              { value: 'always' as const, label: 'Always' },
              { value: 'hover' as const, label: 'On hover' },
              { value: 'never' as const, label: 'Hidden' },
            ]).map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => onChange({ ...data, show_labels: opt.value })}
                className={`px-2.5 py-1.5 text-xs rounded-lg border transition-all font-medium ${
                  (data.show_labels ?? 'always') === opt.value
                    ? 'bg-[#1A3C6E] text-white border-[#1A3C6E]'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="border-t border-gray-100 pt-3 space-y-3">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Copy</p>

        <div>
          <label className={labelClass}>Prompt / instruction (optional)</label>
          <input
            type="text"
            value={data.prompt ?? ''}
            placeholder="e.g. Drag the slider to compare before and after"
            onChange={(e) => onChange({ ...data, prompt: e.target.value || undefined })}
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass}>Caption (optional)</label>
          <input
            type="text"
            value={data.caption ?? ''}
            placeholder="e.g. Results after 3 months of treatment"
            onChange={(e) => onChange({ ...data, caption: e.target.value || undefined })}
            className={inputClass}
          />
        </div>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={data.require_interaction ?? false}
            onChange={(e) => onChange({ ...data, require_interaction: e.target.checked })}
            className="rounded border-gray-300"
          />
          <span className="text-xs text-gray-600">Require slider interaction to mark block complete</span>
        </label>
      </div>
    </div>
  );
}
