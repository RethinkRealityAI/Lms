'use client';

import { useState } from 'react';
import { Image as ImageIcon, Type, EyeOff, Eye, PartyPopper, Sparkles, Ban } from 'lucide-react';
import type { BlockEditorProps } from '@/lib/content/block-registry';
import type { ScratchRevealData, ScratchFace } from '@/lib/content/blocks/scratch-reveal/schema';
import { DropZoneUploader } from '@/components/editor/drop-zone-uploader';

const inputClass =
  'w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent';
const labelClass = 'block text-xs font-medium text-gray-600 mb-1';

function ColorRow({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs text-gray-600">{label}</span>
      <div className="flex items-center gap-1.5">
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)}
          className="w-7 h-7 rounded-md border border-gray-200 cursor-pointer bg-white" />
        <input type="text" value={value} onChange={(e) => onChange(e.target.value)}
          className="w-20 px-2 py-1 text-xs border border-gray-200 rounded-md font-mono" />
      </div>
    </div>
  );
}

/** Editor for one face (before cover / after reveal) */
function FaceEditor({ face, onChange, blockId, slot }: {
  face: ScratchFace; onChange: (f: ScratchFace) => void; blockId: string; slot: 'before' | 'after';
}) {
  return (
    <div className="space-y-3">
      {/* Type toggle */}
      <div className="flex rounded-lg overflow-hidden border border-gray-200">
        {([
          { value: 'image' as const, label: 'Image', icon: <ImageIcon className="w-3.5 h-3.5" /> },
          { value: 'text' as const, label: 'Text', icon: <Type className="w-3.5 h-3.5" /> },
        ]).map((opt) => (
          <button key={opt.value} type="button" onClick={() => onChange({ ...face, type: opt.value })}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold transition-all ${
              face.type === opt.value ? 'bg-[#1A3C6E] text-white' : 'bg-white text-gray-500 hover:bg-gray-50'
            }`}>
            {opt.icon}{opt.label}
          </button>
        ))}
      </div>

      {face.type === 'image' ? (
        <div className="space-y-2">
          <DropZoneUploader
            bucket="block-media"
            pathPrefix={`blocks/scratch/${slot}/`}
            accept="image/*"
            label="Drop image or click to upload"
            hint="JPG, PNG, WebP"
            currentUrl={face.image_url}
            onUpload={(url) => onChange({ ...face, image_url: url })}
            onRemove={() => onChange({ ...face, image_url: undefined })}
            previewMode="image"
          />
          <div>
            <label className={labelClass}>…or paste an image URL</label>
            <input type="url" value={face.image_url ?? ''} placeholder="https://…"
              onChange={(e) => onChange({ ...face, image_url: e.target.value || undefined })} className={inputClass} />
          </div>
        </div>
      ) : (
        <div className="space-y-2.5">
          <div>
            <label className={labelClass}>Text</label>
            <textarea rows={2} value={face.text ?? ''} placeholder={slot === 'before' ? 'Scratch to reveal!' : 'Surprise! 🎉'}
              onChange={(e) => onChange({ ...face, text: e.target.value })}
              className={`${inputClass} resize-none`} />
          </div>
          <ColorRow label="Background" value={face.bg_color || '#1A3C6E'} onChange={(v) => onChange({ ...face, bg_color: v })} />
          <ColorRow label="Text color" value={face.text_color || '#FFFFFF'} onChange={(v) => onChange({ ...face, text_color: v })} />
        </div>
      )}
    </div>
  );
}

export function ScratchRevealEditor({ data, onChange, block }: BlockEditorProps<ScratchRevealData>) {
  const [tab, setTab] = useState<'before' | 'after'>('before');
  const before = data.before ?? { type: 'text', text: 'Scratch to reveal!', bg_color: '#1A3C6E', text_color: '#FFFFFF' };
  const after = data.after ?? { type: 'text', text: 'Surprise!', bg_color: '#FFFFFF', text_color: '#0F172A' };

  const ANIMS = [
    { value: 'confetti' as const, label: 'Confetti', icon: <PartyPopper className="w-3.5 h-3.5" /> },
    { value: 'sparkles' as const, label: 'Sparkles', icon: <Sparkles className="w-3.5 h-3.5" /> },
    { value: 'none' as const, label: 'None', icon: <Ban className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="space-y-4">
      {/* Before / After switcher */}
      <div className="flex rounded-xl overflow-hidden border border-gray-200">
        {([
          { value: 'before' as const, label: 'Cover (before)', icon: <EyeOff className="w-3.5 h-3.5" /> },
          { value: 'after' as const, label: 'Reveal (after)', icon: <Eye className="w-3.5 h-3.5" /> },
        ]).map((t) => (
          <button key={t.value} type="button" onClick={() => setTab(t.value)}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold transition-all ${
              tab === t.value ? 'bg-[#1A3C6E] text-white' : 'bg-white text-gray-500 hover:bg-gray-50'
            }`}>
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {tab === 'before'
        ? <FaceEditor face={before} slot="before" blockId={block.id} onChange={(f) => onChange({ ...data, before: f })} />
        : <FaceEditor face={after} slot="after" blockId={block.id} onChange={(f) => onChange({ ...data, after: f })} />}

      <div className="border-t border-gray-100 pt-3 space-y-3">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Behaviour</p>

        <div>
          <label className={labelClass}>Prompt / instruction (optional)</label>
          <input type="text" value={data.prompt ?? ''} placeholder="e.g. Scratch the card to reveal the answer"
            onChange={(e) => onChange({ ...data, prompt: e.target.value || undefined })} className={inputClass} />
        </div>

        <label className="flex items-start justify-between gap-3 cursor-pointer">
          <span className="text-xs text-gray-600">
            Required to continue
            <span className="block text-[11px] text-gray-400">Students must reveal the card before the Next button unlocks on this slide.</span>
          </span>
          <input type="checkbox" checked={data.required === true}
            onChange={(e) => onChange({ ...data, required: e.target.checked })} className="mt-0.5 accent-[#1A3C6E] w-4 h-4 shrink-0" />
        </label>

        <div>
          <label className={labelClass}>Aspect ratio</label>
          <div className="flex flex-wrap gap-1.5">
            {(['16/9', '4/3', '3/2', '1/1'] as const).map((a) => (
              <button key={a} type="button" onClick={() => onChange({ ...data, aspect: a })}
                className={`px-2.5 py-1.5 text-xs rounded-lg border transition-all font-medium ${
                  (data.aspect ?? '16/9') === a ? 'bg-[#1A3C6E] text-white border-[#1A3C6E]' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                }`}>{a}</button>
            ))}
          </div>
        </div>

        <div>
          <label className={labelClass}>Image fit</label>
          <div className="flex gap-1.5">
            {([
              { value: 'contain' as const, label: 'Contain (whole image)' },
              { value: 'cover' as const, label: 'Cover (fill / crop)' },
            ]).map((opt) => (
              <button key={opt.value} type="button" onClick={() => onChange({ ...data, fit: opt.value })}
                className={`flex-1 px-2.5 py-1.5 text-xs rounded-lg border transition-all font-medium ${
                  (data.fit ?? 'contain') === opt.value ? 'bg-[#1A3C6E] text-white border-[#1A3C6E]' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                }`}>{opt.label}</button>
            ))}
          </div>
        </div>

        <div>
          <label className={labelClass}>Brush size — {data.brush_size ?? 42}px</label>
          <input type="range" min={10} max={120} value={data.brush_size ?? 42}
            onChange={(e) => onChange({ ...data, brush_size: Number(e.target.value) })}
            className="w-full accent-[#1A3C6E]" />
        </div>

        <div>
          <label className={labelClass}>Auto-reveal after {data.reveal_threshold ?? 55}% scratched</label>
          <input type="range" min={20} max={100} value={data.reveal_threshold ?? 55}
            onChange={(e) => onChange({ ...data, reveal_threshold: Number(e.target.value) })}
            className="w-full accent-[#1A3C6E]" />
        </div>

        <div>
          <label className={labelClass}>Celebration when revealed</label>
          <div className="flex flex-wrap gap-1.5">
            {ANIMS.map((a) => (
              <button key={a.value} type="button" onClick={() => onChange({ ...data, animation: a.value })}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg border transition-all font-medium ${
                  (data.animation ?? 'confetti') === a.value ? 'bg-[#1A3C6E] text-white border-[#1A3C6E]' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                }`}>{a.icon}{a.label}</button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
