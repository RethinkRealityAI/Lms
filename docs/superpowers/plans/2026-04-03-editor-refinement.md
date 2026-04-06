# Lesson Builder Editor Refinement — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Elevate the lesson builder editor to a modern, premium experience with proper drag-and-drop for blocks, sortable blocks within slides, polished block viewers (images, video), and refined visual design across all three panels.

**Architecture:** Upgrade the existing @dnd-kit integration from slide-only sorting to a full block DnD system — blocks can be dragged from the components palette onto the preview canvas with visual drop indicators, and reordered within slides via drag handles. Refine block viewers (image gallery, video) with proper aspect ratios, loading states, and error handling. Polish all panels with subtle animations, better spacing, and a premium visual hierarchy.

**Tech Stack:** @dnd-kit/core + @dnd-kit/sortable (already installed), Framer Motion (already installed), Tailwind CSS 4, Lucide icons, Zustand

---

## File Structure

### New Files
- `src/components/editor/dnd/editor-dnd-context.tsx` — Top-level DndContext wrapper for the entire editor (blocks + slides)
- `src/components/editor/dnd/draggable-block-item.tsx` — Draggable wrapper for palette items with drag overlay
- `src/components/editor/dnd/sortable-block.tsx` — Sortable wrapper for blocks within a slide on the canvas
- `src/components/editor/dnd/block-drag-overlay.tsx` — Custom drag overlay shown while dragging blocks
- `src/components/editor/dnd/drop-indicator.tsx` — Visual insertion line indicator shown between blocks

### Modified Files
- `src/components/editor/preview-panel.tsx` — Replace HTML5 drag with @dnd-kit droppable zone, add sortable blocks
- `src/components/editor/properties-panel.tsx` — Replace HTML5 draggable with @dnd-kit Draggable, visual polish
- `src/components/editor/slide-preview.tsx` — Wrap blocks in SortableContext, add drop indicators, visual polish
- `src/components/editor/course-editor-shell.tsx` — Wrap EditorContent in EditorDndContext, add reorderBlocks handler
- `src/components/editor/editor-toolbar.tsx` — Visual polish (premium styling)
- `src/components/editor/structure-panel.tsx` — Visual polish
- `src/components/blocks/image-gallery/viewer.tsx` — Aspect ratio, loading states, error fallback, lazy loading
- `src/components/blocks/video/viewer.tsx` — Remove hardcoded maxHeight, add loading spinner, error fallback
- `src/lib/stores/editor-store.ts` — Add `reorderBlocks(slideId, blockIds)` action

---

## Task 1: Add `reorderBlocks` action to editor store

**Files:**
- Modify: `src/lib/stores/editor-store.ts`

- [ ] **Step 1: Add `reorderBlocks` to the EditorState interface**

In `src/lib/stores/editor-store.ts`, add to the `EditorState` interface after line 73 (`removeBlock`):

```typescript
reorderBlocks: (slideId: string, blockIds: string[]) => void;
```

- [ ] **Step 2: Implement `reorderBlocks` in the store**

Add the implementation after the `removeBlock` method (after line 317):

```typescript
reorderBlocks: (slideId, blockIds) => {
  const snap = snapshot(get());
  set((s) => {
    const existing = s.blocks.get(slideId) ?? [];
    const reordered = blockIds
      .map((id) => existing.find((b) => b.id === id))
      .filter(Boolean) as BlockData[];
    const next = new Map(s.blocks);
    next.set(
      slideId,
      reordered.map((b, i) => ({ ...b, order_index: i })),
    );
    return { blocks: next, ...push(s, snap, 'reorderBlocks', slideId) };
  });
},
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/stores/editor-store.ts
git commit -m "feat(editor): add reorderBlocks action to editor store"
```

---

## Task 2: Create DnD infrastructure components

**Files:**
- Create: `src/components/editor/dnd/editor-dnd-context.tsx`
- Create: `src/components/editor/dnd/draggable-block-item.tsx`
- Create: `src/components/editor/dnd/sortable-block.tsx`
- Create: `src/components/editor/dnd/block-drag-overlay.tsx`
- Create: `src/components/editor/dnd/drop-indicator.tsx`

