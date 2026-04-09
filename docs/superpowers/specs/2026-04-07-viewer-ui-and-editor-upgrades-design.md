# Viewer UI & Editor Upgrades Design

**Date:** 2026-04-07
**Status:** Approved
**Scope:** Two-phase overhaul — student viewer viewport optimization + editor canvas/formatting/management upgrades

---

## Phase A: Student Viewer & Navbar Overhaul

### A1. Slim Lesson Navbar

**Current state:** Full navbar is 64px + 96px total with padding (6rem). Course header band adds more. ~150px of viewport consumed by chrome.

**New design:** When a student is inside a course/lesson, replace the full navbar with a slim **40px** fixed top bar.

| Position | Content |
|----------|---------|
| Left | Back arrow icon + "Back to My Courses" (links to `/gansid/student`) |
| Center | Course title (truncated with ellipsis on small screens) |
| Right | Fullscreen toggle button (expand icon) + user avatar dropdown |

- Background: `bg-[#0F172A]` (near-black, matches current brand)
- No My Courses / Progress / Certificates nav links — those live on the dashboard only
- The full navbar remains on non-lesson pages (dashboard, profile, certificates, progress)

### A2. Course Header Band

- Reduce from current size to **48px** — course title + teal overall progress bar, tighter padding (`px-4 py-2`)
- Combined chrome: **88px** total (40px navbar + 48px header) vs current ~150px = **~62px reclaimed**
- Viewport calc updates: `h-[calc(100vh-88px)]` for student, `h-[calc(100vh-3rem)]` for admin preview (unchanged)

### A3. Fullscreen Mode

- Toggle button in slim navbar (expand icon)
- Keyboard shortcut: `F` to toggle (only when not focused on an input/textarea)
- Hides both slim navbar and course header — slide fills entire viewport
- Exit: press `Escape`, press `F` again, or click a small semi-transparent floating button (bottom-right corner, `z-[70]`)
- State managed via React state in CourseViewer, no URL change

### A4. Responsive Content Width

**Large screens (>1280px):**
- Slide content area: `max-w-5xl` (1024px) centered within available space
- Sidebar stays at 260px fixed
- Prevents overly long text lines, provides breathing room

**Medium screens (768px–1280px):**
- Content fills available width (no max-width cap)
- Same as current behavior with tighter padding

**Small screens (<768px):**
- Sidebar collapses to dropdown (existing behavior, unchanged)
- Grid blocks collapse to single-column full-width stack
- Slim navbar adapts: course title truncates, back arrow + fullscreen toggle remain

### A5. Text/Image Alignment & Slide Card Styling

- Within the CSS Grid viewer, blocks snap to 12-column grid alignment
- Standalone images: centered within grid cell, `object-contain` to preserve aspect ratio
- Rich text: left-aligned by default, respects author's alignment choice
- Slide card internal padding: reduce from `px-6 py-5` to `px-5 py-4`
- Progress bar within slide header: reduce to 3px thin line

### A6. CSS Grid Viewer (Prepares for Phase B)

- Student viewer renders block positions using plain CSS Grid (12 columns)
- No `react-grid-layout` on the student/viewer side — only CSS
- Reads `x, y, w, h` from each block's `data` jsonb field
- Backward compatible: blocks without grid position data render as full-width (`w: 12`) vertical stack
- Mobile (<768px): all blocks collapse to `grid-column: 1 / -1` regardless of saved position

---

## Phase B: Editor Upgrades

### B1. react-grid-layout Canvas

**Package:** `react-grid-layout` (same as SCD simulation project)

**Grid configuration (shared `gridConstants.ts`):**

```ts
export const GRID_COLS = 12;
export const GRID_MARGIN: [number, number] = [6, 6];
export const GRID_PADDING: [number, number] = [8, 8];
export const RESIZE_HANDLES = ['se', 'sw', 'e', 'w'] as const;
```

- Row height computed dynamically to fit canvas container (same `computeRowHeight()` pattern as SCD)
- New blocks drop in at full width: `{ x: 0, y: Infinity, w: 12, h: 2 }`
- Existing blocks without grid data get default full-width position (backward compatible)

