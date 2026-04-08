# tldraw Canvas Slides Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add freeform canvas slides (powered by tldraw) as an alternative to block-based slides in the GANSID LMS editor and student viewer.

**Architecture:** Canvas slides are a new `slide_type = 'canvas'` that store a tldraw document snapshot in a `canvas_data` jsonb column. Custom tldraw `ShapeUtil` classes render existing LMS block viewers (quiz, callout, CTA) inside the canvas. The tldraw editor/viewer are dynamically imported to avoid impacting block-based lessons.

**Tech Stack:** tldraw v4.x, Next.js 16 (dynamic import, ssr: false), React 19, Supabase (Postgres jsonb), Zustand (editor store)

**Spec:** `docs/superpowers/specs/2026-04-08-tldraw-canvas-slides-design.md`

---

## File Map

### New Files

| File | Responsibility |
|---|---|
| `src/lib/canvas/shapes/lms-quiz-shape.tsx` | ShapeUtil for quiz_inline blocks on canvas |
| `src/lib/canvas/shapes/lms-callout-shape.tsx` | ShapeUtil for callout blocks on canvas |
| `src/lib/canvas/shapes/lms-cta-shape.tsx` | ShapeUtil for CTA blocks on canvas |
| `src/lib/canvas/shapes/lms-video-shape.tsx` | ShapeUtil for video blocks on canvas |
| `src/lib/canvas/register-shapes.ts` | Collects all custom ShapeUtils into a single array export |
| `src/lib/canvas/canvas-utils.ts` | Snapshot save/load helpers, frame bounds, viewport fitting |
| `src/components/editor/canvas-slide-editor.tsx` | tldraw editor wrapper for canvas slides (dynamic import) |
| `src/components/student/canvas-slide-viewer.tsx` | Read-only tldraw viewer for students/preview (dynamic import) |
| `supabase/migrations/020_add_canvas_data_to_slides.sql` | Migration: add `canvas_data` jsonb column |

### Modified Files

| File | Change |
|---|---|
| `src/types/index.ts` (~line 222, 226) | Add `'canvas'` to `SlideType`, add `canvas_data` to `Slide` interface |
| `src/lib/db/slides.ts` (~line 20, 63) | Add `canvas_data` to `CreateSlideInput` and `updateSlide` |
| `src/lib/db/editor.ts` (~line 88) | Include `canvas_data` in slides query |
| `src/components/student/course-viewer.tsx` (~line 199, 688) | Fetch `canvas_data`, branch rendering for canvas slides |
| `src/components/editor/preview-panel.tsx` (~line 129) | Render `CanvasSlideEditor` when `slide_type === 'canvas'` |
| `src/components/editor/course-editor-shell.tsx` (~line 80, 208) | Serialize canvas data in save, handle canvas slide creation |
| `src/components/editor/structure-panel.tsx` (~line 79) | Add "Add Canvas Slide" option |
| `src/components/editor/slide-template-picker.tsx` (~line 16) | Add canvas template option |
| `src/components/editor/editor-toolbar.tsx` (~line 12) | Add device preview toggle |
| `package.json` | Add `tldraw` dependency |

---

## Task 1: Install tldraw and Add Database Migration

**Files:**
- Modify: `package.json`
- Create: `supabase/migrations/020_add_canvas_data_to_slides.sql`
- Modify: `src/types/index.ts:222,226-237`

- [ ] **Step 1: Install tldraw**

```bash
npm install tldraw
```

- [ ] **Step 2: Create migration file**

Create `supabase/migrations/020_add_canvas_data_to_slides.sql`:

```sql
-- Migration 020: Add canvas_data column for tldraw freeform canvas slides
-- Stores the tldraw document snapshot (shapes, pages, bindings) as JSON
-- Only populated when slide_type = 'canvas'; NULL for block-based slides

ALTER TABLE slides ADD COLUMN IF NOT EXISTS canvas_data jsonb DEFAULT NULL;

COMMENT ON COLUMN slides.canvas_data IS 'tldraw document snapshot JSON. Only used when slide_type = canvas.';
```

- [ ] **Step 3: Apply migration via Supabase MCP**

Use the Supabase MCP `apply_migration` tool with the SQL above against project `ylmnbbrpaeiogdeqezlo`.

- [ ] **Step 4: Update TypeScript types**

In `src/types/index.ts`, update the `SlideType` union (~line 222):

```typescript
export type SlideType = 'title' | 'content' | 'media' | 'quiz' | 'disclaimer' | 'interactive' | 'cta' | 'canvas';
```

In the `Slide` interface (~line 226-237), add after `settings`:

```typescript
  canvas_data: Record<string, unknown> | null;
```

- [ ] **Step 5: Update DB layer — slides.ts**

In `src/lib/db/slides.ts`, add `canvas_data` to `CreateSlideInput` (~line 20):

```typescript
export interface CreateSlideInput {
  lesson_id: string;
  slide_type: SlideType;
  title?: string;
  order_index: number;
  status?: SlideStatus;
  settings?: Record<string, unknown>;
  canvas_data?: Record<string, unknown> | null;
}
```

In the `createSlide()` function (~line 29), ensure `canvas_data` is included in the insert object:

```typescript
const { data, error } = await supabase
  .from('slides')
  .insert({
    lesson_id: input.lesson_id,
    slide_type: input.slide_type,
    title: input.title ?? null,
    order_index: input.order_index,
    status: input.status ?? 'draft',
    settings: input.settings ?? {},
    canvas_data: input.canvas_data ?? null,
  })
  .select()
  .single();
```

In `updateSlide()` (~line 63), add `canvas_data` to the allowed update fields. The update function should accept and pass through `canvas_data` when provided.