- [ ] **Step 1: Create `editor-dnd-context.tsx`**

This is the top-level DnD context that wraps the entire editor. It handles two drag scenarios:
1. Dragging a new block from the palette → dropping on the canvas (add block)
2. Reordering existing blocks within a slide (sort blocks)

```tsx
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
  type DragOverEvent,
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
        const newIndex = blocks.findIndex((b) => b.id === over.id);
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
```

- [ ] **Step 2: Create `draggable-block-item.tsx`**

Used in the properties panel palette. Replaces HTML5 `draggable`.

```tsx
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
        ${isDragging ? 'opacity-40 scale-95' : ''}
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
```

- [ ] **Step 3: Create `sortable-block.tsx`**

Wraps each block on the canvas for reorder support.

```tsx
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
```

- [ ] **Step 4: Create `block-drag-overlay.tsx`**

The floating preview shown while dragging.

```tsx
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
```

- [ ] **Step 5: Create `drop-indicator.tsx`**

Visual insertion line shown between blocks when dragging.

```tsx
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
```

- [ ] **Step 6: Commit**

```bash
git add src/components/editor/dnd/
git commit -m "feat(editor): add DnD infrastructure — context, draggable palette, sortable blocks, drag overlay"
```

---

## Task 3: Integrate DnD context into editor shell and preview

**Files:**
- Modify: `src/components/editor/course-editor-shell.tsx`
- Modify: `src/components/editor/preview-panel.tsx`
- Modify: `src/components/editor/slide-preview.tsx`
- Modify: `src/components/editor/properties-panel.tsx`

- [ ] **Step 1: Wire EditorDndContext into course-editor-shell.tsx**

In `course-editor-shell.tsx`, import the new DnD context and wrap the three panels with it. Add `handleReorderBlocks` callback.

Add import at top:
```typescript
import { EditorDndContext } from './dnd/editor-dnd-context';
```

Add `reorderBlocks` to the store selectors (around line 46):
```typescript
const reorderBlocks = useEditorStore((s) => s.reorderBlocks);
```

Add the reorder handler after `handleAddBlock`:
```typescript
const handleReorderBlocks = useCallback((slideId: string, blockIds: string[]) => {
  reorderBlocks(slideId, blockIds);
}, [reorderBlocks]);

const getSlideBlocks = useCallback((slideId: string) => {
  const state = store?.getState();
  return state?.blocks.get(slideId) ?? [];
}, [store]);

// Compute the active slide ID for DnD context
const activeSlideId = (() => {
  if (!selectedEntity) return null;
  if (selectedEntity.type === 'slide') return selectedEntity.id;
  if (selectedEntity.type === 'block') {
    const state = store?.getState();
    if (!state) return null;
    for (const [slideId, blockList] of state.blocks) {
      if (blockList.some(b => b.id === selectedEntity.id)) return slideId;
    }
  }
  return null;
})();
```

Wrap the three panels inside the return JSX (replace lines 428-451):
```tsx
<EditorToolbar onSave={saveNow} courseId={courseId} />
<EditorDndContext
  onAddBlock={handleAddBlock}
  onReorderBlocks={handleReorderBlocks}
  getSlideBlocks={getSlideBlocks}
  activeSlideId={activeSlideId}
>
  <div className="flex flex-1 min-h-0">
    <StructurePanel
      collapsed={structureCollapsed}
      onToggleCollapse={() => setStructureCollapsed((c) => !c)}
      onAddModule={handleAddModule}
      onAddLesson={handleAddLesson}
      onDeleteLesson={handleRequestDeleteLesson}
      onDeleteModule={handleRequestDeleteModule}
      onAddSlide={handleAddSlide}
    />
    <PreviewPanel
      onAddBlock={handleAddBlock}
      onDeleteBlock={(blockId) => {
        selectEntity({ type: 'block', id: blockId });
        setDeleteDialogOpen(true);
      }}
    />
    <PropertiesPanel
      collapsed={propertiesCollapsed}
      onToggleCollapse={() => setPropertiesCollapsed((c) => !c)}
      onAddBlock={handleAddBlock}
      onDeleteBlock={handleDeleteKey}
    />
  </div>
</EditorDndContext>
<EditorStatusBar />
```

