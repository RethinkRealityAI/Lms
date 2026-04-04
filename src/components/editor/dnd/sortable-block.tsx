'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';

interface SortableBlockProps {
  id: string;
  blockType: string;
  label: string;
  children: React.ReactNode;
}

export function SortableBlock({ id, blockType, label, children }: SortableBlockProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
    isOver,
    isSorting,
  } = useSortable({
    id,
    data: { source: 'canvas', blockType, label },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition ?? undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative group transition-all duration-150 ${
        isDragging
          ? 'opacity-20 scale-[0.97] z-0'
          : isOver && isSorting
            ? 'z-10'
            : ''
      }`}
    >
      {/* Blue insertion line — visible when something is being dragged over this block */}
      {isOver && !isDragging && (
        <div className="absolute -top-1.5 left-2 right-2 flex items-center z-20 pointer-events-none">
          <div className="w-2.5 h-2.5 rounded-full bg-blue-500 border-2 border-white shadow-sm shrink-0" />
          <div className="flex-1 h-0.5 bg-blue-500 rounded-full" />
          <div className="w-2.5 h-2.5 rounded-full bg-blue-500 border-2 border-white shadow-sm shrink-0" />
        </div>
      )}

      {/* Drag handle — shown on hover */}
      <button
        {...attributes}
        {...listeners}
        className="absolute -left-7 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100
          p-1 rounded hover:bg-gray-100 text-gray-300 hover:text-gray-500
          cursor-grab active:cursor-grabbing transition-all duration-150 z-10"
        title="Drag to reorder"
      >
        <GripVertical className="w-4 h-4" />
      </button>
      {children}
    </div>
  );
}
