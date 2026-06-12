'use client';

import { Plus, Trash2, GripVertical } from 'lucide-react';
import type { BlockEditorProps } from '@/lib/content/block-registry';
import type { IconListData, IconListItem, IconListColumns } from '@/lib/content/blocks/icon-list/schema';
import { DropZoneUploader } from '@/components/editor/drop-zone-uploader';

const inputClass =
  'w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent';
const labelClass = 'block text-xs font-medium text-gray-600 mb-1';

function ColorRow({ label, value, fallback, onChange }: { label: string; value?: string; fallback: string; onChange: (v: string | undefined) => void }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs text-gray-600">{label}</span>
      <div className="flex items-center gap-1.5">
        <input
          type="color"
          value={value || fallback}
          onChange={(e) => onChange(e.target.value)}
          className="w-7 h-7 rounded-md border border-gray-200 cursor-pointer bg-white"
        />
        <input
          type="text"
          value={value ?? ''}
          placeholder={fallback}
          onChange={(e) => onChange(e.target.value || undefined)}
          className="w-20 px-2 py-1 text-xs border border-gray-200 rounded-md font-mono"
        />
      </div>
    </div>
  );
}

export function IconListEditor({ data, onChange }: BlockEditorProps<IconListData>) {
  const items = data.items ?? [];

  const updateItem = (i: number, patch: Partial<IconListItem>) => {
    const next = items.map((it, idx) => (idx === i ? { ...it, ...patch } : it));
    onChange({ ...data, items: next });
  };
  const addItem = () => onChange({ ...data, items: [...items, { icon_url: '', title: '', html: '' }] });
  const removeItem = (i: number) => onChange({ ...data, items: items.filter((_, idx) => idx !== i) });
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[i], next[j]] = [next[j], next[i]];
    onChange({ ...data, items: next });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {items.map((item, i) => (
          <div key={i} className="rounded-xl border border-gray-200 p-3 space-y-3 bg-slate-50/60">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Tile {i + 1}</span>
              <div className="flex items-center gap-1">
                <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="p-1 rounded hover:bg-gray-200 disabled:opacity-30" title="Move up">
                  <GripVertical className="w-3.5 h-3.5 -rotate-90" />
                </button>
                <button type="button" onClick={() => move(i, 1)} disabled={i === items.length - 1} className="p-1 rounded hover:bg-gray-200 disabled:opacity-30" title="Move down">
                  <GripVertical className="w-3.5 h-3.5 rotate-90" />
                </button>
                <button type="button" onClick={() => removeItem(i)} className="p-1 rounded hover:bg-red-50 text-red-500" title="Delete tile">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="w-24 shrink-0">
                <DropZoneUploader
                  bucket="block-media"
                  pathPrefix="blocks/icon-list/"
                  accept="image/*"
                  label="Icon"
                  hint="SVG/PNG"
                  currentUrl={item.icon_url || undefined}
                  onUpload={(url) => updateItem(i, { icon_url: url })}
                  onRemove={() => updateItem(i, { icon_url: '' })}
                  previewMode="image"
                />
              </div>
              <div className="flex-1 space-y-2">
                <input
                  type="url"
                  value={item.icon_url ?? ''}
                  placeholder="…or paste icon URL"
                  onChange={(e) => updateItem(i, { icon_url: e.target.value })}
                  className={inputClass}
                />
                <input
                  type="text"
                  value={item.title ?? ''}
                  placeholder="Tile title"
                  onChange={(e) => updateItem(i, { title: e.target.value })}
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label className={labelClass}>Body (supports HTML)</label>
              <textarea
                value={item.html ?? ''}
                placeholder="Tile body text"
                rows={3}
                onChange={(e) => updateItem(i, { html: e.target.value })}
                className={`${inputClass} resize-y`}
              />
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addItem}
        className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-dashed border-gray-300 text-gray-500 hover:border-[#1A3C6E] hover:text-[#1A3C6E] transition-colors"
      >
        <Plus className="w-3.5 h-3.5" /> Add tile
      </button>

      <div className="border-t border-gray-100 pt-3 space-y-3">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Layout</p>
        <div>
          <label className={labelClass}>Columns</label>
          <div className="flex flex-wrap gap-1.5">
            {(['auto', '1', '2', '3', '4'] as IconListColumns[]).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => onChange({ ...data, columns: c })}
                className={`px-2.5 py-1.5 text-xs rounded-lg border transition-all font-medium ${
                  (data.columns ?? 'auto') === c
                    ? 'bg-[#1A3C6E] text-white border-[#1A3C6E]'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                }`}
              >
                {c === 'auto' ? 'Auto' : c}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className={labelClass}>Icon vs text</label>
          <div className="flex gap-1.5">
            {([
              { value: 'stacked' as const, label: 'Stacked (centered)' },
              { value: 'inline' as const, label: 'Inline (icon left)' },
            ]).map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => onChange({ ...data, layout: opt.value })}
                className={`flex-1 px-2.5 py-1.5 text-xs rounded-lg border transition-all font-medium ${
                  (data.layout ?? 'stacked') === opt.value
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
          <label className={labelClass}>Icon size — {data.icon_size ?? 64}px</label>
          <input
            type="range"
            min={24}
            max={160}
            value={data.icon_size ?? 64}
            onChange={(e) => onChange({ ...data, icon_size: Number(e.target.value) })}
            className="w-full accent-[#1A3C6E]"
          />
        </div>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={data.card !== false}
            onChange={(e) => onChange({ ...data, card: e.target.checked })}
            className="rounded border-gray-300"
          />
          <span className="text-xs text-gray-600">Show a card behind each tile</span>
        </label>
      </div>

      <div className="border-t border-gray-100 pt-3 space-y-3">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Colors</p>
        <ColorRow label="Accent" value={data.accent_color} fallback="#1A3C6E" onChange={(v) => onChange({ ...data, accent_color: v })} />
        <ColorRow label="Title" value={data.title_color} fallback="#1A3C6E" onChange={(v) => onChange({ ...data, title_color: v })} />
        <ColorRow label="Body text" value={data.text_color} fallback="#0F172A" onChange={(v) => onChange({ ...data, text_color: v })} />
      </div>
    </div>
  );
}
