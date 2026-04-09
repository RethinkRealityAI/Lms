# Viewer UI & Editor Upgrades Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Maximize lesson viewport space with a slim navbar + fullscreen mode, add react-grid-layout canvas for side-by-side block layout with resizing, inline rich text editing, enhanced Tiptap toolbar, cross-lesson slide movement, and block duplication.

**Architecture:** Two-phase approach. Phase A rewrites the student viewer chrome (navbar, header, content width) and introduces a CSS Grid block renderer. Phase B migrates the editor canvas to react-grid-layout, adds inline Tiptap editing with expanded formatting, cross-lesson slide DnD, block duplication, and fixes properties panel sync. Shared `gridConstants.ts` ensures WYSIWYG parity between editor and viewer.

**Tech Stack:** Next.js 16, React 19, react-grid-layout (new), Tiptap with new extensions (underline, text-align, color, text-style, font-family), @dnd-kit (existing), Zustand (existing), Tailwind CSS 4, Supabase.

---

## File Structure

### New Files
| File | Responsibility |
|------|---------------|
| `src/lib/content/gridConstants.ts` | Shared 12-col grid constants (cols, margin, padding, resize handles, computeRowHeight) |
| `src/components/student/lesson-navbar.tsx` | Slim 40px navbar shown only inside course/lesson view |
| `src/components/editor/context-menu.tsx` | Right-click context menu for slides (Move to...) and blocks (Duplicate, Copy to..., Delete) |
| `src/components/editor/move-slide-dialog.tsx` | Modal picker for "Move to..." target (module → lesson tree) |
| `src/components/editor/copy-block-dialog.tsx` | Modal picker for "Copy to..." target (module → lesson → slide tree) |
| `src/components/blocks/rich-text/inline-editor.tsx` | Tiptap editor mounted inline on the canvas (shared toolbar config with properties panel editor) |
| `src/components/blocks/rich-text/toolbar.tsx` | Extracted + enhanced Tiptap toolbar (font family, size, color, alignment, spacing) |

### Modified Files
| File | Changes |
|------|---------|
| `src/components/nav-bar.tsx` | Accept `variant` prop for slim mode |
| `src/app/student/layout.tsx` | Pass slim variant to navbar on course pages |
| `src/app/student/courses/[id]/page.tsx` | Signal to layout that we're inside a course |
| `src/components/student/course-viewer.tsx` | Fullscreen toggle, updated height calc, CSS Grid block renderer, responsive max-width |
| `src/components/shared/slide-frame.tsx` | Tighter padding, thinner progress bar |
| `src/components/blocks/rich-text/viewer.tsx` | Prose overrides for whitespace/empty paragraphs, honor text-align/color/font |
| `src/components/blocks/rich-text/editor.tsx` | Use extracted toolbar, add key prop for selection sync |
| `src/components/editor/preview-panel.tsx` | Replace vertical block stack with react-grid-layout canvas |
| `src/components/editor/slide-preview.tsx` | Integrate react-grid-layout for content slides, inline text editing |
| `src/components/editor/structure-panel.tsx` | Cross-lesson slide DnD, right-click context menu |
| `src/components/editor/properties-panel.tsx` | Key prop on block editors for sync fix |
| `src/components/editor/block-editor-panel.tsx` | Key prop on Tiptap editor |
| `src/components/editor/dnd/editor-dnd-context.tsx` | Support cross-lesson slide drops |
| `src/lib/stores/editor-store.ts` | moveSlideToLesson(), duplicateBlock(), copyBlockToSlide() actions |
| `src/lib/db/blocks.ts` | duplicateBlock() DB function |
| `src/lib/db/slides.ts` | moveSlideToLesson() DB function |
| `src/components/lesson-block-renderer.tsx` | Pass through grid position data |
| `package.json` | Add react-grid-layout + 5 Tiptap extension packages |

---

## Phase A: Student Viewer & Navbar Overhaul

### Task 1: Install Dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install react-grid-layout and Tiptap extensions**

```bash
cd "c:/Users/devel/OneDrive/Documents/RethinkReality/GANSID-LMS/Lms"
npm install react-grid-layout @types/react-grid-layout @tiptap/extension-underline @tiptap/extension-text-align @tiptap/extension-color @tiptap/extension-text-style @tiptap/extension-font-family
```

- [ ] **Step 2: Verify install succeeded**

```bash
cd "c:/Users/devel/OneDrive/Documents/RethinkReality/GANSID-LMS/Lms"
node -e "require('react-grid-layout'); console.log('react-grid-layout OK')"
```

Expected: `react-grid-layout OK`

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: install react-grid-layout and Tiptap formatting extensions"
```

---

### Task 2: Create Shared Grid Constants

**Files:**
- Create: `src/lib/content/gridConstants.ts`

- [ ] **Step 1: Create gridConstants.ts**

```typescript
/**
 * Shared grid constants used by both the editor canvas (react-grid-layout)
 * and the student viewer (CSS Grid) so the two always stay in sync.
 */

export const GRID_COLS = 12;
export const GRID_MARGIN: [number, number] = [6, 6];
export const GRID_CONTAINER_PADDING: [number, number] = [8, 8];
export const DEFAULT_ROW_HEIGHT = 60;

/** Resize handles for editor canvas — edges and bottom corners only */
export const RESIZE_HANDLES: ('se' | 'sw' | 'e' | 'w')[] = ['se', 'sw', 'e', 'w'];

/** Default grid position for new or legacy blocks (full-width row) */
export const DEFAULT_BLOCK_LAYOUT = {
  gridX: 0,
  gridY: 0,  // will be overridden by react-grid-layout's auto-placement
  gridW: 12,
  gridH: 2,
} as const;

/** Extract grid layout from block data, falling back to defaults */
export function getBlockGridLayout(data: Record<string, unknown>): {
  gridX: number;
  gridY: number;
  gridW: number;
  gridH: number;
} {
  return {
    gridX: typeof data.gridX === 'number' ? data.gridX : DEFAULT_BLOCK_LAYOUT.gridX,
    gridY: typeof data.gridY === 'number' ? data.gridY : DEFAULT_BLOCK_LAYOUT.gridY,
    gridW: typeof data.gridW === 'number' ? data.gridW : DEFAULT_BLOCK_LAYOUT.gridW,
    gridH: typeof data.gridH === 'number' ? data.gridH : DEFAULT_BLOCK_LAYOUT.gridH,
  };
}

/**
 * Compute a row-height so rows fit inside the given canvas pixel-height
 * without overflow. Uses a target of 10 visible rows.
 */
export function computeRowHeight(canvasHeight: number | undefined, rows = 10): number {
  if (!canvasHeight || canvasHeight <= 0) return DEFAULT_ROW_HEIGHT;

  const verticalPadding = GRID_CONTAINER_PADDING[1] * 2;
  const interRowGaps = (rows - 1) * GRID_MARGIN[1];
  const available = canvasHeight - verticalPadding - interRowGaps;

  return Math.max(1, Math.floor(available / rows));
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/content/gridConstants.ts
git commit -m "feat: add shared grid constants for editor/viewer WYSIWYG parity"
```

---

### Task 3: Slim Lesson Navbar

**Files:**
- Create: `src/components/student/lesson-navbar.tsx`
- Modify: `src/components/student/course-viewer.tsx`

- [ ] **Step 1: Create the slim lesson navbar component**

```tsx
'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Maximize2, Minimize2, User, LogOut } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface LessonNavbarProps {
  courseTitle: string;
  userName?: string;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
}

