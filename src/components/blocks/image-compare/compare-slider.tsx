'use client';

import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Columns2, ImageIcon } from 'lucide-react';
import type { ImageCompareData } from '@/lib/content/blocks/image-compare/schema';

const ASPECT: Record<string, string> = {
  '16/9': '16 / 9',
  '4/3': '4 / 3',
  '1/1': '1 / 1',
  '3/2': '3 / 2',
};

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function CompareImageLayer({
  url,
  alt,
  fit,
  clipStyle,
}: {
  url: string;
  alt: string;
  fit: 'contain' | 'cover';
  clipStyle?: React.CSSProperties;
}) {
  if (!url) {
    return (
      <div
        className="absolute inset-0 flex flex-col items-center justify-center bg-slate-100 text-slate-400"
        style={clipStyle}
      >
        <ImageIcon className="w-10 h-10 mb-2 opacity-40" />
        <span className="text-xs font-medium">No image</span>
      </div>
    );
  }
  return (
    <img
      src={url}
      alt={alt}
      draggable={false}
      className={`absolute inset-0 w-full h-full pointer-events-none select-none ${
        fit === 'cover' ? 'object-cover' : 'object-contain'
      }`}
      style={clipStyle}
    />
  );
}

function CompareHandle({
  style,
  direction,
  handleStyle,
  handleColor,
  dividerColor,
}: {
  style: React.CSSProperties;
  direction: 'horizontal' | 'vertical';
  handleStyle: ImageCompareData['handle_style'];
  handleColor: string;
  dividerColor: string;
}) {
  const isHorizontal = direction === 'horizontal';

  return (
    <div
      className="absolute z-20 flex items-center justify-center pointer-events-none"
      style={{
        ...style,
        ...(isHorizontal
          ? { top: 0, bottom: 0, width: 0, transform: 'translateX(-50%)' }
          : { left: 0, right: 0, height: 0, transform: 'translateY(-50%)' }),
      }}
    >
      <div
        className="absolute shadow-sm"
        style={
          isHorizontal
            ? { top: 0, bottom: 0, width: 3, backgroundColor: dividerColor, left: '50%', transform: 'translateX(-50%)' }
            : { left: 0, right: 0, height: 3, backgroundColor: dividerColor, top: '50%', transform: 'translateY(-50%)' }
        }
      />
      {handleStyle === 'bar' ? (
        <div
          className="relative rounded-full shadow-lg ring-2 ring-black/10"
          style={{
            backgroundColor: handleColor,
            ...(isHorizontal ? { width: 6, height: 56 } : { width: 56, height: 6 }),
          }}
        />
      ) : handleStyle === 'arrows' ? (
        <div
          className="relative flex items-center justify-center w-11 h-11 rounded-full shadow-lg ring-2 ring-black/15"
          style={{ backgroundColor: handleColor, color: '#0F172A' }}
        >
          <span className="flex items-center gap-0.5 text-[10px] font-black tracking-tighter">
            {isHorizontal ? <>◀ ▶</> : <>▲ ▼</>}
          </span>
        </div>
      ) : (
        <div
          className="relative w-11 h-11 rounded-full shadow-lg ring-2 ring-black/15 flex items-center justify-center"
          style={{ backgroundColor: handleColor }}
        >
          <Columns2 className="w-5 h-5 text-slate-800" strokeWidth={2.25} />
        </div>
      )}
    </div>
  );
}

export interface CompareSliderProps {
  data: ImageCompareData;
  interactive: boolean;
  onFirstInteract?: () => void;
}

