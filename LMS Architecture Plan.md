# LMS Architecture Plan

## Goal

Build a self-hosted, multi-tenant LMS platform for institutions (GANSID, SCAGO) that:
1. Imports existing EdApp/SCORM course content natively via an extraction pipeline.
2. Supports a rich, extensible block-based lesson model (text, media, interactive, 3D, H5P).
3. Delivers a modern, polished student experience from day one.
4. Is built for long-term maintainability: TDD, separation of concerns, registry-driven extensibility.

> **Full design doc:** `docs/plans/2026-03-29-scorm-first-lms-course-builder-design.md`
> **Implementation plan:** `docs/plans/2026-03-30-lms-course-builder-implementation.md`

---

## Approved Architecture Decisions

### Content Hierarchy
```
Course → Module → Lesson → Lesson Blocks
```
- `modules` table added between `courses` and `lessons`.
- `lessons.module_id`, `is_required`, `prerequisite_lesson_id` added.
- Backward compatible: lessons with `module_id = NULL` still work.

### Block Registry Pattern
- Each block type is a self-contained unit: Zod schema + lazy-loaded viewer + lazy-loaded editor.
- Registry lives in `src/lib/content/block-registry.ts` — Map-based, no switch statements.
- Adding a new block type = create a folder + call `registerBlockType()`. Zero changes to renderer or DB.
- `src/lib/content/blocks/register-all.ts` bootstraps all types at app startup.
- `LessonBlockRenderer` uses registry lookup + error boundaries per block.

### Block Types (MVP)
`rich_text`, `image_gallery`, `video`, `audio`, `image`, `pdf`, `iframe`, `model3d`, `h5p`, `canvas`, `hotspot`, `quiz_inline`, `quiz_summary`, `callout`, `download`, `cta`

### SCORM Extraction Pipeline
- Node.js CLI at `scripts/import-scorm/` reads EdApp `config.json` from SCORM zips.
- Maps EdApp slide types → LMS block types (see mapping table below).
- Merges quiz data from `gansid_course_data.json`.
- Outputs structured seed JSON per module.
- Run: `npm run import-scorm <module-dir> <output-dir>`

**EdApp → Block Mapping:**
| EdApp Type | Block Type | Mode |
|---|---|---|
| `scrolling-media` | `rich_text` | `mode: 'scrolling'` |
| `text-sequence` | `rich_text` | `mode: 'sequence'` |
| `image-slider` | `image_gallery` | `mode: 'slider'` |
| `image-gallery` | `image_gallery` | `mode: 'gallery'` |
| `image-map` | `hotspot` | — |
| `categorise` | `quiz_inline` | `question_type: 'categorize'` |
| `exit` | `cta` | `action: 'complete_lesson'` |

### Quiz/Assessment Model
- `questions.question_type` widened (no CHECK constraint) — validated by Zod at app layer.
- `questions.question_data JSONB` + `correct_answer_data JSONB` replace `options TEXT[]` + `correct_answer TEXT`.
- New `quiz_responses` table for per-question attempt tracking.
- Supported question types: `multiple_choice`, `multiple_select`, `true_false`, `fill_blank`, `matching`, `ordering`, `categorize`, `likert_scale`, `open_text`, `short_answer`.

### Progress & Completion
- Completion is bottom-up: block → lesson → module → course → certificate.
- Pure utility functions in `src/lib/utils/completion.ts` (tested, reusable).
- Sequential locking computed at query time from `prerequisite_*` columns — never stored.

### Engineering Standards
1. **TDD everywhere** — failing test before implementation, always.
2. **`lib/db/` is the only Supabase access layer** — components and server actions call functions from here.
3. **Guard functions** — all server actions/API routes call `requireAuth()` or `requireAdminAuth()` first.
4. **No file > 200 lines, no function > 40 lines** — extract aggressively.
5. **Error boundaries per block** — one broken block doesn't crash the lesson.
6. **Co-located tests** — `foo.ts` → `foo.test.ts` in same directory.
7. **Backward-compatible migrations** — nullable columns with defaults, never drop in same release.

---

## What Already Exists (KEEP AS-IS)

| Feature | Quality | Location |
|---------|---------|----------|
| Auth flow (login, signup, callback, middleware) | 8/10 | `app/login/`, `app/admin/login/`, `middleware.ts` |
| User profiles (avatar, bio, password reset) | 9/10 | `app/student/profile/`, `app/admin/profile/` |
| Student dashboard | 9/10 | `app/student/page.tsx` |
| Enrollment / unenrollment | 7/10 | `app/student/courses/[id]/` |
| Progress page | 9/10 | `app/student/progress/` |
| Course reviews / ratings | 8/10 | `app/student/courses/[id]/` |
| Supabase SSR client setup | ✓ | `lib/supabase/` |
| Multi-tenant middleware + path utils | ✓ | `middleware.ts`, `lib/tenant/` |
| Theme system (dark/light) | ✓ | `components/theme-*` |
| shadcn/ui component library | ✓ | `components/ui/` |

**Known bug:** `src/app/student/certificates/page.tsx` — missing `Loader2` import (Task 2.1 fixes this).

---

## Implementation Phases

| Phase | Focus | Status |
|-------|-------|--------|
| **Phase 0** | Test infra, `lib/db/` layer, auth guards, completion utils, schema migrations, SCORM pipeline | Planned |
| **Phase 1** | Block registry evolution, block viewers, registry-driven renderer | Planned |
| **Phase 2** | Student experience: module sidebar, completion chain, seeded GANSID content | Planned |
| **Phase 3** | Admin authoring: lesson composer, module management, media library | Planned |
| **Phase 4** | Quiz expansion: question types, response tracking, scoring modes | Planned |
| **Phase 5** | Multi-tenant polish: institution branding, admin UI, RLS scoping | Planned |
| **Phase 6** | Advanced blocks: H5P authoring, React Three Fiber, tldraw | Planned |
| **Phase 7** | Hardening: E2E tests, analytics dashboards, PDF certificates, logging | Planned |

---

## Recommended Content Stack

- **Rich text editing:** Tiptap
- **Interactive content:** H5P (`@lumieducation/h5p-server` + `@lumieducation/h5p-react`)
- **3D/simulation blocks:** `@react-three/fiber` + `@react-three/drei`
- **Free-canvas block:** `tldraw`
- **Charts/analytics:** `recharts` (already installed)
- **Testing:** Vitest + React Testing Library + Playwright

---

## Key File Locations

| What | Where |
|------|-------|
| DB query layer | `src/lib/db/` |
| Auth guards | `src/lib/auth/guards.ts` |
| Pure utilities | `src/lib/utils/` |
| Block registry | `src/lib/content/block-registry.ts` |
| Block schemas | `src/lib/content/blocks/<type>/schema.ts` |
| Block registration | `src/lib/content/blocks/register-all.ts` |
| Block viewers | `src/components/blocks/<type>/viewer.tsx` |
| Block editors | `src/components/blocks/<type>/editor.tsx` |
| Feature components | `src/components/features/` |
| DB migrations | `supabase/migrations/` |
| SCORM pipeline | `scripts/import-scorm/` |
| Design doc | `docs/plans/2026-03-29-scorm-first-lms-course-builder-design.md` |
| Implementation plan | `docs/plans/2026-03-30-lms-course-builder-implementation.md` |
