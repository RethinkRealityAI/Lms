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
  } = useSortable({
    id,
    data: { source: 'canvas', blockType, label },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative group ${isDragging ? 'opacity-30 scale-[0.98]' : ''}`}
    >
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
