'use client';

import { useCallback, useEffect, useRef } from 'react';
import { GRID_MARGIN, pixelsToGridRows } from '@/lib/content/gridConstants';

interface BlockContentAutosizeProps {
  blockId: string;
  rowHeight: number;
  enabled: boolean;
  /** Bust measure cache when block content changes */
  contentKey?: string;
  onFitHeight?: (blockId: string, gridH: number) => void;
  onMinHeight?: (blockId: string, minH: number) => void;
  children: React.ReactNode;
}

function measureContentHeightPx(root: HTMLElement): number {
  // Prefer the block surface (the visual container) over the stretched grid cell
  const surface = root.querySelector('[data-block-style]') as HTMLElement | null;
  const target = surface ?? (root.firstElementChild as HTMLElement | null) ?? root;
  const rect = target.getBoundingClientRect();
  const height = Math.ceil(rect.height);
  if (height > 0) return height;
  return Math.ceil(root.scrollHeight);
}

/**
 * Measures intrinsic block content height and syncs the RGL row count.
 */
export function BlockContentAutosize({
  blockId,
  rowHeight,
  enabled,
  contentKey,
  onFitHeight,
  onMinHeight,
  children,
}: BlockContentAutosizeProps) {
  const measureRef = useRef<HTMLDivElement>(null);
  const lastGridHRef = useRef<number | null>(null);
  const lastPxRef = useRef<number | null>(null);

  useEffect(() => {
    lastGridHRef.current = null;
    lastPxRef.current = null;
  }, [blockId, contentKey]);

  const measure = useCallback(() => {
    if (!enabled || !measureRef.current) return;
    const heightPx = measureContentHeightPx(measureRef.current);
    if (heightPx <= 0) return;
    // Dead-band: ignore sub-pixel / tiny measurement jitter. Browsers can report a
    // content height that wobbles by a pixel or two between frames (font hinting,
    // image decode, fractional layout). Without this, that wobble can flip the
    // computed gridH across a row boundary every frame → the cell animates up/down
    // forever ("pulsing as if trying to resize"). A few px never matter visually.
    if (lastPxRef.current != null && Math.abs(heightPx - lastPxRef.current) <= 2) return;
    const gridH = pixelsToGridRows(heightPx, rowHeight, GRID_MARGIN[1]);
    lastPxRef.current = heightPx;
    if (gridH === lastGridHRef.current) return;
    lastGridHRef.current = gridH;
    onMinHeight?.(blockId, gridH);
    onFitHeight?.(blockId, gridH);
  }, [blockId, enabled, onFitHeight, onMinHeight, rowHeight]);

  useEffect(() => {
    if (!enabled) return;
    const el = measureRef.current;
    if (!el) return;

    // Schedule a measure resiliently. rAF batches with paint when the tab is
    // visible, but rAF is PAUSED entirely when the document is hidden (background
    // tab, headless preview). getBoundingClientRect only needs layout (synchronous),
    // not paint — so a setTimeout fallback keeps autosizing working when hidden.
    const schedule = () => {
      if (typeof document !== 'undefined' && !document.hidden && typeof requestAnimationFrame === 'function') {
        requestAnimationFrame(measure);
      } else {
        setTimeout(measure, 0);
      }
    };

    const ro = new ResizeObserver(schedule);
    ro.observe(el);
    // Observe inner surface too — lazy-loaded viewers mount after first paint
    const surface = el.querySelector('[data-block-style]');
    if (surface) ro.observe(surface);

    const mo = new MutationObserver(schedule);
    mo.observe(el, { childList: true, subtree: true, attributes: true, characterData: true });

    // Initial measures: cover the synchronous-layout case immediately, then a few
    // deferred passes to catch lazy-mounted (Suspense/dynamic) viewer content.
    // Mixed rAF + setTimeout so it works whether or not the tab is visible.
    measure();
    const t1 = setTimeout(measure, 0);
    const t2 = setTimeout(measure, 60);
    const t3 = setTimeout(measure, 200);
    schedule();

    return () => {
      ro.disconnect();
      mo.disconnect();
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [enabled, measure, blockId, contentKey]);

  return (
    <div ref={measureRef} className="w-full min-w-0 h-auto">
      {children}
    </div>
  );
}
