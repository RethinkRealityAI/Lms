# Visual Course Editor — Architecture Design

**Date:** 2026-03-30
**Status:** Approved
**Scope:** A unified, three-panel visual editor for creating and styling courses, modules, lessons, slides, and blocks — with live preview, drag-and-drop reordering, theme customization, and multi-tenant isolation.

---

## 1. Goals

1. Replace the basic admin CRUD forms with a professional visual editor that any admin can use intuitively.
2. Provide a live preview that renders actual student viewer components — true WYSIWYG.
3. Support full course authoring: modules, lessons, slides (with template presets), and content blocks.
4. Enable visual customization at every level: institution theme defaults, course theme overrides, slide-level style overrides.
5. Ensure complete multi-tenant isolation — each institution sees only its own content, users, and themes.
6. Future-proof with draft/published workflow, soft deletes, activity logging, and extensible block layout fields.

## 2. Non-Goals (This Phase)

- Real-time collaborative editing (multiple admins on the same course simultaneously).
- AI-assisted content generation.
- Payment/commerce integration.
- Mobile-native admin app (responsive web only).
- Full free-form canvas editor (tldraw is scoped as a future block type, not the editor foundation).

---

## 3. Approach

**Custom-built panel editor** using the existing stack: React state management, shadcn/ui components, Tailwind CSS styling, and `@dnd-kit/core` for drag-and-drop. The live preview reuses existing student viewer components rendered inline. No heavy external editor framework.

**Why not Plate.js / Editor.js?** Our block types (quiz, iframe, H5P) don't fit a text-editor model. Fighting the framework would cost more than building our own panel layout.

**Why not tldraw as the editor canvas?** Overkill for vertical block lists. tldraw will instead be available as an optional interactive block type for specialized slides.

---

## 4. Editor Layout

### Three-Panel Layout (`/admin/courses/[id]/editor`)

```
+-------------------------------------------------------------+
|  Toolbar: [Save] [Undo/Redo] [Preview Mode] [Publish]      |
+------------+--------------------------+---------------------+
|            |                          |                     |
|  STRUCTURE |     LIVE PREVIEW         |   PROPERTIES        |
|  PANEL     |                          |   PANEL             |
|  (260px)   |     (flex-1)             |   (320px)           |
|            |                          |                     |
|  Modules   |  +------------------+    |  Context-sensitive: |
|   +Lessons |  |                  |    |                     |
|     +Slides|  |  Student view    |    |  - Course theme     |
|            |  |  rendered live   |    |  - Module settings  |
|            |  |                  |    |  - Slide settings   |
|  [+ Module]|  |                  |    |  - Block properties |
|  [+ Lesson]|  +------------------+    |  - Style overrides  |
|            |                          |                     |
|  Drag to   |  <- prev  [3/8]  next ->|  Depends on what's  |
|  reorder   |                          |  selected in left   |
|            |                          |  or center panel    |
+------------+--------------------------+---------------------+
|  Status bar: Auto-saved 2s ago | Module 1 > Lesson 3 > S5  |
+-------------------------------------------------------------+
```

### Panel Behavior

- **Left (Structure):** Tree view of Modules > Lessons > Slides. Click to navigate. Drag to reorder. Right-click context menu for delete/duplicate/rename. `+ Module`, `+ Lesson`, `+ Slide` buttons at each level.
- **Center (Live Preview):** Renders actual student viewer components inside a preview frame. Device toggle (desktop/tablet/mobile). Click any element to select it — properties panel updates. Slide navigation arrows at bottom.
- **Right (Properties):** Context-sensitive based on selection:
  - Nothing/Course selected: Course theme editor (colors, fonts, logo, course card preview)
  - Module selected: Module title, description, ordering
  - Lesson selected: Lesson title, description, thumbnail
  - Slide selected: Slide template, background override, layout settings
  - Block selected (click in preview): Block-specific editor (text, image URL, quiz answers, etc.) + style overrides
- **Toolbar:** Save, undo/redo, toggle edit/full preview mode, publish toggle.
- **Status Bar:** Auto-save indicator, breadcrumb (Module > Lesson > Slide).

---

## 5. Data Model Changes

### New / Modified Tables

#### `institutions` (existing — ADD columns)

