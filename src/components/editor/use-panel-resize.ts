'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

interface PanelResizeOptions {
  /** localStorage key so the chosen width survives reloads. */
  storageKey: string;
  /** Default (and initial) width in px. */
  defaultWidth: number;
  /** Minimum width in px. */
  min: number;
  /** Maximum width in px. */
  max: number;
  /**
   * Which edge the drag handle lives on. 'right' = handle on the panel's right
   * edge (dragging right widens it, e.g. the left Structure panel). 'left' =
   * handle on the left edge (dragging left widens it, e.g. the right Properties
   * panel).
   */
  side: 'left' | 'right';
}

/**
 * Drag-to-resize width state for an editor side panel. Width is clamped to
 * [min, max] and persisted to localStorage. Returns the current width, a
 * pointer-down handler to start a drag, and whether a drag is in progress
 * (used to suppress the width transition so dragging feels 1:1).
 */
export function usePanelResize({ storageKey, defaultWidth, min, max, side }: PanelResizeOptions) {
  const clamp = useCallback((n: number) => Math.min(max, Math.max(min, n)), [min, max]);
  const [width, setWidth] = useState(defaultWidth);
  const [isResizing, setIsResizing] = useState(false);
  const drag = useRef<{ x: number; w: number } | null>(null);
  const widthRef = useRef(defaultWidth);
  widthRef.current = width;

  // Hydrate the persisted width on mount (client only — avoids SSR mismatch).
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(storageKey);
      if (saved != null) {
        const n = parseInt(saved, 10);
        if (!Number.isNaN(n)) setWidth(clamp(n));
      }
    } catch {
      /* localStorage unavailable — keep the default */
    }
  }, [storageKey, clamp]);

  const startResize = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    drag.current = { x: e.clientX, w: widthRef.current };
    setIsResizing(true);
  }, []);

  useEffect(() => {
    if (!isResizing) return;
    const onMove = (e: PointerEvent) => {
      if (!drag.current) return;
      const dx = e.clientX - drag.current.x;
      setWidth(clamp(side === 'right' ? drag.current.w + dx : drag.current.w - dx));
    };
    const onUp = () => {
      setIsResizing(false);
      drag.current = null;
      try {
        window.localStorage.setItem(storageKey, String(Math.round(widthRef.current)));
      } catch {
        /* ignore persist failures */
      }
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    // pointercancel / losing the window ends the drag too, so it can't get stuck
    // "on" if the pointer is released outside the viewport.
    window.addEventListener('pointercancel', onUp);
    window.addEventListener('blur', onUp);
    // While dragging, force a resize cursor everywhere and block text selection.
    const prevCursor = document.body.style.cursor;
    const prevSelect = document.body.style.userSelect;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      window.removeEventListener('blur', onUp);
      document.body.style.cursor = prevCursor;
      document.body.style.userSelect = prevSelect;
    };
  }, [isResizing, side, storageKey, clamp]);

  return { width, startResize, isResizing };
}
