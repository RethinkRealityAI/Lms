# tldraw Freeform Canvas Slides — Design Spec

**Date:** 2026-04-08
**Status:** Approved
**Scope:** Add freeform canvas as an alternative slide type alongside existing block-based slides

---

## Problem

The current slide-based lesson system uses vertically stacked blocks (rich text, images, video, quiz, etc.) within fixed-layout slides. This works well for linear, structured content but limits instructors who want spatial freedom — placing elements anywhere on a canvas, mixing freeform drawing/annotation with structured LMS content, and creating visually dynamic lesson pages.

## Solution

Integrate **tldraw** (v4.x) as a freeform canvas option that coexists with the existing slide system. Each slide in a lesson can be either block-based (as today) or canvas-based. Instructors get tldraw's full editor (drawing, text, shapes, arrows, images) plus the ability to drag custom LMS shapes (quizzes, callouts, CTAs) onto the same canvas. Students view the canvas in read-only mode with interactive content (play videos, answer quizzes, click CTAs).

## Decisions Made

| Decision | Choice | Rationale |
|---|---|---|
| Canvas library | tldraw v4.x | First-class custom React shapes, built-in read-only mode, JSON snapshots fit Postgres jsonb, collaboration-ready via @tldraw/sync |
| Integration model | Canvas as a slide type | Fits existing hierarchy (course → module → lesson → slides). No structural changes. Mix-and-match within a lesson. |
| Student interaction | View-only + interactive content | Instructor designs layout; students pan/zoom and interact with content (quizzes, videos, CTAs) but cannot rearrange |
| Editor experience | Full tldraw + LMS block palette | Native tldraw tools (draw, text, shapes, arrows) plus custom LMS shapes from a sidebar palette |
| Data storage | Hybrid: tldraw JSON + lesson_blocks | tldraw owns spatial layout; lesson_blocks owns educational content (quizzes, assessments). Custom shapes link via blockId. |
| Canvas dimensions | Fixed aspect ratio (16:9, 1920x1080 default) | Consistent viewing experience. A non-editable background frame shape marks the design area; content can extend beyond it but the student viewer's `zoomToFit()` targets the frame bounds. |
| Mobile | Fit-to-width with vertical scroll fallback | Canvas scales to screen width; tall content scrolls. Future: optional reflow mode below 768px. |
| Device preview | Editor toggle (desktop/tablet/mobile) | Instructor can check layout at different viewport sizes before publishing |

---

## 1. Data Model

### Migration 020: Add canvas_data to slides

```sql
ALTER TABLE slides ADD COLUMN IF NOT EXISTS canvas_data jsonb DEFAULT NULL;
```

- **`canvas_data`** — tldraw document snapshot (`getSnapshot(editor.store).document`). Only populated when `slide_type = 'canvas'`; NULL for traditional slides.
- No changes to existing data. No CHECK constraint changes (slide_type is text, not enum).

### Slide Type Extension

```typescript
type SlideType = 'title' | 'content' | 'media' | 'quiz' | 'disclaimer' | 'interactive' | 'cta' | 'canvas';
```

The `Slide` interface gains:

```typescript
interface Slide {
  // ... existing fields
  canvas_data: TLDocumentSnapshot | null;
}
```

### Dual Storage for Custom LMS Shapes

**Native tldraw shapes** (text, drawings, arrows, images, sticky notes): data lives entirely in `canvas_data`. No `lesson_blocks` rows.

**Custom LMS shapes** (quiz_inline, callout, CTA):
- **Spatial data** (position, size, rotation) → stored in `canvas_data` as tldraw shape props
- **Content data** (quiz questions, CTA config, callout content) → stored in `lesson_blocks` rows linked via `slide_id`
- The custom shape's props include a `blockId` that references `lesson_blocks.id`

```
canvas_data (tldraw JSON)
  └── shape: { type: 'lms-quiz', props: { blockId: 'uuid-123', w: 400, h: 300 } }
                                              │
lesson_blocks table                           │
  └── { id: 'uuid-123', slide_id: '...', block_type: 'quiz_inline', data: { questions: [...] } }
```

**Why this split:**
- Quiz/assessment data must be queryable for grading, analytics, progress tracking
- `lesson_blocks` already has versioning, visibility, and the established CRUD layer
- tldraw owns layout; the LMS owns educational content

