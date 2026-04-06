# GANSID LMS — Claude Code Context

## What This Project Is

A multi-tenant Learning Management System built for the **Global Action Network for Sickle Cell & Other Inherited Blood Disorders (GANSID)**. It hosts courses originally authored in EdApp (SCORM format) and serves patient organizations and advocates globally.

**Live Supabase project:** `ylmnbbrpaeiogdeqezlo`
**Dev server port:** 3001 (`npm run dev -- -p 3001`)
**Tenant slug:** `gansid` — all student/admin URLs use the prefix `/gansid/`

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript 5, React 19 |
| Auth + DB | Supabase (Postgres + Auth) |
| Styling | Tailwind CSS 4, shadcn/ui |
| Validation | Zod |
| Testing | Vitest, React Testing Library |
| SCORM import | Node.js CLI (`scripts/import-scorm/`) |

---

## Project Structure

```
src/
  app/
    admin/               # Admin portal (requires admin role)
      courses/[id]/      # Course editor + lesson list
        editor/          # Three-panel course editor (structure/preview/properties)
        preview/         # Admin course preview — full-screen overlay, student view
        lessons/[lessonId]/blocks/  # Block editor
        lessons/[lessonId]/quiz/    # Quiz editor
      layout.tsx
      login/page.tsx
    student/             # Student portal
      page.tsx                      # Dashboard — enrolled courses + explore catalog
      courses/[id]/page.tsx         # Thin wrapper — delegates to CourseViewer component
      courses/[id]/lessons/[lessonId]/quiz/page.tsx   # Stand-alone quiz page
      profile/page.tsx
      layout.tsx
    [tenant]/            # Multi-tenant rewrite target
    layout.tsx           # Root layout — MUST keep import '@/lib/content/blocks/register-all'
  components/
    student/
      course-viewer.tsx  # Shared viewer — accepts courseId + previewMode props
                         #   previewMode suppresses enrollment/progress/cert DB writes
                         #   h-[calc(100vh-3rem)] preview vs h-[calc(100vh-6rem)] student
    lesson-block-renderer.tsx   # Renders any LessonBlock using registry
    leave-review-button.tsx     # CLIENT — star-rating review modal (Dialog + Supabase upsert)
    editor/              # Three-panel editor components
      course-editor-shell.tsx   # Editor root — loads course data, owns all CRUD handlers
      editor-toolbar.tsx        # Save/Undo/Redo/Preview/Publish toolbar
      structure-panel.tsx       # Left: module/lesson/slide tree
      preview-panel.tsx         # Centre: slide preview
      properties-panel.tsx      # Right: selected element properties
      dnd/                      # @dnd-kit drag-and-drop system
        editor-dnd-context.tsx  # Top-level DnD context (palette→canvas + block reorder)
        draggable-block-item.tsx # Palette items with useDraggable
        sortable-block.tsx      # Canvas blocks with useSortable + drag handles
        block-drag-overlay.tsx  # Floating preview with block-type icon
        drop-indicator.tsx      # Blue insertion line between blocks
    shared/                     # Shared components used by both editor and student views
      slide-frame.tsx           # WYSIWYG slide card: header + progress bar + content area
      title-slide.tsx           # Hero gradient/image title slide with GANSID branding
      completion-slide.tsx      # Award icon completion slide
    blocks/                     # One viewer per block type
      rich-text/viewer.tsx      # prose-xl scaling
      image-gallery/viewer.tsx  # Aspect ratio, lazy loading, error fallback, HTML captions
      cta/viewer.tsx
      quiz-inline/viewer.tsx    # Navy button/highlight, h-full layout
      callout/viewer.tsx
      video/viewer.tsx          # Responsive aspect-video, loading spinner, error state
      pdf/, iframe/, h5p/
  lib/
    content/
      block-registry.ts         # Runtime Map of registered block types
      blocks/register-all.ts    # 'use client' — registers ALL block types on import
      lesson-blocks.ts          # sortBlocks(), createLegacyBlockPayload()
    stores/
      editor-store.ts           # Zustand vanilla store for editor state (undo/redo, dirty flag)
    db/                         # All Supabase CRUD — functions accept SupabaseClient param
      index.ts                  # Barrel — re-exports all db modules
      editor.ts                 # loadEditorCourseData() — bulk fetch for editor shell
      courses.ts / modules.ts / lessons.ts / slides.ts / blocks.ts
      progress.ts / enrollments.ts / users.ts / activity-log.ts
      groups.ts             # User group CRUD, membership management
      course-assignments.ts # Course assignment CRUD, visibility query
    auth/
    tenant/
    supabase/
      client.ts   # createClient() — anon key + cookies (USE IN CLIENT COMPONENTS)
      server.ts   # createClient() — server-side with next/headers (SERVER ONLY)

scripts/
  import-scorm/       # EdApp SCORM → seed JSON → SQL pipeline
    index.ts          # CLI entry: npx tsx scripts/import-scorm/index.ts <dir>
    extract.ts        # Reads .zip, parses config.json
    map-slides.ts     # Converts EdApp slides → MappedBlock[]
    map-quizzes.ts
    generate-seed.ts  # Writes .seed.json
    output/           # Generated SQL and seed files

.claude/
  launch.json         # Dev server config — port 3001, autoPort: false (required for Supabase OAuth)
```

