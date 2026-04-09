'use client';

import { useRef, useCallback } from 'react';
import { useDraggable } from '@dnd-kit/core';
import type { LucideIcon } from 'lucide-react';

interface DraggableBlockItemProps {
  type: string;
  label: string;
  icon: LucideIcon;
  color: string;
  onClick: () => void;
  disabled?: boolean;
}

export function DraggableBlockItem({
  type,
  label,
  icon: Icon,
  color,
  onClick,
  disabled,
}: DraggableBlockItemProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `palette-${type}`,
    data: { source: 'palette', blockType: type, label },
    disabled,
  });

  // Track pointer to distinguish clicks from drags.
  // dnd-kit's PointerSensor captures the pointer on pointerdown, which can
  // swallow the native click event. We detect "click" ourselves: if the
  // pointer hasn't moved more than 5 px between down and up, treat it as a click.
  const pointerStart = useRef<{ x: number; y: number } | null>(null);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      pointerStart.current = { x: e.clientX, y: e.clientY };
      // Forward to dnd-kit so dragging still works
      listeners?.onPointerDown?.(e as any);
    },
    [listeners],
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!pointerStart.current) return;
      const dx = e.clientX - pointerStart.current.x;
      const dy = e.clientY - pointerStart.current.y;
      pointerStart.current = null;
      // If the pointer barely moved, treat as a click
      if (Math.abs(dx) < 5 && Math.abs(dy) < 5 && !disabled) {
        onClick();
      }
    },
    [onClick, disabled],
  );

  return (
    <button
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      disabled={disabled}
      className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border border-gray-100 bg-white
        shadow-sm hover:shadow-md hover:border-gray-200 hover:-translate-y-0.5
        active:scale-95 transition-all duration-150 group select-none
        ${isDragging ? 'opacity-30 scale-90 ring-2 ring-blue-300 ring-offset-1 border-blue-200' : ''}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-grab active:cursor-grabbing'}`}
      title={`Click or drag to add ${label}`}
    >
      <div className={`p-2.5 rounded-lg ${color} group-hover:scale-110 transition-transform duration-150`}>
        <Icon className="w-5 h-5" />
      </div>
      <span className="text-[11px] font-medium text-gray-600 leading-tight">{label}</span>
    </button>
  );
}
