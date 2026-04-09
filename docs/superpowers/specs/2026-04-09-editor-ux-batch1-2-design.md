# Editor UX Improvements — Batch 1 & 2 Design

**Date:** 2026-04-09
**Status:** Approved
**Scope:** 10 features across editor polish (Batch 1) and editor power features (Batch 2)

---

## Batch 1: Editor & Viewer Polish

### 1A. Undo/Redo Button Enhancement

**Current state:** Undo/Redo buttons already exist in `editor-toolbar.tsx` (lines 50-65). They work via keyboard shortcuts.

**Changes:**
- Add tooltips showing keyboard shortcut ("Undo (Ctrl+Z)", "Redo (Ctrl+Y)")
- Add a small count badge showing undo stack depth (e.g., "3" next to undo icon)
- Subtle pulse animation on the undo button when a new action is pushed

**Files:** `src/components/editor/editor-toolbar.tsx`

---

### 1B. Auto-Save Status Indicator

**Current state:** Auto-save hook (`use-auto-save.ts`) debounces saves on `isDirty`. Store tracks `isDirty` but no visible status.

**Add a status pill to the editor toolbar** (between title and action buttons):

| State | Visual |
|-------|--------|
| Saved | Green dot + "Saved" text |
| Saving... | Yellow dot + spinner + "Saving..." |
| Unsaved changes | Orange dot + "Unsaved changes" |
| Save failed | Red dot + "Save failed" |

**Implementation:**
- Add `isSaving: boolean` and `lastSaveError: string | null` to the editor store
- The `handleSave` function in `course-editor-shell.tsx` sets `isSaving = true` before save, `false` after, and captures errors
- Toolbar reads these + `isDirty` to determine which state to show

**Files:** `src/lib/stores/editor-store.ts`, `src/components/editor/editor-toolbar.tsx`, `src/components/editor/course-editor-shell.tsx`

---

### 1C. Keyboard Shortcut Hint Overlay (Student Viewer)

On first visit to the course viewer, show a dismissable overlay:
- Semi-transparent dark backdrop (`bg-black/50`)
- Centered card: "← → Navigate slides | F Fullscreen | Esc Exit"
- "Got it" button to dismiss
- Store dismissal in `localStorage('gansid-shortcuts-dismissed')` — shows only once

**Files:** `src/components/student/course-viewer.tsx` (inline component or extract to `src/components/student/shortcut-hint.tsx`)

---

### 1D. Slide Transition System

**Per-slide setting** stored in `slide.settings.transition`:
- `'crossfade'` (default) — opacity crossfade, 300ms
- `'slide-horizontal'` — exit left / enter right (reverses for prev), 300ms
- `'fade-up'` — current behavior refined to 200ms

**Editor UI:** "Transition" dropdown in slide properties panel (alongside existing background settings in `SlideStyleEditor`).

**Viewer implementation:**
- Track navigation direction in state (`forward` / `backward`) based on whether slide index increased or decreased
- Replace static `slideIn` keyframe with dynamic CSS class:
  - Crossfade: `@keyframes crossfade { from { opacity: 0 } to { opacity: 1 } }`
  - Slide horizontal (forward): `@keyframes slideLeft { from { opacity: 0; transform: translateX(30px) } to { opacity: 1; transform: translateX(0) } }`
  - Slide horizontal (backward): `@keyframes slideRight { from { opacity: 0; transform: translateX(-30px) } to { opacity: 1; transform: translateX(0) } }`
  - Fade up: `@keyframes fadeUp { from { opacity: 0; transform: translateY(4px) } to { opacity: 1; transform: translateY(0) } }`
- Key the animation container on `${slideId}-${currentSlide}` to retrigger

**Files:** `src/components/student/course-viewer.tsx`, `src/components/editor/theme-editor/slide-style-editor.tsx` (or wherever slide settings UI lives), `src/app/globals.css`

---

### 1E. Progress Persistence Indicator (Student Viewer)

After auto-mark-complete fires successfully:
- Call `toast.success('Progress saved', { duration: 2000 })` with a subtle style
- Already uses `sonner` toast library

This is minimal — the completion toast already exists for course completion. Add a per-lesson "Progress saved" toast after the progress upsert succeeds (inside `handleMarkComplete`).

**Files:** `src/components/student/course-viewer.tsx`

---

## Batch 2: Editor Power Features

### 2A. Block Type Quick-Switch

**Compatible type groups:**

| Group | Types | Shared field |
|-------|-------|-------------|
| Text | `rich_text` ↔ `callout` | `data.html` |
| Media | `image_gallery` ↔ `video` | URL-based content |
| Standalone | `cta`, `quiz_inline`, `pdf`, `iframe`, `h5p` | No switching |

**UI:** Properties panel header shows current block type as a dropdown. Only compatible types in the dropdown.

**Data mapping:**
- `rich_text → callout`: keep `html`, add `{ variant: 'info', title: 'Note' }`
- `callout → rich_text`: keep `html`, drop `variant`/`title`
- `image_gallery → video`: map first image URL to `url`, drop gallery metadata
- `video → image_gallery`: map `url` to `{ images: [{ url }] }`

**Implementation:**
- Define `COMPATIBLE_TYPES` map in a shared constants file
- Add `switchBlockType(slideId, blockId, newType)` action to editor store
- Properties panel renders a `<select>` for the type when a block is selected, filtered to compatible types
- On change: transforms data, updates `block_type` and `data`, marks dirty

**Files:** `src/lib/content/block-type-compat.ts` (new), `src/lib/stores/editor-store.ts`, `src/components/editor/properties-panel.tsx` or `block-editor-panel.tsx`

---

### 2B. Multi-Select Blocks

