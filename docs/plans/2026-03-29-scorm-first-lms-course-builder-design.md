# SCORM-First LMS Course Builder — Architecture Design

**Date:** 2026-03-29
**Status:** Approved
**Scope:** Extract EdApp SCORM content into a registry-driven, block-based LMS with extensible content types, built on the existing Next.js + Supabase platform.

---

## 1. Goals

1. Import all GANSID EdApp SCORM modules as native LMS content via a reusable extraction pipeline.
2. Evolve the lesson model from single `content_type/content_url` to ordered, typed lesson blocks.
3. Build a block registry where each content type is self-contained (schema, editor, viewer) and new types can be added without touching core code.
4. Expand the quiz/assessment system to support all GANSID question types and future additions.
5. Add a module layer (Course > Module > Lesson > Blocks) matching standard LMS hierarchy.
6. Ensure the architecture supports future rich content: iframed 3JS scenes, H5P activities, tldraw canvases, and custom interactive blocks.
7. Deliver a modern, polished student experience from day one using imported GANSID content.

## 2. Non-Goals (This Phase)

- Custom domain routing per institution (deferred to multi-tenant polish phase).
- Payment/commerce integration.
- Real-time collaborative editing.
- AI-assisted grading.
- Mobile native app.

---

## 3. Engineering Standards

These standards apply to ALL code written under this plan. They are not optional.

### 3.1 Test-Driven Development

- Every new module, utility, and component gets tests BEFORE implementation.
- **Unit tests:** All pure functions (block schema validators, SCORM mappers, completion calculators, score aggregators). Use Vitest.
- **Component tests:** All block viewer and editor components render correctly given valid data, show fallback on invalid data. Use Vitest + React Testing Library.
- **Integration tests:** API routes and server actions return correct responses for valid/invalid/unauthorized requests.
- **E2E tests:** Critical user flows (login, enroll, view lesson, complete quiz, earn certificate). Use Playwright.
- Test files co-locate with source: `block-registry.ts` → `block-registry.test.ts`.
- CI must run the full test suite. PRs cannot merge with failing tests.

### 3.2 Separation of Concerns

Code is organized into strict layers. Each layer has a single responsibility and clear boundaries.

```
src/
  app/                      # ROUTES ONLY — thin wrappers that compose components
    (routes)/                # Route groups, layouts, pages
  components/
    ui/                      # Primitive UI atoms (shadcn) — no business logic
    blocks/                  # Block-specific editor/viewer components
    features/                # Feature-specific composed components (course-card, lesson-sidebar)
    layouts/                 # Shell layouts, navigation, sidebars
  lib/
    content/                 # Block registry, block utilities, SCORM mapping
      blocks/                # Per-block-type folders (schema, editor, viewer)
    auth/                    # Auth utilities, role checks, guards
    tenant/                  # Tenant resolution, institution context
    db/                      # Database query functions (thin Supabase wrappers)
    validators/              # Shared Zod schemas for API input validation
    utils/                   # Pure utility functions (formatting, calculations)
    hooks/                   # Custom React hooks
    constants/               # Enums, config values, magic strings
  types/                     # TypeScript type definitions (no runtime code)
  middleware.ts              # Request-level auth + tenant routing
scripts/
  import-scorm/              # SCORM extraction pipeline (CLI, not app code)
```

**Rules:**
- Route files (`page.tsx`) must be thin: fetch data via `lib/db`, render via `components`. No business logic in route files.
- Components never import from `app/`. Data flows down via props.
- `lib/` modules never import from `components/` or `app/`.
- `lib/db/` is the ONLY layer that touches Supabase directly. Components and routes use these functions, never raw `supabase.from(...)`.
- Server actions live in dedicated files (`actions.ts`) next to their route, importing from `lib/db/`.

### 3.3 Component Size Limits

- No single component file exceeds ~200 lines. If it does, extract sub-components.
- No single function exceeds ~40 lines. If it does, extract helpers.
- No single file has more than one exported React component (co-located small internal components are fine).

### 3.4 Reusable Utilities & Guards

Shared logic is extracted into tested utility functions so changes propagate everywhere:

