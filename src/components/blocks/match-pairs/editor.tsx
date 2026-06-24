'use client';

import { Plus, Trash2, Image as ImageIcon, Type, ArrowLeftRight, GripVertical } from 'lucide-react';
import type { BlockEditorProps } from '@/lib/content/block-registry';
import type { MatchPairsData, MatchSide } from '@/lib/content/blocks/match-pairs/schema';
import { normalizeMatchPairsData } from '@/lib/content/blocks/match-pairs/schema';
import { DropZoneUploader } from '@/components/editor/drop-zone-uploader';

const inputClass =
  'w-full px-2.5 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent';

function newId() {
  try { return crypto.randomUUID(); } catch { return `p-${Date.now()}-${Math.round(Math.random() * 1e6)}`; }
}

function SideEditor({ side: rawSide, onChange, label, slot }: {
  side: MatchSide | undefined; onChange: (s: MatchSide) => void; label: string; slot: string;
}) {
  const side: MatchSide = rawSide ?? { type: 'text' };
  return (
    <div className="space-y-2 rounded-lg bg-gray-50/70 p-2.5 border border-gray-100">
      {/* Label and type toggle stack vertically so neither gets squished in the
          two-column pair layout — the toggle sits above the text input. */}
      <span className="block text-[10px] font-bold uppercase tracking-wider text-gray-400">{label}</span>
      <div className="flex w-max rounded-md overflow-hidden border border-gray-200">
        {([
          { v: 'text' as const, icon: <Type className="w-3 h-3" />, label: 'Text' },
          { v: 'image' as const, icon: <ImageIcon className="w-3 h-3" />, label: 'Image' },
        ]).map(o => (
          <button key={o.v} type="button" onClick={() => onChange({ ...side, type: o.v })}
            title={o.label}
            className={`flex items-center gap-1 px-2 py-1 text-[10px] font-semibold transition-all ${side.type === o.v ? 'bg-[#1A3C6E] text-white' : 'bg-white text-gray-400 hover:text-gray-600'}`}>
            {o.icon}{o.label}
          </button>
        ))}
      </div>
      {side.type === 'image' ? (
        <div className="space-y-1.5">
          <DropZoneUploader
            bucket="block-media" pathPrefix={`blocks/match/${slot}/`} accept="image/*"
            label="Drop / click to upload" currentUrl={side.image_url}
            onUpload={(url) => onChange({ ...side, image_url: url })}
            onRemove={() => onChange({ ...side, image_url: undefined })}
            previewMode="image"
          />
          <input type="url" value={side.image_url ?? ''} placeholder="…or image URL"
            onChange={(e) => onChange({ ...side, image_url: e.target.value || undefined })} className={inputClass} />
          <input type="text" value={side.text ?? ''} placeholder="Alt text (optional)"
            onChange={(e) => onChange({ ...side, text: e.target.value })} className={inputClass} />
        </div>
      ) : (
        <input type="text" value={side.text ?? ''} placeholder="Type here…"
          onChange={(e) => onChange({ ...side, text: e.target.value })} className={inputClass} />
      )}
    </div>
  );
}