---

## 2. Component Architecture

### New Files

```
src/lib/canvas/
  ├── shapes/
  │     ├── lms-quiz-shape.tsx       # ShapeUtil for quiz_inline
  │     ├── lms-callout-shape.tsx    # ShapeUtil for callout
  │     ├── lms-cta-shape.tsx        # ShapeUtil for CTA
  │     └── lms-video-shape.tsx      # ShapeUtil for video (LMS-managed variant)
  ├── register-shapes.ts            # Collects all custom ShapeUtils into array
  └── canvas-utils.ts               # Snapshot save/load helpers, viewport fitting

src/components/editor/
  └── canvas-slide-editor.tsx        # tldraw editor for canvas slides (dynamic import)

src/components/student/
  └── canvas-slide-viewer.tsx        # Read-only tldraw for student/preview (dynamic import)
```

### Editor Components

**`canvas-slide-editor.tsx`** — the core editor component:
- Dynamically imported (`next/dynamic`, `ssr: false`) — tldraw requires browser APIs
- Wraps `<Tldraw>` with custom shape registrations from `register-shapes.ts`
- Props: `slide`, `onCanvasChange(canvasData)`, `blocks` (for resolving custom shape content)
- tldraw's native toolbar provides drawing, text, shape, arrow, image tools
- LMS block palette (sidebar tab) provides quiz, callout, CTA, video blocks for drag-onto-canvas
- `onMount` callback stores editor ref for save serialization

**Integration with existing editor panels:**

| Panel | Canvas Slide Behavior |
|---|---|
| Structure (left) | Unchanged. Canvas slides show a distinct icon (grid/canvas) in the tree. |
| Preview (center) | Renders `canvas-slide-editor` instead of `slide-preview` when `slide_type === 'canvas'` |
| Properties (right) | Context-dependent: native tldraw shape selected → tldraw style controls; custom LMS shape selected → existing block editor (e.g., quiz-inline/editor.tsx); nothing selected → slide-level settings (background, dimensions) |

### Student/Viewer Components

**`canvas-slide-viewer.tsx`** — read-only canvas for students and admin preview:
- Dynamically imported (same as editor — only loads when canvas slide is encountered)
- `<Tldraw>` with `isReadonly: true`
- Loads `slide.canvas_data` via `loadSnapshot(editor.store, { document: slide.canvas_data })`
- On mount: `editor.zoomToFit()` to frame all content
- Custom LMS shapes render viewer components — quiz answers are clickable, CTAs work, videos play
- React event handlers inside custom shapes fire normally in read-only mode (tldraw only blocks shape mutations)

### Rendering Branch in CourseViewer

```typescript
// In course-viewer.tsx slide rendering:
if (slide.kind === 'title')      → <TitleSlide />          // unchanged
if (slide.kind === 'completion') → <CompletionSlide />      // unchanged
if (slide.kind === 'page' && slide.slideType === 'canvas') → <CanvasSlideViewer />  // NEW
if (slide.kind === 'page')       → <SlideFrame> + blocks    // unchanged
```

### Custom ShapeUtil Pattern

Each LMS shape follows this structure:

```typescript
class LmsQuizShapeUtil extends ShapeUtil<LmsQuizShape> {
  static override type = 'lms-quiz' as const

  getDefaultProps() { return { blockId: '', w: 400, h: 300 } }

  getGeometry(shape) {
    return new Rectangle2d({ width: shape.props.w, height: shape.props.h })
  }

  component(shape) {
    // Renders existing block viewer inside tldraw's HTML container
    return (
      <HTMLContainer>
        <LessonBlockRenderer block={resolveBlock(shape.props.blockId)} />
      </HTMLContainer>
    )
  }

  indicator(shape) {
    return <rect width={shape.props.w} height={shape.props.h} />
  }
}
```

---

## 3. Editor UX

### Creating a Canvas Slide

The "Add Slide" button in the structure panel gains an option:
- **Add Slide** — creates block-based slide (default, as today)
- **Add Canvas Slide** — creates slide with `slide_type: 'canvas'`, `canvas_data: null` (empty canvas)

### Canvas Editor Layout