```typescript
// lib/utils/completion.ts
export function calculateCompletionPercentage(completed: number, total: number): number

// lib/auth/guards.ts
export function requireAuth(): Promise<User>                    // throws if not authenticated
export function requireRole(role: string): Promise<User>        // throws if wrong role
export function requireEnrollment(userId: string, courseId: string): Promise<Enrollment>
export function requireInstitutionMembership(userId: string, institutionId: string): Promise<Membership>

// lib/validators/quiz.ts
export const questionDataSchema: Record<QuestionType, ZodSchema>
export function validateQuestionData(type: string, data: unknown): Result<QuestionData, ValidationError>

// lib/db/courses.ts
export function getCourseWithModules(courseId: string): Promise<CourseWithModules>
export function getCourseLessonsWithProgress(courseId: string, userId: string): Promise<LessonWithProgress[]>
```

**Guard pattern:** Auth/permission checks are centralized guard functions called at the top of every server action and API route. Never inline permission logic.

### 3.5 Error Handling & Observability

- **Structured error types:** Define a `LmsError` base class with subclasses (`AuthError`, `NotFoundError`, `ValidationError`, `PermissionError`). Server actions catch and map these to appropriate responses.
- **Error boundaries:** Every route segment has a React `error.tsx` boundary. Block renderers have individual error boundaries so one broken block doesn't crash the lesson.
- **Logging:** All server actions and API routes log structured events (action name, user ID, institution, duration, success/failure). Use a simple logger utility that can be swapped for a service later.
- **Client error reporting:** Add a global `onError` handler that captures unhandled client errors with context (current route, user role, block type if applicable). Initially logs to console; wired to a reporting service later.
- **Health checks:** API route at `/api/health` that verifies database connectivity and auth service status.

### 3.6 Database Migration Safety

- All schema changes are versioned SQL migration files in `supabase/migrations/`.
- Migrations must be backward-compatible: add columns as nullable with defaults, never drop columns in the same release as code changes.
- Every migration has a corresponding rollback file.
- Seed data for development is separate from migrations.

### 3.7 Feature Flags & Graceful Degradation

- New block types are registered but can be disabled per institution via a `disabled_block_types` JSONB array on `institution_branding`.
- The block renderer gracefully handles unknown block types with a styled "Content type not available" placeholder — never crashes.
- The legacy `content_type/content_url` lesson model continues to work via the existing `createFallbackBlockFromLesson()` bridge until all content is migrated.

---

## 4. Data Model Evolution

### 4.1 New: `modules` Table

```sql
CREATE TABLE modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  institution_id UUID REFERENCES institutions(id),
  title TEXT NOT NULL,
  description TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  is_published BOOLEAN DEFAULT TRUE,
  prerequisite_module_id UUID REFERENCES modules(id) ON DELETE SET NULL,
  unlock_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 4.2 Evolve: `lessons` Table

Add columns (all nullable for backward compat):

```sql
ALTER TABLE lessons
  ADD COLUMN module_id UUID REFERENCES modules(id) ON DELETE SET NULL,
  ADD COLUMN prerequisite_lesson_id UUID REFERENCES lessons(id) ON DELETE SET NULL,
  ADD COLUMN is_required BOOLEAN DEFAULT TRUE;
```

Lessons with `module_id = NULL` continue to work as top-level course lessons (backward compat).

### 4.3 Evolve: `lesson_blocks` Table

The table already exists. Add:

```sql
ALTER TABLE lesson_blocks
  ADD COLUMN is_visible BOOLEAN DEFAULT TRUE,
  ADD COLUMN settings JSONB DEFAULT '{}',
  ADD COLUMN version INTEGER DEFAULT 1;
```

- `settings`: Display-level config (padding, background, width) orthogonal to content `data`.
- `version`: Tracks block data schema version for safe migrations when block schemas evolve.

### 4.4 Evolve: `questions` Table

Migrate from rigid columns to JSONB:

```sql
-- New columns
ALTER TABLE questions
  ADD COLUMN question_data JSONB DEFAULT '{}',
  ADD COLUMN correct_answer_data JSONB DEFAULT '{}',
  ADD COLUMN points NUMERIC(6,2) DEFAULT 1.0,
  ADD COLUMN explanation TEXT;

