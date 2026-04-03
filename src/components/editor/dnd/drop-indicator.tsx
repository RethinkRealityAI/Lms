'use client';

import { useDroppable } from '@dnd-kit/core';

interface DropIndicatorProps {
  id: string;
  isOver?: boolean;
}

export function DropIndicator({ id, isOver }: DropIndicatorProps) {
  const { setNodeRef, isOver: isOverThis } = useDroppable({ id });
  const active = isOver || isOverThis;

  return (
    <div
      ref={setNodeRef}
      className={`h-1 rounded-full mx-4 transition-all duration-200 ${
        active ? 'bg-blue-400 h-1 my-1' : 'bg-transparent my-0'
      }`}
    />
  );
}
