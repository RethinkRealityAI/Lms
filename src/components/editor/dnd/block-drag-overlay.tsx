'use client';

import {
  Type,
  Image as ImageIcon,
  Video,
  Square,
  CheckSquare,
  HelpCircle,
  File as FileIcon,
  Code,
  GripVertical,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const BLOCK_ICONS: Record<string, { icon: LucideIcon; color: string }> = {
  'rich text': { icon: Type, color: 'text-blue-500 bg-blue-50' },
  'image gallery': { icon: ImageIcon, color: 'text-emerald-500 bg-emerald-50' },
  image: { icon: ImageIcon, color: 'text-emerald-500 bg-emerald-50' },
  video: { icon: Video, color: 'text-red-500 bg-red-50' },
  cta: { icon: Square, color: 'text-indigo-500 bg-indigo-50' },
  button: { icon: Square, color: 'text-indigo-500 bg-indigo-50' },
  'quiz inline': { icon: CheckSquare, color: 'text-orange-500 bg-orange-50' },
  quiz: { icon: CheckSquare, color: 'text-orange-500 bg-orange-50' },
  callout: { icon: HelpCircle, color: 'text-yellow-600 bg-yellow-50' },
  pdf: { icon: FileIcon, color: 'text-rose-500 bg-rose-50' },
  iframe: { icon: Code, color: 'text-purple-500 bg-purple-50' },
};

interface BlockDragOverlayProps {
  label: string;
  isNew?: boolean;
}

export function BlockDragOverlay({ label, isNew }: BlockDragOverlayProps) {
  const normalized = label.toLowerCase().replace(/_/g, ' ');
  const match = BLOCK_ICONS[normalized];
  const Icon = match?.icon ?? GripVertical;
  const colorClass = match?.color ?? 'text-gray-500 bg-gray-100';

  return (
    <div className="flex items-center gap-2.5 px-4 py-3 bg-white rounded-xl shadow-2xl border border-blue-200 ring-2 ring-blue-100 pointer-events-none min-w-[160px]">
      <div className={`p-2 rounded-lg ${colorClass}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex flex-col">
        <span className="text-sm font-semibold text-gray-800 capitalize">{normalized}</span>
        <span className="text-[10px] text-gray-400">
          {isNew ? 'Drop on canvas to add' : 'Drop to reorder'}
        </span>
      </div>
    </div>
  );
}
