'use client';

import {
  Trash2, CopyPlus, AlignStartVertical, AlignEndVertical,
  AlignStartHorizontal, AlignEndHorizontal, AlignHorizontalSpaceAround,
  AlignVerticalSpaceAround,
} from 'lucide-react';

interface MultiSelectToolbarProps {
  count: number;
  onDeleteAll: () => void;
  onDuplicateAll: () => void;
  onAlign: (alignment: 'left' | 'right' | 'top' | 'bottom' | 'distribute-h' | 'distribute-v') => void;
}

function ToolbarBtn({ onClick, title, children }: { onClick: () => void; title: string; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="p-1.5 rounded hover:bg-white/20 text-white/80 hover:text-white transition-colors"
    >
      {children}
    </button>
  );
}

export function MultiSelectToolbar({ count, onDeleteAll, onDuplicateAll, onAlign }: MultiSelectToolbarProps) {
  return (
    <div className="absolute top-2 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1 bg-[#1E3A5F] rounded-lg px-2 py-1 shadow-lg">
      <span className="text-[10px] font-bold text-white/70 px-1">{count} selected</span>
      <div className="w-px h-4 bg-white/20" />
      <ToolbarBtn onClick={onDuplicateAll} title="Duplicate all"><CopyPlus className="w-3.5 h-3.5" /></ToolbarBtn>
      <ToolbarBtn onClick={onDeleteAll} title="Delete all"><Trash2 className="w-3.5 h-3.5" /></ToolbarBtn>
      <div className="w-px h-4 bg-white/20" />
      <ToolbarBtn onClick={() => onAlign('left')} title="Align left"><AlignStartVertical className="w-3.5 h-3.5" /></ToolbarBtn>
      <ToolbarBtn onClick={() => onAlign('right')} title="Align right"><AlignEndVertical className="w-3.5 h-3.5" /></ToolbarBtn>
      <ToolbarBtn onClick={() => onAlign('top')} title="Align top"><AlignStartHorizontal className="w-3.5 h-3.5" /></ToolbarBtn>
      <ToolbarBtn onClick={() => onAlign('bottom')} title="Align bottom"><AlignEndHorizontal className="w-3.5 h-3.5" /></ToolbarBtn>
      <div className="w-px h-4 bg-white/20" />
      <ToolbarBtn onClick={() => onAlign('distribute-h')} title="Distribute horizontally"><AlignHorizontalSpaceAround className="w-3.5 h-3.5" /></ToolbarBtn>
      <ToolbarBtn onClick={() => onAlign('distribute-v')} title="Distribute vertically"><AlignVerticalSpaceAround className="w-3.5 h-3.5" /></ToolbarBtn>
    </div>
  );
}