- [ ] **Step 6: Update editor data loader**

In `src/lib/db/editor.ts` (~line 88), add `canvas_data` to the slides select query:

```typescript
const { data: slides } = await supabase
  .from('slides')
  .select('id, lesson_id, slide_type, title, order_index, status, settings, canvas_data, deleted_at')
  .in('lesson_id', lessonIds)
  .is('deleted_at', null)
  .order('order_index');
```

- [ ] **Step 7: Update student viewer data fetch**

In `src/components/student/course-viewer.tsx` (~line 199), add `canvas_data` to the slides query:

```typescript
const { data: slidesData } = await supabase
  .from('slides')
  .select('id, lesson_id, order_index, settings, canvas_data, slide_type')
  .in('lesson_id', lessonIds)
  .is('deleted_at', null)
  .order('order_index');
```

- [ ] **Step 8: Verify dev server starts clean**

```bash
npm run dev -- -p 3001
```

Visit `http://localhost:3001/gansid/admin` — confirm existing editor still works. No regressions.

- [ ] **Step 9: Commit**

```bash
git add package.json package-lock.json supabase/migrations/020_add_canvas_data_to_slides.sql src/types/index.ts src/lib/db/slides.ts src/lib/db/editor.ts src/components/student/course-viewer.tsx
git commit -m "feat: add canvas_data column and tldraw dependency for freeform canvas slides"
```

---

## Task 2: Canvas Utilities and Custom Shape Infrastructure

**Files:**
- Create: `src/lib/canvas/canvas-utils.ts`
- Create: `src/lib/canvas/register-shapes.ts`
- Create: `src/lib/canvas/shapes/lms-quiz-shape.tsx`
- Create: `src/lib/canvas/shapes/lms-callout-shape.tsx`
- Create: `src/lib/canvas/shapes/lms-cta-shape.tsx`
- Create: `src/lib/canvas/shapes/lms-video-shape.tsx`

- [ ] **Step 1: Create canvas-utils.ts**

Create `src/lib/canvas/canvas-utils.ts`:

```typescript
import type { Editor } from 'tldraw';

/** Default canvas frame dimensions (16:9) */
export const CANVAS_FRAME = { width: 1920, height: 1080 } as const;

/** Device preview viewport widths */
export const DEVICE_VIEWPORTS = {
  desktop: 1920,
  tablet: 768,
  mobile: 375,
} as const;

export type DevicePreview = keyof typeof DEVICE_VIEWPORTS;

/**
 * Serialize the tldraw editor state to a JSON-safe document snapshot.
 * Only captures the document (shapes, pages, bindings) — not session state.
 */
export function serializeCanvas(editor: Editor): Record<string, unknown> {
  const snapshot = editor.store.getSnapshot('document');
  return JSON.parse(JSON.stringify(snapshot));
}

/**
 * Load a previously saved canvas snapshot into the editor.
 * Clears existing content first, then loads the snapshot.
 */
export function loadCanvasSnapshot(
  editor: Editor,
  canvasData: Record<string, unknown>
): void {
  editor.store.loadSnapshot(canvasData as Parameters<typeof editor.store.loadSnapshot>[0]);
}

/**
 * Fit the camera to show all content, with padding.
 */
export function fitCanvasToContent(editor: Editor): void {
  editor.zoomToFit({ animation: { duration: 0 } });
}

/**
 * Create a locked, non-editable frame rectangle that marks the 16:9 design area.
 * Called once when a new canvas slide is created.
 */
export function createDesignFrame(editor: Editor): void {
  const frameId = createShapeId('design-frame');
  editor.createShape({
    id: frameId,
    type: 'geo',
    x: 0,
    y: 0,
    props: {
      w: CANVAS_FRAME.width,
      h: CANVAS_FRAME.height,
      geo: 'rectangle',
      fill: 'solid',
      color: 'white',
      dash: 'dashed',
      opacity: 0.5,
    },
  });
  editor.toggleLock([frameId]);
  // Send to back so content renders above it
  editor.sendToBack([frameId]);
}
```

Add `createShapeId` to the import from `tldraw` at the top of the file.

- [ ] **Step 2: Create the quiz custom shape**

Create `src/lib/canvas/shapes/lms-quiz-shape.tsx`:

```tsx
import {
  ShapeUtil,
  HTMLContainer,
  Rectangle2d,
  TLBaseShape,
  T,
} from 'tldraw';

/** Props stored inside the tldraw document for this shape */
export type LmsQuizShapeProps = {
  blockId: string;
  w: number;
  h: number;
};

export type LmsQuizShape = TLBaseShape<'lms-quiz', LmsQuizShapeProps>;

export class LmsQuizShapeUtil extends ShapeUtil<LmsQuizShape> {
  static override type = 'lms-quiz' as const;

  static override props = {
    blockId: T.string,
    w: T.number,
    h: T.number,
  };

  getDefaultProps(): LmsQuizShapeProps {
    return { blockId: '', w: 500, h: 400 };
  }

  getGeometry(shape: LmsQuizShape) {
    return new Rectangle2d({
      width: shape.props.w,
      height: shape.props.h,
      isFilled: true,
    });
  }

  override canResize() {
    return true;
  }

  override onResize(shape: LmsQuizShape, info: { newPoint: { x: number; y: number }; scaleX: number; scaleY: number }) {
    return {
      props: {
        w: Math.max(200, shape.props.w * info.scaleX),
        h: Math.max(150, shape.props.h * info.scaleY),
      },
    };
  }

  component(shape: LmsQuizShape) {
    // The actual quiz rendering is handled by a React context provider
    // that supplies the block data. See canvas-slide-editor.tsx / canvas-slide-viewer.tsx.
    return (
      <HTMLContainer
        style={{
          width: shape.props.w,
          height: shape.props.h,
          overflow: 'auto',
          pointerEvents: 'all',
        }}
      >
        <div
          data-lms-block-id={shape.props.blockId}
          data-lms-block-type="quiz_inline"
          style={{ width: '100%', height: '100%' }}
        />
      </HTMLContainer>
    );
  }

  indicator(shape: LmsQuizShape) {
    return <rect width={shape.props.w} height={shape.props.h} />;
  }
}
```

