# Editor UX Batch 1 & 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 10 editor/viewer UX improvements: undo count badges, save status refinement, keyboard shortcut hints, per-slide transitions, progress toasts, block type switching, multi-select with alignment, snap guidelines, slide thumbnails, and image aspect ratio controls.

**Architecture:** Each feature is independent — no cross-feature dependencies. Batch 1 (Tasks 1-5) focuses on polish to existing components. Batch 2 (Tasks 6-10) adds new editor capabilities requiring new files and store changes. All features modify existing patterns without new dependencies.

**Tech Stack:** React 19, Zustand, Tailwind CSS 4, @dnd-kit, react-grid-layout (existing), Tiptap (existing).

---

## File Structure

### New Files
| File | Responsibility |
|------|---------------|
| `src/components/student/shortcut-hint.tsx` | First-time keyboard shortcut overlay for student viewer |
| `src/lib/content/block-type-compat.ts` | Compatible type groups + data mapping functions for block type switching |
| `src/components/editor/multi-select-toolbar.tsx` | Floating toolbar for multi-select alignment/group operations |
| `src/components/editor/alignment-guides.tsx` | Snap-to-grid visual guideline overlay during drag/resize |
| `src/components/editor/slide-thumbnail.tsx` | Mini slide preview component for structure panel |

### Modified Files
| File | Changes |
|------|---------|
| `src/components/editor/editor-toolbar.tsx` | Undo count badge, save status pill refinement |
| `src/lib/stores/editor-store.ts` | `lastSaveError`, `selectedBlockIds`, `switchBlockType`, multi-select actions |
| `src/components/editor/course-editor-shell.tsx` | Save error tracking, `isSaving` set/unset around save |
| `src/components/student/course-viewer.tsx` | Shortcut hint, slide transitions with direction, progress toast |
| `src/app/globals.css` | Slide transition keyframes |
| `src/components/editor/theme-editor/slide-style-editor.tsx` | Transition dropdown |
| `src/components/editor/slide-preview.tsx` | Multi-select shift+click, alignment guides, group drag |
| `src/components/editor/preview-panel.tsx` | Multi-select toolbar rendering |
| `src/components/editor/slide-node.tsx` | Slide thumbnails |
| `src/components/editor/properties-panel.tsx` | Block type dropdown |
| `src/components/blocks/image-gallery/editor.tsx` | Aspect ratio + object-fit controls |
| `src/components/blocks/image-gallery/viewer.tsx` | Render aspect ratio + object-fit |

---

## Batch 1: Editor & Viewer Polish

### Task 1: Undo Count Badge + Save Status Refinement

**Files:**
- Modify: `src/components/editor/editor-toolbar.tsx`
- Modify: `src/lib/stores/editor-store.ts`
- Modify: `src/components/editor/course-editor-shell.tsx`

- [ ] **Step 1: Add `lastSaveError` to the editor store**

In `src/lib/stores/editor-store.ts`, add to the state interface:

```typescript
lastSaveError: string | null;
```

Add to initial state:

```typescript
lastSaveError: null,
```

Add to the `markSaved` action: `lastSaveError: null`

Add a new action:

```typescript
setSaveError: (error: string | null) => set({ lastSaveError: error }),
```

- [ ] **Step 2: Set save error state in course-editor-shell**

In `src/components/editor/course-editor-shell.tsx`, find the `handleSave` function. At the start, clear the error:

```typescript
store?.getState().setSaveError?.(null);
```

In the catch block of handleSave (where save failures are handled), set the error:

```typescript
store?.getState().setSaveError?.('Save failed — retrying...');
```

- [ ] **Step 3: Add undo count badge to toolbar**

In `src/components/editor/editor-toolbar.tsx`, update the undo button to show a count badge when `undoCount > 0`:

```tsx
<button
  onClick={undo}
  disabled={undoCount === 0}
  className="p-2 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors relative"
  title={`Undo (Ctrl+Z) — ${undoCount} action${undoCount !== 1 ? 's' : ''}`}
>
  <Undo2 className="w-4 h-4 text-gray-600" />
  {undoCount > 0 && (
    <span className="absolute -top-0.5 -right-0.5 min-w-[14px] h-[14px] flex items-center justify-center bg-[#1E3A5F] text-white text-[9px] font-bold rounded-full px-0.5">
      {undoCount}
    </span>
  )}
</button>
```