export function LessonNavbar({
  courseTitle,
  userName,
  isFullscreen,
  onToggleFullscreen,
}: LessonNavbarProps) {
  if (isFullscreen) return null;

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = '/gansid/student/login';
  };

  return (
    <nav className="h-10 bg-[#0F172A] flex items-center px-4 shrink-0 z-50">
      {/* Left: Back to courses */}
      <Link
        href="/gansid/student"
        className="flex items-center gap-1.5 text-sm text-slate-300 hover:text-white transition-colors shrink-0"
      >
        <ArrowLeft className="w-4 h-4" />
        <span className="hidden sm:inline">My Courses</span>
      </Link>

      {/* Center: Course title */}
      <div className="flex-1 min-w-0 mx-4">
        <p className="text-sm font-semibold text-white truncate text-center">
          {courseTitle}
        </p>
      </div>

      {/* Right: Fullscreen + user */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={onToggleFullscreen}
          className="p-1.5 text-slate-400 hover:text-white transition-colors rounded"
          title="Toggle fullscreen (F)"
        >
          <Maximize2 className="w-4 h-4" />
        </button>

        {userName && (
          <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-slate-700">
            <div className="w-6 h-6 rounded-full bg-slate-600 flex items-center justify-center">
              <User className="w-3.5 h-3.5 text-slate-300" />
            </div>
            <span className="text-xs text-slate-400 max-w-[100px] truncate">{userName}</span>
          </div>
        )}

        <button
          onClick={handleSignOut}
          className="p-1.5 text-slate-500 hover:text-red-400 transition-colors rounded"
          title="Sign out"
        >
          <LogOut className="w-3.5 h-3.5" />
        </button>
      </div>
    </nav>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/student/lesson-navbar.tsx
git commit -m "feat: add slim 40px lesson navbar component"
```

---

### Task 4: Fullscreen Mode & Updated Viewport Heights

**Files:**
- Modify: `src/components/student/course-viewer.tsx`

This task modifies the CourseViewer to:
1. Replace the full navbar with the slim LessonNavbar
2. Add fullscreen toggle state + keyboard shortcut (F / Escape)
3. Update height calculation from `100vh-6rem` to `100vh-40px` (navbar only, header integrated)
4. Add a floating exit-fullscreen button

- [ ] **Step 1: Add fullscreen state and keyboard handler to CourseViewer**

At the top of the CourseViewer component (after existing state declarations around line 128), add:

```typescript
const [isFullscreen, setIsFullscreen] = useState(false);
```

Add a `useEffect` for keyboard shortcuts after the existing keyboard navigation effect:

```typescript
useEffect(() => {
  const handleFullscreenKey = (e: KeyboardEvent) => {
    const tag = (e.target as HTMLElement)?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable) return;
    if (e.key === 'f' || e.key === 'F') {
      e.preventDefault();
      setIsFullscreen(prev => !prev);
    }
    if (e.key === 'Escape' && isFullscreen) {
      setIsFullscreen(false);
    }
  };
  window.addEventListener('keydown', handleFullscreenKey);
  return () => window.removeEventListener('keydown', handleFullscreenKey);
}, [isFullscreen]);
```

- [ ] **Step 2: Replace outer height class and integrate LessonNavbar**

Replace the current outer height calculation (around line 476):

```typescript
// OLD
const outerHeightClass = previewMode
  ? 'h-[calc(100vh-3rem)]'
  : 'h-[calc(100vh-6rem)]';
```

With:

```typescript
const outerHeightClass = isFullscreen
  ? 'h-screen'
  : previewMode
    ? 'h-[calc(100vh-3rem)]'
    : 'h-screen';  // LessonNavbar is inside the component now, not external
```

- [ ] **Step 3: Add LessonNavbar and floating fullscreen exit button to the JSX**

At the top of the returned JSX (inside the outer div, before the course header band), add:

```tsx
{!previewMode && (
  <LessonNavbar
    courseTitle={course?.title ?? ''}
    userName={undefined}  // TODO: pass from parent if needed
    isFullscreen={isFullscreen}
    onToggleFullscreen={() => setIsFullscreen(prev => !prev)}
  />
)}

{/* Floating fullscreen exit button */}
{isFullscreen && (
  <button
    onClick={() => setIsFullscreen(false)}
    className="fixed bottom-6 right-6 z-[70] p-2 bg-black/40 hover:bg-black/60 text-white/70 hover:text-white rounded-lg backdrop-blur-sm transition-all"
    title="Exit fullscreen (Esc)"
  >
    <Minimize2 className="w-5 h-5" />
  </button>
)}
```

Also hide the course header band when fullscreen:

```tsx
{!isFullscreen && (
  <div className="shrink-0 bg-[#0F172A] px-4 sm:px-6 lg:px-8 py-2">
    {/* Compact header: title + progress on one line */}
    <div className="flex items-center gap-4">
      <h1 className="text-sm font-bold text-white truncate flex-1">{course?.title}</h1>
      <div className="flex items-center gap-2 shrink-0">
        <div className="w-32 bg-white/20 rounded-full h-1.5">
          <div
            className="bg-[#0099CA] h-1.5 rounded-full transition-all"
            style={{ width: `${overallProgress}%` }}
          />
        </div>
        <span className="text-xs font-bold text-white">{overallProgress}%</span>
      </div>
    </div>
  </div>
)}
```

- [ ] **Step 4: Add import for LessonNavbar and Minimize2**

At the top of course-viewer.tsx, add:

```typescript
import { LessonNavbar } from '@/components/student/lesson-navbar';
```

And add `Minimize2` to the existing lucide-react import.

- [ ] **Step 5: Verify the dev server runs without errors**

```bash
cd "c:/Users/devel/OneDrive/Documents/RethinkReality/GANSID-LMS/Lms"
npx next build --no-lint 2>&1 | head -30
```

Expected: Build succeeds or only shows warnings (not errors).

- [ ] **Step 6: Commit**

```bash
git add src/components/student/course-viewer.tsx
git commit -m "feat: fullscreen mode, slim lesson navbar, compact course header"
```

---

### Task 5: Hide Full Navbar on Course Pages

**Files:**
- Modify: `src/app/student/layout.tsx`
- Modify: `src/app/student/courses/[id]/page.tsx`

The student layout currently always renders the full navbar with `pt-24`. When inside a course, we need to suppress it since CourseViewer now has its own LessonNavbar.

- [ ] **Step 1: Add a context to signal "inside course view"**

In `src/app/student/layout.tsx`, the simplest approach is to check the pathname. The layout is a server component, so we use `headers()` to detect the route.

At the top of the layout function, after the auth check, add:

```typescript
const headersList = await headers();
const pathname = headersList.get('x-next-pathname') || '';
const isInsideCourse = pathname.includes('/student/courses/');
```

Note: Next.js middleware already sets headers. We need to forward the pathname. An easier approach: use a CSS class to hide the navbar when inside course view.

**Alternative approach — simpler:** Wrap the navbar render in a condition. Since this is a server component and we don't have pathname access easily, use a client wrapper.

Actually, the cleanest approach: change the student layout to conditionally show the navbar, and have course pages use a separate layout.

- [ ] **Step 2: Create a course-specific layout that hides the navbar**

Create or modify `src/app/student/courses/layout.tsx`:

```tsx
export default function CourseLayout({ children }: { children: React.ReactNode }) {
  // No navbar, no padding — CourseViewer manages its own chrome
  return <div className="min-h-screen bg-[#F8FAFC]">{children}</div>;
}
```

- [ ] **Step 3: Update student layout to not apply pt-24 globally**

In `src/app/student/layout.tsx`, the `<main className="pt-24">` applies padding for the navbar. Since course pages will use their own layout, this is fine — nested layouts in Next.js App Router compose, but the course layout overrides the chrome.

Actually in Next.js App Router, nested layouts DON'T replace parent layouts — they nest inside them. So the parent navbar + pt-24 will still render.

**Better approach:** Use a client component to detect if we're on a course page and conditionally hide the navbar.

- [ ] **Step 3 (revised): Use CSS to hide navbar on course routes**

In `src/app/student/layout.tsx`, add a data attribute to the navbar wrapper:

```tsx
<div id="student-navbar">
  <NavBar ... />
</div>
<main className="pt-24" id="student-main">
  {children}
</main>
```

Then in `src/components/student/course-viewer.tsx`, add a `useEffect` to hide the navbar when mounted and restore it on unmount:

```typescript
useEffect(() => {
  const navbar = document.getElementById('student-navbar');
  const main = document.getElementById('student-main');
  if (navbar) navbar.style.display = 'none';
  if (main) main.style.paddingTop = '0';
  return () => {
    if (navbar) navbar.style.display = '';
    if (main) main.style.paddingTop = '';
  };
}, []);
```

This is clean: when CourseViewer mounts, the full navbar hides and padding resets. When navigating away, it restores.

- [ ] **Step 4: Commit**

```bash
git add src/app/student/layout.tsx src/components/student/course-viewer.tsx
git commit -m "feat: hide full navbar when inside course viewer, remove top padding"
```

---

### Task 6: Responsive Content Width & Slide Card Styling

**Files:**
- Modify: `src/components/student/course-viewer.tsx`
- Modify: `src/components/shared/slide-frame.tsx`

- [ ] **Step 1: Add max-width constraint on large screens**

In `course-viewer.tsx`, find the slide card container (the `flex-1 min-h-0` div that wraps the Card for the slide viewer, around line 661). Wrap it with a max-width constraint:

```tsx
<div className="flex-1 min-h-0 max-w-5xl mx-auto w-full">
  {/* existing Card with slide content */}
</div>
```

- [ ] **Step 2: Tighten slide-frame padding and progress bar**

In `src/components/shared/slide-frame.tsx`:

Change the header padding (around line 34):
```
// OLD: px-6 pt-5 pb-4
// NEW: px-5 pt-3 pb-3
```

Change the progress bar height:
```
// OLD: h-1.5
// NEW: h-[3px]
```

Change `SlideContentArea` padding:
```
// OLD: px-3 py-3 sm:px-6 sm:py-5 ... gap-5
// NEW: px-3 py-3 sm:px-5 sm:py-4 ... gap-4
```

- [ ] **Step 3: Also apply same tightening in course-viewer.tsx**

The course-viewer has its own inline slide header (not using SlideFrame). Update the slide header area (around line 667):

```
// OLD: px-6 pt-5 pb-0 ... pb-4
// NEW: px-5 pt-3 pb-3
```

Progress bar:
```
// OLD: h-1.5
// NEW: h-[3px]
```

- [ ] **Step 4: Commit**

```bash
git add src/components/student/course-viewer.tsx src/components/shared/slide-frame.tsx
git commit -m "feat: responsive max-width on large screens, tighter slide padding"
```

---

### Task 7: CSS Grid Block Renderer for Student Viewer

**Files:**
- Modify: `src/components/student/course-viewer.tsx`
- Modify: `src/components/lesson-block-renderer.tsx`

- [ ] **Step 1: Create a GridBlockRenderer component inside course-viewer.tsx**

Add this component above the main CourseViewer component:

```tsx
import { GRID_COLS, GRID_MARGIN, GRID_CONTAINER_PADDING, getBlockGridLayout } from '@/lib/content/gridConstants';

interface GridBlockRendererProps {
  blocks: LessonBlock[];
}

function GridBlockRenderer({ blocks }: GridBlockRendererProps) {
  if (!blocks.length) return null;

  // Check if any block has explicit grid positions (non-default)
  const hasGridLayout = blocks.some(
    b => typeof b.data?.gridX === 'number' && typeof b.data?.gridW === 'number' && b.data.gridW < 12
  );

  // If no custom grid layout, render simple vertical stack (backward compatible)
  if (!hasGridLayout) {
    return (
      <div className="flex flex-col gap-4">
        {blocks.map(block => (
          <LessonBlockRenderer key={block.id} block={block} />
        ))}
      </div>
    );
  }

  // CSS Grid renderer matching editor's react-grid-layout
  return (
    <div
      className="w-full"
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${GRID_COLS}, 1fr)`,
        gap: `${GRID_MARGIN[1]}px ${GRID_MARGIN[0]}px`,
        padding: `${GRID_CONTAINER_PADDING[1]}px ${GRID_CONTAINER_PADDING[0]}px`,
      }}
    >
      {blocks.map(block => {
        const layout = getBlockGridLayout(block.data ?? {});
        return (
          <div
            key={block.id}
            className="min-w-0 min-h-0"
            style={{
              gridColumn: `${layout.gridX + 1} / ${layout.gridX + layout.gridW + 1}`,
              gridRow: `${layout.gridY + 1} / ${layout.gridY + layout.gridH + 1}`,
            }}
          >
            <LessonBlockRenderer block={block} />
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Replace the existing vertical block stack with GridBlockRenderer**

In the slide content rendering area (around line 729 where blocks are mapped with LessonBlockRenderer), replace:

```tsx
// OLD: blocks.map(block => <LessonBlockRenderer key={block.id} block={block} />)
// NEW:
<GridBlockRenderer blocks={slideBlocks} />
```

- [ ] **Step 3: Add mobile collapse — force full-width on small screens**

Add a media query approach. In the GridBlockRenderer, add a responsive class:

```tsx
<div
  className="w-full grid-viewer"
  style={{
    display: 'grid',
    gridTemplateColumns: `repeat(${GRID_COLS}, 1fr)`,
    gap: `${GRID_MARGIN[1]}px ${GRID_MARGIN[0]}px`,
    padding: `${GRID_CONTAINER_PADDING[1]}px ${GRID_CONTAINER_PADDING[0]}px`,
  }}
>
```

Add a `<style>` tag or use Tailwind's `@media` in globals:

```css
@media (max-width: 767px) {
  .grid-viewer > * {
    grid-column: 1 / -1 !important;
    grid-row: auto !important;
  }
}
```

Add this CSS rule to `src/app/globals.css`.

- [ ] **Step 4: Commit**

```bash
git add src/components/student/course-viewer.tsx src/app/globals.css
git commit -m "feat: CSS Grid block renderer for student viewer with mobile collapse"
```

---

## Phase B: Editor Upgrades

### Task 8: Enhanced Tiptap Toolbar (Extracted Component)

**Files:**
- Create: `src/components/blocks/rich-text/toolbar.tsx`
- Modify: `src/components/blocks/rich-text/editor.tsx`

- [ ] **Step 1: Create the enhanced toolbar component**

```tsx
'use client';

import React from 'react';
import { Editor } from '@tiptap/react';
import {
  Bold, Italic, Underline, Strikethrough, AlignLeft, AlignCenter, AlignRight,
  List, ListOrdered, Quote, Link as LinkIcon, Type, Heading1, Heading2, Heading3,
} from 'lucide-react';

interface RichTextToolbarProps {
  editor: Editor | null;
}

const FONT_FAMILIES = [
  { label: 'Sans', value: 'ui-sans-serif, system-ui, sans-serif' },
  { label: 'Serif', value: 'ui-serif, Georgia, serif' },
  { label: 'Mono', value: 'ui-monospace, monospace' },
];

const FONT_SIZES = [
  { label: 'Small', value: '14px' },
  { label: 'Normal', value: '16px' },
  { label: 'Large', value: '20px' },
  { label: 'XL', value: '24px' },
];

const LINE_HEIGHTS = [
  { label: 'Compact', value: '1.2' },
  { label: 'Normal', value: '1.5' },
  { label: 'Relaxed', value: '2.0' },
];

const TEXT_COLORS = [
  '#000000', '#1E3A5F', '#DC2626', '#0099CA', '#16A34A',
  '#9333EA', '#EA580C', '#6B7280', '#FFFFFF',
];

function ToolbarButton({
  onClick,
  isActive,
  title,
  children,
}: {
  onClick: () => void;
  isActive?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`p-1.5 rounded transition-colors ${
        isActive ? 'bg-slate-200 text-slate-900' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
      }`}
    >
      {children}
    </button>
  );
}

function ToolbarDivider() {
  return <div className="w-px h-5 bg-slate-200 mx-0.5" />;
}

export function RichTextToolbar({ editor }: RichTextToolbarProps) {
  if (!editor) return null;

  const setFontSize = (size: string) => {
    editor.chain().focus().setMark('textStyle', { fontSize: size }).run();
  };

  const setLineHeight = (height: string) => {
    // Apply via paragraph style
    editor.chain().focus().setMark('textStyle', { lineHeight: height }).run();
  };

  return (
    <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 border-b border-slate-200 bg-slate-50 rounded-t-lg">
      {/* Font Family */}
      <select
        value={editor.getAttributes('textStyle').fontFamily || ''}
        onChange={e => {
          if (e.target.value) {
            editor.chain().focus().setFontFamily(e.target.value).run();
          } else {
            editor.chain().focus().unsetFontFamily().run();
          }
        }}
        className="text-xs border border-slate-200 rounded px-1.5 py-1 bg-white"
        title="Font family"
      >
        <option value="">Default</option>
        {FONT_FAMILIES.map(f => (
          <option key={f.value} value={f.value}>{f.label}</option>
        ))}
      </select>

      {/* Font Size */}
      <select
        onChange={e => setFontSize(e.target.value)}
        className="text-xs border border-slate-200 rounded px-1.5 py-1 bg-white"
        title="Font size"
        defaultValue="16px"
      >
        {FONT_SIZES.map(s => (
          <option key={s.value} value={s.value}>{s.label}</option>
        ))}
      </select>

      <ToolbarDivider />

      {/* Headings */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        isActive={editor.isActive('heading', { level: 1 })}
        title="Heading 1"
      >
        <Heading1 className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        isActive={editor.isActive('heading', { level: 2 })}
        title="Heading 2"
      >
        <Heading2 className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        isActive={editor.isActive('heading', { level: 3 })}
        title="Heading 3"
      >
        <Heading3 className="w-4 h-4" />
      </ToolbarButton>

      <ToolbarDivider />

      {/* Text Formatting */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        isActive={editor.isActive('bold')}
        title="Bold"
      >
        <Bold className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        isActive={editor.isActive('italic')}
        title="Italic"
      >
        <Italic className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        isActive={editor.isActive('underline')}
        title="Underline"
      >
        <Underline className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleStrike().run()}
        isActive={editor.isActive('strike')}
        title="Strikethrough"
      >
        <Strikethrough className="w-4 h-4" />
      </ToolbarButton>

      <ToolbarDivider />

      {/* Text Color */}
      <div className="flex items-center gap-0.5">
        {TEXT_COLORS.map(color => (
          <button
            key={color}
            type="button"
            onClick={() => editor.chain().focus().setColor(color).run()}
            className={`w-5 h-5 rounded-sm border transition-all ${
              editor.getAttributes('textStyle').color === color
                ? 'border-slate-900 scale-110'
                : 'border-slate-200 hover:border-slate-400'
            }`}
            style={{ backgroundColor: color }}
            title={`Text color: ${color}`}
          />
        ))}
      </div>

      <ToolbarDivider />

      {/* Alignment */}
      <ToolbarButton
        onClick={() => editor.chain().focus().setTextAlign('left').run()}
        isActive={editor.isActive({ textAlign: 'left' })}
        title="Align left"
      >
        <AlignLeft className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().setTextAlign('center').run()}
        isActive={editor.isActive({ textAlign: 'center' })}
        title="Align center"
      >
        <AlignCenter className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().setTextAlign('right').run()}
        isActive={editor.isActive({ textAlign: 'right' })}
        title="Align right"
      >
        <AlignRight className="w-4 h-4" />
      </ToolbarButton>

      <ToolbarDivider />

      {/* Lists */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        isActive={editor.isActive('bulletList')}
        title="Bullet list"
      >
        <List className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        isActive={editor.isActive('orderedList')}
        title="Numbered list"
      >
        <ListOrdered className="w-4 h-4" />
      </ToolbarButton>

      {/* Blockquote */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        isActive={editor.isActive('blockquote')}
        title="Quote"
      >
        <Quote className="w-4 h-4" />
      </ToolbarButton>

      <ToolbarDivider />

      {/* Line Height */}
      <select
        onChange={e => setLineHeight(e.target.value)}
        className="text-xs border border-slate-200 rounded px-1.5 py-1 bg-white"
        title="Line height"
        defaultValue="1.5"
      >
        {LINE_HEIGHTS.map(h => (
          <option key={h.value} value={h.value}>{h.label}</option>
        ))}
      </select>
    </div>
  );
}
```

- [ ] **Step 2: Update the rich text editor to use extracted toolbar and new extensions**

In `src/components/blocks/rich-text/editor.tsx`, replace the existing toolbar and extension config:

```tsx
'use client';

import React from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import { Color } from '@tiptap/extension-color';
import TextStyle from '@tiptap/extension-text-style';
import FontFamily from '@tiptap/extension-font-family';
import { RichTextToolbar } from './toolbar';

interface RichTextEditorProps {
  data: { html?: string };
  onChange: (data: { html: string }) => void;
}

export default function RichTextEditor({ data, onChange }: RichTextEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Image,
      Link.configure({ openOnClick: false }),
      Placeholder.configure({ placeholder: 'Start typing your content...' }),
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Color,
      TextStyle,
      FontFamily,
    ],
    content: data.html || '',
    onUpdate: ({ editor }) => {
      onChange({ html: editor.getHTML() });
    },
  });

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <RichTextToolbar editor={editor} />
      <EditorContent
        editor={editor}
        className="prose prose-sm max-w-none p-4 min-h-[180px] focus:outline-none [&_.ProseMirror]:min-h-[160px] [&_.ProseMirror]:outline-none [&_.ProseMirror_p.is-editor-empty:first-child::before]:text-gray-400 [&_.ProseMirror_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)] [&_.ProseMirror_p.is-editor-empty:first-child::before]:float-left [&_.ProseMirror_p.is-editor-empty:first-child::before]:h-0 [&_.ProseMirror_p.is-editor-empty:first-child::before]:pointer-events-none"
      />
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/blocks/rich-text/toolbar.tsx src/components/blocks/rich-text/editor.tsx
git commit -m "feat: enhanced Tiptap toolbar with font family, size, color, alignment, spacing"
```

---

### Task 9: Fix Rich Text Formatting Translation (Viewer)

**Files:**
- Modify: `src/components/blocks/rich-text/viewer.tsx`
- Modify: `src/app/globals.css`

- [ ] **Step 1: Update viewer to preserve Tiptap formatting**

Replace the viewer's rendering to honor inline styles from Tiptap (text-align, color, font-family, font-size):

In `src/components/blocks/rich-text/viewer.tsx`, the current `dangerouslySetInnerHTML` approach works — but the `prose` class strips inline styles. Add custom CSS overrides.

In `src/app/globals.css`, add:

```css
/* Preserve Tiptap formatting in the prose viewer */
.rich-text-viewer.prose p:empty::before {
  content: '\00a0';  /* non-breaking space to preserve empty paragraphs */
  display: block;
}