- [ ] **Step 3: Create the callout custom shape**

Create `src/lib/canvas/shapes/lms-callout-shape.tsx`:

```tsx
import {
  ShapeUtil,
  HTMLContainer,
  Rectangle2d,
  TLBaseShape,
  T,
} from 'tldraw';

export type LmsCalloutShapeProps = {
  blockId: string;
  w: number;
  h: number;
};

export type LmsCalloutShape = TLBaseShape<'lms-callout', LmsCalloutShapeProps>;

export class LmsCalloutShapeUtil extends ShapeUtil<LmsCalloutShape> {
  static override type = 'lms-callout' as const;

  static override props = {
    blockId: T.string,
    w: T.number,
    h: T.number,
  };

  getDefaultProps(): LmsCalloutShapeProps {
    return { blockId: '', w: 400, h: 200 };
  }

  getGeometry(shape: LmsCalloutShape) {
    return new Rectangle2d({
      width: shape.props.w,
      height: shape.props.h,
      isFilled: true,
    });
  }

  override canResize() {
    return true;
  }

  override onResize(shape: LmsCalloutShape, info: { newPoint: { x: number; y: number }; scaleX: number; scaleY: number }) {
    return {
      props: {
        w: Math.max(150, shape.props.w * info.scaleX),
        h: Math.max(100, shape.props.h * info.scaleY),
      },
    };
  }

  component(shape: LmsCalloutShape) {
    return (
      <HTMLContainer
        style={{
          width: shape.props.w,
          height: shape.props.h,
          overflow: 'auto',
          pointerEvents: 'all',
        }}
      >
        <div
          data-lms-block-id={shape.props.blockId}
          data-lms-block-type="callout"
          style={{ width: '100%', height: '100%' }}
        />
      </HTMLContainer>
    );
  }

  indicator(shape: LmsCalloutShape) {
    return <rect width={shape.props.w} height={shape.props.h} />;
  }
}
```

- [ ] **Step 4: Create the CTA custom shape**

Create `src/lib/canvas/shapes/lms-cta-shape.tsx`:

```tsx
import {
  ShapeUtil,
  HTMLContainer,
  Rectangle2d,
  TLBaseShape,
  T,
} from 'tldraw';

export type LmsCtaShapeProps = {
  blockId: string;
  w: number;
  h: number;
};

export type LmsCtaShape = TLBaseShape<'lms-cta', LmsCtaShapeProps>;

export class LmsCtaShapeUtil extends ShapeUtil<LmsCtaShape> {
  static override type = 'lms-cta' as const;

  static override props = {
    blockId: T.string,
    w: T.number,
    h: T.number,
  };

  getDefaultProps(): LmsCtaShapeProps {
    return { blockId: '', w: 300, h: 120 };
  }

  getGeometry(shape: LmsCtaShape) {
    return new Rectangle2d({
      width: shape.props.w,
      height: shape.props.h,
      isFilled: true,
    });
  }

  override canResize() {
    return true;
  }

  override onResize(shape: LmsCtaShape, info: { newPoint: { x: number; y: number }; scaleX: number; scaleY: number }) {
    return {
      props: {
        w: Math.max(150, shape.props.w * info.scaleX),
        h: Math.max(60, shape.props.h * info.scaleY),
      },
    };
  }

  component(shape: LmsCtaShape) {
    return (
      <HTMLContainer
        style={{
          width: shape.props.w,
          height: shape.props.h,
          overflow: 'hidden',
          pointerEvents: 'all',
        }}
      >
        <div
          data-lms-block-id={shape.props.blockId}
          data-lms-block-type="cta"
          style={{ width: '100%', height: '100%' }}
        />
      </HTMLContainer>
    );
  }

  indicator(shape: LmsCtaShape) {
    return <rect width={shape.props.w} height={shape.props.h} />;
  }
}
```

- [ ] **Step 5: Create the video custom shape**

Create `src/lib/canvas/shapes/lms-video-shape.tsx`:

```tsx
import {
  ShapeUtil,
  HTMLContainer,
  Rectangle2d,
  TLBaseShape,
  T,
} from 'tldraw';

export type LmsVideoShapeProps = {
  blockId: string;
  w: number;
  h: number;
};

export type LmsVideoShape = TLBaseShape<'lms-video', LmsVideoShapeProps>;

export class LmsVideoShapeUtil extends ShapeUtil<LmsVideoShape> {
  static override type = 'lms-video' as const;

  static override props = {
    blockId: T.string,
    w: T.number,
    h: T.number,
  };

  getDefaultProps(): LmsVideoShapeProps {
    return { blockId: '', w: 640, h: 360 };
  }

  getGeometry(shape: LmsVideoShape) {
    return new Rectangle2d({
      width: shape.props.w,
      height: shape.props.h,
      isFilled: true,
    });
  }

  override canResize() {
    return true;
  }

  override onResize(shape: LmsVideoShape, info: { newPoint: { x: number; y: number }; scaleX: number; scaleY: number }) {
    return {
      props: {
        w: Math.max(200, shape.props.w * info.scaleX),
        h: Math.max(120, shape.props.h * info.scaleY),
      },
    };
  }

  component(shape: LmsVideoShape) {
    return (
      <HTMLContainer
        style={{
          width: shape.props.w,
          height: shape.props.h,
          overflow: 'hidden',
          pointerEvents: 'all',
        }}
      >
        <div
          data-lms-block-id={shape.props.blockId}
          data-lms-block-type="video"
          style={{ width: '100%', height: '100%' }}
        />
      </HTMLContainer>
    );
  }

  indicator(shape: LmsVideoShape) {
    return <rect width={shape.props.w} height={shape.props.h} />;
  }
}
```

