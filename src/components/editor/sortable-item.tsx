'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';

interface SortableItemProps {
  id: string;
  children: React.ReactNode;
  className?: string;
}

export function SortableItem({ id, children, className = '' }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className={`flex items-center group ${className}`}>
      <button
        {...attributes}
        {...listeners}
        className="p-1 cursor-grab active:cursor-grabbing text-transparent group-hover:text-gray-300 hover:!text-gray-500 transition-colors shrink-0 touch-none"
        title="Drag to reorder"
        tabIndex={-1}
      >
        <GripVertical className="w-3 h-3" />
      </button>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}