- [ ] **Step 2: Update slide-preview.tsx to use SortableContext for blocks**

Replace the blocks rendering section with sortable blocks:

Add imports:
```typescript
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { SortableBlock } from './dnd/sortable-block';
```

In the component body, add droppable for the canvas:
```typescript
const { setNodeRef: setDropRef, isOver } = useDroppable({ id: 'slide-canvas' });
```

Replace the blocks section (the `<div className="flex-1 p-6 space-y-4">` div) with:
```tsx
<div ref={setDropRef} className={`flex-1 p-6 pl-10 space-y-3 transition-colors duration-200 ${isOver ? 'bg-blue-50/40' : ''}`}>
  {blocks.length === 0 ? (
    <div className={`flex items-center justify-center h-40 border-2 border-dashed rounded-xl text-sm transition-all duration-200 ${
      isOver
        ? 'border-blue-400 bg-blue-50/60 text-blue-500'
        : 'border-gray-200 text-gray-400'
    }`}>
      <div className="text-center">
        <p className="font-medium">{isOver ? 'Drop to add block' : 'No blocks on this slide'}</p>
        <p className="text-xs mt-1 opacity-70">Drag components from the panel or click to add</p>
      </div>
    </div>
  ) : (
    <SortableContext items={blocks.map(b => b.id)} strategy={verticalListSortingStrategy}>
      {blocks.map((block) => (
        <SortableBlock
          key={block.id}
          id={block.id}
          blockType={block.block_type}
          label={block.block_type.replace('_', ' ')}
        >
          <div
            onClick={() => onSelectBlock(block.id)}
            className={`relative group/block cursor-pointer rounded-xl transition-all duration-150 ${
              selectedBlockId === block.id
                ? 'ring-2 ring-[#1E3A5F] ring-offset-2 shadow-sm'
                : 'hover:ring-2 hover:ring-blue-200 hover:ring-offset-1'
            }`}
          >
            {/* Block type label + delete */}
            <div
              className={`absolute -top-6 left-0 flex items-center gap-1.5 transition-all duration-150 z-10 ${
                selectedBlockId === block.id
                  ? 'opacity-100'
                  : 'opacity-0 group-hover/block:opacity-100'
              }`}
            >
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full tracking-wide uppercase ${
                selectedBlockId === block.id
                  ? 'bg-[#1E3A5F] text-white'
                  : 'bg-gray-600 text-white'
              }`}>
                {block.block_type.replace('_', ' ')}
              </span>
              {onDeleteBlock && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onDeleteBlock(block.id); }}
                  title="Delete block"
                  className="p-0.5 rounded-full bg-red-500 hover:bg-red-600 text-white transition-colors shadow-sm"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Block content */}
            <div className="pointer-events-none">
              <Suspense fallback={<div className="animate-pulse bg-gray-100 rounded-xl h-16" />}>
                <LessonBlockRenderer
                  block={{
                    id: block.id,
                    institution_id: '',
                    lesson_id: '',
                    block_type: block.block_type,
                    data: block.data,
                    order_index: block.order_index,
                    is_visible: block.is_visible,
                    settings: {},
                    version: 1,
                    title: undefined,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                  }}
                  lessonTitle=""
                />
              </Suspense>
            </div>
          </div>
        </SortableBlock>
      ))}
    </SortableContext>
  )}
