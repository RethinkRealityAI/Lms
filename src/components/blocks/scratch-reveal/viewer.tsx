'use client';

import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { Sparkles, Hand } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { BlockViewerProps } from '@/lib/content/block-registry';
import type { ScratchRevealData, ScratchFace } from '@/lib/content/blocks/scratch-reveal/schema';

const ASPECT: Record<string, string> = { '16/9': '16 / 9', '4/3': '4 / 3', '1/1': '1 / 1', '3/2': '3 / 2' };

const DEFAULT_BEFORE: ScratchFace = { type: 'text', text: 'Scratch to reveal!', bg_color: '#1A3C6E', text_color: '#FFFFFF' };
const DEFAULT_AFTER: ScratchFace = { type: 'text', text: 'Surprise!', bg_color: '#FFFFFF', text_color: '#0F172A' };

// ── Celebration overlays ──────────────────────────────────────────────────────
const COLORS = ['#DC2626', '#0099CA', '#1A3C6E', '#FFD700', '#22C55E', '#E87722'];

function Confetti() {
  const pieces = React.useMemo(
    () => Array.from({ length: 36 }, (_, i) => ({
      id: i, left: Math.random() * 100, delay: Math.random() * 0.6,
      duration: 1.6 + Math.random() * 1.4, drift: (Math.random() - 0.5) * 80,
      size: 5 + Math.random() * 6, color: COLORS[i % COLORS.length],
      rotate: Math.random() * 360, circle: Math.random() > 0.5,
    })), []);
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden z-20" aria-hidden>
      <style>{`@keyframes sr-fall{0%{opacity:1;transform:translateY(-12%) translateX(0) rotate(0)}100%{opacity:0;transform:translateY(120%) translateX(var(--d)) rotate(var(--r))}}`}</style>
      {pieces.map(p => (
        <span key={p.id} className={p.circle ? 'rounded-full' : 'rounded-[1px]'} style={{
          position: 'absolute', top: 0, left: `${p.left}%`, width: p.size, height: p.size,
          backgroundColor: p.color, '--d': `${p.drift}px`, '--r': `${p.rotate + 360}deg`,
          animation: `sr-fall ${p.duration}s ease-out ${p.delay}s forwards`,
        } as React.CSSProperties} />
      ))}
    </div>
  );
}

function SparkleBurst() {
  const stars = React.useMemo(
    () => Array.from({ length: 18 }, (_, i) => ({
      id: i, left: 10 + Math.random() * 80, top: 10 + Math.random() * 80,
      delay: Math.random() * 0.8, size: 10 + Math.random() * 18,
    })), []);
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden z-20" aria-hidden>
      <style>{`@keyframes sr-twinkle{0%,100%{opacity:0;transform:scale(.4) rotate(0)}50%{opacity:1;transform:scale(1) rotate(90deg)}}`}</style>
      {stars.map(s => (
        <Sparkles key={s.id} className="absolute text-amber-300 drop-shadow" style={{
          left: `${s.left}%`, top: `${s.top}%`, width: s.size, height: s.size,
          animation: `sr-twinkle 1.4s ease-in-out ${s.delay}s infinite`,
        }} />
      ))}
    </div>
  );
}

// ── Face renderer (used for the revealed "after" base) ────────────────────────
function Face({ face, fit }: { face: ScratchFace; fit: 'contain' | 'cover' }) {
  if (face.type === 'image' && face.image_url) {
    return (
      <img
        src={face.image_url}
        alt=""
        className={`absolute inset-0 w-full h-full ${fit === 'cover' ? 'object-cover' : 'object-contain'}`}
      />
    );
  }
  return (
    <div className="absolute inset-0 flex items-center justify-center p-5 text-center overflow-hidden"
      style={{ backgroundColor: face.bg_color }}>
      {/* Responsive + break-words so long text stays inside the card */}
      <span
        className="text-xl sm:text-2xl @lg:text-3xl font-black leading-tight break-words hyphens-auto max-w-full"
        style={{ color: face.text_color }}
      >
        {face.text || ''}
      </span>
    </div>
  );
}