export function CompareSlider({ data, interactive, onFirstInteract }: CompareSliderProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const interacted = useRef(false);
  const [position, setPosition] = useState(data.initial_position ?? 50);

  const direction = data.direction ?? 'horizontal';
  const fit = data.fit ?? 'cover';
  const aspect = data.aspect ?? '16/9';
  const isHorizontal = direction === 'horizontal';

  useEffect(() => {
    setPosition(data.initial_position ?? 50);
  }, [data.initial_position]);

  const updateFromPointer = useCallback(
    (clientX: number, clientY: number) => {
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const pct = isHorizontal
        ? ((clientX - rect.left) / rect.width) * 100
        : ((clientY - rect.top) / rect.height) * 100;
      setPosition(clamp(pct, 0, 100));
      if (!interacted.current) {
        interacted.current = true;
        onFirstInteract?.();
      }
    },
    [isHorizontal, onFirstInteract],
  );

  const onPointerDown = (e: React.PointerEvent) => {
    if (!interactive) return;
    e.stopPropagation();
    dragging.current = true;
    containerRef.current?.setPointerCapture(e.pointerId);
    updateFromPointer(e.clientX, e.clientY);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!interactive || !dragging.current) return;
    e.stopPropagation();
    updateFromPointer(e.clientX, e.clientY);
  };

  const endDrag = (e: React.PointerEvent) => {
    if (!dragging.current) return;
    dragging.current = false;
    try {
      containerRef.current?.releasePointerCapture(e.pointerId);
    } catch {
      /* noop */
    }
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!interactive) return;
    const step = e.shiftKey ? 10 : 2;
    let next = position;
    if (isHorizontal) {
      if (e.key === 'ArrowLeft') next -= step;
      if (e.key === 'ArrowRight') next += step;
    } else {
      if (e.key === 'ArrowUp') next -= step;
      if (e.key === 'ArrowDown') next += step;
    }
    if (next !== position) {
      e.preventDefault();
      setPosition(clamp(next, 0, 100));
      if (!interacted.current) {
        interacted.current = true;
        onFirstInteract?.();
      }
    }
  };

  const beforeClip: React.CSSProperties = isHorizontal
    ? { clipPath: `inset(0 ${100 - position}% 0 0)` }
    : { clipPath: `inset(0 0 ${100 - position}% 0)` };

  const handlePos: React.CSSProperties = isHorizontal
    ? { left: `${position}%` }
    : { top: `${position}%` };

  const labelVisibility =
    data.show_labels === 'never'
      ? 'opacity-0'
      : data.show_labels === 'hover'
        ? 'opacity-0 group-hover:opacity-100 transition-opacity duration-200'
        : 'opacity-100';

  const beforeLabel = data.before_label ?? 'Before';
  const afterLabel = data.after_label ?? 'After';

  return (
    <div
      ref={containerRef}
      className={`group relative w-full overflow-hidden rounded-2xl shadow-inner ring-1 ring-black/5 bg-slate-100 select-none ${
        interactive ? (isHorizontal ? 'cursor-col-resize' : 'cursor-row-resize') : ''
      }`}
      style={{ aspectRatio: ASPECT[aspect] ?? '16 / 9', touchAction: interactive ? 'none' : undefined }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerLeave={endDrag}
      onPointerCancel={endDrag}
      role="slider"
      tabIndex={interactive ? 0 : -1}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(position)}
      aria-label="Compare before and after images"
      aria-orientation={isHorizontal ? 'horizontal' : 'vertical'}
      onKeyDown={onKeyDown}
    >
      <CompareImageLayer url={data.after?.url ?? ''} alt={data.after?.alt ?? afterLabel} fit={fit} />
      <CompareImageLayer
        url={data.before?.url ?? ''}
        alt={data.before?.alt ?? beforeLabel}
        fit={fit}
        clipStyle={beforeClip}
      />

      {data.show_labels !== 'never' && (
        <>
          <span
            className={`pointer-events-none absolute top-3 left-3 z-10 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide bg-black/55 text-white backdrop-blur-sm ${labelVisibility}`}
          >
            {beforeLabel}
          </span>
          <span
            className={`pointer-events-none absolute top-3 right-3 z-10 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide bg-black/55 text-white backdrop-blur-sm ${labelVisibility}`}
          >
            {afterLabel}
          </span>
        </>
      )}

      <CompareHandle
        style={handlePos}
        direction={direction}
        handleStyle={data.handle_style ?? 'circle'}
        handleColor={data.handle_color ?? '#FFFFFF'}
        dividerColor={data.divider_color ?? '#FFFFFF'}
      />

      {!interactive && (
        <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/55 text-white text-xs font-semibold backdrop-blur-sm">
          <Columns2 className="w-3.5 h-3.5" /> Drag to compare · interactive in student view
        </div>
      )}
    </div>
  );
}