.rich-text-viewer.prose p:empty {
  min-height: 1em;
}

/* Honor inline text-align from Tiptap */
.rich-text-viewer.prose p[style*="text-align"],
.rich-text-viewer.prose h1[style*="text-align"],
.rich-text-viewer.prose h2[style*="text-align"],
.rich-text-viewer.prose h3[style*="text-align"] {
  text-align: inherit;
}

/* Honor inline color from Tiptap */
.rich-text-viewer.prose span[style*="color"] {
  color: inherit;
}

/* Honor inline font-family from Tiptap */
.rich-text-viewer.prose span[style*="font-family"] {
  font-family: inherit;
}

/* Honor inline font-size from Tiptap */
.rich-text-viewer.prose span[style*="font-size"] {
  font-size: inherit;
}

/* Ensure list items render with proper markers */
.rich-text-viewer.prose ul {
  list-style-type: disc;
  padding-left: 1.5em;
}

.rich-text-viewer.prose ol {
  list-style-type: decimal;
  padding-left: 1.5em;
}
```

- [ ] **Step 2: Add the rich-text-viewer class to the viewer component**

In `src/components/blocks/rich-text/viewer.tsx`, change the prose container class:

```tsx
// OLD:
className="prose prose-xl max-w-none dark:prose-invert"