---

## Database Architecture

### Core Tables

```
institutions → courses → modules → lessons → lesson_blocks
                      ↘ course_enrollments
                      ↘ categories
                      ↘ course_user_assignments → users
                      ↘ course_group_assignments → user_groups
users → progress (lesson_id)
      → certificates (course_id)
      → course_reviews (course_id)
      → user_group_members → user_groups
```

### Key IDs (GANSID institution)

| Entity | UUID |
|---|---|
| institution | `725f40e5-a317-4b8f-80b8-1df6cf3bbe2a` |
| Course: Fundamentals of Effective Advocacy | `6b4906f1-803b-40bb-8582-d591220e5d09` |
| Module 1 (Advocacy) | `a4ce8c6c-ea88-45fb-b590-05fb329347c3` |
| Course: Fundraising Strategies | `823fe330-1df4-42ee-89af-d7df079958f5` |
| Module 2 (Fundraising) | `9a681ce2-e300-404e-be2c-a081e6795ade` |

### Applied Migrations (in order)

| # | Name | Purpose |
|---|---|---|
| 001–007 | initial schema | Core tables, RLS, auth trigger |
| 008 | add_slug_to_courses | `ALTER TABLE courses ADD COLUMN IF NOT EXISTS slug text UNIQUE` |
| 009 | add_blocks_content_type | Adds `'blocks'` to `lessons.content_type` CHECK constraint |
| 010 | fix_rls_infinite_recursion | Creates `public.is_admin()` SECURITY DEFINER fn; fixes admin policies on users/courses/enrollments |
| 011 | fix_remaining_rls_policies | Updates admin policies on certificates, progress, categories, lessons, questions, quiz_attempts, quizzes to use `is_admin()` |
| 012–015 | modules_3_10_seed | Modules 3–10 content seeded (all GANSID courses) |
| 016 | course_enrollments_delete_policy | DELETE RLS policy for self-unenroll |
| 017 | make_content_url_nullable | `lessons.content_url` DROP NOT NULL (block-based lessons don't use it) |
| 018 | user_groups_and_course_assignments | `user_groups`, `user_group_members`, `course_user_assignments`, `course_group_assignments` tables + `courses.access_mode` column |
| 019 | user_group_members_legacy_support | `user_group_members.user_id` nullable + `legacy_user_id` column with CHECK constraint (exactly one set) |

### RLS Pattern — CRITICAL

All "admin can do X" policies MUST use `public.is_admin()`, not inline `EXISTS (SELECT 1 FROM users ...)`. The inline form causes infinite recursion.

```sql
-- CORRECT
CREATE POLICY "Admins can read all X" ON public.X FOR SELECT USING (public.is_admin());

-- WRONG — causes 500 for all users
CREATE POLICY "Admins can read all X" ON public.X FOR SELECT
  USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'));
```

The `is_admin()` function:
```sql
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin');
$$;
```

---

## Routing / Middleware

`src/middleware.ts` handles multi-tenancy:
- `/gansid/student/*` → rewrites to `/student/*`
- `/gansid/admin/*` → rewrites to `/admin/*`
- Admin users hitting `/student/*` get redirected to `/admin`
- Student users hitting `/admin/*` get redirected to `/student`

Student URL for testing: `http://localhost:3001/gansid/student`

---

## Block System

### How It Works

1. `lesson_blocks` table rows have `block_type` (string) and `data` (jsonb).
2. `src/lib/content/blocks/register-all.ts` registers all known block types into a module-level `Map`.
3. `lesson-block-renderer.tsx` calls `getBlockType(block.block_type)` to find the viewer and renders it.

### CRITICAL: Registration Must Run on the Client

`register-all.ts` has `'use client'`. It is imported in:
- `src/app/layout.tsx` (side-effect import for server layout)
- `src/components/lesson-block-renderer.tsx` (direct import — required for the client bundle)

**If you add a new block type**, register it in `register-all.ts`. Failure to do this causes "Content unavailable (block_type)" in the student view.

### Registered Block Types

`rich_text`, `image_gallery`, `cta`, `callout`, `quiz_inline`, `video`, `pdf`, `iframe`, `h5p`

---

## Next.js 15+ Params Pattern

All dynamic route pages must unwrap `params` with `React.use()`:

```tsx
// CORRECT for Next.js 15+
export default function Page({ params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const params = React.use(paramsPromise);
  // ...
}

// WRONG — causes "params is a Promise" error
export default function Page({ params }: { params: { id: string } }) {
  // ...
}
```

Affected files: all `app/**/[id]/page.tsx` and `app/**/[lessonId]/page.tsx`.

---

## SCORM Import Pipeline

EdApp SCORM packages live in: `Core Scorn Packages/` (sibling of `Lms/`)

### Quick Import (Full Process)

```bash
# 1. Run the extractor — outputs .seed.json
npx tsx scripts/import-scorm/index.ts "../Core Scorn Packages/Module 1 - Fundamentals of Effective Advocacy"

# 2. Fix order_index (EdApp always exports config.index = 0)
#    The seed JSON will have all lessons at order_index: 0 — run the fix:
node -e "
const fs = require('fs');
const data = JSON.parse(fs.readFileSync('scripts/import-scorm/output/<module-slug>.seed.json', 'utf8'));
data.lessons = data.lessons.map((l, i) => ({ ...l, order_index: i }));
fs.writeFileSync('scripts/import-scorm/output/<module-slug>.seed.json', JSON.stringify(data, null, 2));
console.log('Fixed order_index for', data.lessons.length, 'lessons');
"

# 3. Apply via Supabase MCP (see full skill: gansid-scorm-import)
```

**See the full step-by-step skill:** `~/.claude/skills/gansid-scorm-import/SKILL.md`

---

## Environment Variables

`.env.local` contains:
```
NEXT_PUBLIC_SUPABASE_URL=https://ylmnbbrpaeiogdeqezlo.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
```

There is **no** `SUPABASE_SERVICE_ROLE_KEY`. Use the **Supabase MCP** (`execute_sql` / `apply_migration`) for all DDL and seeding operations.

---

## Brand Colours

| Token | Hex | Usage |
|---|---|---|
| Red | `#DC2626` | Active lesson, progress bar, lesson title header, "Next Lesson" button |
| Dark navy | `#1E3A5F` | Primary action buttons (Next, Check Answer), title slide gradient start |
| Near-black | `#0F172A` | Navbar, course header, "Back to Dashboard" button |
| Teal | `#0099CA` | Overall course progress bar in course header |
| Blue | `#2563EB` | Legacy accent (quiz page, some outlines) — prefer navy for new UI |

---

## Slide Viewer Architecture

`src/components/student/course-viewer.tsx` is the shared course viewer (`'use client'`).
- `src/app/student/courses/[id]/page.tsx` is a thin wrapper passing `courseId` to `<CourseViewer />`
- `src/app/admin/courses/[id]/preview/page.tsx` passes `courseId` + `previewMode` to suppress DB writes

### `previewMode` behaviour
When `previewMode={true}`:
- Auto-enrollment insert is skipped
- Progress upsert + certificate insert are skipped; `fetchData()` not re-called
- Local state (`setProgress`) and completion toast still fire (visual feedback works)
- Unenroll button and Leave a Review button are hidden

### Height classes
- Student layout (nav = 6rem): `h-[calc(100vh-6rem)]`
- Preview overlay (banner = 3rem): `h-[calc(100vh-3rem)]`

### Slide Types

```ts
type Slide =
  | { kind: 'title' }               // Hero gradient + lesson title + description + GANSID attribution
  | { kind: 'page'; slideId: string; blocks: LessonBlock[]; settings?: SlideSettings }
  | { kind: 'completion' }          // Award icon, Mark Complete, Take Quiz, Next Lesson / Back buttons
```

### Key State

| State | Purpose |
|---|---|
| `selectedLesson` | Currently displayed lesson |
| `currentSlide` | 0-based index into `currentSlides[]` |
| `sidebarOpen` | Desktop sidebar visibility (collapsible) |
| `autoCompleteFired` | Guards against double-calling `handleMarkComplete` |
| `showReviewModal` | Controls the Leave a Review Dialog |

### Layout

- Outer: `h-[calc(100vh-6rem)] flex flex-col overflow-hidden` (subtracts `pt-24` navbar = 6rem)
- Header: `shrink-0` dark band with course title + overall progress
- Body: `flex-1 min-h-0 flex lg:flex-row gap-3 p-3` — sidebar + slide card side by side
- Sidebar: fixed `260px` wide, collapsible on desktop; `<select>` dropdown on mobile (`lg:hidden`)
- Slide card: `flex flex-col h-full` with `shrink-0` top bar + bottom nav, `flex-1 overflow-y-auto` content

### Auto-complete behaviour

A `useEffect` fires `handleMarkComplete()` when `currentSlide` reaches the completion slide, guarded by `autoCompleteFired` ref to prevent re-runs.

### Course Reviews

`LeaveReviewButton` (`src/components/leave-review-button.tsx`) is a client component that:
- Opens a shadcn `Dialog` with a 5-star rating + optional text
- Fetches any existing review from `course_reviews` on open (pre-fills if found)
- Upserts (insert or update) on submit
- Used on: completion slide, and enrolled course cards (only when `progressPercent === 100`)

---

## WYSIWYG Editor Architecture

The editor canvas renders slides identically to the student viewer using shared components:

| Component | Location | Purpose |
|---|---|---|
| `SlideFrame` | `src/components/shared/slide-frame.tsx` | Card shell: header (lesson title + progress bar) + content area. Used by both editor and student views. |
| `TitleSlide` | `src/components/shared/title-slide.tsx` | Gradient/image hero with GANSID branding. Shared. |
| `CompletionSlide` | `src/components/shared/completion-slide.tsx` | Award icon + "Lesson Complete". Editor-only (student has action buttons inline). |
| `SlideContentArea` | Exported from `slide-frame.tsx` | Content wrapper with student-matching padding (`px-6 py-5 gap-5`). |

### Slide Backgrounds

Stored in `slide.settings`:
- `settings.background` — `'gradient'` | `'#hexcolor'` | defaults to `'#FFFFFF'`
- `settings.background_image` — Full Supabase URL to an uploaded image (renders as absolute-positioned cover behind content with `bg-black/20` overlay)

The `SlideStyleEditor` (`theme-editor/slide-style-editor.tsx`) provides both color presets and image upload.

Both the editor preview (`slide-preview.tsx`) and the student/preview viewer (`course-viewer.tsx`) use `getSlideBackground()` + background image overlays, and `SlideContentArea` for matching padding. The student viewer fetches `settings` from the `slides` table alongside `id` and `order_index`.

### Editor DnD System

All DnD uses `@dnd-kit` (no HTML5 drag). Components in `src/components/editor/dnd/`:

- **`EditorDndContext`** — Wraps the three editor panels. Hybrid collision detection: `pointerWithin` for palette drops, `closestCenter` for block reorder.
- **`DraggableBlockItem`** — Palette items (properties panel "Components" tab) use `useDraggable` with `source: 'palette'` data.
- **`SortableBlock`** — Canvas blocks use `useSortable` with `source: 'canvas'` data. Drag handle (GripVertical) appears on hover. Blue insertion line shows drop target.
- **`BlockDragOverlay`** — Floating preview with block-type icon + contextual hint.

### Delete Confirmation

Uses an inline bottom toast bar (`fixed bottom-6 left-1/2 z-[70]`), NOT a full-screen dialog. No blur overlay. After deletion, selection moves to the parent entity (block→slide, slide→lesson, lesson→module).

### Quiz Editor State Caching

`quiz-inline/editor.tsx` uses a `useRef<TypeCache>` to cache options/categories per question type. Switching from multiple choice → categorize → back restores previous options.

---

## Admin Preview Route

`/gansid/admin/courses/[id]/preview` renders `<CourseViewer courseId={id} previewMode />` inside a `fixed inset-0 z-[60]` overlay that covers the admin nav entirely. A navy banner at the top (`h-12`, `bg-[#1E3A5F]`) shows "Admin Preview" with a "Back to Editor" link.

- **z-index:** Use `z-[60]` (not `z-50`) — admin nav uses `z-50`; dialogs use `z-50` but are portal-rendered so they escape the overlay stacking context
- **Entry points:** Editor toolbar Eye button (`courseId?` prop → `router.push`) + hover Eye icon on admin course cards (`opacity-0 group-hover:opacity-100 focus-visible:opacity-100`)

---

## Engineering Rules

1. **No Supabase calls outside `lib/db/`** — partially enforced; `CourseViewer` is a known exception pending refactor.
2. **RLS admin policies always use `public.is_admin()`** — never inline `FROM users` check.
3. **`register-all.ts` must be imported in `lesson-block-renderer.tsx`** — not just in layout.
4. **`params` must be unwrapped with `React.use()`** in all dynamic route pages.
5. **New migrations go through Supabase MCP** (`apply_migration`) — not raw SQL editor.
6. **Block types registered in `register-all.ts`** — one entry per viewer component.
7. **Dev server port is fixed at 3001** — `autoPort: false` in `.claude/launch.json`. Do not change; Supabase OAuth callback is pinned to this port.
8. **Course page is a client component** — do not add `async` or server-side `await` to `CourseViewer`. Fetch via Supabase client in effects.
9. **`lib/db/` files must NOT import from `@/lib/supabase/server`** — `server.ts` uses `next/headers` which is server-only. Any db file imported by a client component (directly or via the `@/lib/db` barrel) will break the build. All read helpers must accept a `SupabaseClient` parameter instead of calling `createClient()` internally.
10. **Tiptap `useEditor` must include `immediatelyRender: false`** — without it, SSR throws a hydration mismatch error.
11. **`lessons.content_url` is nullable** — block-based lessons don't use it (migration 017). Do not restore the NOT NULL constraint.
12. **Editor save must not swallow errors** — `handleSave` tracks failure count and only calls `markSaved()` when all DB writes succeed. Failures keep `isDirty = true` (so auto-save retries) and show a toast error. Never `.catch()` and discard save errors silently.
13. **Rich text sanitizer strips relative image paths** — SCORM-imported HTML may contain `<img src="fit_content_assets/...">` with relative paths that can't load. The sanitizer in `rich-text/viewer.tsx` removes `<img>` tags whose `src` doesn't start with `http://`, `https://`, or `data:`.

---

## Current Implementation Status (as of 2026-04-06)

### Completed
- [x] Auth system: signup, login, role-based routing, email verification
- [x] Multi-tenant middleware (`/gansid/` prefix)
- [x] Database schema: all core tables + indexes
- [x] RLS: all admin policies fixed to use `is_admin()` (migrations 010, 011)
- [x] Block registry system with lazy-loaded viewers
- [x] SCORM import pipeline (CLI → seed.json → SQL)
- [x] All 10 GANSID modules seeded (Modules 1–10)
- [x] Student course page: renders all block types (rich_text, image_gallery, cta, etc.)
- [x] Lesson ordering correct in all courses
- [x] `params` Promise fix applied to all dynamic route pages
- [x] Slide-based lesson viewer (title → content blocks → completion slide)
- [x] Collapsible desktop sidebar with red active-state accent
- [x] Mobile lesson selector (native `<select>` dropdown with ✓ for completed)
- [x] Keyboard navigation (← / → arrow keys) across slides
- [x] Auto-mark-complete on reaching the completion slide
- [x] Viewport-locked layout (no page scroll; internal slide scroll only)
- [x] Course reviews: "Leave a Review" modal on completion slide and completed course cards
- [x] Quiz page redesign (white bg, navy question card, white answer buttons)
- [x] Block viewer typography scale (prose-xl rich text, larger quiz text/buttons)
- [x] Brand colour system documented (red primary, navy secondary)
- [x] Three-panel course editor (`/admin/courses/[id]/editor`) with structure/preview/properties panels
- [x] Admin course preview mode (`/admin/courses/[id]/preview`) — full-screen overlay, no DB writes
- [x] Editor toolbar Eye button + admin course card hover Eye → preview route
- [x] `CourseViewer` extracted to `src/components/student/course-viewer.tsx`
- [x] DB layer client-safe: all `lib/db/` helpers accept `SupabaseClient` param (no server-only imports)
- [x] Course assignment system: `access_mode` toggle (all/restricted), user/group assignment, student visibility filtering
- [x] User groups: CRUD, membership management (active + legacy users), Groups tab in admin user management
- [x] AccessModePicker: reusable component in course create/edit forms + course detail assignments tab
- [x] Editor DnD: @dnd-kit block drag from palette with visual overlay, block reorder with drag handles + insertion lines
- [x] Block viewer improvements: image gallery (aspect ratio, lazy load, error fallback), video (responsive, loading spinner)
- [x] WYSIWYG editor preview: shared SlideFrame/TitleSlide components, editor matches student view pixel-for-pixel
- [x] Full-page slide backgrounds: image upload + color/gradient via slide settings editor
- [x] Editor UX: inline delete toast (no blur overlay), quiz type state caching, "Unsaved changes" indicator
- [x] Image URL validation: handles SCORM relative paths gracefully, HTML caption rendering
- [x] Save reliability: errors tracked per-item, `markSaved()` only on zero failures, toast on failure, auto-save retries
- [x] WYSIWYG parity: student/preview viewer renders slide backgrounds + `SlideContentArea` matching editor
- [x] Rich text sanitizer strips unresolvable relative `<img>` paths from SCORM imports

### In Progress / Next
- [ ] Phase 3 remaining: inline block editing on canvas, slide CRUD polish
- [ ] Phase 4: Quiz expansion (standalone quiz grading, scores, retry logic)
- [ ] Phase 5: Multi-tenant polish, per-tenant branding
- [ ] Phase 6: Advanced blocks (hotspot, sequence, drag-and-drop)
- [ ] Phase 7: Hardening — error boundaries, accessibility audit, performance

### Known Gaps
- `CourseViewer` still makes direct Supabase calls (should go through `lib/db/`)
- `src/app/admin/courses/[id]/page.tsx` same issue
- No `SUPABASE_SERVICE_ROLE_KEY` — seed scripts must use MCP
- SCORM-imported images: inline relative paths (`fit_content_assets/...`) are stripped by the rich text sanitizer; the actual images exist as separate `image_gallery` blocks with working EdApp CDN URLs. A future data migration could upload them to Supabase Storage.

---

## Test Users

| Email | Role | Password |
|---|---|---|
| `tech@sicklecellanemia.ca` | admin | (in Supabase auth) |

Supabase user ID for `tech@sicklecellanemia.ca`: `485e3136-1337-41c3-b8a2-d0d98accb541`

**Required:** This user must have `institution_id = '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a'` set in `public.users` — otherwise the course editor throws "No institution found for user".