- [ ] **Step 6: Create register-shapes.ts**

Create `src/lib/canvas/register-shapes.ts`:

```typescript
import { LmsQuizShapeUtil } from './shapes/lms-quiz-shape';
import { LmsCalloutShapeUtil } from './shapes/lms-callout-shape';
import { LmsCtaShapeUtil } from './shapes/lms-cta-shape';
import { LmsVideoShapeUtil } from './shapes/lms-video-shape';

/**
 * All custom LMS shape utils for tldraw.
 * Pass this array to <Tldraw shapeUtils={lmsShapeUtils} />.
 */
export const lmsShapeUtils = [
  LmsQuizShapeUtil,
  LmsCalloutShapeUtil,
  LmsCtaShapeUtil,
  LmsVideoShapeUtil,
];

/** Block types that have corresponding canvas shapes */
export const CANVAS_BLOCK_TYPES = [
  { type: 'quiz_inline', shapeType: 'lms-quiz', label: 'Quiz', icon: '❓' },
  { type: 'callout', shapeType: 'lms-callout', label: 'Callout', icon: '💡' },
  { type: 'cta', shapeType: 'lms-cta', label: 'CTA Button', icon: '🔗' },
  { type: 'video', shapeType: 'lms-video', label: 'Video', icon: '🎬' },
] as const;
```

- [ ] **Step 7: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Fix any type errors. The shapes reference tldraw types which must resolve correctly.

- [ ] **Step 8: Commit**

```bash
git add src/lib/canvas/
git commit -m "feat: add tldraw custom LMS shape utilities and canvas helpers"
```

---

## Task 3: Canvas Slide Editor Component

**Files:**
- Create: `src/components/editor/canvas-slide-editor.tsx`
- Modify: `src/components/editor/preview-panel.tsx:129-153`

- [ ] **Step 1: Create the canvas slide editor component**

Create `src/components/editor/canvas-slide-editor.tsx`:

```tsx
'use client';

import { useCallback, useEffect, useRef } from 'react';
import { Tldraw, Editor, createShapeId } from 'tldraw';
import 'tldraw/tldraw.css';
import { lmsShapeUtils, CANVAS_BLOCK_TYPES } from '@/lib/canvas/register-shapes';
import {
  serializeCanvas,
  loadCanvasSnapshot,
  fitCanvasToContent,
  createDesignFrame,
  CANVAS_FRAME,
} from '@/lib/canvas/canvas-utils';
import { LessonBlockRenderer } from '@/components/lesson-block-renderer';
import type { Slide, LessonBlock } from '@/types';

interface CanvasSlideEditorProps {
  slide: Slide;
  blocks: LessonBlock[];
  onCanvasChange: (canvasData: Record<string, unknown>) => void;
  onAddBlock: (blockType: string) => Promise<LessonBlock | null>;
  onSelectBlock: (blockId: string | null) => void;
}

export default function CanvasSlideEditor({
  slide,
  blocks,
  onCanvasChange,
  onAddBlock,
  onSelectBlock,
}: CanvasSlideEditorProps) {
  const editorRef = useRef<Editor | null>(null);
  const isLoadingRef = useRef(false);

  const handleMount = useCallback((editor: Editor) => {
    editorRef.current = editor;

    // Load existing canvas data or create fresh design frame
    if (slide.canvas_data) {
      isLoadingRef.current = true;
      loadCanvasSnapshot(editor, slide.canvas_data);
      fitCanvasToContent(editor);
      isLoadingRef.current = false;
    } else {
      // New canvas slide — create the 1920x1080 locked design frame
      createDesignFrame(editor);
      editor.zoomToFit({ animation: { duration: 0 } });
    }

    // Listen for changes to serialize and report upstream
    const unsub = editor.store.listen(
      () => {
        if (isLoadingRef.current) return;
        const data = serializeCanvas(editor);
        onCanvasChange(data);
      },
      { source: 'user', scope: 'document' }
    );

    return () => {
      unsub();
      editorRef.current = null;
    };
  }, [slide.canvas_data, onCanvasChange]);

  // Resolve block data for custom LMS shapes rendered on the canvas
  const blockMap = useRef(new Map<string, LessonBlock>());
  useEffect(() => {
    blockMap.current.clear();
    for (const block of blocks) {
      blockMap.current.set(block.id, block);
    }
  }, [blocks]);

  const handleAddLmsBlock = useCallback(async (blockType: string, shapeType: string) => {
    const editor = editorRef.current;
    if (!editor) return;

    // Create the lesson_block row in the DB first
    const block = await onAddBlock(blockType);
    if (!block) return;

    // Add the tldraw shape pointing to the new block
    const shapeId = createShapeId();
    const center = editor.getViewportScreenCenter();
    const pagePoint = editor.screenToPage(center);

    editor.createShape({
      id: shapeId,
      type: shapeType,
      x: pagePoint.x - 200,
      y: pagePoint.y - 150,
      props: { blockId: block.id },
    });

    editor.select(shapeId);
    onSelectBlock(block.id);
  }, [onAddBlock, onSelectBlock]);

  return (
    <div className="flex h-full">
      {/* tldraw canvas */}
      <div className="flex-1 relative">
        <Tldraw
          shapeUtils={lmsShapeUtils}
          onMount={handleMount}
          components={{
            // Override shape rendering to inject actual block content
            ShapeIndicators: null,
          }}
        />
      </div>

      {/* LMS block palette sidebar */}
      <div className="w-48 shrink-0 border-l bg-gray-50 p-3 overflow-y-auto">
        <h3 className="text-xs font-semibold text-gray-500 uppercase mb-3">
          LMS Blocks
        </h3>
        <div className="space-y-2">
          {CANVAS_BLOCK_TYPES.map((bt) => (
            <button
              key={bt.type}
              onClick={() => handleAddLmsBlock(bt.type, bt.shapeType)}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md border bg-white hover:bg-gray-100 transition-colors"
            >
              <span>{bt.icon}</span>
              <span>{bt.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Update preview-panel.tsx to render canvas editor**

In `src/components/editor/preview-panel.tsx`, add a dynamic import at the top of the file:

```typescript
import dynamic from 'next/dynamic';