- [ ] **Step 4: Refine the save status indicator**

Replace the existing "Unsaved changes" pill in the toolbar with a more comprehensive status:

```tsx
{/* Save status indicator */}
{isSaving ? (
  <div className="flex items-center gap-1.5 bg-yellow-50 border border-yellow-200 text-yellow-600 text-[10px] font-semibold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
    <Loader2 className="w-2.5 h-2.5 animate-spin" />
    Saving
  </div>
) : lastSaveError ? (
  <div className="flex items-center gap-1.5 bg-red-50 border border-red-200 text-red-600 text-[10px] font-semibold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
    <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
    Save failed
  </div>
) : isDirty ? (
  <div className="flex items-center gap-1.5 bg-orange-50 border border-orange-200 text-orange-600 text-[10px] font-semibold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
    <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />
    Unsaved changes
  </div>
) : (
  <div className="flex items-center gap-1.5 bg-green-50 border border-green-200 text-green-600 text-[10px] font-semibold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
    <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
    Saved
  </div>
)}
```

Read `lastSaveError` from the store at the top:

```typescript
const lastSaveError = useEditorStore((s) => s.lastSaveError);
```

---

### Task 2: Keyboard Shortcut Hint Overlay

**Files:**
- Create: `src/components/student/shortcut-hint.tsx`
- Modify: `src/components/student/course-viewer.tsx`

- [ ] **Step 1: Create the shortcut hint component**

```tsx
'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

const STORAGE_KEY = 'gansid-shortcuts-dismissed';

export function ShortcutHint() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!localStorage.getItem(STORAGE_KEY)) {
      setShow(true);
    }
  }, []);

  if (!show) return null;

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, '1');
    setShow(false);
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50" onClick={dismiss}>
      <div
        className="bg-white rounded-xl shadow-2xl p-6 max-w-sm mx-4 space-y-4"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900">Keyboard Shortcuts</h3>
          <button onClick={dismiss} className="p-1 text-slate-400 hover:text-slate-600 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="space-y-2">
          {[
            { keys: '← →', desc: 'Navigate slides' },
            { keys: 'F', desc: 'Toggle fullscreen' },
            { keys: 'Esc', desc: 'Exit fullscreen' },
          ].map(({ keys, desc }) => (
            <div key={keys} className="flex items-center gap-3">
              <kbd className="px-2 py-0.5 text-xs font-mono bg-slate-100 border border-slate-200 rounded text-slate-700 min-w-[40px] text-center">
                {keys}
              </kbd>
              <span className="text-sm text-slate-600">{desc}</span>
            </div>
          ))}
        </div>
        <button
          onClick={dismiss}
          className="w-full py-2 text-sm font-medium text-white bg-[#1E3A5F] rounded-lg hover:bg-[#162d4a] transition-colors"
        >
          Got it
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Add ShortcutHint to CourseViewer**

In `src/components/student/course-viewer.tsx`, import and render `ShortcutHint` inside the viewer (after the LessonNavbar, before the header):

```tsx
import { ShortcutHint } from '@/components/student/shortcut-hint';

