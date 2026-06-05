## Learned User Preferences

- Unify duplicate editor blocks into one component (e.g. a single `content_list` / List) instead of maintaining parallel list variants.
- Use color pickers for bullet/text color properties; avoid raw hex text fields in the properties panel.
- Do not label rich-text list fields as "HTML" in titles or placeholders; support links and basic formatting in list item editors.
- Editor preview must open on the slide being edited and preserve the device size (desktop/tablet/mobile) when closing preview back to the editor.
- Structure panel should show slide numbers and titles (e.g. `Slide N · Title`), including copy/move targets and cross-lesson drag targets.
- Cross-lesson slide drag-and-drop should use the same drop-indicator line as within-lesson reordering, with clearer highlight on the target lesson.
- Block up/down reorder controls must respect first/last position (disable arrows when there is no valid neighbor).
- Run Vitest (create tests when adding features) and confirm passing before applying Supabase migrations via MCP.
- When committing: stage only related changes, write a concise message, and do not push unless explicitly asked.
- Survey blocks should support institution-scoped reusable templates so configs are not recreated per course.
- After substantial feature work, update `CLAUDE.md` and offer a dev server on port 3001 for manual testing.

## Learned Workspace Facts

- Multi-tenant LMS for **GANSID** and **SCAGO**; URL prefix `/{institutionSlug}/admin|student` rewrites to `/admin` and `/student` via middleware and `institution_slug` cookie.
- Local dev server runs on **port 3001** (`npm run dev -- -p 3001`); Supabase OAuth callback is pinned to this port.
- Live Supabase project `ylmnbbrpaeiogdeqezlo`; apply DDL/seeds via **Supabase MCP** (`apply_migration` / `execute_sql`) — no `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`.
- `platform_admin` accesses both tenants by switching URL prefix; other roles are institution-scoped.
- Block types register in `src/lib/content/blocks/register-all.ts` (`'use client'`); must be imported from `lesson-block-renderer.tsx` for student rendering.
- All `lib/db/` helpers accept a `SupabaseClient` param and must not import `@/lib/supabase/server` (client-bundle safe).
- RLS admin policies must use `public.is_admin()`, not inline `EXISTS (SELECT 1 FROM users ...)`.
- Slide layout responsiveness uses **container queries** (`.slide-cq`) so editor device preview matches student view width.
- Default slide block container style is **`glass`** (`settings.block_style` / course theme `default_block_style`).
- Slide navigation (Next/Previous/Complete) lives in the course-viewer footer; CTA blocks are external content links only.
- Primary admin preview is the toolbar **Preview** portal (`LessonPreviewDialog`); tablet/mobile use embedded `CourseViewer` in a device-sized iframe for true media-query parity.