const CanvasSlideEditor = dynamic(
  () => import('./canvas-slide-editor'),
  { ssr: false, loading: () => <div className="flex items-center justify-center h-full text-gray-400">Loading canvas editor...</div> }
);
```

Then in the rendering logic (~line 129-153), add a branch before the existing `SlidePreview` render. When the selected slide has `slide_type === 'canvas'`, render `CanvasSlideEditor` instead of `SlidePreview`:

```tsx
{selectedSlide?.slide_type === 'canvas' ? (
  <CanvasSlideEditor
    slide={selectedSlide}
    blocks={canvasBlocks}
    onCanvasChange={handleCanvasChange}
    onAddBlock={handleAddCanvasBlock}
    onSelectBlock={handleSelectBlock}
  />
) : selectedSlide ? (
  <SlidePreview ... />  // existing code
) : (
  // "No slide selected" placeholder — existing code
)}
```

The `handleCanvasChange`, `handleAddCanvasBlock`, and `handleSelectBlock` handlers need to be wired up. `handleCanvasChange` calls the editor store's `updateSlide` with the new `canvas_data`. `handleAddCanvasBlock` creates a `lesson_blocks` row via the existing DB layer and returns it. `handleSelectBlock` calls `selectEntity({ type: 'block', id })`.

- [ ] **Step 3: Verify the editor loads for a canvas slide**

This requires creating a canvas slide first (Task 4). For now, verify the import compiles:

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add src/components/editor/canvas-slide-editor.tsx src/components/editor/preview-panel.tsx
git commit -m "feat: add canvas slide editor with tldraw and LMS block palette"
```

---

## Task 4: Canvas Slide Creation in Structure Panel

**Files:**
- Modify: `src/components/editor/structure-panel.tsx:79-101`
- Modify: `src/components/editor/slide-template-picker.tsx:16-36`
- Modify: `src/components/editor/course-editor-shell.tsx:208-279`

- [ ] **Step 1: Add canvas option to slide template picker**

In `src/components/editor/slide-template-picker.tsx`, add a "Canvas" template to the template list. This should create a slide with `slide_type: 'canvas'` and `canvas_data: null`:

```typescript
{
  label: 'Freeform Canvas',
  description: 'Free-form layout with tldraw — place content anywhere',
  icon: 'LayoutGrid', // or appropriate Lucide icon
  slideType: 'canvas' as SlideType,
}
```

When this template is selected, the picker creates a slide object with `slide_type: 'canvas'` and calls `onAddSlide`.

- [ ] **Step 2: Update handleAddSlide for canvas slides**

In `src/components/editor/course-editor-shell.tsx` (~line 208-279), find `handleAddSlide`. After the slide is created in the DB, the function auto-adds a default block based on `slide_type`. For canvas slides, skip the auto-block creation — the canvas starts empty:

```typescript
// Inside handleAddSlide, after DB insert succeeds:
if (newSlide.slide_type === 'canvas') {
  // Canvas slides start empty — no default block.
  // The design frame (1920x1080 locked rectangle) is created
  // by the CanvasSlideEditor on mount when canvas_data is null.
} else {
  // Existing default block creation logic...
}
```

- [ ] **Step 3: Add distinct icon for canvas slides in structure tree**

In the structure panel's slide rendering, add a visual indicator for canvas slides. Where slide icons are shown, add a branch:

```tsx
{slide.slide_type === 'canvas' ? (
  <LayoutGrid className="h-4 w-4 text-purple-500" />
) : (
  // existing slide icon
)}
```

Import `LayoutGrid` from `lucide-react`.

- [ ] **Step 4: Test canvas slide creation**

1. Start dev server: `npm run dev -- -p 3001`
2. Go to `http://localhost:3001/gansid/admin/courses/6b4906f1-803b-40bb-8582-d591220e5d09/editor`
3. Select a lesson in the structure panel
4. Click "Add Slide" → select "Freeform Canvas"
5. Verify: slide is created, canvas icon shows in tree, preview panel shows tldraw editor
6. Draw something on the canvas, add text — verify it works

- [ ] **Step 5: Commit**

```bash
git add src/components/editor/structure-panel.tsx src/components/editor/slide-template-picker.tsx src/components/editor/course-editor-shell.tsx
git commit -m "feat: add 'Freeform Canvas' option to slide template picker"
```

---

## Task 5: Canvas Save Integration

**Files:**
- Modify: `src/components/editor/course-editor-shell.tsx:80-96`
- Modify: `src/lib/stores/editor-store.ts:274-285`

- [ ] **Step 1: Wire canvas data into the editor store**