// In the render, after the LessonNavbar:
{!previewMode && <ShortcutHint />}
```

---

### Task 3: Per-Slide Transition System

**Files:**
- Modify: `src/app/globals.css`
- Modify: `src/components/student/course-viewer.tsx`
- Modify: `src/components/editor/theme-editor/slide-style-editor.tsx`

- [ ] **Step 1: Add transition keyframes to globals.css**

Add at the end of `src/app/globals.css`:

```css
/* Slide transition animations */
@keyframes crossfade {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideFromRight {
  from { opacity: 0; transform: translateX(30px); }
  to { opacity: 1; transform: translateX(0); }
}

@keyframes slideFromLeft {
  from { opacity: 0; transform: translateX(-30px); }
  to { opacity: 1; transform: translateX(0); }
}

@keyframes fadeUp {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}
```

- [ ] **Step 2: Add direction tracking and dynamic transitions to CourseViewer**

In `src/components/student/course-viewer.tsx`, add a ref to track navigation direction:

```typescript
const navDirection = useRef<'forward' | 'backward'>('forward');
```

Update `goNext` and `goPrev` to set direction:

```typescript
const goNext = useCallback(() => {
  if (nextBlocked) return;
  navDirection.current = 'forward';
  setCurrentSlide(i => Math.min(i + 1, totalSlides - 1));
}, [totalSlides, nextBlocked]);

const goPrev = useCallback(() => {
  navDirection.current = 'backward';
  setCurrentSlide(i => Math.max(i - 1, 0));
}, []);
```

Create a helper to resolve the animation:

```typescript
function getSlideAnimation(transition?: string, direction: 'forward' | 'backward' = 'forward'): string {
  switch (transition) {
    case 'slide-horizontal':
      return direction === 'forward'
        ? 'slideFromRight 0.3s ease-out'
        : 'slideFromLeft 0.3s ease-out';
    case 'fade-up':
      return 'fadeUp 0.2s ease-out';
    case 'crossfade':
    default:
      return 'crossfade 0.3s ease-out';
  }
}
```

Replace the existing `animation: 'slideIn 0.25s ease-out'` style on the slide content div with:

```tsx
style={{
  animation: getSlideAnimation(
    currentSlideData?.kind === 'page' ? (currentSlideData.settings?.transition as string) : undefined,
    navDirection.current,
  ),
}}
```

- [ ] **Step 3: Add transition dropdown to SlideStyleEditor**

In `src/components/editor/theme-editor/slide-style-editor.tsx`, add a transition selector section. After the background color section, add:

```tsx
{/* Transition */}
<div>
  <label className="block text-xs font-medium text-gray-700 mb-1.5">Slide Transition</label>
  <select
    value={(settings.transition as string) || 'crossfade'}
    onChange={e => updateSettings({ transition: e.target.value })}
    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent bg-white"
  >
    <option value="crossfade">Crossfade (default)</option>
    <option value="slide-horizontal">Horizontal Slide</option>
    <option value="fade-up">Fade Up</option>
  </select>
</div>
```

---

### Task 4: Progress Persistence Toast

**Files:**
- Modify: `src/components/student/course-viewer.tsx`

- [ ] **Step 1: Add a subtle toast after progress save**

In `handleMarkComplete`, after the progress upsert succeeds (after the `if (!previewMode)` block where `supabase.from('progress').upsert(...)` is called), add:

```typescript
toast.success('Progress saved', { duration: 2000, className: 'text-sm' });
```

This is a one-line change. The `toast` import from `sonner` already exists in the file.

---

### Task 5: Slide Transition Settings Data Flow

The `SlideSettings` type in `course-viewer.tsx` already uses `[key: string]: unknown`, so `settings.transition` is accessible without type changes. The `slides` table `settings` column is `jsonb` — no migration needed.

The student viewer needs to read `transition` from slide settings. The data is already fetched in `fetchData` where `slides.select('id, lesson_id, order_index, settings, ...')` includes `settings`. The `Slide` type in the viewer's `currentSlides` memo already carries `settings` through to `currentSlideData`.

No additional work needed — Task 3 covers this end-to-end.

---

## Batch 2: Editor Power Features

### Task 6: Block Type Quick-Switch

**Files:**
- Create: `src/lib/content/block-type-compat.ts`
- Modify: `src/lib/stores/editor-store.ts`
- Modify: `src/components/editor/block-editor-panel.tsx`

- [ ] **Step 1: Create block type compatibility module**

```typescript
// src/lib/content/block-type-compat.ts

/** Groups of block types that can switch between each other */
export const COMPATIBLE_GROUPS: string[][] = [
  ['rich_text', 'callout'],
  ['image_gallery', 'video'],
];

/** Get compatible types for a given block type (excludes self) */
export function getCompatibleTypes(blockType: string): string[] {
  for (const group of COMPATIBLE_GROUPS) {
    if (group.includes(blockType)) {
      return group.filter(t => t !== blockType);
    }
  }
  return [];
}

/** Transform block data when switching types */
export function transformBlockData(
  fromType: string,
  toType: string,
  data: Record<string, unknown>,
): Record<string, unknown> {
  // Text group: rich_text <-> callout
  if (fromType === 'rich_text' && toType === 'callout') {
    return { html: data.html ?? '', variant: 'info', title: 'Note' };
  }
  if (fromType === 'callout' && toType === 'rich_text') {
    return { html: data.html ?? '' };
  }

  // Media group: image_gallery <-> video
  if (fromType === 'image_gallery' && toType === 'video') {
    const images = (data.images as Array<{ url?: string }>) ?? [];
    return { url: images[0]?.url ?? '', caption: '' };
  }
  if (fromType === 'video' && toType === 'image_gallery') {
    const url = (data.url as string) ?? '';
    return { images: url ? [{ url, alt: '', caption: '' }] : [], mode: 'gallery' };
  }

  return data;
}
```

- [ ] **Step 2: Add `switchBlockType` action to editor store**

In `src/lib/stores/editor-store.ts`, add to the interface:

```typescript
switchBlockType: (slideId: string, blockId: string, newType: string, newData: Record<string, unknown>) => void;
```

Add the implementation (similar to `updateBlock`):

```typescript
switchBlockType: (slideId, blockId, newType, newData) => {
  const snap = snapshot(get());
  set((s) => {
    const existing = s.blocks.get(slideId) ?? [];
    const next = new Map(s.blocks);
    next.set(
      slideId,
      existing.map((b) => b.id === blockId ? { ...b, block_type: newType, data: newData } : b),
    );
    return { blocks: next, ...push(s, snap, 'switchBlockType', blockId) };
  });
},
```

- [ ] **Step 3: Add type dropdown to block-editor-panel**

In `src/components/editor/block-editor-panel.tsx`, import the compat functions:

```typescript
import { getCompatibleTypes, transformBlockData } from '@/lib/content/block-type-compat';
```

Above the editor component render, add a type selector when compatible types exist:

```tsx
const compatibleTypes = getCompatibleTypes(block.block_type);

// In the render, above the EditorComponent:
{compatibleTypes.length > 0 && (
  <div className="px-4 py-2 border-b border-gray-100">
    <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Block Type</label>
    <select
      value={block.block_type}
      onChange={(e) => {
        const newType = e.target.value;
        const newData = transformBlockData(block.block_type, newType, block.data as Record<string, unknown>);
        // Find slideId for this block
        for (const [sid, blocks] of allBlocks) {
          if (blocks.some(b => b.id === block.id)) {
            switchBlockType(sid, block.id, newType, newData);
            break;
          }
        }
      }}
      className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A5F] bg-white capitalize"
    >
      <option value={block.block_type}>{block.block_type.replace('_', ' ')}</option>
      {compatibleTypes.map(t => (
        <option key={t} value={t}>{t.replace('_', ' ')}</option>
      ))}
    </select>
  </div>
)}
```

Read `switchBlockType` and the blocks map from the store in the component.

---

### Task 7: Multi-Select Blocks

**Files:**
- Modify: `src/lib/stores/editor-store.ts`
- Create: `src/components/editor/multi-select-toolbar.tsx`
- Modify: `src/components/editor/slide-preview.tsx`

- [ ] **Step 1: Add multi-select state and actions to editor store**

Add to the state interface:

```typescript
selectedBlockIds: Set<string>;
toggleBlockSelection: (blockId: string) => void;
clearBlockSelection: () => void;
deleteSelectedBlocks: (slideId: string) => void;
duplicateSelectedBlocks: (slideId: string) => void;
alignBlocks: (slideId: string, alignment: 'left' | 'right' | 'top' | 'bottom' | 'distribute-h' | 'distribute-v') => void;
```

Initial state:

```typescript
selectedBlockIds: new Set<string>(),
```

Implementations:

```typescript
toggleBlockSelection: (blockId) => {
  set((s) => {
    const next = new Set(s.selectedBlockIds);
    if (next.has(blockId)) { next.delete(blockId); } else { next.add(blockId); }
    return { selectedBlockIds: next };
  });
},