| Column | Type | Purpose |
|--------|------|---------|
| `theme` | `jsonb` | Default theme for all courses in this institution |
| `settings` | `jsonb` | Institution-level settings (allowSelfEnroll, defaultLanguage, etc.) |

#### `users` (existing — ADD column)

| Column | Type | Purpose |
|--------|------|---------|
| `institution_id` | `uuid FK -> institutions` | Scopes user to an institution. NULL = super-admin. |

#### `courses` (existing — ADD columns)

| Column | Type | Purpose |
|--------|------|---------|
| `theme_overrides` | `jsonb` | Overrides institution theme at course level |
| `status` | `text` | `'draft'` / `'published'` / `'archived'` |
| `published_at` | `timestamp` | When course was last published |
| `deleted_at` | `timestamp` | Soft delete (NULL = active) |

#### `modules` (existing — ADD column)

| Column | Type | Purpose |
|--------|------|---------|
| `deleted_at` | `timestamp` | Soft delete |

#### `lessons` (existing — ADD column)

| Column | Type | Purpose |
|--------|------|---------|
| `deleted_at` | `timestamp` | Soft delete |

#### `slides` (NEW)

| Column | Type | Purpose |
|--------|------|---------|
| `id` | `uuid PK` | |
| `lesson_id` | `uuid FK -> lessons` | Parent lesson |
| `slide_type` | `text` | `'title'` / `'content'` / `'media'` / `'quiz'` / `'disclaimer'` / `'interactive'` / `'cta'` |
| `title` | `text` | Slide title (optional) |
| `order_index` | `integer` | Position within lesson |
| `status` | `text` | `'draft'` / `'published'` |
| `settings` | `jsonb` | Background, text color, padding, layout template, theme overrides |
| `deleted_at` | `timestamp` | Soft delete |
| `created_at` | `timestamp` | |
| `updated_at` | `timestamp` | |

#### `lesson_blocks` (existing — ADD columns)

| Column | Type | Purpose |
|--------|------|---------|
| `slide_id` | `uuid FK -> slides` | Groups block into a slide. NULL = legacy block. |
| `layout` | `jsonb` | `{ width, align }` — reserved for future multi-block slides |

#### `slide_templates` (NEW — seed data)

| Column | Type | Purpose |
|--------|------|---------|
| `id` | `uuid PK` | |
| `name` | `text` | 'Title', 'Content', 'Media', 'Quiz', etc. |
| `description` | `text` | |
| `default_blocks` | `jsonb` | Array of `{ block_type, default_data }` to auto-create |
| `thumbnail_url` | `text` | Preview image for template picker |
| `institution_id` | `uuid FK` | NULL = global template, non-NULL = institution custom |

#### `content_activity_log` (NEW)

| Column | Type | Purpose |
|--------|------|---------|
| `id` | `uuid PK` | |
| `institution_id` | `uuid FK` | |
| `user_id` | `uuid FK` | Who made the change |
| `entity_type` | `text` | `'course'` / `'module'` / `'lesson'` / `'slide'` / `'block'` |
| `entity_id` | `uuid` | Which entity changed |
| `action` | `text` | `'created'` / `'updated'` / `'deleted'` / `'published'` / `'reordered'` |
| `changes` | `jsonb` | `{ field: { old, new } }` diff |
| `created_at` | `timestamp` | |

### Relationships

```
institution -> theme (defaults)
  +-> courses -> theme_overrides
       +-> modules
            +-> lessons
                 +-> slides (NEW — ordered within lesson)
                      +-> lesson_blocks (existing — now grouped by slide)
```

### Backward Compatibility

- Existing `lesson_blocks` with `slide_id = NULL` continue to render in the student viewer via current logic.
- A data migration creates a default slide per lesson for existing blocks.
- New content uses the slide model.

### Theme Cascade

```
institution.theme -> course.theme_overrides -> slide.settings.theme
```

Resolved via `resolveTheme()` with deep merge + Zod parse. New properties auto-fill with defaults.

---

## 6. Theme Schema

```typescript
const ThemeSchema = z.object({
  primaryColor: z.string().default('#1E3A5F'),
  accentColor: z.string().default('#DC2626'),
  backgroundColor: z.string().default('#FFFFFF'),
  textColor: z.string().default('#0F172A'),
  fontFamily: z.string().default('Inter'),
  fontScale: z.number().min(0.75).max(1.5).default(1),
  logoUrl: z.string().url().optional(),
  borderRadius: z.enum(['none', 'sm', 'md', 'lg', 'full']).default('md'),
  slideTransition: z.enum(['none', 'fade', 'slide']).default('fade'),
});
```