export function MatchPairsEditor({ data: rawData, onChange }: BlockEditorProps<MatchPairsData>) {
  // Normalize legacy/malformed data so the editor never crashes; saving persists the fix.
  const data = normalizeMatchPairsData(rawData);
  const pairs = data.pairs ?? [];
  const promptSide = data.prompt_side ?? 'left';

  const setPair = (id: string, patch: Partial<MatchPairsData['pairs'][number]>) =>
    onChange({ ...data, pairs: pairs.map(p => (p.id === id ? { ...p, ...patch } : p)) });

  const addPair = () =>
    onChange({ ...data, pairs: [...pairs, { id: newId(), prompt: { type: 'text' }, match: { type: 'text' } }] });

  const removePair = (id: string) => onChange({ ...data, pairs: pairs.filter(p => p.id !== id) });

  return (
    <div className="space-y-4">
      {/* Global options */}
      <div className="space-y-2.5">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Instructions (optional)</label>
          <input type="text" value={data.instructions ?? ''} placeholder="e.g. Match each term to its definition"
            onChange={(e) => onChange({ ...data, instructions: e.target.value || undefined })} className={inputClass} />
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-600 flex items-center gap-1.5"><ArrowLeftRight className="w-3.5 h-3.5" /> Prompts on</span>
          <div className="flex rounded-lg overflow-hidden border border-gray-200">
            {(['left', 'right'] as const).map(s => (
              <button key={s} type="button" onClick={() => onChange({ ...data, prompt_side: s })}
                className={`px-3 py-1 text-xs font-semibold capitalize transition-all ${promptSide === s ? 'bg-[#1A3C6E] text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}>
                {s}
              </button>
            ))}
          </div>
        </div>

        <label className="flex items-center justify-between cursor-pointer">
          <span className="text-xs text-gray-600">Shuffle the matches</span>
          <input type="checkbox" checked={data.shuffle ?? true}
            onChange={(e) => onChange({ ...data, shuffle: e.target.checked })} className="accent-[#1A3C6E] w-4 h-4" />
        </label>
        <label className="flex items-center justify-between cursor-pointer">
          <span className="text-xs text-gray-600">Show feedback on check</span>
          <input type="checkbox" checked={data.show_feedback ?? true}
            onChange={(e) => onChange({ ...data, show_feedback: e.target.checked })} className="accent-[#1A3C6E] w-4 h-4" />
        </label>
      </div>

      {/* Pairs */}
      <div className="space-y-2.5">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Pairs ({pairs.length})</p>
        {pairs.map((pair, i) => (
          <div key={pair.id ?? i} className="rounded-xl border border-gray-200 p-2.5 space-y-2 bg-white">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-bold text-gray-400">
                <GripVertical className="w-3.5 h-3.5" /> Pair {i + 1}
              </span>
              <button type="button" onClick={() => removePair(pair.id)}
                className="p-1 rounded hover:bg-red-50 text-gray-300 hover:text-red-500 transition-colors">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 items-start">
              <SideEditor label="Prompt" slot="prompt" side={pair.prompt}
                onChange={(s) => setPair(pair.id, { prompt: s })} />
              <SideEditor label="Matches to" slot="match" side={pair.match}
                onChange={(s) => setPair(pair.id, { match: s })} />
            </div>
          </div>
        ))}

        <button type="button" onClick={addPair}
          className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 text-sm font-medium text-[#1A3C6E] border-2 border-dashed border-gray-200 rounded-xl hover:border-[#1A3C6E] hover:bg-[#1A3C6E]/5 transition-all">
          <Plus className="w-4 h-4" /> Add pair
        </button>
      </div>

      {/* Appearance — card colours (blank = frosted glass that follows the slide theme) */}
      <div className="space-y-2 pt-1 border-t border-gray-100">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Appearance</p>
        {([
          { key: 'accent_color', label: 'Accent', fallback: '#1E3A5F', hint: 'Highlights + Check Answer button' },
          { key: 'item_color', label: 'Item box', fallback: '#FFFFFF', hint: 'Draggable items (blank = glass)' },
          { key: 'match_color', label: 'Match box', fallback: '#FFFFFF', hint: 'Drop targets (blank = glass)' },
          { key: 'text_color', label: 'Text', fallback: '#1E293B', hint: 'Card text colour' },
        ] as const).map((row) => {
          const val = (data[row.key] as string | undefined) ?? '';
          return (
            <div key={row.key} className="flex items-center gap-2">
              <input
                type="color"
                value={val || row.fallback}
                onChange={(e) => onChange({ ...data, [row.key]: e.target.value })}
                className="h-8 w-9 shrink-0 rounded border border-gray-200 cursor-pointer bg-white p-0.5"
                aria-label={`${row.label} colour`}
              />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-gray-700 leading-tight">{row.label}</p>
                <p className="text-[10px] text-gray-400 leading-tight truncate">{row.hint}</p>
              </div>
              {val && (
                <button type="button" onClick={() => onChange({ ...data, [row.key]: undefined })}
                  className="text-[10px] font-medium text-gray-400 hover:text-red-500 shrink-0">
                  Reset
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