</div>
```

- [ ] **Step 3: Update preview-panel.tsx to remove HTML5 drag handling**

Remove the `onDragOver` and `onDrop` handlers from the canvas wrapper div (lines 105-115). The DnD is now handled by @dnd-kit at the context level.

Replace the canvas div (starting at line 102):
```tsx
<div className="flex-1 flex items-start justify-center p-6 overflow-auto">
  <div
    className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden transition-all duration-300 flex flex-col"
    style={{ width: DEVICE_WIDTHS[device], maxWidth: '100%', minHeight: '500px' }}
  >
    {selectedSlide ? (
      <SlidePreview
        slide={selectedSlide}
        selectedBlockId={selectedBlockId}
        onSelectBlock={(blockId) => selectEntity({ type: 'block', id: blockId })}
        onDeleteBlock={onDeleteBlock}
      />
    ) : (
      <div className="flex-1 flex items-center justify-center text-gray-400 text-sm p-12">
        <div className="text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center mx-auto">
            <Monitor className="w-7 h-7 text-gray-200" />
          </div>
          <div>
            <p className="font-medium text-gray-500">No slide selected</p>
            <p className="text-xs text-gray-400 mt-1">Select a slide from the structure panel</p>
          </div>
        </div>
      </div>
    )}
  </div>
