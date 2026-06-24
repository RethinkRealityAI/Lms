'use client';

import { useRef, useState } from 'react';
import { Trash2, MapPin, MousePointerClick } from 'lucide-react';
import { DropZoneUploader } from '@/components/editor/drop-zone-uploader';
import { RichTextEditor } from '@/components/blocks/rich-text/editor';
import type { ImageGalleryData } from '@/lib/content/blocks/image-gallery/schema';
import type { Hotspot } from './hotspot-view';

const inputClass =
  'w-full px-2.5 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent';

function newId() {
  try { return crypto.randomUUID(); } catch { return `hs-${Date.now()}-${Math.round(Math.random() * 1e6)}`; }
}

export function HotspotEditor({ data, onChange }: { data: ImageGalleryData; onChange: (d: ImageGalleryData) => void }) {
  const image = data.images?.[0];
  const hotspots = data.hotspots ?? [];
  const accent = (data.hotspotColor || '').trim() || '#1E3A5F';

  const [selected, setSelected] = useState<string | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const dragId = useRef<string | null>(null);
  const moved = useRef(false);

  const setImageUrl = (url: string | undefined) =>
    onChange({ ...data, images: url ? [{ url, alt: image?.alt }] : [] });
  const setHotspots = (hs: Hotspot[]) => onChange({ ...data, hotspots: hs });
  const update = (id: string, patch: Partial<Hotspot>) => setHotspots(hotspots.map(h => (h.id === id ? { ...h, ...patch } : h)));
  const remove = (id: string) => { setHotspots(hotspots.filter(h => h.id !== id)); if (selected === id) setSelected(null); };

  const pctFrom = (clientX: number, clientY: number) => {
    const el = boxRef.current;
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return {
      x: Math.round(Math.min(100, Math.max(0, ((clientX - r.left) / r.width) * 100)) * 10) / 10,
      y: Math.round(Math.min(100, Math.max(0, ((clientY - r.top) / r.height) * 100)) * 10) / 10,
    };
  };

  const onImageClick = (e: React.MouseEvent) => {
    if (moved.current) { moved.current = false; return; } // ignore the click that ends a drag
    const p = pctFrom(e.clientX, e.clientY);
    if (!p) return;
    const h: Hotspot = { id: newId(), x: p.x, y: p.y, label: `${hotspots.length + 1}`, title: '', body: '' };
    setHotspots([...hotspots, h]);
    setSelected(h.id);
  };

  const onPinPointerDown = (e: React.PointerEvent, id: string) => {
    e.stopPropagation();
    dragId.current = id;
    moved.current = false;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setSelected(id);
  };
  const onPinPointerMove = (e: React.PointerEvent) => {
    if (dragId.current == null) return;
    const p = pctFrom(e.clientX, e.clientY);
    if (!p) return;
    moved.current = true;
    update(dragId.current, { x: p.x, y: p.y });
  };
  const onPinPointerUp = (e: React.PointerEvent) => {
    if (dragId.current == null) return;
    try { (e.target as HTMLElement).releasePointerCapture(e.pointerId); } catch { /* noop */ }
    dragId.current = null;
  };

  const sel = hotspots.find(h => h.id === selected) ?? null;

  return (
    <div className="space-y-3">
      {/* Base image */}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Base image</label>
        <DropZoneUploader
          bucket="block-media" pathPrefix="images/hotspot/" accept="image/*"
          label="Drop / click to upload the image" currentUrl={image?.url}
          onUpload={setImageUrl} onRemove={() => setImageUrl(undefined)} previewMode="image"
        />
        <input type="url" value={image?.url ?? ''} placeholder="…or image URL"
          onChange={(e) => setImageUrl(e.target.value || undefined)} className={`${inputClass} mt-1.5`} />
      </div>

      {/* Interactive placement */}
      {image?.url ? (
        <div>
          <p className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-500 mb-1">
            <MousePointerClick className="w-3 h-3" /> Click the image to add a hotspot · drag a pin to move it
          </p>
          <div
            ref={boxRef}
            onClick={onImageClick}
            className="relative w-full overflow-hidden rounded-lg ring-1 ring-gray-200 cursor-crosshair select-none"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={image.url} alt="" draggable={false} className="w-full h-auto block pointer-events-none" />
            {hotspots.map((h, i) => (
              <button
                key={h.id}
                type="button"
                onPointerDown={(e) => onPinPointerDown(e, h.id)}
                onPointerMove={onPinPointerMove}
                onPointerUp={onPinPointerUp}
                onClick={(e) => e.stopPropagation()}
                className={`absolute z-10 -translate-x-1/2 -translate-y-1/2 flex h-6 w-6 items-center justify-center rounded-full text-white text-[11px] font-black shadow-md ring-2 touch-none cursor-grab active:cursor-grabbing ${
                  selected === h.id ? 'ring-white scale-110' : 'ring-white/70'
                }`}
                style={{ left: `${h.x}%`, top: `${h.y}%`, backgroundColor: accent }}
                title={h.title || h.label || `Hotspot ${i + 1}`}
              >
                {i + 1}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-xs text-gray-400 italic">Add a base image first, then click it to place hotspots.</p>
      )}

      {/* Selected hotspot editor */}
      {sel ? (
        <div className="rounded-xl border border-gray-200 p-3 space-y-2.5 bg-slate-50/60">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs font-bold text-gray-500">
              <MapPin className="w-3.5 h-3.5" style={{ color: accent }} /> Hotspot {hotspots.findIndex(h => h.id === sel.id) + 1}
            </span>
            <button type="button" onClick={() => remove(sel.id)} className="p-1 rounded hover:bg-red-50 text-gray-300 hover:text-red-500">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input type="text" value={sel.label ?? ''} placeholder="Label (chip)"
              onChange={(e) => update(sel.id, { label: e.target.value || undefined })} className={inputClass} />
            <input type="text" value={sel.title ?? ''} placeholder="Panel heading"
              onChange={(e) => update(sel.id, { title: e.target.value || undefined })} className={inputClass} />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Description</label>
            <RichTextEditor
              key={sel.id}
              data={{ html: sel.body ?? '', mode: 'standard' }}
              block={{ id: `hotspot-${sel.id}` }}
              onChange={(rich) => update(sel.id, { body: (rich.html && rich.html !== '<p></p>') ? rich.html : undefined })}
            />
          </div>
        </div>
      ) : (
        hotspots.length > 0 && <p className="text-xs text-gray-400 italic">Select a pin on the image to edit its description.</p>
      )}

      {/* Hotspot list */}
      {hotspots.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {hotspots.map((h, i) => (
            <button
              key={h.id}
              type="button"
              onClick={() => setSelected(h.id)}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-xs font-medium transition-all ${
                selected === h.id ? 'border-[#1A3C6E] bg-blue-50 text-[#1A3C6E]' : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
              }`}
            >
              <span className="flex h-4 w-4 items-center justify-center rounded-full text-white text-[9px] font-black" style={{ backgroundColor: accent }}>{i + 1}</span>
              {h.label || h.title || `Point ${i + 1}`}
            </button>
          ))}
        </div>
      )}

      {/* Global hotspot options */}
      <div className="space-y-2.5 pt-1 border-t border-gray-100">
        <label className="flex items-center justify-between cursor-pointer">
          <span className="text-xs text-gray-600">Show label chips on the image</span>
          <input type="checkbox" checked={!!data.showHotspotLabels}
            onChange={(e) => onChange({ ...data, showHotspotLabels: e.target.checked })} className="accent-[#1A3C6E] w-4 h-4" />
        </label>
        <div className="flex items-center gap-2">
          <input type="color" value={accent}
            onChange={(e) => onChange({ ...data, hotspotColor: e.target.value })}
            className="h-8 w-9 shrink-0 rounded border border-gray-200 cursor-pointer bg-white p-0.5" aria-label="Marker colour" />
          <span className="text-xs text-gray-600 flex-1">Marker colour</span>
          {data.hotspotColor && (
            <button type="button" onClick={() => onChange({ ...data, hotspotColor: undefined })} className="text-[10px] font-medium text-gray-400 hover:text-red-500">Reset</button>
          )}
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Prompt (optional)</label>
          <input type="text" value={data.hotspotPrompt ?? ''} placeholder="e.g. Tap each marker to learn more"
            onChange={(e) => onChange({ ...data, hotspotPrompt: e.target.value || undefined })} className={inputClass} />
        </div>
      </div>
    </div>
  );
}