// NEW:
className="rich-text-viewer prose prose-xl max-w-none dark:prose-invert"
```

Apply to both the regular render and the sequence render.

- [ ] **Step 3: Commit**

```bash
git add src/components/blocks/rich-text/viewer.tsx src/app/globals.css
git commit -m "fix: preserve Tiptap formatting (whitespace, color, alignment, lists) in viewer"
```

---

### Task 10: Properties Panel Selection Sync Fix

**Files:**
- Modify: `src/components/editor/block-editor-panel.tsx`
- Modify: `src/components/editor/properties-panel.tsx`

- [ ] **Step 1: Add key prop to block editor panel**

In `src/components/editor/block-editor-panel.tsx`, find where `definition.EditorComponent` is rendered (around line 70). Wrap it with a key based on the block ID:

```tsx
// Find the Suspense wrapper and add key to it
<Suspense key={block.id} fallback={<div className="p-4 text-sm text-gray-400">Loading editor...</div>}>
  <definition.EditorComponent
    data={block.data}
    block={block}
    onChange={handleChange}
  />
</Suspense>
```

The `key={block.id}` forces React to unmount and remount the editor when a different block is selected, ensuring fresh Tiptap content.

- [ ] **Step 2: Also add key to the block editor wrapper in properties-panel.tsx**

In `src/components/editor/properties-panel.tsx`, find where `BlockEditorPanel` is rendered (around line 305). Add a key:

```tsx
<BlockEditorPanel
  key={entity.id}
  blockId={entity.id}
  blocks={blocks}
  onUpdate={onUpdateBlock}
  onDelete={() => onDelete?.(entity)}