**Block position storage:**
- Each block's `lesson_blocks.data` jsonb gains layout fields: `{ gridX, gridY, gridW, gridH }`
- Prefixed with `grid` to avoid collision with block content data
- Defaults: `{ gridX: 0, gridY: 0, gridW: 12, gridH: 2 }` for legacy blocks

**Resize handles:** `se, sw, e, w` — right/left edges + bottom corners. No top handles to prevent accidental overlap during content editing.

**WYSIWYG parity:** Editor and viewer both use the same 12-column grid constants. Editor uses `react-grid-layout` for interactivity; viewer uses CSS Grid for rendering. Shared constants file ensures pixel-accurate match.

**Layout examples enabled:**
- Text + image side by side: 6+6 cols
- Small image + large text: 4+8 cols
- Three equal blocks: 4+4+4 cols
- Any arbitrary layout within 12-col constraint

### B2. Inline Text Editing on Canvas

- Click a `rich_text` block on the slide canvas → block enters edit mode with Tiptap mounted inline
- Floating toolbar appears above the block (absolute positioned, same visual style as properties panel toolbar)
- Click outside the block or press `Escape` → exits edit mode, returns to preview/selection mode
- Properties panel rich text editor remains functional as alternative — both sync via editor store (single source of truth in Zustand)
- Other block types (image, video, CTA, etc.) remain click-to-select with properties panel editing only

### B3. Enhanced Tiptap Toolbar

**New formatting options:**

| Category | Options | Extension |
|----------|---------|-----------|
| Font family | Default (sans), Serif, Mono | `@tiptap/extension-font-family` + `@tiptap/extension-text-style` |
| Font size | Small (14px), Normal (16px), Large (20px), XL (24px) | Custom extension or inline styles via `@tiptap/extension-text-style` |
| Headings | H1, H2, H3 | StarterKit (existing) |
| Text style | Bold, Italic, **Underline**, Strikethrough | `@tiptap/extension-underline` (new) + StarterKit |
| Text color | 8-10 brand-aligned preset colors | `@tiptap/extension-color` + `@tiptap/extension-text-style` |
| Alignment | Left, Center, Right | `@tiptap/extension-text-align` |
| Lists | Bullet, Numbered | StarterKit (existing) |
| Block | Blockquote | StarterKit (existing) |
| Spacing | Line height: Compact (1.2) / Normal (1.5) / Relaxed (2.0) | Custom extension or inline style |
| Links | Insert/edit link | Existing Link extension |

**New Tiptap packages to install:**
- `@tiptap/extension-underline`
- `@tiptap/extension-text-align`
- `@tiptap/extension-color`
- `@tiptap/extension-text-style` (may already be a dependency of color)
- `@tiptap/extension-font-family`

### B4. Fix Formatting Translation (Whitespace & Lists)

**Root cause:** Viewer uses Tailwind `prose` class which normalizes spacing. Tiptap outputs `<p>` tags correctly but prose collapses margins and hides empty paragraphs.

**Fix:**
- Add custom CSS overrides on the viewer's prose container:
  - Preserve empty `<p>` tags as intentional blank lines (`p:empty { min-height: 1em; }`)
  - Maintain paragraph margin spacing as authored
  - Ensure list styling (bullet/numbered) renders faithfully
- Unify prose sizing: editor canvas should use the same prose scale as the viewer, or use a CSS transform/scale approach so inline editing is truly WYSIWYG
- The inline Tiptap editor (B2) inherits the same prose styles as the viewer — what you type is what students see

### B5. Cross-Lesson Slide Movement

**Drag-and-drop in structure panel:**
- Extend existing `@dnd-kit` setup in the structure panel
- Slide items become draggable across lesson boundaries (lesson nodes are valid drop targets)
- Visual feedback: hovering a slide over a different lesson highlights that lesson as a drop zone
- On drop: API call updates the slide's `lesson_id` to the new lesson, reindexes `order_index` in both source and target lessons
- Undo support: store previous state for undo/redo

