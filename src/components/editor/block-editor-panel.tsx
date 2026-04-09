'use client';

import { Suspense } from 'react';
import { Trash2 } from 'lucide-react';
import { getBlockType } from '@/lib/content/block-registry';
import { useEditorStore } from './editor-store-context';
import type { BlockData } from '@/lib/stores/editor-store';

interface BlockEditorPanelProps {
  blockId: string;
  onDelete?: () => void;
}

export function BlockEditorPanel({ blockId, onDelete }: BlockEditorPanelProps) {
  const blocks = useEditorStore((s) => s.blocks);
  const updateBlock = useEditorStore((s) => s.updateBlock);

  // Find the block across all slides
  let foundBlock: { slideId: string; block: BlockData } | null = null;
  for (const [slideId, slideBlocks] of blocks) {
    const block = slideBlocks.find((b) => b.id === blockId);
    if (block) {
      foundBlock = { slideId, block };
      break;
    }
  }

  if (!foundBlock) {
    return (
      <p className="text-sm text-gray-400 text-center py-4">Block not found</p>
    );
  }

  const { slideId, block } = foundBlock;
  const definition = getBlockType(block.block_type);

  if (!definition?.EditorComponent) {
    return (
      <div className="rounded-lg border border-gray-200 p-3 text-center">
        <p className="text-xs text-gray-500">No editor available</p>
        <p className="text-xs text-gray-400 mt-1">Block type: {block.block_type}</p>
      </div>
    );
  }

  const EditorComponent = definition.EditorComponent;

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex-1">
          {definition.label}
        </span>
        <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
          {definition.category}
        </span>
        {onDelete && (
          <button
            type="button"
            onClick={onDelete}
            title="Delete block"
            className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      <Suspense
        key={block.id}
        fallback={
          <div className="animate-pulse bg-gray-100 rounded-lg h-32" />
        }
      >
        <EditorComponent
          data={block.data}
          block={{ id: block.id, title: '' }}
          onChange={(newData) => {
            updateBlock(slideId, blockId, { data: newData as Record<string, unknown> });
          }}
        />
      </Suspense>
    </div>
  );
}
