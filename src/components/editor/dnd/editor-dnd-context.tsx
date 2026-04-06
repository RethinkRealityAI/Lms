'use client';

import { useState, useCallback } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  pointerWithin,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
  type CollisionDetection,
} from '@dnd-kit/core';
import { BlockDragOverlay } from './block-drag-overlay';

interface DragState {
  type: 'palette' | 'reorder';
  blockType?: string;
  blockId?: string;
  label?: string;
}

export interface DropTarget {
  /** The id of the droppable/sortable being hovered */
  overId: string | null;
  /** Whether hovering over the canvas drop zone itself */
  overCanvas: boolean;
}

interface EditorDndContextProps {
  children: React.ReactNode;
  onAddBlock: (slideId: string, blockType: string, insertIndex?: number) => void;
  onReorderBlocks: (slideId: string, blockIds: string[]) => void;
  getSlideBlocks: (slideId: string) => { id: string }[];
  activeSlideId: string | null;
}

// Use pointerWithin for palette drops (large zone), closestCenter for reorder precision
const collisionDetection: CollisionDetection = (args) => {
  // If dragging from palette, use pointerWithin (easier to hit the canvas)
  const pointerCollisions = pointerWithin(args);
  if (pointerCollisions.length > 0) return pointerCollisions;
  // Fallback to closestCenter for reorder scenarios
  return closestCenter(args);
};

export function EditorDndContext({
  children,
  onAddBlock,
  onReorderBlocks,
  getSlideBlocks,
  activeSlideId,
}: EditorDndContextProps) {
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [dropTarget, setDropTarget] = useState<DropTarget>({ overId: null, overCanvas: false });

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

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { over } = event;
    if (!over) {
      setDropTarget({ overId: null, overCanvas: false });
      return;
    }
    setDropTarget({
      overId: over.id as string,
      overCanvas: over.id === 'slide-canvas' || over.data.current?.source === 'canvas',
    });
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setDragState(null);
      setDropTarget({ overId: null, overCanvas: false });

      if (!over || !activeSlideId) return;

      const activeData = active.data.current;

      // Palette → Canvas: add new block at the drop position
      if (activeData?.source === 'palette') {
        const targetIsCanvas =
          over.id === 'slide-canvas' || over.data.current?.source === 'canvas';
        if (targetIsCanvas) {
          // If dropped over a specific block, insert at that block's position
          let insertIndex: number | undefined;
          if (over.id !== 'slide-canvas' && over.data.current?.source === 'canvas') {
            const blocks = getSlideBlocks(activeSlideId);
            const overIndex = blocks.findIndex((b) => b.id === over.id);
            if (overIndex !== -1) {
              insertIndex = overIndex;
            }
          }
          onAddBlock(activeSlideId, activeData.blockType as string, insertIndex);
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
      collisionDetection={collisionDetection}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
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