-- Migrate existing data
UPDATE questions SET
  question_data = jsonb_build_object('options', options),
  correct_answer_data = jsonb_build_object('correct_answer', correct_answer);

-- Widen the CHECK constraint
ALTER TABLE questions DROP CONSTRAINT IF EXISTS questions_question_type_check;
-- No new CHECK — validated at application layer via Zod
```

Supported question types: `multiple_choice`, `multiple_select`, `true_false`, `fill_blank`, `matching`, `ordering`, `categorize`, `likert_scale`, `open_text`, `short_answer`.

### 4.5 New: `quiz_responses` Table

```sql
CREATE TABLE quiz_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id UUID NOT NULL REFERENCES quiz_attempts(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES questions(id),
  response_data JSONB NOT NULL DEFAULT '{}',
  is_correct BOOLEAN,
  points_awarded NUMERIC(6,2),
  answered_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(attempt_id, question_id)
);
```

### 4.6 Evolve: `quiz_attempts` Table

```sql
ALTER TABLE quiz_attempts
  ADD COLUMN attempt_number INTEGER DEFAULT 1,
  ADD COLUMN status TEXT DEFAULT 'submitted' CHECK (status IN ('in_progress', 'submitted', 'graded')),
  ADD COLUMN max_score NUMERIC(10,5),
  ADD COLUMN percentage NUMERIC(5,2),
  ADD COLUMN time_started TIMESTAMPTZ,
  ADD COLUMN graded_by UUID REFERENCES users(id);
```

### 4.7 Evolve: `quizzes` Table

```sql
ALTER TABLE quizzes
  ADD COLUMN max_attempts INTEGER DEFAULT 1,
  ADD COLUMN passing_score_percentage NUMERIC(5,2) DEFAULT 0,
  ADD COLUMN scoring_mode TEXT DEFAULT 'best' CHECK (scoring_mode IN ('best', 'latest', 'average', 'first')),
  ADD COLUMN time_limit_minutes INTEGER,
  ADD COLUMN shuffle_questions BOOLEAN DEFAULT FALSE;
```

---

## 5. Block Registry Architecture

### 5.1 Registry Interface

```typescript
// src/lib/content/block-registry.ts

interface BlockTypeDefinition<TData = Record<string, unknown>> {
  type: string;
  label: string;
  description: string;
  icon: string;                    // lucide icon name
  category: 'content' | 'media' | 'interactive' | 'assessment' | 'navigation';

  dataSchema: ZodSchema<TData>;
  defaultData: TData;

  // Lazy-loaded components — keep bundle small
  EditorComponent: React.LazyExoticComponent<React.ComponentType<BlockEditorProps<TData>>>;
  ViewerComponent: React.LazyExoticComponent<React.ComponentType<BlockViewerProps<TData>>>;

  completionCriteria?: (data: TData, interaction: unknown) => boolean;
  singleton?: boolean;
  version: number;
  migrate?: (oldData: unknown, fromVersion: number) => TData;
}
```

### 5.2 Block Type Inventory

| Type | Category | EdApp Source | Data Shape (key fields) |
|------|----------|-------------|------------------------|
| `rich_text` | content | `scrolling-media`, `text-sequence` | `{ html, media[], mode }` |
| `image_gallery` | media | `image-slider`, `image-gallery` | `{ images[], mode: 'slider'\|'gallery'\|'carousel' }` |
| `video` | media | *(existing)* | `{ url, poster?, autoplay? }` |
| `audio` | media | *(new)* | `{ url, title?, transcript? }` |
| `image` | media | *(existing)* | `{ url, alt, caption? }` |
| `pdf` | media | *(existing)* | `{ url, title? }` |
| `iframe` | interactive | *(existing)* | `{ url, height?, sandbox? }` |
| `model3d` | interactive | *(existing)* | `{ url, autoRotate?, cameraControls? }` |
| `h5p` | interactive | *(existing)* | `{ contentKey }` |
| `canvas` | interactive | *(existing)* | `{ canvasData }` |
| `hotspot` | interactive | `image-map` | `{ imageUrl, regions[] }` |
| `quiz_inline` | assessment | `categorise` + quiz data | `{ questions[], showFeedback? }` |
| `quiz_summary` | assessment | *(existing)* | `{ quizId }` |
| `callout` | content | *(new)* | `{ variant: 'info'\|'warning'\|'tip', html }` |
| `download` | navigation | *(existing)* | `{ url, filename, description? }` |
| `cta` | navigation | `exit` | `{ text, action, buttonLabel }` |

### 5.3 Folder-Per-Block Structure

```
src/lib/content/blocks/
  rich-text/
    schema.ts          # Zod schema for data JSONB
    index.ts           # registerBlockType() call
  image-gallery/
    schema.ts
    index.ts