clearBlockSelection: () => set({ selectedBlockIds: new Set() }),

deleteSelectedBlocks: (slideId) => {
  const snap = snapshot(get());
  set((s) => {
    const existing = s.blocks.get(slideId) ?? [];
    const next = new Map(s.blocks);
    next.set(slideId, existing.filter(b => !s.selectedBlockIds.has(b.id)));
    return { blocks: next, selectedBlockIds: new Set(), ...push(s, snap, 'deleteSelectedBlocks', slideId) };
  });
},

duplicateSelectedBlocks: (slideId) => {
  const snap = snapshot(get());
  set((s) => {
    const existing = [...(s.blocks.get(slideId) ?? [])];
    const selected = existing.filter(b => s.selectedBlockIds.has(b.id));
    const clones = selected.map(b => ({
      ...b,
      id: crypto.randomUUID(),
      order_index: existing.length + selected.indexOf(b),
      data: JSON.parse(JSON.stringify(b.data)),
    }));
    const next = new Map(s.blocks);
    next.set(slideId, [...existing, ...clones]);
    const newIds = new Set(clones.map(c => c.id));
    return { blocks: next, selectedBlockIds: newIds, ...push(s, snap, 'duplicateSelectedBlocks', slideId) };
  });
},

alignBlocks: (slideId, alignment) => {
  const snap = snapshot(get());
  set((s) => {
    const existing = s.blocks.get(slideId) ?? [];
    const selected = existing.filter(b => s.selectedBlockIds.has(b.id));
    if (selected.length < 2) return {};

    const getGrid = (b: typeof selected[0]) => {
      const d = (b.data ?? {}) as Record<string, unknown>;
      return {
        gridX: (d.gridX as number) ?? 0,
        gridY: (d.gridY as number) ?? 0,
        gridW: (d.gridW as number) ?? 12,
        gridH: (d.gridH as number) ?? 2,
      };
    };

    const grids = selected.map(b => ({ id: b.id, ...getGrid(b) }));

    let updates: Record<string, { gridX?: number; gridY?: number }> = {};

    switch (alignment) {
      case 'left': {
        const minX = Math.min(...grids.map(g => g.gridX));
        grids.forEach(g => { updates[g.id] = { gridX: minX }; });
        break;
      }
      case 'right': {
        const maxRight = Math.max(...grids.map(g => g.gridX + g.gridW));
        grids.forEach(g => { updates[g.id] = { gridX: maxRight - g.gridW }; });
        break;
      }
      case 'top': {
        const minY = Math.min(...grids.map(g => g.gridY));
        grids.forEach(g => { updates[g.id] = { gridY: minY }; });
        break;
      }
      case 'bottom': {
        const maxBottom = Math.max(...grids.map(g => g.gridY + g.gridH));
        grids.forEach(g => { updates[g.id] = { gridY: maxBottom - g.gridH }; });
        break;
      }
      case 'distribute-h': {
        const sorted = [...grids].sort((a, b) => a.gridX - b.gridX);
        const first = sorted[0].gridX;
        const last = sorted[sorted.length - 1].gridX;
        const step = sorted.length > 1 ? (last - first) / (sorted.length - 1) : 0;
        sorted.forEach((g, i) => { updates[g.id] = { gridX: Math.round(first + step * i) }; });
        break;
      }
      case 'distribute-v': {
        const sorted = [...grids].sort((a, b) => a.gridY - b.gridY);
        const first = sorted[0].gridY;
        const last = sorted[sorted.length - 1].gridY;
        const step = sorted.length > 1 ? (last - first) / (sorted.length - 1) : 0;
        sorted.forEach((g, i) => { updates[g.id] = { gridY: Math.round(first + step * i) }; });
        break;
      }
    }

    const next = new Map(s.blocks);
    next.set(slideId, existing.map(b => {
      const u = updates[b.id];
      if (!u) return b;
      const d = { ...(b.data as Record<string, unknown>) };
      if (u.gridX !== undefined) d.gridX = u.gridX;
      if (u.gridY !== undefined) d.gridY = u.gridY;
      return { ...b, data: d };
    }));
    return { blocks: next, ...push(s, snap, 'alignBlocks', slideId) };
  });
},
```

- [ ] **Step 2: Create multi-select toolbar component**

```tsx
// src/components/editor/multi-select-toolbar.tsx
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
```

- [ ] **Step 3: Add shift+click multi-select to slide-preview**

In `src/components/editor/slide-preview.tsx`, read multi-select state from the store:

```typescript
const selectedBlockIds = useEditorStore((s) => s.selectedBlockIds);
const toggleBlockSelection = useEditorStore((s) => s.toggleBlockSelection);
const clearBlockSelection = useEditorStore((s) => s.clearBlockSelection);
const deleteSelectedBlocks = useEditorStore((s) => s.deleteSelectedBlocks);
const duplicateSelectedBlocks = useEditorStore((s) => s.duplicateSelectedBlocks);
const alignBlocks = useEditorStore((s) => s.alignBlocks);
```

Update the block click handler:

```tsx
onClick={(e) => {
  e.stopPropagation();
  if (e.shiftKey) {
    toggleBlockSelection(block.id);
  } else {
    clearBlockSelection();
    onSelectBlock(block.id);
  }
}}
```

Update the ring class to highlight all multi-selected blocks:

```tsx
className={`... ${
  selectedBlockId === block.id || selectedBlockIds.has(block.id)
    ? 'ring-2 ring-[#1E3A5F]'
    : 'ring-1 ring-slate-200 hover:ring-slate-300'
}`}
```

Render the `MultiSelectToolbar` when multiple blocks are selected:

```tsx
{selectedBlockIds.size > 1 && (
  <MultiSelectToolbar
    count={selectedBlockIds.size}
    onDeleteAll={() => deleteSelectedBlocks(slide.id)}
    onDuplicateAll={() => duplicateSelectedBlocks(slide.id)}
    onAlign={(alignment) => alignBlocks(slide.id, alignment)}
  />
)}
```

Import `MultiSelectToolbar` from `./multi-select-toolbar`.

---

### Task 8: Snap-to-Grid Alignment Guidelines

**Files:**
- Create: `src/components/editor/alignment-guides.tsx`
- Modify: `src/components/editor/slide-preview.tsx`

- [ ] **Step 1: Create alignment guides component**

```tsx
// src/components/editor/alignment-guides.tsx
'use client';