export default function ScratchRevealViewer({ data, onComplete, context }: BlockViewerProps<ScratchRevealData>) {
  const before = useMemo(() => data.before ?? DEFAULT_BEFORE, [data.before]);
  const after = useMemo(() => data.after ?? DEFAULT_AFTER, [data.after]);
  const brush_size = data.brush_size ?? 42;
  const reveal_threshold = data.reveal_threshold ?? 55;
  const animation = data.animation ?? 'confetti';
  const prompt = data.prompt;
  const aspect = data.aspect ?? '16/9';
  const fit: 'contain' | 'cover' = data.fit ?? 'contain';
  const isEditing = context?.editing === true;
  const sole = context?.soleBlock === true;
  // When it's the only block on the slide, fill the available height; otherwise keep
  // the chosen aspect ratio. The block surface is flush (no padding) + fill-cell, so
  // this card IS the single container — no nested card chrome.
  const cardSizing = sole ? 'flex-1 min-h-[14rem]' : '';
  const cardStyle = sole ? undefined : { aspectRatio: ASPECT[aspect] ?? '16 / 9' };

  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const strokes = useRef(0);
  const completed = useRef(false);
  const [revealed, setRevealed] = useState(false);
  const [started, setStarted] = useState(false);

  // Paint the "before" cover onto the canvas, sized to the container.
  const paint = useCallback(() => {
    const canvas = canvasRef.current, wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const r = wrap.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return;
    canvas.width = r.width; canvas.height = r.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.globalCompositeOperation = 'source-over';
    if (before.type === 'image' && before.image_url) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        // honour the chosen fit (contain = whole image, cover = fill/crop)
        const s = fit === 'cover'
          ? Math.max(canvas.width / img.width, canvas.height / img.height)
          : Math.min(canvas.width / img.width, canvas.height / img.height);
        const w = img.width * s, h = img.height * s;
        if (fit === 'contain') {
          // fill the gaps with the bg colour so the scratch surface covers the whole card
          ctx.fillStyle = before.bg_color || '#1A3C6E';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        ctx.drawImage(img, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h);
      };
      img.src = before.image_url;
    } else {
      ctx.fillStyle = before.bg_color || '#1A3C6E';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      const text = before.text || 'Scratch here';
      ctx.fillStyle = before.text_color || '#FFFFFF';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = `800 ${Math.round(Math.min(canvas.width, canvas.height) / 9)}px Outfit, system-ui, sans-serif`;
      // simple word-wrap
      const max = canvas.width * 0.86, words = text.split(' '), lines: string[] = [];
      let line = '';
      for (const word of words) {
        const test = line ? `${line} ${word}` : word;
        if (ctx.measureText(test).width > max && line) { lines.push(line); line = word; } else line = test;
      }
      if (line) lines.push(line);
      const lh = Math.round(Math.min(canvas.width, canvas.height) / 7);
      lines.forEach((ln, i) => ctx.fillText(ln, canvas.width / 2, canvas.height / 2 + (i - (lines.length - 1) / 2) * lh));
    }
  }, [before, fit]);

  // Interactive canvas setup — skipped entirely in the editor (static preview there).
  useEffect(() => {
    if (isEditing) return;
    paint();
  }, [paint, isEditing]);
  useEffect(() => {
    if (isEditing) return;
    const wrap = wrapRef.current;
    if (!wrap) return;
    const ro = new ResizeObserver(() => { if (!completed.current) paint(); });
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [paint, isEditing]);

  const erase = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(clientX - rect.left, clientY - rect.top, brush_size, 0, Math.PI * 2);
    ctx.fill();
    strokes.current += 1;
  };

  const measureAndMaybeReveal = () => {
    if (completed.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    let pct = 0;
    try {
      const { data: px } = ctx.getImageData(0, 0, canvas.width, canvas.height);
      let cleared = 0, total = 0;
      for (let i = 3; i < px.length; i += 4 * 40) { total++; if (px[i] === 0) cleared++; }
      pct = total ? (cleared / total) * 100 : 0;
    } catch {
      // cross-origin image tainted the canvas — fall back to a stroke heuristic
      pct = Math.min(100, strokes.current * 1.4);
    }
    if (pct >= reveal_threshold) {
      completed.current = true;
      setRevealed(true);
      onComplete?.();
    }
  };

  const onDown = (e: React.PointerEvent) => {
    if (completed.current) return;
    // Keep the scratch gesture local — never let it reach the editor's grid/drag system.
    e.stopPropagation();
    drawing.current = true;
    if (!started) setStarted(true);
    erase(e.clientX, e.clientY);
  };
  const onMove = (e: React.PointerEvent) => {
    if (!drawing.current || completed.current) return;
    e.stopPropagation();
    erase(e.clientX, e.clientY);
  };
  const endStroke = () => {
    if (!drawing.current) return;
    drawing.current = false;
    measureAndMaybeReveal();
  };

  // ── Static preview inside the editor canvas (no pointer capture → never freezes) ──
  if (isEditing) {
    return (
      <div className="w-full h-full flex flex-col">
        {prompt && <p className="text-sm font-medium text-center [color:inherit] opacity-90 px-4 pt-3 pb-1 shrink-0">{prompt}</p>}
        <div
          className={cn('relative w-full overflow-hidden select-none', cardSizing)}
          style={cardStyle}
        >
          {/* Show the cover so authors see what the learner starts with */}
          <Face face={before} fit={fit} />
          <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/55 text-white text-xs font-semibold backdrop-blur-sm">
            <Hand className="w-3.5 h-3.5" /> Scratch-to-reveal · interactive in student view
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col">
      {prompt && (
        <p className="text-sm font-medium text-center [color:inherit] opacity-90 px-4 pt-3 pb-1 shrink-0">{prompt}</p>
      )}
      <div
        ref={wrapRef}
        className={cn('relative w-full overflow-hidden select-none', cardSizing)}
        style={cardStyle}
      >
        {/* Revealed base */}
        <Face face={after} fit={fit} />

        {/* Scratch cover */}
        <canvas
          ref={canvasRef}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={endStroke}
          onPointerLeave={endStroke}
          onPointerCancel={endStroke}
          className={`absolute inset-0 transition-opacity duration-700 ${revealed ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
          style={{ touchAction: 'none', cursor: revealed ? 'default' : 'grab' }}
        />

        {/* Hint badge before any scratching */}
        {!revealed && !started && (
          <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/55 text-white text-xs font-semibold backdrop-blur-sm">
            <Hand className="w-3.5 h-3.5" /> Scratch to reveal
          </div>
        )}

        {/* Celebration */}
        {revealed && animation === 'confetti' && <Confetti />}
        {revealed && animation === 'sparkles' && <SparkleBurst />}
      </div>
    </div>
  );
}