When a canvas slide is selected:
- The center panel becomes the full tldraw editor with its native toolbar (select, hand, draw, text, shapes, arrows, image upload, etc.)
- The properties panel shows an "LMS Blocks" tab with draggable block types (quiz, callout, CTA, video)
- Clicking or dragging an LMS block adds the custom shape to the canvas center (or drop position) and creates a `lesson_blocks` row

### Device Preview Toggle

A toolbar button alongside existing Save/Undo/Redo/Preview/Publish:
- **Desktop** (default) — canvas at 1920x1080
- **Tablet** — viewport scales to ~768px wide
- **Mobile** — viewport scales to ~375px wide

This adjusts the editor viewport only — canvas data is unchanged. Instructors use this to verify their layout at different sizes.

### Save Integration

Canvas slides integrate with existing auto-save:
1. `handleSave()` iterates slides as today
2. For `slide_type === 'canvas'`: serialize `getSnapshot(editor.store).document` → write to `slides.canvas_data` via `dbUpdateSlide()`
3. Custom LMS shapes' block data saves via the normal `lesson_blocks` update path (already handled)
4. Same error tracking, dirty flag, retry behavior as today

---

## 4. Student Viewer & Preview

### Read-Only Canvas

- tldraw's `isReadonly: true` disables all shape mutations (move, resize, delete, create)
- Pan and zoom remain enabled (mouse wheel, pinch on mobile)
- Custom LMS shapes render their viewer components with full interactivity (quiz answers, video playback, CTA clicks)
- Camera auto-fits content on mount

### Mobile Responsive

- **>=768px:** Full canvas with pan/zoom
- **<768px:** Canvas scales to fit screen width, maintaining aspect ratio. Content scrolls vertically if taller than viewport.
- Future enhancement: optional reflow mode that extracts canvas elements into a vertical stack

### Admin Preview

No canvas-specific preview logic needed. The existing `previewMode` prop on `CourseViewer`:
- Suppresses DB writes (enrollment, progress, certificates) — unchanged
- Canvas slides render the same `canvas-slide-viewer.tsx` component (read-only tldraw)
- Fixed overlay (`z-[60]`), navy banner, "Back to Editor" link — all unchanged
- Height class `h-[calc(100vh-3rem)]` for preview — unchanged

### Progress & Completion

No changes:
- Canvas slides are another slide kind between title and completion
- Auto-complete fires on reaching the completion slide
- Quiz answers within canvas slides use the same `onQuizCorrect` callback
- Progress tracking remains lesson-level

---

## 5. Performance & Bundle

### Dynamic Import Strategy

tldraw (~300-400KB gzipped) is loaded only when needed:

```typescript
const CanvasSlideEditor = dynamic(() => import('./canvas-slide-editor'), { ssr: false });
const CanvasSlideViewer = dynamic(() => import('../student/canvas-slide-viewer'), { ssr: false });
```

- Block-based lessons never load tldraw (zero impact on existing pages)
- First canvas slide triggers the load; subsequent canvas slides reuse the cached bundle
- Next.js code splitting ensures tldraw is a separate chunk

### Package Addition

```
npm install tldraw
```

tldraw v4.x is compatible with React 19 and Next.js 16.

---

## 6. Migration & Backwards Compatibility

### Migration 020

```sql
ALTER TABLE slides ADD COLUMN IF NOT EXISTS canvas_data jsonb DEFAULT NULL;
```

### Zero Breaking Changes

| Concern | Impact |
|---|---|
| Existing slides | None — `slide_type` stays as-is, `canvas_data` is NULL |
| Existing blocks | None — blocks with `slide_id` render in block-based slides as before |
| Existing student view | None — canvas branch only triggers for `slide_type = 'canvas'` |
| Existing editor | None — panels unchanged for non-canvas slides |
| SCORM imports | None — imported content creates block-based slides |
| Existing tests | None — no changes to existing component APIs |

---

## 7. Future Extensibility

These are explicitly out of scope for the MVP but the architecture supports them:

- **Interactive mode** — remove `isReadonly` flag, add permission controls per slide/lesson/module
- **Collaborative mode** — `@tldraw/sync` package provides real-time collaboration infrastructure
- **Canvas templates** — pre-designed canvas layouts instructors can start from
- **Mobile reflow** — extract canvas shapes into vertical stack below breakpoint
- **Per-slide interaction settings** — stored in `slides.settings` alongside existing background settings
