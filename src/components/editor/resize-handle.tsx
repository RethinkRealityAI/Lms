'use client';

import React from 'react';

interface ResizeHandleProps {
  onPointerDown: (e: React.PointerEvent) => void;
  /** True while a drag is in progress (keeps the grip highlighted). */
  active?: boolean;
}

/**
 * A thin vertical drag handle rendered as a flex item BETWEEN two editor panels
 * (not overlapping panel content, so it never fights a panel's scrollbar). The
 * parent lays the panels out in a horizontal flex row; drop one of these in the
 * gap. `shrink-0` keeps its width fixed as the panels resize.
 */
export function ResizeHandle({ onPointerDown, active }: ResizeHandleProps) {
  return (
    <div
      role="separator"
      aria-orientation="vertical"
      title="Drag to resize"
      onPointerDown={onPointerDown}
      className="group relative z-20 w-1.5 shrink-0 cursor-col-resize select-none"
    >
      <div
        className={`absolute inset-y-0 left-1/2 -translate-x-1/2 w-0.5 transition-colors ${
          active ? 'bg-[#2563EB]' : 'bg-transparent group-hover:bg-[#2563EB]/40'
        }`}
      />
    </div>
  );
}