- Validated at app layer (same pattern as block data schemas).
- `resolveTheme(institution, course?, slide?)` merges the cascade.
- CSS variables generated: `--theme-primary`, `--theme-accent`, `--theme-bg`, etc.
- Student viewer uses the same `resolveTheme()` — guaranteed visual parity.

---

## 7. Component Architecture

### Component Tree

```
/admin/courses/[id]/editor/page.tsx        <- thin route wrapper
  +-> <CourseEditorShell>                   <- layout shell (three panels + toolbar)
       +-> <EditorToolbar>                  <- save, undo/redo, preview toggle, publish
       +-> <StructurePanel>                 <- left panel
       |    +-> <ModuleTree>               <- collapsible module > lesson > slide tree
       |    |    +-> <ModuleNode>          <- draggable, right-click menu
       |    |    +-> <LessonNode>          <- draggable, right-click menu
       |    |    +-> <SlideNode>           <- draggable, thumbnail preview
       |    +-> <AddModuleButton>
       |    +-> <SlideTemplateDrawer>      <- slide template picker (opens as drawer)
       |         +-> <TemplateCard>        <- one per template with preview thumbnail
       +-> <PreviewPanel>                   <- center panel
       |    +-> <PreviewToolbar>           <- device toggle, zoom
       |    +-> <PreviewFrame>             <- renders student viewer components
       |    |    +-> <ThemeProvider>        <- merged theme cascade
       |    |    +-> <SlideRenderer>       <- reuses LessonBlockRenderer
       |    |    +-> <SelectionOverlay>    <- click-to-select blocks
       |    +-> <SlideNavigation>          <- prev/next + slide counter
       +-> <PropertiesPanel>               <- right panel (context-sensitive)
            +-> <CourseThemeEditor>        <- when course selected
            |    +-> <ColorPicker>
            |    +-> <FontSelector>
            |    +-> <CourseCardPreview>   <- live mini-preview of student card
            |    +-> <LogoUploader>
            +-> <ModuleProperties>         <- when module selected
            +-> <LessonProperties>         <- when lesson selected
            +-> <SlideProperties>          <- when slide selected
            |    +-> <SlideTypeSelector>
            |    +-> <BackgroundPicker>
            |    +-> <LayoutSettings>
            +-> <BlockEditor>              <- when block clicked in preview
                 +-> <RichTextEditor>      <- Tiptap WYSIWYG
                 +-> <ImageEditor>         <- URL + upload + alt text + caption
                 +-> <VideoEditor>         <- URL + YouTube auto-detect + autoplay
                 +-> <QuizEditor>          <- question, answers, correct toggle, explanation
                 +-> <IframeEditor>        <- URL + height + sandbox options
                 +-> <CalloutEditor>       <- variant, title, content
                 +-> <CTAEditor>           <- action type, label, URL
```

### State Management — `useEditorStore`

Single store (Zustand or `useReducer`) holding all editor state:

```typescript
interface EditorState {
  // Data
  course: Course & { theme_overrides: Theme };
  modules: Module[];
  lessons: Map<string, Lesson>;
  slides: Map<string, Slide[]>;
  blocks: Map<string, LessonBlock[]>;

  // UI
  selectedEntity: { type: 'course' | 'module' | 'lesson' | 'slide' | 'block'; id: string } | null;
  previewSlideIndex: number;
  isDirty: boolean;
  isSaving: boolean;

  // History
  undoStack: EditorAction[];
  redoStack: EditorAction[];

  // Actions
  selectEntity(type, id): void;
  addModule(title): void;
  addLesson(moduleId, title): void;
  addSlide(lessonId, template): void;
  addBlock(slideId, blockType): void;
  updateEntity(type, id, changes): void;
  reorder(type, ids): void;
  deleteEntity(type, id): void;
  undo(): void;
  redo(): void;
  save(): Promise<void>;
  publish(): Promise<void>;
}
```

### Auto-save