**Selection model:**
- Add `selectedBlockIds: Set<string>` to editor store
- Single click = single select (clears multi-select)
- Shift+click = toggle block in/out of multi-select set
- `selectedBlockIds.size > 1` triggers multi-select mode

**Multi-select floating toolbar** (above canvas when active):

| Action | Behavior |
|--------|----------|
| Delete all | Remove all selected blocks |
| Duplicate all | Clone all selected in place |
| Align left | Set all `gridX` to `min(gridX)` of selection |
| Align right | Set all `gridX` so `gridX + gridW = max(gridX + gridW)` |
| Align top | Set all `gridY` to `min(gridY)` of selection |
| Align bottom | Set all `gridY` so `gridY + gridH = max(gridY + gridH)` |
| Distribute H | Evenly space between leftmost and rightmost |
| Distribute V | Evenly space between topmost and bottommost |

**Group drag:** When dragging a multi-selected block, all selected blocks move together (maintain relative offsets). This requires intercepting react-grid-layout's drag events and applying delta to all selected items.

**Visual feedback:** All selected blocks get a `ring-2 ring-[#1E3A5F]` highlight (same as single select but applied to all).

**Files:** `src/lib/stores/editor-store.ts`, `src/components/editor/slide-preview.tsx`, `src/components/editor/multi-select-toolbar.tsx` (new), `src/components/editor/preview-panel.tsx`

---

### 2C. Snap-to-Grid Alignment Guidelines

**Visual guidelines** shown when dragging/resizing a block:
- Blue dashed lines appear when the block's edge aligns with another block's edge
- Lines span the full canvas width/height
- Alignments detected: left-to-left, right-to-right, top-to-top, bottom-to-bottom, center-to-center (both axes)

**Implementation:**
- On react-grid-layout's `onDrag`/`onResize` callback, compute the dragged block's current grid position
- Compare each edge against all other blocks' edges
- When a match is detected, render an absolutely-positioned `<div>` with `border: 1px dashed #3B82F6` across the canvas
- Lines disappear on drag/resize end

**Snap threshold:** Exact grid column/row match only (the grid already quantizes positions). Guidelines are visual indicators, not magnetic snaps.

**Files:** `src/components/editor/slide-preview.tsx` (overlay layer), `src/components/editor/alignment-guides.tsx` (new)

---

### 2D. Slide Thumbnails in Structure Panel

Replace text-only slide items with mini thumbnail previews (48px tall):

| Slide type | Thumbnail content |
|-----------|-------------------|
| Title | Mini gradient/color from settings, lesson title text |
| Content | First 30 chars of first rich_text block, or tiny image from first image block |
| Canvas | Canvas icon placeholder |
| Completion | Award icon |

**Implementation:** Static representation, NOT rendered React components at thumbnail scale:
- Read the first block's data from the store
- For `rich_text`: strip HTML, take first 30 chars
- For `image_gallery`: render tiny `<img>` of first image URL, 48x64px, `object-cover`
- For other types: block type icon
- Apply slide's background color/gradient to the thumbnail container

**Layout:** Each slide item is now `48px` tall instead of ~28px. The slide type icon moves into the thumbnail. Title text overlays or appears beside the thumbnail.

**Files:** `src/components/editor/slide-node.tsx`, `src/components/editor/slide-thumbnail.tsx` (new)

---

### 2E. Image Resize in Editor

When an image block is selected, the properties panel shows:

**Aspect ratio presets:**
- Original (no constraint)
- 16:9
- 4:3
- 1:1
- Free (same as original)

**Object fit toggle:**
- Cover (fills area, may crop edges)
- Contain (shows full image, may letterbox)

**Storage:** `block.data.aspectRatio` (`'original' | '16:9' | '4:3' | '1:1'`) and `block.data.objectFit` (`'cover' | 'contain'`).

**Viewer rendering:** Apply `aspect-ratio` CSS property and `object-fit` to the image element. Falls back to current behavior (`object-cover`, no aspect ratio constraint) for blocks without these fields.

**Files:** `src/components/blocks/image-gallery/viewer.tsx`, `src/components/blocks/image-gallery/editor.tsx` (properties panel editor for image blocks)

---

## New Files Summary

| File | Purpose |
|------|---------|
| `src/lib/content/block-type-compat.ts` | Compatible type groups + data mapping functions |
| `src/components/editor/multi-select-toolbar.tsx` | Floating toolbar for multi-select operations |
| `src/components/editor/alignment-guides.tsx` | Snap-to-grid visual guideline overlay |
| `src/components/editor/slide-thumbnail.tsx` | Mini slide preview for structure panel |
| `src/components/student/shortcut-hint.tsx` | First-time keyboard shortcut overlay |

## Modified Files Summary

| File | Changes |
|------|---------|
| `src/components/editor/editor-toolbar.tsx` | Undo/redo tooltips + count badge, save status pill |
| `src/lib/stores/editor-store.ts` | `isSaving`, `lastSaveError`, `selectedBlockIds`, `switchBlockType`, multi-select actions |
| `src/components/editor/course-editor-shell.tsx` | Save state management (`isSaving` flag) |
| `src/components/student/course-viewer.tsx` | Shortcut hint, slide transitions, progress toast |
| `src/components/editor/slide-preview.tsx` | Multi-select (shift+click), alignment guides overlay, group drag |
| `src/components/editor/preview-panel.tsx` | Multi-select toolbar rendering |
| `src/components/editor/slide-node.tsx` | Slide thumbnails replacing text-only items |
| `src/components/editor/properties-panel.tsx` | Block type dropdown, image aspect ratio/fit controls |
| `src/components/blocks/image-gallery/viewer.tsx` | Aspect ratio + object-fit rendering |
| `src/components/editor/theme-editor/slide-style-editor.tsx` | Transition dropdown per slide |
| `src/app/globals.css` | Slide transition keyframes |
