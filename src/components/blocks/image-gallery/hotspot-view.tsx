'use client';

import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronLeft, ChevronRight, ImageOff, Plus } from 'lucide-react';
import type { ImageGalleryData } from '@/lib/content/blocks/image-gallery/schema';

export type Hotspot = NonNullable<ImageGalleryData['hotspots']>[number];

function sanitizeHtml(html: string): string {
  let r = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  r = r.replace(/<img\s+[^>]*src=["'](?!https?:\/\/|data:)[^"']*["'][^>]*\/?>/gi, '');
  r = r.replace(/(<a\b[^>]*\bhref=)(["'])\s*(?:javascript|vbscript|data):[^"']*\2/gi, '$1$2#$2');
  r = r.replace(/<a\b(?![^>]*\btarget=)/gi, '<a target="_blank" rel="noopener noreferrer nofollow"');
  return r;
}

/**
 * A single image overlaid with clickable markers. Tapping a marker opens a description
 * panel — a bottom sheet on mobile, a centred card on desktop — with prev/next nav.
 */
export function HotspotView({ data, editing }: { data: ImageGalleryData; editing?: boolean }) {
  const image = data.images?.[0];
  const hotspots = data.hotspots ?? [];
  const accent = (data.hotspotColor || '').trim() || '#1E3A5F';
  const showLabels = !!data.showHotspotLabels;

  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const [shown, setShown] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const close = useCallback(() => {
    setShown(false);
    window.setTimeout(() => setOpenIdx(null), 240);
  }, []);
  const go = useCallback((dir: 1 | -1) => {
    setOpenIdx((i) => (i === null ? i : (i + dir + hotspots.length) % hotspots.length));
  }, [hotspots.length]);

  // Animate the sheet in once it mounts.
  useEffect(() => {
    if (openIdx === null) return;
    const r = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(r);
  }, [openIdx]);

  // Keyboard: Esc closes, arrows navigate.
  useEffect(() => {
    if (openIdx === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowRight') go(1);
      else if (e.key === 'ArrowLeft') go(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [openIdx, close, go]);

  if (!image?.url) {
    return (
      <div className="w-full min-h-[8rem] bg-gray-50 rounded-xl flex items-center justify-center border border-dashed border-gray-200">
        <div className="text-center">
          <ImageOff className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-400">Add an image to place hotspots on</p>
        </div>
      </div>
    );
  }

  const active = openIdx !== null ? hotspots[openIdx] : null;

  return (
    <div className="w-full flex flex-col gap-2">
      {data.hotspotPrompt && (
        <p className="text-sm text-[color:var(--surface-text,#0f172a)] opacity-80 leading-relaxed">{data.hotspotPrompt}</p>
      )}

      <div
        className="relative w-full overflow-hidden rounded-xl ring-1 ring-black/5 bg-slate-50"
        onClick={() => { if (openIdx !== null) close(); }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={image.url} alt={image.alt || ''} draggable={false} className="w-full h-auto block select-none" />

        {hotspots.map((h, i) => (
          <button
            key={h.id}
            type="button"
            // Stay clickable even while the panel is open: switch to this hotspot
            // (stopPropagation so the image-background close handler doesn't also fire).
            onClick={(e) => { if (!editing) { e.stopPropagation(); setOpenIdx(i); setShown(true); } }}
            aria-label={h.label || h.title || `Hotspot ${i + 1}`}
            className="absolute z-10 -translate-x-1/2 -translate-y-1/2 outline-none focus-visible:ring-2 focus-visible:ring-white rounded-full"
            style={{ left: `${h.x}%`, top: `${h.y}%` }}
          >
            {/* Only the currently-open hotspot pulses, so it's clear which one the
                description belongs to. The pulse is strong + a steady glow ring. */}
            {openIdx === i && (
              <>
                <span className="absolute inset-0 m-auto h-12 w-12 rounded-full animate-ping opacity-80" style={{ backgroundColor: accent }} />
                <span className="absolute inset-0 m-auto h-10 w-10 rounded-full opacity-30" style={{ backgroundColor: accent }} />
              </>
            )}
            <span
              className={`relative flex items-center justify-center rounded-full text-white font-black shadow-lg transition-all ${
                openIdx === i ? 'h-8 w-8 text-sm ring-4 ring-white scale-110' : 'h-7 w-7 text-xs ring-2 ring-white hover:scale-110'
              }`}
              style={{ backgroundColor: accent }}
            >
              {i + 1}
            </span>
            {showLabels && (h.label || h.title) && (
              <span
                className="pointer-events-none absolute left-1/2 top-full mt-1.5 -translate-x-1/2 whitespace-nowrap rounded-full bg-white/95 px-2.5 py-0.5 text-[11px] font-bold shadow-md ring-1 ring-black/5 backdrop-blur-sm"
                style={{ color: accent }}
              >
                {h.label || h.title}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Description panel overlay. The container is click-through (pointer-events-none)
          so the markers underneath stay tappable while the panel is open — tap another
          marker to switch, or tap the image background to close. Only the panel itself
          is interactive. */}
      {mounted && active !== null && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-end justify-center sm:items-center sm:p-4 pointer-events-none">
          <div
            className={`absolute inset-0 bg-black/10 transition-opacity duration-300 ${shown ? 'opacity-100' : 'opacity-0'}`}
          />
          <div
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            className={`pointer-events-auto relative w-full sm:max-w-md bg-white shadow-2xl rounded-t-3xl sm:rounded-3xl max-h-[85vh] flex flex-col transition-all duration-300 ease-[cubic-bezier(.16,1,.3,1)] ${
              shown ? 'translate-y-0 opacity-100 sm:scale-100' : 'translate-y-full opacity-0 sm:translate-y-3 sm:scale-95'
            }`}
          >
            <div className="sm:hidden pt-2.5 flex justify-center shrink-0">
              <span className="h-1.5 w-10 rounded-full bg-slate-300" />
            </div>

            <div className="flex items-start gap-3 px-5 pt-3 sm:pt-5 shrink-0">
              <span className="shrink-0 flex items-center justify-center w-8 h-8 rounded-full text-white text-sm font-black shadow" style={{ backgroundColor: accent }}>
                {openIdx! + 1}
              </span>
              <h4 className="flex-1 min-w-0 text-lg font-extrabold text-slate-900 leading-snug pt-0.5">
                {active.title || active.label || `Point ${openIdx! + 1}`}
              </h4>
              <button type="button" onClick={close} aria-label="Close" className="shrink-0 -mr-1.5 -mt-0.5 p-1.5 rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-5 py-4 overflow-y-auto">
              {active.body ? (
                <div className="prose prose-sm max-w-none text-slate-700 [&_a]:underline [&_p:first-child]:mt-0 [&_p:last-child]:mb-0"
                  dangerouslySetInnerHTML={{ __html: sanitizeHtml(active.body) }} />
              ) : (
                <p className="text-sm text-slate-400 italic">No description yet.</p>
              )}
            </div>

            {hotspots.length > 1 && (
              <div className="flex items-center justify-between gap-2 px-4 py-3 border-t border-slate-100 shrink-0">
                <button type="button" onClick={() => go(-1)} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-sm font-semibold text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-colors">
                  <ChevronLeft className="w-4 h-4" /> Prev
                </button>
                <span className="text-xs font-medium text-slate-400 tabular-nums">{openIdx! + 1} / {hotspots.length}</span>
                <button type="button" onClick={() => go(1)} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-sm font-semibold text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-colors">
                  Next <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}

/** Empty-state marker used in the editor preview placeholder. */
export function HotspotPlaceholderHint() {
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#1E3A5F]">
      <Plus className="w-3 h-3" /> Click the image to add a hotspot
    </span>
  );
}