src/components/blocks/
  rich-text/
    viewer.tsx         # Student-facing renderer
    editor.tsx         # Admin editing component
  image-gallery/
    viewer.tsx
    editor.tsx
  ...
```

Schema + registration lives in `lib/` (no React imports). Components live in `components/`. This keeps the dependency graph clean: `lib/` never imports from `components/`.

### 5.4 Registry-Driven Renderer

Replaces the current switch statement in `lesson-block-renderer.tsx`:

```typescript
export function LessonBlockRenderer({ block }: { block: LessonBlock }) {
  const definition = getBlockType(block.block_type);
  if (!definition) {
    return <BlockUnsupported type={block.block_type} />;
  }
  const Viewer = definition.ViewerComponent;
  return (
    <BlockErrorBoundary blockType={block.block_type}>
      <Suspense fallback={<BlockSkeleton />}>
        <Viewer data={block.data} block={block} />
      </Suspense>
    </BlockErrorBoundary>
  );
}
```

Adding a new block type: create the folder, register it, done. Zero changes to the renderer, routes, or database.

---

## 6. SCORM Content Extraction Pipeline

### 6.1 Pipeline Overview

```
scripts/import-scorm/
  index.ts              # CLI entry: accepts module directory path
  extract.ts            # Unzip SCORM .zip → read config.json
  map-slides.ts         # EdApp slide → LessonBlock[] mapping
  map-quizzes.ts        # gansid_course_data.json → Question[] mapping
  extract-media.ts      # Copy images from fit_content_assets/ → public/media/
  rewrite-paths.ts      # Update image URLs in HTML content
  generate-seed.ts      # Output SQL/JSON seed files
  types.ts              # EdApp config.json TypeScript types