- Every mutation pushes to undo stack and marks `isDirty = true`.
- Debounced save (2s after last change) persists to Supabase.
- Status bar: "Saving..." -> "Saved" with timestamp.
- `beforeunload` warning on browser close with unsaved changes.

---

## 8. Block Editors

Each block type gets a dedicated editor component in the properties panel. Registered in the block registry alongside the existing viewer.

| Block Type | Editor Fields | Live Preview |
|---|---|---|
| `rich_text` | Tiptap WYSIWYG (headings, bold, italic, lists, links, images) | Updates as you type |
| `image_gallery` | Image URL/upload, caption, alt text, display mode | Image swaps live |
| `video` | URL, YouTube/Vimeo auto-detect, autoplay, poster | Player updates |
| `quiz_inline` | Question text, answers (add/remove/reorder), correct toggle, explanation | Quiz card updates |
| `callout` | Variant picker, title, rich text content | Color/icon changes |
| `cta` | Action type, button label, URL (if external) | Button updates |
| `iframe` | URL, height, sandbox permissions | Iframe reloads |
| `pdf` | PDF URL/upload | Viewer reloads |
| `h5p` | Content key selector | H5P loads |
| `tldraw` *(future)* | Opens tldraw canvas | Canvas snapshot |

### Rich Text — Tiptap