</div>
```

- [ ] **Step 4: Update properties-panel.tsx to use DraggableBlockItem**

Replace the HTML5 draggable buttons in the components tab.

Add import:
```typescript
import { DraggableBlockItem } from './dnd/draggable-block-item';
```

Replace the components tab grid (inside `renderContent`, the `activeTab === 'components'` branch):
```tsx
if (activeTab === 'components' && activeSlideId) {
  return (
    <div className="space-y-4">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Add Elements</p>
      <p className="text-[11px] text-gray-400">Click to add or drag onto the canvas</p>
      <div className="grid grid-cols-2 gap-2.5">
        {AVAILABLE_BLOCKS.map((block) => (
          <DraggableBlockItem
            key={block.type}
            type={block.type}
            label={block.label}
            icon={block.icon}
            color={block.color}
            onClick={() => onAddBlock?.(activeSlideId!, block.type)}
            disabled={!activeSlideId}
          />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add src/components/editor/course-editor-shell.tsx src/components/editor/preview-panel.tsx src/components/editor/slide-preview.tsx src/components/editor/properties-panel.tsx
git commit -m "feat(editor): integrate @dnd-kit for block drag-and-drop and reordering"
```

---

## Task 4: Fix image gallery viewer

**Files:**
- Modify: `src/components/blocks/image-gallery/viewer.tsx`

- [ ] **Step 1: Rewrite image gallery viewer with proper rendering**

Replace the entire file content:

```tsx
'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight, ImageOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { BlockViewerProps } from '@/lib/content/block-registry';
import type { ImageGalleryData } from '@/lib/content/blocks/image-gallery/schema';

function ImageWithFallback({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const [error, setError] = useState(false);
  const [loaded, setLoaded] = useState(false);

  if (error) {
    return (
      <div className={`bg-gray-100 flex items-center justify-center ${className}`}>
        <div className="text-center p-4">
          <ImageOff className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-xs text-gray-400">Image unavailable</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {!loaded && (
        <div className="absolute inset-0 bg-gray-100 animate-pulse rounded-lg" />
      )}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        onLoad={() => setLoaded(true)}
        onError={() => setError(true)}
        className={`w-full h-full object-cover transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
      />
    </div>
  );
}

export default function ImageGalleryViewer({ data }: BlockViewerProps<ImageGalleryData>) {
  const [current, setCurrent] = useState(0);
  const images = data.images ?? [];

  if (images.length === 0) {
    return (
      <div className="w-full aspect-video bg-gray-50 rounded-xl flex items-center justify-center border border-dashed border-gray-200">
        <div className="text-center">
          <ImageOff className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-400">No images added</p>
        </div>
      </div>
    );
  }

  if (data.mode === 'slider') {
    return (
      <div className="relative overflow-hidden rounded-xl">
        <ImageWithFallback
          src={images[current].url}
          alt={images[current].alt ?? ''}
          className="w-full aspect-video rounded-xl overflow-hidden"
        />
        {images[current].caption && (
          <p className="mt-2.5 text-sm text-gray-500 italic">{images[current].caption}</p>
        )}
        {images.length > 1 && (
          <div className="mt-3 flex items-center justify-center gap-3">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrent((c) => Math.max(0, c - 1))}
              disabled={current === 0}
              className="h-8 w-8 rounded-full"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-1.5">
              {images.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrent(i)}
                  className={`w-2 h-2 rounded-full transition-all duration-200 ${
                    i === current ? 'bg-gray-800 scale-125' : 'bg-gray-300 hover:bg-gray-400'
                  }`}
                />
              ))}
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrent((c) => Math.min(images.length - 1, c + 1))}
              disabled={current === images.length - 1}
              className="h-8 w-8 rounded-full"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    );
  }

  // Gallery grid mode
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {images.map((img, i) => (
        <div key={i} className="overflow-hidden rounded-xl">
          <ImageWithFallback
            src={img.url}
            alt={img.alt ?? ''}
            className="aspect-[4/3] rounded-xl overflow-hidden"
          />
          {img.caption && (
            <p className="mt-1.5 text-xs text-gray-500 px-0.5">{img.caption}</p>
          )}
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/blocks/image-gallery/viewer.tsx
git commit -m "fix(blocks): improve image gallery with aspect ratios, loading states, error fallback"
```

---

## Task 5: Fix video viewer

**Files:**
- Modify: `src/components/blocks/video/viewer.tsx`

- [ ] **Step 1: Rewrite video viewer with loading states and responsive sizing**

Replace the entire file content:

```tsx
'use client';

import { useState } from 'react';
import { Play, AlertCircle } from 'lucide-react';
import type { BlockViewerProps } from '@/lib/content/block-registry';

type EmbedResult =
  | { type: 'youtube' | 'vimeo'; embedUrl: string }
  | { type: 'video'; embedUrl: string };

function resolveEmbedUrl(url: string): EmbedResult {
  const ytMatch = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/,
  );
  if (ytMatch) {
    return { type: 'youtube', embedUrl: `https://www.youtube.com/embed/${ytMatch[1]}` };
  }
  const vimeoMatch = url.match(/vimeo\.com\/(?:[^/]+\/)*(\d+)/);
  if (vimeoMatch) {
    return { type: 'vimeo', embedUrl: `https://player.vimeo.com/video/${vimeoMatch[1]}` };
  }
  return { type: 'video', embedUrl: url };
}

export default function VideoViewer({
  data,
}: BlockViewerProps<{ url: string; poster?: string; caption?: string; autoplay?: boolean }>) {
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [videoError, setVideoError] = useState(false);

  if (!data.url) {
    return (
      <div className="w-full aspect-video bg-gray-50 rounded-xl flex items-center justify-center border border-dashed border-gray-200">
        <div className="text-center">
          <Play className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-400">No video URL provided</p>
        </div>
      </div>
    );
  }

  if (videoError) {
    return (
      <div className="w-full aspect-video bg-gray-50 rounded-xl flex items-center justify-center border border-gray-200">
        <div className="text-center">
          <AlertCircle className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-500">Failed to load video</p>
          <p className="text-xs text-gray-400 mt-1 max-w-xs truncate">{data.url}</p>
        </div>
      </div>
    );
  }

  const { type, embedUrl } = resolveEmbedUrl(data.url);

  return (
    <div className="space-y-2.5">
      {type === 'video' ? (
        <video
          src={embedUrl}
          poster={data.poster || undefined}
          controls
          autoPlay={data.autoplay}
          onError={() => setVideoError(true)}
          className="w-full aspect-video rounded-xl object-contain bg-black"
        >
          Your browser does not support the video tag.
        </video>
      ) : (
        <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-gray-900">
          {!iframeLoaded && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-900 z-10">
              <div className="text-center">
                <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-3" />
                <p className="text-xs text-white/50">Loading video...</p>
              </div>
            </div>
          )}
          <iframe
            src={`${embedUrl}${data.autoplay ? '?autoplay=1' : ''}`}
            className="absolute inset-0 w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            title="Video"
            onLoad={() => setIframeLoaded(true)}
            onError={() => setVideoError(true)}
          />
        </div>
      )}
      {data.caption && <p className="text-sm text-gray-500 italic">{data.caption}</p>}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/blocks/video/viewer.tsx
git commit -m "fix(blocks): improve video viewer with loading spinner, error fallback, responsive aspect-video"
```

---

## Task 6: Visual polish — premium editor UI

**Files:**
- Modify: `src/components/editor/editor-toolbar.tsx`
- Modify: `src/components/editor/preview-panel.tsx`
- Modify: `src/components/editor/structure-panel.tsx`
- Modify: `src/components/editor/properties-panel.tsx`

- [ ] **Step 1: Polish editor-toolbar.tsx**

Replace the toolbar's outer div (line 28) with:
```tsx
<div className="flex items-center justify-between px-4 py-2 bg-white/95 backdrop-blur-sm border-b border-gray-100 shrink-0 h-12">
```

Replace the "Course Editor" span (line 30) with:
```tsx
<span className="text-sm font-semibold text-gray-800 tracking-tight">Course Editor</span>
```

Replace the Draft badge (lines 32-35) with:
```tsx
{courseStatus === 'draft' && (
  <div className="bg-amber-50 border border-amber-200 text-amber-700 text-[10px] font-semibold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
    Draft
  </div>
)}
```

Replace the save button (lines 67-74) with:
```tsx
<button
  onClick={onSave}
  disabled={!isDirty || isSaving}
  className="flex items-center gap-1.5 px-3.5 py-1.5 text-sm font-medium text-white bg-[#1E3A5F] rounded-lg hover:bg-[#162d4a] disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150 shadow-sm hover:shadow"
>
  <Save className="w-3.5 h-3.5" />
  {isSaving ? 'Saving...' : 'Save'}
</button>
```

- [ ] **Step 2: Polish preview-panel.tsx**

Replace the preview toolbar (lines 81-99) with:
```tsx
<div className="flex items-center justify-between px-4 py-2.5 bg-white/95 backdrop-blur-sm border-b border-gray-100 shrink-0">
  <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Preview</span>
  <div className="flex items-center gap-1 bg-gray-50 rounded-lg p-0.5">
    {(['desktop', 'tablet', 'mobile'] as DeviceMode[]).map((d) => (
      <button
        key={d}
        onClick={() => setDevice(d)}
        title={d.charAt(0).toUpperCase() + d.slice(1)}
        className={`p-1.5 rounded-md transition-all duration-150 ${
          device === d
            ? 'bg-white text-gray-700 shadow-sm'
            : 'text-gray-400 hover:text-gray-500'
        }`}
      >
        {d === 'desktop' && <Monitor className="w-4 h-4" />}
        {d === 'tablet' && <Tablet className="w-4 h-4" />}
        {d === 'mobile' && <Smartphone className="w-4 h-4" />}
      </button>
    ))}
  </div>
</div>
```

Replace the bottom slide navigation (lines 136-157) with:
```tsx
<div className="flex items-center justify-center gap-4 py-2.5 bg-white/95 backdrop-blur-sm border-t border-gray-100 shrink-0">
  <button
    onClick={goToPrevSlide}
    disabled={slideIndex <= 0}
    className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 disabled:opacity-20 transition-all"
  >
    <ChevronLeft className="w-4 h-4" />
  </button>
  <span className="text-xs font-medium text-gray-500 min-w-[100px] text-center tabular-nums">
    {selectedSlide
      ? `Slide ${slideIndex + 1} of ${siblingSlides.length}`
      : 'No slide selected'
    }
  </span>
  <button
    onClick={goToNextSlide}
    disabled={slideIndex < 0 || slideIndex >= siblingSlides.length - 1}
    className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 disabled:opacity-20 transition-all"
  >
    <ChevronRight className="w-4 h-4" />
  </button>
</div>
```

Replace the background color of the preview area (line 79):
```tsx
<div className="flex-1 flex flex-col min-w-0 bg-gray-50">
```

- [ ] **Step 3: Polish structure-panel.tsx**

Replace the panel header (lines 34-58) with:
```tsx
<div className={`flex items-center px-3 py-2.5 border-b border-gray-100 shrink-0 ${collapsed ? 'justify-center' : 'justify-between'}`}>
  {!collapsed && (
    <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest overflow-hidden whitespace-nowrap">
      Structure
    </span>
  )}
  <div className="flex items-center gap-0.5">
    {!collapsed && (
      <button
        onClick={() => setShowAddModule(true)}
        className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-all"
        title="Add Module"
      >
        <Plus className="w-3.5 h-3.5" />
      </button>
    )}
    <button
      onClick={onToggleCollapse}
      className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-all"
      title={collapsed ? 'Expand Structure' : 'Collapse Structure'}
    >
      {collapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
    </button>
  </div>
</div>
```

- [ ] **Step 4: Polish properties-panel.tsx**

Update the panel's outer div class (line 355):
```tsx
<div className={`shrink-0 bg-white border-l border-gray-100 flex flex-col overflow-hidden transition-all duration-300 ${collapsed ? 'w-12' : 'w-[300px]'}`}>
```

Update the tab buttons styling (lines 373-385) to use the segment control look:
```tsx
{!collapsed && showTabs && (
  <div className="flex items-center mx-3 mb-1 p-0.5 bg-gray-50 rounded-lg gap-0.5">
    <button
      onClick={() => setActiveTab('properties')}
      className={`flex-1 text-xs font-medium py-1.5 rounded-md transition-all duration-150 ${
        activeTab === 'properties'
          ? 'bg-white text-gray-800 shadow-sm'
          : 'text-gray-400 hover:text-gray-600'
      }`}
    >
      Content
    </button>
    <button
      onClick={() => setActiveTab('components')}
      className={`flex-1 text-xs font-medium py-1.5 rounded-md transition-all duration-150 ${
        activeTab === 'components'
          ? 'bg-white text-gray-800 shadow-sm'
          : 'text-gray-400 hover:text-gray-600'
      }`}
    >
      Components
    </button>
  </div>
)}
```

Update the "Properties" heading (line 366-368):
```tsx
<span className="text-xs font-semibold text-gray-400 uppercase tracking-widest flex-1 overflow-hidden whitespace-nowrap">
  Properties
</span>
```

- [ ] **Step 5: Commit**

```bash
git add src/components/editor/editor-toolbar.tsx src/components/editor/preview-panel.tsx src/components/editor/structure-panel.tsx src/components/editor/properties-panel.tsx
git commit -m "feat(editor): premium visual polish — backdrop blur, segment controls, refined spacing"
```

---

## Task 7: Verify build and test

- [ ] **Step 1: Run TypeScript check**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 2: Run dev build**

```bash
npm run build
```

Expected: Build succeeds.

- [ ] **Step 3: Run existing tests**

```bash
npm run test
```

Expected: All tests pass (existing tests should not be affected).

- [ ] **Step 4: Fix any issues found**

If there are type errors or build failures, fix them.

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "chore: fix any build/type issues from editor refinement"
```

---

## Summary of Changes

| Area | Before | After |
|------|--------|-------|
| Block DnD (palette → canvas) | HTML5 dataTransfer | @dnd-kit with visual drag overlay |
| Block reordering in slides | Not possible | @dnd-kit sortable with drag handles |
| Image gallery | No aspect ratio, no loading/error | aspect-video, lazy loading, error fallback, dot indicators |
| Video viewer | Hardcoded maxHeight: 500px, no loading | aspect-video responsive, loading spinner, error state |
| Toolbar | Flat white | Backdrop blur, refined badge/buttons |
| Device toggle | Plain buttons | Segmented control with active shadow |
| Slide nav | Basic chevrons | Polished tabular-nums, rounded buttons |
| Panels | border-gray-200 | border-gray-100, tracking-widest headers |
| Tab switcher | bg-gray-100 active | Segment control (bg-white shadow active) |
| Empty states | Minimal | Icons, descriptive subtext, dashed borders |