```

### 6.2 Slide Type Mapping

| EdApp Slide Type | Block Type | Mapping Logic |
|---|---|---|
| `scrolling-media` | `rich_text` | Concatenate `data.content[]` items (text → HTML, image → `<img>` tag), set `mode: 'scrolling'` |
| `image-slider` | `image_gallery` | Map `data.items[]` to `images[]` with captions, set `mode: 'slider'` |
| `image-gallery` | `image_gallery` | Same as slider but `mode: 'gallery'` |
| `text-sequence` | `rich_text` | Map `data.items[]` to `segments[]`, set `mode: 'sequence'` |
| `image-map` | `hotspot` | Map `data.pins[]` to `regions[]` with coordinates and content |
| `categorise` | `quiz_inline` | Map `data.categories[]` to question with `type: 'categorize'` |
| `exit` | `cta` | Map to `{ action: 'complete_lesson', text: data.content, buttonLabel: data.buttonText }` |

### 6.3 Quiz Data Merge

The `gansid_course_data.json` contains the final assessment quiz (9 lessons, 7 question types). The pipeline:

1. Reads `gansid_course_data.json`.
2. For each lesson with `capture_status: 'complete'` or `'partial'`, maps questions to the JSONB question model.
3. Outputs quiz seed data linked to the appropriate module/lesson.

### 6.4 Media Handling

- Images referenced in EdApp `config.json` as `fit_content_assets/...` are copied to `public/media/courses/{moduleSlug}/{lessonSlug}/`.
- HTML content image paths are rewritten to the new location.
- A manifest of all extracted media is generated for later upload to Supabase Storage.

---

## 7. Completion & Progress Logic

### 7.1 Completion Chain

```
Block Complete → Lesson Complete → Module Complete → Course Complete → Certificate
```

**Block completion** is defined per block type in the registry's `completionCriteria`:
- `rich_text`, `image`, `callout`, `download`: Viewed (rendered on screen)
- `video`: Watched >= 90%
- `quiz_inline`: Submitted with all questions answered
- `cta`: Button clicked
- `iframe`, `h5p`, `model3d`: Loaded (interaction tracking added later)

**Lesson complete:** All blocks where `is_visible = true` are completed.

**Module complete:** All lessons where `is_required = true` and `is_published = true` are completed.

**Course complete:** All modules where `is_published = true` are completed AND any quiz `passing_score_percentage` thresholds are met.

### 7.2 Sequential Locking

Locking is computed at query time, never stored:

```typescript
// lib/utils/locking.ts
export function isLessonLocked(
  lesson: Lesson,
  moduleConfig: Module,
  userProgress: Map<string, boolean>
): { locked: boolean; reason?: string }
```

A lesson is locked if:
1. Its `prerequisite_lesson_id` is not completed, OR
2. Its parent module has `prerequisite_module_id` whose module is not completed, OR
3. Its parent module `unlock_date` is in the future.

### 7.3 Progress Calculation Utility

```typescript
// lib/utils/completion.ts
export function calculateCompletionPercentage(completed: number, total: number): number
export function calculateModuleProgress(lessons: LessonWithProgress[]): ModuleProgress
export function calculateCourseProgress(modules: ModuleWithProgress[]): CourseProgress
```

These are pure functions, fully tested, used by both the student dashboard and the progress page.

---

## 8. What We KEEP, EVOLVE, and ADD

### KEEP (No Changes)

| Feature | Files | Quality |
|---------|-------|---------|
| Auth flow (login, signup, callback) | `app/login/`, `app/admin/login/`, `app/auth/` | 8/10 |
| User profiles (avatar, bio, password) | `app/student/profile/`, `app/admin/profile/` | 9/10 |
| Student dashboard | `app/student/page.tsx` | 9/10 |
| Enrollment/unenrollment | In `app/student/courses/[id]/` | 7/10 |
| Progress page | `app/student/progress/` | 9/10 |
| Course reviews/ratings | In `app/student/courses/[id]/` | 8/10 |
| Supabase client setup | `lib/supabase/server.ts`, `client.ts` | Solid |
| Middleware (auth + tenant routing) | `middleware.ts` | Solid |
| Theme system (dark/light) | `components/theme-*` | Solid |
| shadcn/ui component library | `components/ui/` | 15+ components |
| Tenant path utilities | `lib/tenant/` | Solid |

### EVOLVE (Enhance Existing)

| Feature | Current State | Evolution |
|---------|---------------|-----------|
| Block registry | Metadata-only labels | Full registry with schemas, lazy components, completion criteria |
| LessonBlockRenderer | Switch statement, 6 types | Registry-driven lookup, error boundaries, all block types |
| Questions table | `options TEXT[]`, `correct_answer TEXT` | JSONB `question_data`, `correct_answer_data`, wider type support |
| Quiz attempts | `score`, `total_questions` only | Add `quiz_responses` table, attempt tracking, scoring modes |
| Lessons table | Direct course child | Add `module_id`, `prerequisite_lesson_id`, `is_required` |
| Lesson blocks table | Basic columns | Add `is_visible`, `settings`, `version` |
| Quizzes table | Basic | Add `max_attempts`, `passing_score`, `scoring_mode`, `time_limit` |
| Admin dashboard | Basic course grid | Stats cards, metrics, student counts |
| Certificates page | Has missing `Loader2` import (bug) | Fix bug, enhance with sharing |

### ADD (New)

| New Addition | Purpose |
|-------------|---------|
| `modules` table + API + UI | Course > Module > Lesson hierarchy |
| `quiz_responses` table | Per-question answer tracking |
| SCORM extraction pipeline | Convert EdApp packages to seed data |
| Block type folders (5 new) | `image_gallery`, `hotspot`, `quiz_inline`, `callout`, `audio` |
| Admin lesson composer | Block-based lesson editing |
| Module management UI | Admin CRUD for modules within courses |
| Completion utilities | Pure functions for progress calculation |
| Auth guard utilities | Centralized permission checks |
| DB query layer | `lib/db/` functions replacing inline Supabase queries |
| Error boundaries | Per-block and per-route error handling |
| Test suite | Vitest + RTL + Playwright setup |
| Structured logger | Server-side action logging |
| Health check endpoint | `/api/health` |

---

## 9. Phased Implementation

### Phase 0: Foundation & Extraction (Pipeline + Schema + Test Setup)

- Set up Vitest, React Testing Library, Playwright.
- Run schema migrations (modules table, lesson columns, question JSONB, quiz_responses, quiz enhancements).
- Build SCORM extraction pipeline.
- Extract all available GANSID SCORM modules to seed data.
- Establish `lib/db/` query layer and auth guard utilities.

### Phase 1: Block System (Registry + Renderers)

- Evolve block registry to full `BlockTypeDefinition` pattern.
- Create folder-per-block for all 16 block types (schema + viewer at minimum).
- Evolve `LessonBlockRenderer` to registry-driven lookup with error boundaries.
- Build block viewers for EdApp-sourced types: `rich_text` (scrolling mode), `image_gallery`, `hotspot`, `quiz_inline`, `cta`.
- Test all viewers with extracted SCORM data.

### Phase 2: Student Experience with Imported Content

- Build module sidebar + lesson navigation with completion indicators and locking.
- Implement completion logic (block → lesson → module → course chain).
- Seed database with extracted GANSID content.
- Polish student course view with module-aware layout.
- Implement inline quiz rendering and scoring.
- Fix certificates page bug + enhance.

### Phase 3: Admin Authoring

- Build admin lesson composer (add/reorder/edit blocks).
- Build module management UI (CRUD, reordering).
- Build block editors for each type.
- Build media library UI (browse `media_assets`, upload, select).
- Enhance admin dashboard with stats.

### Phase 4: Quiz Expansion & Assessment

- Implement all question type editors and viewers.
- Build quiz attempt flow with per-question response tracking.
- Add scoring modes, time limits, attempt limits.
- Implement quiz results review page (student + admin views).

### Phase 5: Multi-Tenant Polish

- Institution branding (colors, logos, custom CSS).
- Institution admin UI (manage members, roles).
- Institution-scoped data filtering via RLS.
- Domain management.

### Phase 6: Advanced Content Blocks

- H5P authoring integration (not just playback).
- 3D scene blocks via React Three Fiber.
- tldraw canvas blocks.
- Custom iframe blocks with postMessage communication.

### Phase 7: Hardening & Operations

- Complete E2E test suite for all critical flows.
- Analytics dashboards (recharts) scoped by institution.
- Certificate PDF generation with templates.
- Structured logging to external service.
- Performance optimization (bundle splitting, image optimization).
- Documentation alignment.

---

## 10. Key Architecture Decisions

| Decision | Rationale |
|----------|-----------|
| JSONB for block data and question data | Extensible without migrations. Each type defines its own shape. Validated at app layer via Zod. |
| No CHECK constraint on block_type or question_type | New types added by registration, not DDL changes. App-layer validation is sufficient. |
| Lazy-loaded block components | 16+ block types would bloat initial bundle. Lazy loading keeps pages fast. |
| Folder-per-block organization | Each block type is self-contained. Adding a type is additive (new folder), never modifying existing code. |
| Pure utility functions for completion/locking | Testable, reusable, no side effects. Same logic powers dashboards, APIs, and server actions. |
| Guard functions for auth/permissions | Centralized. One fix propagates everywhere. Prevents missed permission checks. |
| `lib/db/` query layer | Decouples components from Supabase. Enables testing with mocks. Single place to add caching, logging, or query optimization. |
| Error boundaries per block | One broken block doesn't crash the lesson. Graceful degradation. |
| Backward-compatible migrations | Add columns as nullable. Keep legacy `content_type/content_url` working via fallback bridge. |
| Co-located tests | Tests live next to source. Easy to find, easy to maintain, visible when code changes. |