- ProseMirror-based, ~40KB gzipped.
- Markdown shortcuts (## for h2, ** for bold).
- Output stored as HTML in `data.html` (same format already rendered by viewer).
- Paste-from-Word cleanup.

---

## 9. Slide Templates

Pre-configured slide presets that auto-create blocks:

| Template | Default Blocks | Default Settings |
|---|---|---|
| **Title** | rich_text (h1 heading) | Gradient background, white text |
| **Content** | rich_text (h2 + paragraph) + image_gallery | White background |
| **Media** | video | Black background, white text |
| **Quiz** | quiz_inline | Light gray background |
| **Disclaimer** | callout (warning variant) | Warm yellow background |
| **Interactive** | iframe | White background |
| **CTA** | rich_text (h2) + cta button | Gradient background |

Admins pick a template -> blocks pre-created -> edit content in properties -> preview updates live. Blocks can be added/removed regardless of template.

---

## 10. Drag-and-Drop

### Library: `@dnd-kit/core` + `@dnd-kit/sortable`

| Drag Target | Valid Drop Zones | Effect |
|---|---|---|
| Module | Between other modules | Reorders `modules.order_index` |
| Lesson | Between lessons, across modules | Reorders + can reparent `module_id` |
| Slide | Between slides in same lesson | Reorders `slides.order_index` |
| Block | Between blocks in same slide | Reorders `lesson_blocks.order_index` |

### Visual Feedback

- Drag handle (grip icon) on each item — prevents accidental drags.
- Blue horizontal drop indicator line between items.
- Dragging item: reduced opacity + shadow lift.
- Invalid zones: dimmed.
- Keyboard accessible: Tab > Space > Arrow keys > Space.

### Preview Panel

Blocks within a slide can also be reordered by dragging directly in the live preview (drag handle appears on hover).

---

## 11. Multi-Tenancy Isolation

### Three Isolation Layers

**Layer 1: Database (RLS)**

```sql
CREATE OR REPLACE FUNCTION public.current_institution_id()
RETURNS uuid LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT institution_id FROM public.users WHERE id = auth.uid();
$$;

-- All tables get institution-scoped policies:
CREATE POLICY "Users see own institution courses"
  ON public.courses FOR SELECT
  USING (institution_id = public.current_institution_id());

CREATE POLICY "Admins manage own institution courses"
  ON public.courses FOR ALL
  USING (public.is_admin() AND institution_id = public.current_institution_id());
```

**Layer 2: Application (`lib/db/`)**

Every query function includes `institution_id` filter. Double protection.

**Layer 3: Middleware (Tenant Routing)**

Tenant slug resolved from URL path. Admin pages consume `institutionId` from context.

### Isolation Matrix

| Resource | Isolated | Method |
|---|---|---|
| Courses, modules, lessons, slides, blocks | Yes | `institution_id` FK + RLS |
| Users & enrollments | Yes | `institution_id` on users |
| Progress, certificates, reviews | Yes | Via course -> institution chain |
| Themes & branding | Yes | `institution.theme` column |
| Slide templates | Yes | Global (`NULL`) + institution-specific |
| File uploads (future) | Yes | Storage buckets per institution |
| Activity logs | Yes | `institution_id` on log |

### Shared (Global)

- Block type registry (code-level, same types for all).
- Default slide templates (`institution_id = NULL`).
- Platform feature flags and system config.

---

## 12. Live Preview

### Architecture

Preview renders actual student viewer components (not mockups). WYSIWYG guaranteed.

```
<PreviewPanel>
  +-> <PreviewToolbar>
  |    +-> Device toggle: [Desktop 1024px] [Tablet 768px] [Mobile 375px]
  |    +-> Zoom: [50%] [75%] [100%] [Fit]
  +-> <PreviewFrame width={deviceWidth}>
  |    +-> <ThemeProvider theme={resolvedTheme}>
  |    |    +-> <SlideRenderer slide={selectedSlide}>
  |    +-> <SelectionOverlay>
  |         +-> hover: dashed blue outline + type label
  |         +-> click: solid blue outline + properties panel switches
  |         +-> double-click rich_text: inline Tiptap editing
  +-> <SlideNavigation>
       +-> prev / "Slide 3 of 8" / next
```

### Course Card Preview

When course theme is selected, properties panel shows live mini-preview of the student catalog card with thumbnail, title, progress bar, and button — all styled with the current theme.

---

## 13. Future-Proofing Enhancements

| Enhancement | Purpose | Cost |
|---|---|---|
| **Draft/Published status** | Admins edit without affecting live students | Low |
| **Soft deletes** (`deleted_at`) | Undo accidental deletions | Low |
| **Typed theme schema** (Zod) | Safe theme merging, auto-fill new properties | Low |
| **Block `layout` field** | Reserved for future multi-block slides | Trivial |
| **Activity log** | Audit trail for multi-admin institutions | Medium |

---

## 14. Implementation Phases

### Phase 1: Foundation (Editor Shell + Data Model)
- Database migrations (slides, theme columns, soft deletes, status, institution scoping)
- `resolveTheme()` utility
- `lib/db/` query layer with institution scoping
- Editor route with three-panel shell
- Structure panel: read-only tree
- Preview panel: renders existing viewers

### Phase 2: Structure Management (CRUD + Reordering)
- Add/edit/delete modules, lessons, slides
- Slide template picker
- `@dnd-kit` reordering
- Undo/redo stack
- Auto-save + status bar

### Phase 3: Block Editors (Content Authoring)
- Editor components for all block types (Tiptap for rich text)
- Register `EditorComponent` in block registry
- Click-to-select in preview
- Add/remove/reorder blocks within slides

### Phase 4: Theme Editor (Visual Customization)
- Course theme editor (colors, fonts, logo)
- Slide-level style overrides
- Institution theme defaults
- Course card preview
- CSS variable generation
- Student viewer consumes `resolveTheme()`

### Phase 5: Polish & Publishing
- Draft/published workflow
- Device preview toggle
- Keyboard shortcuts
- Unsaved changes warning
- Activity log
- RLS for new tables
- Legacy content migration to slides model

### Phase 6: Advanced (Future)
- tldraw interactive block type
- Duplicate course/module/lesson
- Version history with rollback
- Collaborative editing
- AI content generation

### Dependencies

```
Phase 1 --> Phase 2 --> Phase 3 --> Phase 5
                |                    ^
                +--> Phase 4 --------+
```

Phases 3 and 4 can run in parallel after Phase 2.

---

## 15. Key Decisions Summary

| Decision | Choice | Rationale |
|---|---|---|
| Editor approach | Custom-built panels | Full control, reuses existing viewers, no framework fighting |
| Slide model | New `slides` table between lessons and blocks | Clean separation, template support, per-slide styling |
| Drag-and-drop | `@dnd-kit` | Lightweight, accessible, React-native |
| Rich text | Tiptap | ProseMirror-based, small bundle, HTML output matches existing format |
| Theme system | Zod-validated cascade (institution > course > slide) | Type-safe, extensible, auto-fills defaults |
| Multi-tenancy | Triple layer (RLS + app + middleware) | Defense in depth, zero data leakage |
| Content safety | Draft/published + soft deletes | Prevents live breakage and data loss |
| tldraw | Future block type, not editor canvas | Right tool for the right job |