In `src/lib/stores/editor-store.ts`, the `updateSlide` action (~line 274-285) already accepts partial slide updates. Verify it passes through `canvas_data` when included in the update:

```typescript
updateSlide: (lessonId: string, slideId: string, changes: Partial<Slide>) => {
  // The existing implementation should spread `changes` into the slide.
  // Verify canvas_data is not being filtered out.
}
```

If the store filters specific fields, add `canvas_data` to the allowed fields.

- [ ] **Step 2: Update handleSave for canvas data**

In `src/components/editor/course-editor-shell.tsx`, the `handleSave()` function (~line 80-96) iterates slides and calls `dbUpdateSlide()`. Ensure `canvas_data` is included in the update payload for canvas slides:

```typescript
// In the slide save loop:
for (const slide of slides) {
  slidePromises.push(
    dbUpdateSlide(supabase, slide.id, {
      title: slide.title,
      slide_type: slide.slide_type,
      order_index: slide.order_index,
      status: slide.status,
      settings: slide.settings,
      canvas_data: slide.canvas_data,  // ← add this
    }, institutionId)
  );
}
```

- [ ] **Step 3: Connect CanvasSlideEditor onChange to store**

In `preview-panel.tsx`, the `handleCanvasChange` callback should call:

```typescript
const handleCanvasChange = useCallback((canvasData: Record<string, unknown>) => {
  if (!selectedSlide) return;
  const lessonId = selectedSlide.lesson_id;
  store.getState().updateSlide(lessonId, selectedSlide.id, { canvas_data: canvasData });
}, [selectedSlide]);
```

This marks the store as dirty, which triggers auto-save.

- [ ] **Step 4: Test save round-trip**

1. Open a canvas slide in the editor
2. Draw shapes, add text on the canvas
3. Wait for auto-save (or click Save manually)
4. Refresh the page
5. Verify: canvas content is restored — shapes and text appear as before

- [ ] **Step 5: Commit**

```bash
git add src/components/editor/course-editor-shell.tsx src/lib/stores/editor-store.ts src/components/editor/preview-panel.tsx
git commit -m "feat: save and restore canvas slide data through auto-save pipeline"
```

---

## Task 6: Student Canvas Viewer

**Files:**
- Create: `src/components/student/canvas-slide-viewer.tsx`
- Modify: `src/components/student/course-viewer.tsx:346-383,678-711`

- [ ] **Step 1: Create the canvas slide viewer component**

Create `src/components/student/canvas-slide-viewer.tsx`:

```tsx
'use client';

import { useCallback, useEffect, useRef } from 'react';
import { Tldraw, Editor } from 'tldraw';
import 'tldraw/tldraw.css';
import { lmsShapeUtils } from '@/lib/canvas/register-shapes';
import { loadCanvasSnapshot, fitCanvasToContent } from '@/lib/canvas/canvas-utils';
import type { LessonBlock } from '@/types';

interface CanvasSlideViewerProps {
  canvasData: Record<string, unknown>;
  blocks: LessonBlock[];
  onQuizCorrect?: (blockId: string) => void;
}

export default function CanvasSlideViewer({
  canvasData,
  blocks,
  onQuizCorrect,
}: CanvasSlideViewerProps) {
  const editorRef = useRef<Editor | null>(null);

  const handleMount = useCallback((editor: Editor) => {
    editorRef.current = editor;

    // Set read-only mode — students can pan/zoom but not edit
    editor.updateInstanceState({ isReadonly: true });

    // Load the canvas snapshot
    loadCanvasSnapshot(editor, canvasData);

    // Fit camera to show all content
    fitCanvasToContent(editor);
  }, [canvasData]);

  return (
    <div className="w-full h-full relative">
      <Tldraw
        shapeUtils={lmsShapeUtils}
        onMount={handleMount}
        hideUi
      />
    </div>
  );
}
```

Note: `hideUi` removes tldraw's toolbar in the student view — students only see the canvas content with pan/zoom.

- [ ] **Step 2: Add dynamic import in course-viewer.tsx**

At the top of `src/components/student/course-viewer.tsx`, add:

```typescript
import dynamic from 'next/dynamic';

const CanvasSlideViewer = dynamic(
  () => import('./canvas-slide-viewer'),
  { ssr: false, loading: () => <div className="flex items-center justify-center h-full text-gray-400">Loading canvas...</div> }
);
```

- [ ] **Step 3: Update slide data structures in course-viewer.tsx**

In the `Slide` type union (~line 30-33), extend the `'page'` kind to include canvas data:

```typescript
type ViewerSlide =
  | { kind: 'title' }
  | { kind: 'page'; slideId: string; blocks: LessonBlock[]; settings?: Record<string, unknown>; slideType?: string; canvasData?: Record<string, unknown> | null }
  | { kind: 'completion' };
```

In the `currentSlides` memo (~line 346-383), when building page slides from the slides data, include the `slide_type` and `canvas_data`:

```typescript
// When building the slides array, include canvas data:
{
  kind: 'page' as const,
  slideId: slide.id,
  blocks: slideBlocks,
  settings: slide.settings,
  slideType: slide.slide_type,
  canvasData: slide.canvas_data,
}
```

- [ ] **Step 4: Add rendering branch for canvas slides**

In the slide rendering section (~line 688-711), add a branch before the existing block-based page rendering:

```tsx
{currentSlideData?.kind === 'page' && currentSlideData.slideType === 'canvas' && currentSlideData.canvasData ? (
  <div className="flex-1 min-h-0">
    <CanvasSlideViewer
      canvasData={currentSlideData.canvasData}
      blocks={currentSlideData.blocks}
      onQuizCorrect={handleQuizCorrect}
    />
  </div>
) : currentSlideData?.kind === 'page' ? (
  // existing block-based slide rendering
) : null}
```

