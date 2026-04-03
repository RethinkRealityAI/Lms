'use client';

import { Package } from 'lucide-react';

interface BlockDragOverlayProps {
  label: string;
  isNew?: boolean;
}

export function BlockDragOverlay({ label, isNew }: BlockDragOverlayProps) {
  return (
    <div className="flex items-center gap-2 px-4 py-2.5 bg-white rounded-xl shadow-2xl border border-gray-200 pointer-events-none">
      <div className={`p-1.5 rounded-lg ${isNew ? 'bg-blue-50 text-blue-500' : 'bg-gray-100 text-gray-500'}`}>
        <Package className="w-4 h-4" />
      </div>
      <span className="text-sm font-medium text-gray-700 capitalize">{label}</span>
      {isNew && (
        <span className="text-[10px] font-medium text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded-full">
          New
        </span>
      )}
    </div>
  );
}
