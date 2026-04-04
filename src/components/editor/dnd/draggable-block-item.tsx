'use client';

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

  return (
    <button
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={onClick}
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
