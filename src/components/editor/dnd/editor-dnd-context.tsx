'use client';

import { useState, useCallback } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import { BlockDragOverlay } from './block-drag-overlay';

interface DragState {
  type: 'palette' | 'reorder';
  blockType?: string;
  blockId?: string;
  label?: string;
}

interface EditorDndContextProps {
  children: React.ReactNode;
  onAddBlock: (slideId: string, blockType: string) => void;
  onReorderBlocks: (slideId: string, blockIds: string[]) => void;
  getSlideBlocks: (slideId: string) => { id: string }[];
  activeSlideId: string | null;
}

export function EditorDndContext({
  children,
  onAddBlock,
  onReorderBlocks,
  getSlideBlocks,
  activeSlideId,
}: EditorDndContextProps) {
  const [dragState, setDragState] = useState<DragState | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;
    const data = active.data.current;

    if (data?.source === 'palette') {
      setDragState({
        type: 'palette',
        blockType: data.blockType as string,
        label: data.label as string,
      });
    } else if (data?.source === 'canvas') {
      setDragState({
        type: 'reorder',
        blockId: active.id as string,
        blockType: data.blockType as string,
        label: data.label as string,
      });
    }
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setDragState(null);

      if (!over || !activeSlideId) return;

      const activeData = active.data.current;

      // Palette → Canvas: add new block
      if (activeData?.source === 'palette') {
        const targetIsCanvas =
          over.id === 'slide-canvas' || over.data.current?.source === 'canvas';
        if (targetIsCanvas) {
          onAddBlock(activeSlideId, activeData.blockType as string);
        }
        return;
      }

      // Reorder: block moved within slide
      if (activeData?.source === 'canvas' && active.id !== over.id) {
        const blocks = getSlideBlocks(activeSlideId);
        const oldIndex = blocks.findIndex((b) => b.id === active.id);
        const newIndex = blocks.findIndex((b) => b.id === (over.id as string));
        if (oldIndex === -1 || newIndex === -1) return;

        const reordered = [...blocks];
        const [moved] = reordered.splice(oldIndex, 1);
        reordered.splice(newIndex, 0, moved);
        onReorderBlocks(activeSlideId, reordered.map((b) => b.id));
      }
    },
    [activeSlideId, onAddBlock, onReorderBlocks, getSlideBlocks],
  );

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      {children}
      <DragOverlay dropAnimation={{ duration: 200, easing: 'ease-out' }}>
        {dragState && (
          <BlockDragOverlay
            label={dragState.label ?? dragState.blockType ?? ''}
            isNew={dragState.type === 'palette'}
          />
        )}
      </DragOverlay>
    </DndContext>
  );
}