- [ ] **Step 5: Test student view**

1. Create a canvas slide in the editor with some shapes/text (from Task 4)
2. Navigate to `http://localhost:3001/gansid/student/courses/6b4906f1-803b-40bb-8582-d591220e5d09`
3. Navigate to the lesson containing the canvas slide
4. Verify: canvas content renders, pan/zoom works, no editing tools visible
5. Verify: slide navigation (← →) still works for moving between slides
6. Verify: title and completion slides still render correctly

- [ ] **Step 6: Test admin preview**

1. From the editor, click the Eye (preview) button
2. Navigate to the canvas slide in preview
3. Verify: same read-only canvas renders, navy banner shows, "Back to Editor" works
4. Verify: no DB writes occur (check browser network tab)

- [ ] **Step 7: Commit**

```bash
git add src/components/student/canvas-slide-viewer.tsx src/components/student/course-viewer.tsx
git commit -m "feat: add read-only canvas viewer for student and preview modes"
```

---

## Task 7: Device Preview Toggle in Editor Toolbar

**Files:**
- Modify: `src/components/editor/editor-toolbar.tsx:12-102`
- Modify: `src/components/editor/preview-panel.tsx`

- [ ] **Step 1: Add device state to editor store or local state**

In `src/components/editor/editor-toolbar.tsx`, add a device preview dropdown. Since device preview is a UI-only concern (doesn't persist), use local state passed via props or a simple context. Add to the toolbar alongside existing buttons:

```tsx
import { Monitor, Tablet, Smartphone } from 'lucide-react';

// Inside the toolbar, after the preview Eye button:
<div className="flex items-center border rounded-md">
  <button
    onClick={() => onDeviceChange('desktop')}
    className={`p-1.5 ${device === 'desktop' ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
    title="Desktop preview"
  >
    <Monitor className="h-4 w-4" />
  </button>
  <button
    onClick={() => onDeviceChange('tablet')}
    className={`p-1.5 ${device === 'tablet' ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
    title="Tablet preview"
  >
    <Tablet className="h-4 w-4" />
  </button>
  <button
    onClick={() => onDeviceChange('mobile')}
    className={`p-1.5 ${device === 'mobile' ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
    title="Mobile preview"
  >
    <Smartphone className="h-4 w-4" />
  </button>
</div>
```

The `device` state and `onDeviceChange` callback are managed by the parent (`course-editor-shell.tsx`) and passed to both the toolbar and preview panel.

- [ ] **Step 2: Apply device viewport to preview panel**

In `src/components/editor/preview-panel.tsx`, use the `device` prop to constrain the canvas editor width:

```tsx
const viewportWidth = {
  desktop: '100%',
  tablet: '768px',
  mobile: '375px',
}[device];

<div className="mx-auto transition-all duration-300" style={{ maxWidth: viewportWidth }}>
  {/* canvas editor or slide preview renders here */}
</div>
```

- [ ] **Step 3: Test device toggle**

1. Open a canvas slide in the editor
2. Click tablet icon → canvas area shrinks to 768px centered
3. Click mobile icon → canvas area shrinks to 375px centered
4. Click desktop icon → canvas returns to full width
5. Verify: canvas data is unchanged (only viewport changes)
6. Verify: also works for block-based slides (nice bonus)

- [ ] **Step 4: Commit**

```bash
git add src/components/editor/editor-toolbar.tsx src/components/editor/preview-panel.tsx src/components/editor/course-editor-shell.tsx
git commit -m "feat: add device preview toggle (desktop/tablet/mobile) to editor toolbar"
```

---

## Task 8: LMS Block Content Rendering Inside Canvas Shapes

**Files:**
- Modify: `src/components/editor/canvas-slide-editor.tsx`
- Modify: `src/components/student/canvas-slide-viewer.tsx`
- Modify: `src/lib/canvas/shapes/lms-quiz-shape.tsx`
- Modify: `src/lib/canvas/shapes/lms-callout-shape.tsx`
- Modify: `src/lib/canvas/shapes/lms-cta-shape.tsx`
- Modify: `src/lib/canvas/shapes/lms-video-shape.tsx`

This task wires up the actual block content rendering inside tldraw custom shapes. The shapes from Task 2 render placeholder `<div>` elements with `data-lms-block-id` attributes. Now we use React context to supply block data and render the real block viewers.

- [ ] **Step 1: Create a block context provider**

Add to `src/lib/canvas/canvas-utils.ts`:

```typescript
import { createContext, useContext } from 'react';
import type { LessonBlock } from '@/types';

export type BlockResolver = (blockId: string) => LessonBlock | undefined;
export type QuizCorrectHandler = ((blockId: string) => void) | undefined;

export const CanvasBlockContext = createContext<{
  resolveBlock: BlockResolver;
  onQuizCorrect: QuizCorrectHandler;
}>({
  resolveBlock: () => undefined,
  onQuizCorrect: undefined,
});

export function useCanvasBlock(blockId: string) {
  const ctx = useContext(CanvasBlockContext);
  return {
    block: ctx.resolveBlock(blockId),
    onQuizCorrect: ctx.onQuizCorrect,
  };
}
```

- [ ] **Step 2: Update custom shapes to use the context**

Update each shape's `component()` method to use `useCanvasBlock` and render the actual block viewer. Example for `lms-quiz-shape.tsx`:

```tsx
import { useCanvasBlock } from '@/lib/canvas/canvas-utils';
import { LessonBlockRenderer } from '@/components/lesson-block-renderer';

// Inside the component() method:
component(shape: LmsQuizShape) {
  return (
    <HTMLContainer
      style={{
        width: shape.props.w,
        height: shape.props.h,
        overflow: 'auto',
        pointerEvents: 'all',
      }}
    >
      <LmsShapeContent
        blockId={shape.props.blockId}
        width={shape.props.w}
        height={shape.props.h}
      />
    </HTMLContainer>
  );
}
```

Create a shared inner component (can live in `canvas-utils.ts` or a new `lms-shape-content.tsx`):

```tsx
'use client';

import { useCanvasBlock } from '@/lib/canvas/canvas-utils';
import { LessonBlockRenderer } from '@/components/lesson-block-renderer';

export function LmsShapeContent({
  blockId,
  width,
  height,
}: {
  blockId: string;
  width: number;
  height: number;
}) {
  const { block, onQuizCorrect } = useCanvasBlock(blockId);

  if (!block) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-100 text-gray-400 text-sm rounded border border-dashed">
        Block not found
      </div>
    );
  }

  return (
    <div style={{ width, height }} className="overflow-auto">
      <LessonBlockRenderer
        block={block}
        onQuizCorrect={onQuizCorrect ? () => onQuizCorrect(block.id) : undefined}
      />
    </div>
  );
}
```

Apply the same pattern to all four shapes (callout, cta, video) — they all use `LmsShapeContent`.

- [ ] **Step 3: Wrap tldraw in the context provider**

In `canvas-slide-editor.tsx`, wrap the `<Tldraw>` component:

```tsx
<CanvasBlockContext.Provider value={{
  resolveBlock: (id) => blockMap.current.get(id),
  onQuizCorrect: undefined, // Editor doesn't need quiz grading
}}>
  <Tldraw ... />
</CanvasBlockContext.Provider>
```

In `canvas-slide-viewer.tsx`, wrap similarly but with the quiz handler:

```tsx
const blockMapRef = useRef(new Map<string, LessonBlock>());
useEffect(() => {
  blockMapRef.current.clear();
  for (const b of blocks) blockMapRef.current.set(b.id, b);
}, [blocks]);

<CanvasBlockContext.Provider value={{
  resolveBlock: (id) => blockMapRef.current.get(id),
  onQuizCorrect: onQuizCorrect,
}}>
  <Tldraw ... />
</CanvasBlockContext.Provider>
```

- [ ] **Step 4: Test block rendering on canvas**

1. In the editor, open a canvas slide
2. Click "Quiz" in the LMS Blocks palette → a quiz shape appears on canvas
3. Select the quiz shape → properties panel shows quiz editor
4. Add a question, save
5. Verify: quiz renders inside the tldraw shape on the canvas
6. Switch to student view → verify quiz renders and answers are clickable
7. Repeat for callout, CTA, and video blocks

- [ ] **Step 5: Commit**

```bash
git add src/lib/canvas/ src/components/editor/canvas-slide-editor.tsx src/components/student/canvas-slide-viewer.tsx
git commit -m "feat: render LMS block content inside tldraw canvas shapes via context"
```

---

## Task 9: End-to-End Verification and Polish

**Files:**
- Various (fixes only — no new files)

- [ ] **Step 1: Full editor workflow test**

1. Navigate to course editor
2. Select a lesson → Add a canvas slide
3. On the canvas: draw freeform lines, add text, add an arrow
4. Add an LMS quiz block from the palette
5. Configure the quiz in the properties panel
6. Add a callout block
7. Save (auto-save or manual)
8. Refresh → verify all content persists

- [ ] **Step 2: Full student workflow test**

1. Navigate to student view for the same course
2. Go to the lesson with the canvas slide
3. Verify: title slide renders → navigate to canvas slide
4. Verify: all content visible (drawings, text, quiz, callout)
5. Verify: can pan and zoom
6. Verify: quiz answers are interactive (click to select)
7. Verify: CTA buttons are clickable
8. Navigate to completion slide → verify auto-complete fires
9. Verify: keyboard nav (← →) works across all slides

- [ ] **Step 3: Admin preview test**

1. From the editor, click Eye (preview) button
2. Navigate to the canvas slide in preview
3. Verify: canvas renders read-only with all content
4. Verify: navy banner at top, "Back to Editor" link works
5. Verify: no enrollment/progress DB writes (check network tab)

- [ ] **Step 4: Block-based slide regression test**

1. Navigate to a lesson that has only block-based slides (no canvas)
2. Verify: editor works exactly as before — no visual changes, no errors
3. Verify: student view renders all block types correctly
4. Verify: tldraw JS bundle is NOT loaded (check network tab — no tldraw chunks)

- [ ] **Step 5: Mobile responsive test**

1. Open student view on a mobile viewport (Chrome DevTools → 375px)
2. Navigate to the canvas slide
3. Verify: canvas fits within the screen width
4. Verify: pinch-to-zoom and pan work (simulate in DevTools)

- [ ] **Step 6: Fix any issues found**

Address any bugs or regressions found during testing.

- [ ] **Step 7: Final commit**

```bash
git add -A
git commit -m "fix: polish canvas slides after end-to-end testing"
```

---

## Task Summary

| Task | Description | Estimated Complexity |
|---|---|---|
| 1 | Install tldraw, migration, type updates, DB layer | Low |
| 2 | Custom shape infrastructure (4 shapes, registry, utils) | Medium |
| 3 | Canvas slide editor component + preview panel integration | Medium |
| 4 | Canvas slide creation in structure panel | Low |
| 5 | Save pipeline integration (auto-save, store) | Low |
| 6 | Student canvas viewer + course-viewer integration | Medium |
| 7 | Device preview toggle in toolbar | Low |
| 8 | LMS block content rendering inside canvas shapes | Medium |
| 9 | End-to-end verification and polish | Low |