interface AlignmentGuidesProps {
  guides: Array<{ type: 'vertical' | 'horizontal'; position: number }>;
  canvasWidth: number;
  canvasHeight: number;
}

export function AlignmentGuides({ guides, canvasWidth, canvasHeight }: AlignmentGuidesProps) {
  if (guides.length === 0) return null;

  return (
    <div className="absolute inset-0 pointer-events-none z-20">
      {guides.map((guide, i) => (
        guide.type === 'vertical' ? (
          <div
            key={`v-${i}`}
            className="absolute top-0 bottom-0 border-l border-dashed border-blue-400"
            style={{ left: `${(guide.position / 12) * 100}%` }}
          />
        ) : (
          <div
            key={`h-${i}`}
            className="absolute left-0 right-0 border-t border-dashed border-blue-400"
            style={{ top: `${guide.position}px` }}
          />
        )
      ))}
    </div>
  );
}

/** Compute alignment guides for a dragging block against other blocks */
export function computeAlignmentGuides(
  draggingId: string,
  currentLayout: Array<{ i: string; x: number; y: number; w: number; h: number }>,
): Array<{ type: 'vertical' | 'horizontal'; position: number }> {
  const dragging = currentLayout.find(l => l.i === draggingId);
  if (!dragging) return [];

  const guides: Array<{ type: 'vertical' | 'horizontal'; position: number }> = [];
  const others = currentLayout.filter(l => l.i !== draggingId);

  for (const other of others) {
    // Vertical guides (column alignment)
    if (dragging.x === other.x) guides.push({ type: 'vertical', position: dragging.x });
    if (dragging.x + dragging.w === other.x + other.w) guides.push({ type: 'vertical', position: dragging.x + dragging.w });
    if (dragging.x === other.x + other.w) guides.push({ type: 'vertical', position: dragging.x });
    if (dragging.x + dragging.w === other.x) guides.push({ type: 'vertical', position: dragging.x + dragging.w });
  }

  // Deduplicate
  const seen = new Set<string>();
  return guides.filter(g => {
    const key = `${g.type}-${g.position}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
```

- [ ] **Step 2: Integrate alignment guides into slide-preview**

In `src/components/editor/slide-preview.tsx`, add state and callbacks for tracking drag:

```typescript
import { AlignmentGuides, computeAlignmentGuides } from './alignment-guides';

const [activeGuides, setActiveGuides] = useState<Array<{ type: 'vertical' | 'horizontal'; position: number }>>([]);
```

Add `onDrag` callback to the ReactGridLayout:

```tsx
onDrag={(_layout: any, _oldItem: any, newItem: any, _placeholder: any, _e: any, _element: any) => {
  const currentLayout = blocks.map((block, index) => {
    const grid = getBlockGridLayout((block.data ?? {}) as Record<string, unknown>);
    return { i: block.id, x: grid.gridX, y: grid.gridY === 0 && index > 0 ? index * 2 : grid.gridY, w: grid.gridW, h: grid.gridH };
  });
  // Override the dragging item with its current position
  const updated = currentLayout.map(l => l.i === newItem.i ? { ...l, x: newItem.x, y: newItem.y } : l);
  setActiveGuides(computeAlignmentGuides(newItem.i, updated));
}}
onDragStop={() => setActiveGuides([])}
onResizeStop={() => setActiveGuides([])}
```

Render the guides overlay inside the canvas container:

```tsx
<AlignmentGuides guides={activeGuides} canvasWidth={canvasSize.width} canvasHeight={canvasSize.height} />
```

---

### Task 9: Slide Thumbnails in Structure Panel

**Files:**
- Create: `src/components/editor/slide-thumbnail.tsx`
- Modify: `src/components/editor/slide-node.tsx`

- [ ] **Step 1: Create slide thumbnail component**

```tsx
// src/components/editor/slide-thumbnail.tsx
'use client';

import { Award, Layout, Layers } from 'lucide-react';
import { useEditorStore } from './editor-store-context';
import type { Slide } from '@/types';

interface SlideThumbnailProps {
  slide: Slide;
}

export function SlideThumbnail({ slide }: SlideThumbnailProps) {
  const blocks = useEditorStore((s) => s.blocks.get(slide.id) ?? []);
  const settings = (slide.settings ?? {}) as Record<string, unknown>;
  const bg = (settings.background as string) || '#FFFFFF';
  const bgStyle = bg === 'gradient'
    ? { background: 'linear-gradient(135deg, #1E3A5F 0%, #2563EB 100%)' }
    : bg.startsWith('#')
      ? { backgroundColor: bg }
      : { backgroundColor: '#FFFFFF' };

  // Title slide
  if (slide.slide_type === 'title') {
    return (
      <div className="w-12 h-8 rounded border border-gray-200 flex items-center justify-center shrink-0 overflow-hidden" style={bgStyle}>
        <span className="text-[6px] font-bold text-white truncate px-0.5">Title</span>
      </div>
    );
  }

  // Canvas slide
  if (slide.slide_type === 'canvas') {
    return (
      <div className="w-12 h-8 rounded border border-gray-200 flex items-center justify-center bg-gray-50 shrink-0">
        <Layers className="w-3 h-3 text-gray-400" />
      </div>
    );
  }

  // Content slide — show first block preview
  const firstBlock = blocks[0];
  if (!firstBlock) {
    return (
      <div className="w-12 h-8 rounded border border-gray-200 flex items-center justify-center bg-gray-50 shrink-0">
        <Layout className="w-3 h-3 text-gray-300" />
      </div>
    );
  }

  // Rich text: show text excerpt
  if (firstBlock.block_type === 'rich_text' || firstBlock.block_type === 'callout') {
    const html = (firstBlock.data as Record<string, unknown>)?.html as string ?? '';
    const text = html.replace(/<[^>]*>/g, '').trim().slice(0, 20);
    return (
      <div className="w-12 h-8 rounded border border-gray-200 flex items-center p-0.5 overflow-hidden shrink-0" style={bgStyle}>
        <span className="text-[5px] leading-tight text-gray-600 line-clamp-3">{text || '...'}</span>
      </div>
    );
  }

  // Image: show tiny image
  if (firstBlock.block_type === 'image_gallery') {
    const images = (firstBlock.data as Record<string, unknown>)?.images as Array<{ url?: string }> ?? [];
    const url = images[0]?.url;
    if (url) {
      return (
        <div className="w-12 h-8 rounded border border-gray-200 overflow-hidden shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt="" className="w-full h-full object-cover" />
        </div>
      );
    }
  }

  // Fallback
  return (
    <div className="w-12 h-8 rounded border border-gray-200 flex items-center justify-center bg-gray-50 shrink-0" style={bgStyle}>
      <Layout className="w-3 h-3 text-gray-400" />
    </div>
  );
}
```

- [ ] **Step 2: Integrate thumbnails into slide-node**

In `src/components/editor/slide-node.tsx`, import and render the thumbnail:

```typescript
import { SlideThumbnail } from './slide-thumbnail';
```

Replace the current slide item layout. Change the inner div from:

```tsx
<SlideTypeIcon type={slide.slide_type} className={`w-3 h-3 shrink-0 ...`} />
<span className="text-xs truncate flex-1 min-w-0">
  {slide.title || slide.slide_type}
</span>
```

To:

```tsx
<SlideThumbnail slide={slide} />
<span className="text-xs truncate flex-1 min-w-0">
  {slide.title || slide.slide_type}
</span>
```

Remove the `SlideTypeIcon` import if no longer used elsewhere. Increase the slide item height padding from `py-1.5` to `py-1` (the thumbnail provides the visual weight).

---

### Task 10: Image Aspect Ratio & Object Fit Controls

**Files:**
- Modify: `src/components/blocks/image-gallery/editor.tsx`
- Modify: `src/components/blocks/image-gallery/viewer.tsx`

- [ ] **Step 1: Add aspect ratio and object-fit controls to image editor**

In `src/components/blocks/image-gallery/editor.tsx`, inside the `ImageGalleryEditor` component, add controls after the Display Mode section:

```tsx
{/* Aspect Ratio */}
<div>
  <label className="block text-xs font-medium text-gray-700 mb-1">Aspect Ratio</label>
  <div className="flex gap-1.5 flex-wrap">
    {[
      { label: 'Original', value: 'original' },
      { label: '16:9', value: '16/9' },
      { label: '4:3', value: '4/3' },
      { label: '1:1', value: '1/1' },
    ].map((opt) => (
      <button
        key={opt.value}
        type="button"
        onClick={() => onChange({ ...data, aspectRatio: opt.value })}
        className={`px-2.5 py-1 text-xs rounded-lg border transition-colors ${
          (data.aspectRatio ?? 'original') === opt.value
            ? 'bg-[#1E3A5F] text-white border-[#1E3A5F]'
            : 'bg-white text-gray-600 border-gray-200 hover:border-[#1E3A5F]'
        }`}
      >
        {opt.label}
      </button>
    ))}
  </div>
</div>

{/* Object Fit */}
<div>
  <label className="block text-xs font-medium text-gray-700 mb-1">Image Fit</label>
  <div className="flex gap-1.5">
    {[
      { label: 'Cover', value: 'cover' },
      { label: 'Contain', value: 'contain' },
    ].map((opt) => (
      <button
        key={opt.value}
        type="button"
        onClick={() => onChange({ ...data, objectFit: opt.value })}
        className={`px-2.5 py-1 text-xs rounded-lg border transition-colors ${
          (data.objectFit ?? 'cover') === opt.value
            ? 'bg-[#1E3A5F] text-white border-[#1E3A5F]'
            : 'bg-white text-gray-600 border-gray-200 hover:border-[#1E3A5F]'
        }`}
      >
        {opt.label}
      </button>
    ))}
  </div>
</div>
```

Note: The `data` type (`ImageGalleryData`) may need extending. If the schema is strict, add `aspectRatio?: string` and `objectFit?: string` to the schema. If data is `Record<string, unknown>` or the schema uses `[key: string]: unknown`, no change needed.

- [ ] **Step 2: Render aspect ratio and object-fit in viewer**

In `src/components/blocks/image-gallery/viewer.tsx`, find where images are rendered with `object-cover`. Update to read and apply the data fields:

```typescript
const aspectRatio = (data.aspectRatio as string) ?? 'original';
const objectFit = (data.objectFit as string) ?? 'cover';

const aspectStyle = aspectRatio !== 'original' ? { aspectRatio: aspectRatio.replace('/', ' / ') } : {};
const fitClass = objectFit === 'contain' ? 'object-contain' : 'object-cover';
```

Apply to the `<img>` element:

```tsx
<img
  src={img.url}
  alt={img.alt ?? ''}
  className={`w-full h-full ${fitClass} ...`}
  style={aspectStyle}
  loading="lazy"
/>
```

Apply this to both slider mode and grid mode image renders.

---

### Task 11: Build & Test Verification

- [ ] **Step 1: Run the build**

```bash
cd "c:/Users/devel/OneDrive/Documents/RethinkReality/GANSID-LMS/Lms"
rm -rf .next && npx next build
```

Expected: Build succeeds.

- [ ] **Step 2: Run tests**

```bash
npx vitest run
```

Expected: All tests pass.

- [ ] **Step 3: Commit all changes**

```bash
git add -A
git commit -m "feat: editor UX batch 1+2 — undo badges, save status, transitions, shortcuts, block type switch, multi-select, snap guides, thumbnails, image controls"
```