/>
```

- [ ] **Step 3: Commit**

```bash
git add src/components/editor/block-editor-panel.tsx src/components/editor/properties-panel.tsx
git commit -m "fix: properties panel syncs content when switching between blocks"
```

---

### Task 11: react-grid-layout Editor Canvas

**Files:**
- Modify: `src/components/editor/slide-preview.tsx`

This is the core task: replace the vertical `SortableContext` block stack with a `react-grid-layout` canvas for content slides.

- [ ] **Step 1: Add react-grid-layout imports and CSS**

At the top of `slide-preview.tsx`:

```tsx
import GridLayout, { Layout } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import {
  GRID_COLS, GRID_MARGIN, GRID_CONTAINER_PADDING,
  RESIZE_HANDLES, computeRowHeight, getBlockGridLayout, DEFAULT_BLOCK_LAYOUT,
} from '@/lib/content/gridConstants';
```

- [ ] **Step 2: Add canvas size measurement**

Inside the SlidePreview component, add a ref and size state:

```tsx
const canvasRef = useRef<HTMLDivElement>(null);
const [canvasSize, setCanvasSize] = useState<{ width: number; height: number }>({ width: 600, height: 400 });

useEffect(() => {
  if (!canvasRef.current) return;
  const observer = new ResizeObserver(entries => {
    for (const entry of entries) {
      setCanvasSize({ width: entry.contentRect.width, height: entry.contentRect.height });
    }
  });
  observer.observe(canvasRef.current);
  return () => observer.disconnect();
}, []);
```

- [ ] **Step 3: Replace the vertical block stack with GridLayout for content slides**

Find the content slide rendering section (where `SortableContext` + `verticalListSortingStrategy` is used). Replace with:

```tsx
<div ref={canvasRef} className="flex-1 overflow-auto relative">
  {blocks.length === 0 ? (
    <div className="h-full flex items-center justify-center border-2 border-dashed border-slate-200 rounded-lg m-2">
      <p className="text-sm text-slate-400">Drag components here</p>
    </div>
  ) : (
    <GridLayout
      layout={blocks.map((block, index) => {
        const grid = getBlockGridLayout(block.data ?? {});
        return {
          i: block.id,
          x: grid.gridX,
          y: grid.gridY === 0 && index > 0 ? index * 2 : grid.gridY, // auto-stack legacy blocks
          w: grid.gridW,
          h: grid.gridH,
        };
      })}
      cols={GRID_COLS}
      rowHeight={computeRowHeight(canvasSize.height)}
      width={canvasSize.width}
      compactType="vertical"
      isResizable={true}
      isDraggable={true}
      resizeHandles={RESIZE_HANDLES as any}
      draggableHandle=".block-drag-handle"
      margin={GRID_MARGIN}
      containerPadding={GRID_CONTAINER_PADDING}
      onLayoutChange={(newLayout: Layout[]) => {
        // Update each block's grid position in the store
        for (const item of newLayout) {
          const block = blocks.find(b => b.id === item.i);
          if (!block) continue;
          const currentGrid = getBlockGridLayout(block.data ?? {});
          if (
            currentGrid.gridX !== item.x ||
            currentGrid.gridY !== item.y ||
            currentGrid.gridW !== item.w ||
            currentGrid.gridH !== item.h
          ) {
            onUpdateBlock(item.i, {
              ...block.data,
              gridX: item.x,
              gridY: item.y,
              gridW: item.w,
              gridH: item.h,
            });
          }
        }
      }}
    >
      {blocks.map(block => (
        <div
          key={block.id}
          className={`relative overflow-hidden rounded-lg transition-all cursor-default group ${
            selectedBlockId === block.id
              ? 'ring-2 ring-[#1E3A5F]'
              : 'ring-1 ring-slate-200 hover:ring-slate-300'
          }`}
          onClick={(e) => {
            e.stopPropagation();
            onSelectBlock(block.id);
          }}
        >
          {/* Block content */}
          <div className="absolute inset-0 overflow-hidden">
            <Suspense fallback={<div className="p-4 text-sm text-slate-400">Loading...</div>}>
              <LessonBlockRenderer block={block} />
            </Suspense>
          </div>

          {/* Drag handle */}
          <div
            className={`block-drag-handle absolute top-1 left-1 z-10 inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium cursor-grab active:cursor-grabbing backdrop-blur-sm transition-opacity ${
              selectedBlockId === block.id
                ? 'opacity-100 bg-[#1E3A5F]/80 text-white'
                : 'opacity-0 group-hover:opacity-100 bg-black/50 text-white/80'
            }`}
          >
            <GripVertical className="w-3 h-3" />
            <span className="capitalize">{block.block_type.replace('_', ' ')}</span>
          </div>

          {/* Delete button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDeleteBlock(block.id);
            }}
            className={`absolute top-1 right-1 z-10 w-5 h-5 rounded flex items-center justify-center transition-opacity backdrop-blur-sm text-white/60 hover:text-red-400 hover:bg-red-500/20 ${
              selectedBlockId === block.id
                ? 'opacity-100'
                : 'opacity-0 group-hover:opacity-100'
            }`}
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ))}
    </GridLayout>
  )}
</div>
```

- [ ] **Step 4: Add the necessary props to SlidePreview**

Ensure `onUpdateBlock` is passed through. In the SlidePreview props interface, add:

```typescript
onUpdateBlock: (blockId: string, data: Record<string, unknown>) => void;
```

And wire it up from `preview-panel.tsx` where SlidePreview is rendered.

- [ ] **Step 5: Add the GripVertical and X imports**

```typescript
import { GripVertical, X } from 'lucide-react';
```

- [ ] **Step 6: Commit**

```bash
git add src/components/editor/slide-preview.tsx src/components/editor/preview-panel.tsx
git commit -m "feat: react-grid-layout editor canvas with block resize and drag handles"
```

---

### Task 12: Inline Text Editing on Canvas

**Files:**
- Create: `src/components/blocks/rich-text/inline-editor.tsx`
- Modify: `src/components/editor/slide-preview.tsx`

- [ ] **Step 1: Create inline editor component**

```tsx
'use client';

import React, { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import { Color } from '@tiptap/extension-color';
import TextStyle from '@tiptap/extension-text-style';
import FontFamily from '@tiptap/extension-font-family';
import { RichTextToolbar } from './toolbar';

interface InlineRichTextEditorProps {
  html: string;
  onChange: (html: string) => void;
  onBlur: () => void;
}

export function InlineRichTextEditor({ html, onChange, onBlur }: InlineRichTextEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Image,
      Link.configure({ openOnClick: false }),
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Color,
      TextStyle,
      FontFamily,
    ],
    content: html,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    autofocus: 'end',
  });

  // Handle Escape key to exit inline editing
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onBlur();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onBlur]);

  return (
    <div
      className="absolute inset-0 z-20 flex flex-col bg-white"
      onClick={e => e.stopPropagation()}
    >
      {/* Floating toolbar above the block */}
      <div className="shrink-0 shadow-md">
        <RichTextToolbar editor={editor} />
      </div>
      <EditorContent
        editor={editor}
        className="flex-1 overflow-auto prose prose-xl max-w-none p-4 [&_.ProseMirror]:outline-none [&_.ProseMirror]:min-h-full"
      />
    </div>
  );
}
```

- [ ] **Step 2: Integrate inline editing into SlidePreview**

In `slide-preview.tsx`, add state for inline editing:

```typescript
const [inlineEditingBlockId, setInlineEditingBlockId] = useState<string | null>(null);
```

In the block rendering loop within GridLayout, replace the content div for rich_text blocks when they're being inline-edited:

```tsx
{/* Block content */}
<div className="absolute inset-0 overflow-hidden">
  {inlineEditingBlockId === block.id && block.block_type === 'rich_text' ? (
    <InlineRichTextEditor
      html={block.data?.html || ''}
      onChange={(html) => {
        onUpdateBlock(block.id, { ...block.data, html });
      }}
      onBlur={() => setInlineEditingBlockId(null)}
    />
  ) : (
    <Suspense fallback={<div className="p-4 text-sm text-slate-400">Loading...</div>}>
      <LessonBlockRenderer block={block} />
    </Suspense>
  )}
</div>
```

Add double-click handler to enter inline editing:

```tsx
onDoubleClick={(e) => {
  if (block.block_type === 'rich_text') {
    e.stopPropagation();
    setInlineEditingBlockId(block.id);
  }
}}
```

- [ ] **Step 3: Add import**

```typescript
import { InlineRichTextEditor } from '@/components/blocks/rich-text/inline-editor';
```

- [ ] **Step 4: Commit**

```bash
git add src/components/blocks/rich-text/inline-editor.tsx src/components/editor/slide-preview.tsx
git commit -m "feat: inline rich text editing on canvas with double-click to edit"
```

---

### Task 13: Cross-Lesson Slide Movement — Store & DB

**Files:**
- Modify: `src/lib/stores/editor-store.ts`
- Modify: `src/lib/db/slides.ts`

- [ ] **Step 1: Add moveSlideToLesson to the DB layer**

In `src/lib/db/slides.ts`, add after the existing `reorderSlides` function:

```typescript
export async function moveSlideToLesson(
  supabase: SupabaseClient,
  slideId: string,
  fromLessonId: string,
  toLessonId: string,
  institutionId: string,
): Promise<{ success: boolean; error?: string }> {
  // 1. Get the target lesson's current max order_index
  const { data: targetSlides } = await supabase
    .from('slides')
    .select('order_index')
    .eq('lesson_id', toLessonId)
    .is('deleted_at', null)
    .order('order_index', { ascending: false })
    .limit(1);

  const nextIndex = (targetSlides?.[0]?.order_index ?? -1) + 1;

  // 2. Update the slide's lesson_id and order_index
  const { error } = await supabase
    .from('slides')
    .update({ lesson_id: toLessonId, order_index: nextIndex, updated_at: new Date().toISOString() })
    .eq('id', slideId);

  if (error) return { success: false, error: error.message };

  // 3. Reindex source lesson slides
  const { data: sourceSlides } = await supabase
    .from('slides')
    .select('id')
    .eq('lesson_id', fromLessonId)
    .is('deleted_at', null)
    .order('order_index', { ascending: true });

  if (sourceSlides && sourceSlides.length > 0) {
    await reorderSlides(supabase, fromLessonId, sourceSlides.map(s => s.id), institutionId);
  }

  // 4. Log activity
  await supabase.from('activity_log').insert({
    institution_id: institutionId,
    entity_type: 'slide',
    entity_id: slideId,
    action: 'move',
    details: { from_lesson_id: fromLessonId, to_lesson_id: toLessonId },
  });

  return { success: true };
}
```

- [ ] **Step 2: Add moveSlideToLesson action to editor store**

In `src/lib/stores/editor-store.ts`, add to the store actions:

```typescript
moveSlideToLesson: (slideId: string, fromLessonId: string, toLessonId: string) => {
  const state = get();
  state.push('moveSlide', state.snapshot());

  const fromSlides = [...(state.slides.get(fromLessonId) ?? [])];
  const toSlides = [...(state.slides.get(toLessonId) ?? [])];

  const slideIndex = fromSlides.findIndex(s => s.id === slideId);
  if (slideIndex === -1) return;

  const [slide] = fromSlides.splice(slideIndex, 1);
  const movedSlide = { ...slide, lesson_id: toLessonId, order_index: toSlides.length };
  toSlides.push(movedSlide);

  // Reindex source
  fromSlides.forEach((s, i) => { s.order_index = i; });

  const newSlides = new Map(state.slides);
  newSlides.set(fromLessonId, fromSlides);
  newSlides.set(toLessonId, toSlides);

  // Move blocks: update the blocks map key if blocks are keyed by slide
  // Blocks are keyed by slideId, so no change needed — they stay with their slide

  set({ slides: newSlides, isDirty: true });
},
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/db/slides.ts src/lib/stores/editor-store.ts
git commit -m "feat: moveSlideToLesson in DB and editor store"
```

---

### Task 14: Cross-Lesson Slide Movement — UI (Context Menu + DnD)

**Files:**
- Create: `src/components/editor/context-menu.tsx`
- Create: `src/components/editor/move-slide-dialog.tsx`
- Modify: `src/components/editor/structure-panel.tsx`

- [ ] **Step 1: Create the Move Slide dialog**

```tsx
'use client';

import React, { useState } from 'react';
import { ChevronRight, FolderOpen, FileText } from 'lucide-react';

interface MoveSlideDialogProps {
  modules: { id: string; title: string }[];
  lessons: Map<string, { id: string; title: string }[]>;
  currentLessonId: string;
  onMove: (targetLessonId: string) => void;
  onClose: () => void;
}

export function MoveSlideDialog({
  modules,
  lessons,
  currentLessonId,
  onMove,
  onClose,
}: MoveSlideDialogProps) {
  const [expandedModule, setExpandedModule] = useState<string | null>(null);

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-2xl w-80 max-h-96 flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-4 py-3 border-b border-slate-100">
          <h3 className="text-sm font-bold text-slate-900">Move slide to...</h3>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {modules.map(mod => (
            <div key={mod.id}>
              <button
                onClick={() => setExpandedModule(expandedModule === mod.id ? null : mod.id)}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-lg"
              >
                <FolderOpen className="w-4 h-4 text-slate-400" />
                <span className="flex-1 text-left truncate">{mod.title}</span>
                <ChevronRight
                  className={`w-4 h-4 text-slate-400 transition-transform ${
                    expandedModule === mod.id ? 'rotate-90' : ''
                  }`}
                />
              </button>
              {expandedModule === mod.id && (
                <div className="ml-4">
                  {(lessons.get(mod.id) ?? []).map(lesson => (
                    <button
                      key={lesson.id}
                      disabled={lesson.id === currentLessonId}
                      onClick={() => {
                        onMove(lesson.id);
                        onClose();
                      }}
                      className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg ${
                        lesson.id === currentLessonId
                          ? 'text-slate-300 cursor-not-allowed'
                          : 'text-slate-600 hover:bg-blue-50 hover:text-[#1E3A5F]'
                      }`}
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span className="truncate">{lesson.title}</span>
                      {lesson.id === currentLessonId && (
                        <span className="text-xs text-slate-300 ml-auto">(current)</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create the context menu component**

```tsx
'use client';

import React, { useEffect, useRef } from 'react';
import { Copy, CopyPlus, Move, Trash2 } from 'lucide-react';

interface ContextMenuProps {
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
}

export interface ContextMenuItem {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  destructive?: boolean;
  disabled?: boolean;
}

export function ContextMenu({ x, y, items, onClose }: ContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="fixed z-[90] bg-white rounded-lg shadow-xl border border-slate-200 py-1 min-w-[160px]"
      style={{ left: x, top: y }}
    >
      {items.map((item, i) => (
        <button
          key={i}
          onClick={() => {
            item.onClick();
            onClose();
          }}
          disabled={item.disabled}
          className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm transition-colors ${
            item.destructive
              ? 'text-red-600 hover:bg-red-50'
              : item.disabled
                ? 'text-slate-300 cursor-not-allowed'
                : 'text-slate-700 hover:bg-slate-50'
          }`}
        >
          {item.icon}
          {item.label}
        </button>
      ))}
    </div>
  );
}

/** Convenience: build slide context menu items */
export function slideContextMenuItems(opts: {
  onMoveToLesson: () => void;
  onDelete: () => void;
}): ContextMenuItem[] {
  return [
    { label: 'Move to...', icon: <Move className="w-4 h-4" />, onClick: opts.onMoveToLesson },
    { label: 'Delete', icon: <Trash2 className="w-4 h-4" />, onClick: opts.onDelete, destructive: true },
  ];
}

/** Convenience: build block context menu items */
export function blockContextMenuItems(opts: {
  onDuplicate: () => void;
  onCopyTo: () => void;
  onDelete: () => void;
}): ContextMenuItem[] {
  return [
    { label: 'Duplicate', icon: <CopyPlus className="w-4 h-4" />, onClick: opts.onDuplicate },
    { label: 'Copy to...', icon: <Copy className="w-4 h-4" />, onClick: opts.onCopyTo },
    { label: 'Delete', icon: <Trash2 className="w-4 h-4" />, onClick: opts.onDelete, destructive: true },
  ];
}
```

- [ ] **Step 3: Add right-click handler to slide items in structure-panel.tsx**

In the structure panel, wherever slide items are rendered (in the `LessonNode` or `SlideList` child component), add `onContextMenu`:

```tsx
const [contextMenu, setContextMenu] = useState<{ x: number; y: number; slideId: string; lessonId: string } | null>(null);
const [moveDialog, setMoveDialog] = useState<{ slideId: string; lessonId: string } | null>(null);

// On the slide item element:
onContextMenu={(e) => {
  e.preventDefault();
  setContextMenu({ x: e.clientX, y: e.clientY, slideId: slide.id, lessonId: lesson.id });
}}

// Render context menu:
{contextMenu && (
  <ContextMenu
    x={contextMenu.x}
    y={contextMenu.y}
    items={slideContextMenuItems({
      onMoveToLesson: () => setMoveDialog({ slideId: contextMenu.slideId, lessonId: contextMenu.lessonId }),
      onDelete: () => onDelete?.({ type: 'slide', id: contextMenu.slideId }),
    })}
    onClose={() => setContextMenu(null)}
  />
)}

// Render move dialog:
{moveDialog && (
  <MoveSlideDialog
    modules={modules}
    lessons={lessonMap}
    currentLessonId={moveDialog.lessonId}
    onMove={(targetLessonId) => {
      onMoveSlide(moveDialog.slideId, moveDialog.lessonId, targetLessonId);
    }}
    onClose={() => setMoveDialog(null)}
  />
)}
```

- [ ] **Step 4: Wire up onMoveSlide from course-editor-shell.tsx**

In `course-editor-shell.tsx`, add a handler:

```typescript
const handleMoveSlide = async (slideId: string, fromLessonId: string, toLessonId: string) => {
  const supabase = createClient();
  const result = await moveSlideToLesson(supabase, slideId, fromLessonId, toLessonId, institutionId);
  if (result.success) {
    store.moveSlideToLesson(slideId, fromLessonId, toLessonId);
    toast.success('Slide moved');
  } else {
    toast.error('Failed to move slide');
  }
};
```

Pass it down to the structure panel as `onMoveSlide`.

- [ ] **Step 5: Commit**

```bash
git add src/components/editor/context-menu.tsx src/components/editor/move-slide-dialog.tsx src/components/editor/structure-panel.tsx src/components/editor/course-editor-shell.tsx
git commit -m "feat: cross-lesson slide movement via context menu with Move-to dialog"
```

---

### Task 15: Cross-Lesson Slide DnD in Structure Panel

**Files:**
- Modify: `src/components/editor/structure-panel.tsx`
- Modify: `src/components/editor/dnd/editor-dnd-context.tsx`

- [ ] **Step 1: Make slide items draggable across lesson boundaries**

In the structure panel's slide list rendering, add `useDraggable` from @dnd-kit to each slide item:

```tsx
import { useDraggable, useDroppable } from '@dnd-kit/core';

// On each slide item:
const { attributes, listeners, setNodeRef: setDragRef, isDragging } = useDraggable({
  id: `slide-${slide.id}`,
  data: { source: 'structure-slide', slideId: slide.id, fromLessonId: lesson.id },
});
```

On each lesson node, add `useDroppable`:

```tsx
const { setNodeRef: setDropRef, isOver } = useDroppable({
  id: `lesson-drop-${lesson.id}`,
  data: { type: 'lesson', lessonId: lesson.id },
});
```

Add visual feedback when a slide is being dragged over a lesson:

```tsx
<div
  ref={setDropRef}
  className={`${isOver ? 'bg-blue-50 ring-2 ring-blue-300 rounded-lg' : ''}`}
>
  {/* lesson content */}
</div>
```

- [ ] **Step 2: Handle cross-lesson drop in editor-dnd-context.tsx**

In `editor-dnd-context.tsx`, add handling for `source: 'structure-slide'` in the `onDragEnd` callback:

```typescript
if (active.data.current?.source === 'structure-slide' && over?.data.current?.type === 'lesson') {
  const { slideId, fromLessonId } = active.data.current;
  const toLessonId = over.data.current.lessonId;
  if (fromLessonId !== toLessonId) {
    onMoveSlide?.(slideId, fromLessonId, toLessonId);
  }
}
```

Add `onMoveSlide` to the EditorDndContext props:

```typescript
onMoveSlide?: (slideId: string, fromLessonId: string, toLessonId: string) => void;
```

- [ ] **Step 3: Commit**

```bash
git add src/components/editor/structure-panel.tsx src/components/editor/dnd/editor-dnd-context.tsx
git commit -m "feat: drag-and-drop slides between lessons in structure panel"
```

---

### Task 16: Block Duplication — Store & DB

**Files:**
- Modify: `src/lib/db/blocks.ts`
- Modify: `src/lib/stores/editor-store.ts`

- [ ] **Step 1: Add duplicateBlock to DB layer**

In `src/lib/db/blocks.ts`, add:

```typescript
export async function duplicateBlock(
  supabase: SupabaseClient,
  sourceBlock: { id: string; slide_id: string; block_type: string; data: Record<string, unknown>; order_index: number },
  institutionId: string,
  targetSlideId?: string,
): Promise<{ data: any; error: any }> {
  const newData = JSON.parse(JSON.stringify(sourceBlock.data)); // deep clone

  // If duplicating to same slide, shift grid position down
  if (!targetSlideId || targetSlideId === sourceBlock.slide_id) {
    if (typeof newData.gridY === 'number' && typeof newData.gridH === 'number') {
      newData.gridY = newData.gridY + newData.gridH;
    }
  } else {
    // Reset grid position for cross-slide copy
    newData.gridX = 0;
    newData.gridY = 0;
    newData.gridW = 12;
    newData.gridH = 2;
  }

  return createBlock(supabase, {
    lesson_id: '', // will be resolved from slide
    slide_id: targetSlideId || sourceBlock.slide_id,
    block_type: sourceBlock.block_type,
    data: newData,
    order_index: sourceBlock.order_index + 1,
    institution_id: institutionId,
  });
}
```

Note: The `lesson_id` field needs to be resolved. Check if `createBlock` requires it from the slide. If so, look up the slide's lesson_id first. Adjust the implementation based on the actual `createBlock` signature which takes `lesson_id` as required. We'll need to pass it or look it up.

Updated approach — pass lesson_id:

```typescript
export async function duplicateBlock(
  supabase: SupabaseClient,
  sourceBlock: { id: string; slide_id: string; block_type: string; data: Record<string, unknown>; order_index: number },
  lessonId: string,
  institutionId: string,
  targetSlideId?: string,
  targetLessonId?: string,
): Promise<{ data: any; error: any }> {
  const newData = JSON.parse(JSON.stringify(sourceBlock.data));

  const isSameSlide = !targetSlideId || targetSlideId === sourceBlock.slide_id;
  if (isSameSlide && typeof newData.gridY === 'number' && typeof newData.gridH === 'number') {
    newData.gridY = newData.gridY + newData.gridH;
  } else if (!isSameSlide) {
    newData.gridX = 0;
    newData.gridY = 0;
    newData.gridW = 12;
    newData.gridH = 2;
  }

  return createBlock(supabase, {
    lesson_id: targetLessonId || lessonId,
    slide_id: targetSlideId || sourceBlock.slide_id,
    block_type: sourceBlock.block_type,
    data: newData,
    order_index: isSameSlide ? sourceBlock.order_index + 1 : 999, // will be reindexed
    institution_id: institutionId,
  });
}
```

- [ ] **Step 2: Add duplicateBlock action to editor store**

```typescript
duplicateBlock: (slideId: string, blockId: string, newBlockId: string, newData: Record<string, unknown>) => {
  const state = get();
  state.push('duplicateBlock', state.snapshot());

  const blocks = [...(state.blocks.get(slideId) ?? [])];
  const sourceIndex = blocks.findIndex(b => b.id === blockId);
  if (sourceIndex === -1) return;

  const source = blocks[sourceIndex];
  const newBlock = {
    ...source,
    id: newBlockId,
    data: newData,
    order_index: source.order_index + 1,
  };

  // Shift subsequent blocks
  for (let i = sourceIndex + 1; i < blocks.length; i++) {
    blocks[i] = { ...blocks[i], order_index: blocks[i].order_index + 1 };
  }

  blocks.splice(sourceIndex + 1, 0, newBlock);

  const newBlocks = new Map(state.blocks);
  newBlocks.set(slideId, blocks);

  set({ blocks: newBlocks, isDirty: true, selectedEntity: { type: 'block', id: newBlockId } });
},
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/db/blocks.ts src/lib/stores/editor-store.ts
git commit -m "feat: block duplication in DB layer and editor store"
```

---

### Task 17: Block Duplication & Copy-To — UI

**Files:**
- Create: `src/components/editor/copy-block-dialog.tsx`
- Modify: `src/components/editor/slide-preview.tsx`
- Modify: `src/components/editor/course-editor-shell.tsx`

- [ ] **Step 1: Create Copy Block dialog**

```tsx
'use client';

import React, { useState } from 'react';
import { ChevronRight, FolderOpen, FileText, Layers } from 'lucide-react';

interface CopyBlockDialogProps {
  modules: { id: string; title: string }[];
  lessons: Map<string, { id: string; title: string }[]>;
  slides: Map<string, { id: string; order_index: number }[]>;
  onCopy: (targetSlideId: string, targetLessonId: string) => void;
  onClose: () => void;
}

export function CopyBlockDialog({
  modules,
  lessons,
  slides,
  onCopy,
  onClose,
}: CopyBlockDialogProps) {
  const [expandedModule, setExpandedModule] = useState<string | null>(null);
  const [expandedLesson, setExpandedLesson] = useState<string | null>(null);

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-2xl w-80 max-h-[28rem] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-4 py-3 border-b border-slate-100">
          <h3 className="text-sm font-bold text-slate-900">Copy block to...</h3>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {modules.map(mod => (
            <div key={mod.id}>
              <button
                onClick={() => setExpandedModule(expandedModule === mod.id ? null : mod.id)}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-lg"
              >
                <FolderOpen className="w-4 h-4 text-slate-400" />
                <span className="flex-1 text-left truncate">{mod.title}</span>
                <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform ${expandedModule === mod.id ? 'rotate-90' : ''}`} />
              </button>
              {expandedModule === mod.id && (lessons.get(mod.id) ?? []).map(lesson => (
                <div key={lesson.id} className="ml-4">
                  <button
                    onClick={() => setExpandedLesson(expandedLesson === lesson.id ? null : lesson.id)}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50 rounded-lg"
                  >
                    <FileText className="w-3.5 h-3.5 text-slate-400" />
                    <span className="flex-1 text-left truncate">{lesson.title}</span>
                    <ChevronRight className={`w-3.5 h-3.5 text-slate-400 transition-transform ${expandedLesson === lesson.id ? 'rotate-90' : ''}`} />
                  </button>
                  {expandedLesson === lesson.id && (slides.get(lesson.id) ?? []).map((slide, idx) => (
                    <button
                      key={slide.id}
                      onClick={() => {
                        onCopy(slide.id, lesson.id);
                        onClose();
                      }}
                      className="w-full flex items-center gap-2 px-3 py-1 text-sm text-slate-500 hover:bg-blue-50 hover:text-[#1E3A5F] rounded-lg ml-4"
                    >
                      <Layers className="w-3 h-3 text-slate-400" />
                      <span>Slide {idx + 1}</span>
                    </button>
                  ))}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Add right-click context menu to blocks on the canvas**

In `slide-preview.tsx`, add context menu state and handlers:

```typescript
const [blockContextMenu, setBlockContextMenu] = useState<{ x: number; y: number; blockId: string; slideId: string } | null>(null);
const [copyBlockDialog, setCopyBlockDialog] = useState<{ blockId: string; slideId: string } | null>(null);
```

On each block in the GridLayout:

```tsx
onContextMenu={(e) => {
  e.preventDefault();
  e.stopPropagation();
  setBlockContextMenu({ x: e.clientX, y: e.clientY, blockId: block.id, slideId: currentSlideId });
}}
```

Render the context menu:

```tsx
{blockContextMenu && (
  <ContextMenu
    x={blockContextMenu.x}
    y={blockContextMenu.y}
    items={blockContextMenuItems({
      onDuplicate: () => onDuplicateBlock(blockContextMenu.blockId, blockContextMenu.slideId),
      onCopyTo: () => setCopyBlockDialog({ blockId: blockContextMenu.blockId, slideId: blockContextMenu.slideId }),
      onDelete: () => onDeleteBlock(blockContextMenu.blockId),
    })}
    onClose={() => setBlockContextMenu(null)}
  />
)}
```

- [ ] **Step 3: Wire up handlers in course-editor-shell.tsx**

```typescript
const handleDuplicateBlock = async (blockId: string, slideId: string) => {
  // Find the source block
  const blocks = store.blocks.get(slideId);
  const sourceBlock = blocks?.find(b => b.id === blockId);
  if (!sourceBlock) return;

  // Find lesson ID for this slide
  let lessonId = '';
  for (const [lid, slides] of store.slides.entries()) {
    if (slides.some(s => s.id === slideId)) { lessonId = lid; break; }
  }

  const supabase = createClient();
  const { data, error } = await duplicateBlock(supabase, sourceBlock, lessonId, institutionId);
  if (error) { toast.error('Failed to duplicate block'); return; }

  store.duplicateBlock(slideId, blockId, data.id, data.data);
  toast.success('Block duplicated');
};

const handleCopyBlockTo = async (blockId: string, sourceSlideId: string, targetSlideId: string, targetLessonId: string) => {
  const blocks = store.blocks.get(sourceSlideId);
  const sourceBlock = blocks?.find(b => b.id === blockId);
  if (!sourceBlock) return;

  let lessonId = '';
  for (const [lid, slides] of store.slides.entries()) {
    if (slides.some(s => s.id === sourceSlideId)) { lessonId = lid; break; }
  }

  const supabase = createClient();
  const { data, error } = await duplicateBlock(supabase, sourceBlock, lessonId, institutionId, targetSlideId, targetLessonId);
  if (error) { toast.error('Failed to copy block'); return; }

  // Add to store
  const targetBlocks = [...(store.blocks.get(targetSlideId) ?? []), { ...data, id: data.id }];
  const newBlocks = new Map(store.blocks);
  newBlocks.set(targetSlideId, targetBlocks);
  store.set({ blocks: newBlocks, isDirty: true });

  toast.success('Block copied');
};
```

Pass these handlers down to SlidePreview.

- [ ] **Step 4: Commit**

```bash
git add src/components/editor/copy-block-dialog.tsx src/components/editor/slide-preview.tsx src/components/editor/course-editor-shell.tsx
git commit -m "feat: block duplication and copy-to-slide via context menu"
```

---

### Task 18: Integration Test & Build Verification

**Files:**
- None (verification only)

- [ ] **Step 1: Run the build to check for type errors**

```bash
cd "c:/Users/devel/OneDrive/Documents/RethinkReality/GANSID-LMS/Lms"
npx next build --no-lint 2>&1 | tail -30
```

Expected: Build succeeds.

- [ ] **Step 2: Run existing tests**

```bash
cd "c:/Users/devel/OneDrive/Documents/RethinkReality/GANSID-LMS/Lms"
npm test 2>&1
```

Expected: All existing tests pass.

- [ ] **Step 3: Start dev server and verify student viewer**

```bash
cd "c:/Users/devel/OneDrive/Documents/RethinkReality/GANSID-LMS/Lms"
npm run dev -- -p 3001
```

Manual checks:
- Navigate to `http://localhost:3001/gansid/student` — full navbar visible
- Open a course — slim navbar appears, full navbar hidden
- Press `F` — fullscreen mode
- Press `Escape` — exits fullscreen
- Check large screen (>1280px) — content centered with max-width
- Check mobile — blocks stack vertically

- [ ] **Step 4: Verify editor**

Manual checks at `http://localhost:3001/gansid/admin/courses/[id]/editor`:
- Blocks render in react-grid-layout grid
- Can resize blocks by grabbing edges
- Can drag blocks side-by-side
- Double-click rich text block → inline editing
- Right-click slide → Move to... → pick lesson → slide moves
- Right-click block → Duplicate → block clones below
- Right-click block → Copy to... → pick target slide → block copies
- Select different text blocks → properties panel updates correctly

- [ ] **Step 5: Commit any fixes**

```bash
git add -A
git commit -m "fix: integration fixes from build and manual verification"
```