**Context menu ("Move to..."):**
- Right-click a slide in structure panel → context menu includes "Move to..."
- Opens a nested submenu: modules → lessons (grouped tree)
- On select: same API call as drag-and-drop, with confirmation if target lesson already has content
- Appends to end of target lesson's slide list

### B6. Block Duplication

**In-place duplicate:**
- Right-click a block on canvas or in structure panel → "Duplicate"
- Creates a deep clone with fresh UUID, same `block_type`, deep-cloned `data`
- Grid position: same `x`, same `w`, `y` shifted down by the original's `h` (appears directly below)
- Inserted into the block list immediately after the original

**Copy to another slide:**
- Right-click → "Copy to..." → hierarchical picker: module → lesson → slide
- Deep clones block data, appends at bottom of target slide's block list with default full-width grid position
- Works across lessons (not limited to current lesson)

### B7. Properties Panel Sync Fix

**Root cause:** Tiptap `useEditor` hook doesn't re-initialize content when selected block ID changes — editor holds stale content from previous selection.

**Fix approach:** Use React `key` prop on the Tiptap editor component, keyed to `selectedEntity.id`. When selection changes, React unmounts and remounts the editor with fresh content. This is cleaner than imperatively calling `setContent()` and avoids edge cases with cursor position and undo history bleeding between blocks.

**Context Menu Component:**
- Single shared `<BlockContextMenu>` component used on both canvas blocks and structure panel items
- Right-click or kebab menu (⋮) trigger
- Menu items adapt based on target type:
  - **Slides:** Move to..., Delete
  - **Blocks:** Duplicate, Copy to..., Delete

---

## Database Changes

### Block grid position data

No schema migration needed — grid positions stored in existing `lesson_blocks.data` jsonb:

```json
{
  "gridX": 0,
  "gridY": 0,
  "gridW": 12,
  "gridH": 2,
  "content": "..."
}
```

Backward compatible: blocks without `gridX/Y/W/H` fields get defaults (`x:0, w:12, h:2, y: auto-stacked`).

### Cross-lesson slide movement

No schema change — slides already have a `lesson_id` foreign key. Movement is an UPDATE of `lesson_id` + reindexing `order_index` in both source and target lessons.

---

## New Dependencies

| Package | Purpose | Size |
|---------|---------|------|
| `react-grid-layout` | Editor canvas grid + resize | ~45KB gzipped |
| `@tiptap/extension-underline` | Underline formatting | <5KB |
| `@tiptap/extension-text-align` | Text alignment | <5KB |
| `@tiptap/extension-color` | Text color | <5KB |
| `@tiptap/extension-text-style` | Font family/size base | <5KB |
| `@tiptap/extension-font-family` | Font family selector | <5KB |

Total new dependencies: 6 packages, ~65KB gzipped. No major new frameworks.

---

## Files Affected (Estimated)

### Phase A (Viewer)
- `src/components/navbar.tsx` — conditional slim mode
- `src/components/student/course-viewer.tsx` — fullscreen state, height calc, CSS Grid renderer
- `src/components/shared/slide-frame.tsx` — padding/spacing adjustments
- `src/app/student/layout.tsx` — conditional navbar rendering

### Phase B (Editor)
- `src/lib/content/gridConstants.ts` — new shared file
- `src/components/editor/preview-panel.tsx` — replace vertical stack with react-grid-layout
- `src/components/blocks/rich-text/editor.tsx` — enhanced toolbar, inline editing mode
- `src/components/blocks/rich-text/viewer.tsx` — prose overrides for whitespace/formatting
- `src/components/editor/structure-panel.tsx` — cross-lesson DnD, context menus
- `src/components/editor/dnd/` — extend for cross-lesson support
- `src/components/editor/properties-panel.tsx` — key prop fix for selection sync
- `src/components/editor/context-menu.tsx` — new shared context menu
- `src/lib/db/blocks.ts` — duplicate block function
- `src/lib/db/slides.ts` — move slide between lessons function
- `src/lib/stores/editor-store.ts` — cross-lesson state management
