# GANSID LMS — Claude Code Context

## What This Project Is

A multi-tenant Learning Management System built for the **Global Action Network for Sickle Cell & Other Inherited Blood Disorders (GANSID)**. It hosts courses originally authored in EdApp (SCORM format) and serves patient organizations and advocates globally.

**Live Supabase project:** `ylmnbbrpaeiogdeqezlo`
**Dev server port:** 3001 (`npm run dev -- -p 3001`)
**Tenant slug:** `gansid` — all student/admin URLs use the prefix `/gansid/`

---

## Code Search — prefer Sourcegraph MCP (save tokens)

For broad or cross-file code exploration ("where is X used", "find the component/function that…", "trace this flow"), **prefer the Sourcegraph MCP over local `Grep`/`Glob`/Explore-agent fan-out** — it returns ranked, scoped results in one round-trip instead of reading many files. Use local `Grep`/`Glob`/`Read` only for files you already know, or as the fallback below.

**This is gated — confirm the MCP is connected first.** The server only attaches when `SOURCEGRAPH_ENDPOINT` + `SOURCEGRAPH_ACCESS_TOKEN` are set (see Setup) AND this repo is indexed on that instance. Check with `ToolSearch("nls_search keyword_search")`; if no `mcp__…__nls_search`/`keyword_search` tool exists, the MCP is **not available — go straight to `Grep`/`Glob`** and do not retry Sourcegraph this session.

**When connected, usage:**
- Always scope to this repo: add `repo:^github\.com/RethinkRealityAI/Lms$` to queries.
- `keyword_search({ query })` — precise/regex (Sourcegraph syntax: `file:`, `lang:`, `type:symbol`). e.g. `repo:^github\.com/RethinkRealityAI/Lms$ registerBlockType type:symbol`.
- `nls_search({ query })` — natural-language exploration ("how are slide backgrounds resolved?").
- `read_file({ repo, path, startLine?, endLine? })` — fetch a confirmed file.
- `go_to_definition` / `find_references` — symbol navigation.

**Setup (one-time, user must do — I will not enter access tokens):**
1. Ensure the private repo `RethinkRealityAI/Lms` is indexed on a Sourcegraph instance your token can read (public sourcegraph.com does NOT index private repos — use Sourcegraph Cloud/Enterprise or the app connected to your GitHub).
2. Set env vars (the `sourcegraph` plugin's `.mcp.json` reads them): `SOURCEGRAPH_ENDPOINT` (e.g. `https://sourcegraph.com`) and `SOURCEGRAPH_ACCESS_TOKEN` (PAT with `mcp` scope), then restart Claude Code and confirm via `/mcp`.

(There is no `AGENTS.md` in this repo; CLAUDE.md is the canonical context file.)

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
| Canvas editor | tldraw v4.x (freeform canvas slides) |
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
      canvas-slide-viewer.tsx  # Read-only tldraw viewer (dynamic import, ssr: false)
                         #   previewMode suppresses enrollment/progress/cert DB writes
                         #   h-[calc(100vh-3rem)] preview vs h-[calc(100vh-6rem)] student
    lesson-block-renderer.tsx   # Renders any LessonBlock using registry
    leave-review-button.tsx     # CLIENT — star-rating review modal (Dialog + Supabase upsert)
    editor/              # Three-panel editor components
      course-editor-shell.tsx   # Editor root — loads course data, owns all CRUD handlers
      editor-toolbar.tsx        # Save/Undo/Redo/Preview/Publish toolbar
      structure-panel.tsx       # Left: module/lesson/slide tree + cross-lesson slide DnD
      sortable-slide-list.tsx   # Slide list with drop indicators + empty-lesson targets
      slide-template-picker.tsx # Template picker when adding slides
      copy-block-dialog.tsx     # Copy/move block — shows "Slide N · Title"
      lesson-preview-dialog.tsx # Toolbar Preview portal (device toggle + sync back to editor)
      preview-panel.tsx         # Centre: slide preview
      properties-panel.tsx      # Right: selected element properties (incl. title slide settings)
      canvas-slide-editor.tsx   # tldraw editor for canvas slides (dynamic import, ssr: false)
      dnd/                      # @dnd-kit drag-and-drop system
        editor-dnd-context.tsx  # Top-level DnD context (palette→canvas + block reorder)
        draggable-block-item.tsx # Palette items with useDraggable
        sortable-block.tsx      # Canvas blocks with useSortable + drag handles
        block-drag-overlay.tsx  # Floating preview with block-type icon
        drop-indicator.tsx      # Blue insertion line between blocks
    shared/                     # Shared components used by both editor and student views
      slide-frame.tsx           # WYSIWYG slide card: header + progress bar + content area
      title-slide.tsx           # Hero gradient/image title slide — per-lesson size/color/footer/logo
      completion-slide.tsx      # Award icon completion slide
    blocks/                     # One viewer per block type
      rich-text/viewer.tsx      # prose-xl scaling
      image-gallery/viewer.tsx  # Aspect ratio, lazy loading, error fallback, HTML captions
      cta/viewer.tsx
      quiz-inline/viewer.tsx    # Navy button/highlight, h-full layout
      callout/viewer.tsx
      video/viewer.tsx          # Responsive aspect-video, loading spinner, error state
      pdf/, iframe/, h5p/
      content-list/             # Animated/styled rich-text list items
      survey/                   # Multi-question survey block + template toolbar
    certificates/                   # Certificate system components
      certificate-renderer.tsx      # HTML renderer (Canva background + data fields overlay)
      certificate-pdf-document.tsx  # @react-pdf/renderer PDF generator
      certificate-preview-modal.tsx # Full-size preview with download/print/share actions
      template-editor.tsx           # Template create/edit with live preview + field controls
      award-certificate-modal.tsx   # Manual award: pick template, users/groups, reason
  lib/
    content/
      block-registry.ts         # Runtime Map of registered block types
      blocks/register-all.ts    # 'use client' — registers ALL block types on import
      slide-templates.ts        # Slide template picker configs (id, defaultBlocks, settings)
      title-slide-settings.ts   # Per-lesson title slide overrides (size, color, footer, logo)
      lesson-blocks.ts          # sortBlocks(), createLegacyBlockPayload()
    canvas/
      canvas-utils.ts           # tldraw snapshot helpers, design frame, CanvasBlockContext
      register-shapes.ts        # Custom LMS shape registry (lmsShapeUtils, CANVAS_BLOCK_TYPES)
      lms-shape-content.tsx     # Renders block viewer inside tldraw shapes via context
      shapes/                   # Custom tldraw ShapeUtils
        lms-quiz-shape.tsx      # quiz_inline on canvas
        lms-callout-shape.tsx   # callout on canvas
        lms-cta-shape.tsx       # CTA on canvas
        lms-video-shape.tsx     # video on canvas
    stores/
      editor-store.ts           # Zustand vanilla store for editor state (undo/redo, dirty flag)
    db/                         # All Supabase CRUD — functions accept SupabaseClient param
      index.ts                  # Barrel — re-exports all db modules
      editor.ts                 # loadEditorCourseData() — bulk fetch for editor shell
      courses.ts / modules.ts / lessons.ts / slides.ts / blocks.ts
      progress.ts / enrollments.ts / users.ts / activity-log.ts
      groups.ts             # User group CRUD, membership management
      course-assignments.ts # Course assignment CRUD, visibility query
      certificate-templates.ts # Template CRUD, course-template assignments
      certificates.ts       # Certificate CRUD (award, revoke, detail queries)
      surveys.ts            # Survey response CRUD + analytics queries
      survey-templates.ts   # Reusable institution-scoped survey templates
    canva/
      auth.ts               # Canva OAuth PKCE helpers, token refresh
      api.ts                # Canva REST API (designs, exports)
    auth/
    tenant/
    supabase/
      client.ts   # createClient() — anon key + cookies (USE IN CLIENT COMPONENTS)
      server.ts   # createClient() — server-side with next/headers (SERVER ONLY)

scripts/
  import-scorm/       # EdApp SCORM → seed JSON → SQL pipeline (GANSID Modules 1-2)
    index.ts          # CLI entry: npx tsx scripts/import-scorm/index.ts <dir>
    extract.ts        # Reads .zip, parses config.json
    map-slides.ts     # Converts EdApp slides → MappedBlock[]
    map-quizzes.ts
    generate-seed.ts  # Writes .seed.json
    output/           # Generated SQL and seed files
  import-markdown-modules/ # Markdown → SQL pipeline (GANSID Modules 3-10)
    import.ts         # CLI: npx tsx scripts/import-markdown-modules/import.ts
  import-scago/       # SCAGO Markdown → SQL pipeline (SCAGO Modules 1-13)
    index.ts          # CLI: npx tsx scripts/import-scago/index.ts [--parse-only] [--module=N] [--legacy-users]
    parse-markdown.ts # Parses SCAGO .md files → structured lesson/slide/block data
    generate-sql.ts   # Converts parsed data → SQL INSERTs (dollar-quoted JSONB)
    generate-content-sql.ts # Slides+blocks only, using existing lesson IDs
    upload-images.ts  # Uploads images to scago-assets Supabase Storage bucket
    import-legacy-users.ts  # CSV → legacy_users SQL
    types.ts          # Shared TypeScript interfaces
    output/           # Generated SQL files (gitignored)

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
      → certificates (course_id, template_id)
      → course_reviews (course_id)
      → survey_responses (block_id, user_id) — UNIQUE per block+user
      → user_group_members → user_groups
survey_templates → institutions (reusable survey block configs)
certificate_templates → course_certificate_templates → courses
```

### Key IDs (GANSID institution)

| Entity | UUID |
|---|---|
| institution | `725f40e5-a317-4b8f-80b8-1df6cf3bbe2a` |
| Course: Fundamentals of Effective Advocacy | `6b4906f1-803b-40bb-8582-d591220e5d09` |
| Module 1 (Advocacy) | `a4ce8c6c-ea88-45fb-b590-05fb329347c3` |
| Course: Fundraising Strategies | `823fe330-1df4-42ee-89af-d7df079958f5` |
| Module 2 (Fundraising) | `9a681ce2-e300-404e-be2c-a081e6795ade` |

### Key IDs (SCAGO institution)

| Entity | UUID |
|---|---|
| institution | `ba52611f-9ad5-44b7-824e-97725a177336` |

SCAGO has 13 courses (Modules 1–13), 49 lessons, ~253 slides, ~468 blocks.
Legacy users: 2,868 imported from EdApp CSV.

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
| 020 | add_canvas_data_to_slides | `slides.canvas_data` jsonb column + updates `slides_slide_type_check` constraint to include `'canvas'` |
| 021 | add_user_demographics_and_legacy_claim | `occupation`, `affiliation`, `country` on users + `claim_legacy_profile()` fn + updated `handle_new_user()` trigger |
| 022 | canva_integration | Canva OAuth tokens on `users`, `canva_design_id`/`canva_design_url` on `slides` |
| 023 | certificate_templates | `certificate_templates` + `course_certificate_templates` tables, `certificates` enhancements (template_id, awarded_by, certificate_number, pdf_url), auto-number trigger, default GANSID template seed |
| 024 | scago_institution_and_admin | SCAGO institution row, `is_admin()` updated to recognize `platform_admin`/`institution_admin`, `tech@` upgraded to `platform_admin` |
| 025 | fix_platform_admin_cross_tenant_rls | Slides/slide_templates/activity_log RLS allows `platform_admin` cross-tenant access |
| 026 | add_institution_id_to_contact_submissions | `institution_id` column on `contact_submissions`, backfilled to GANSID |
| 027 | handle_new_user_institution_aware | `handle_new_user` trigger reads `institution_slug` from signup metadata and assigns correct `institution_id` (fixes new SCAGO signups landing with NULL institution) |
| 028 | course_programs | `programs` + `program_courses` tables, `certificates.program_id` column, RLS, and `award_program_certificates()` AFTER-INSERT trigger that auto-issues a program certificate once a user holds course certificates for every course in a program |
| 029 | add_survey_responses | `survey_responses` table (institution/course/lesson/block scoped, `answers` jsonb, UNIQUE block_id+user_id), RLS for self read/write + admin read |
| 030 | survey_templates | `survey_templates` table (institution-scoped reusable configs), admin manage + authenticated read |
| 031 | add_title_slide_settings | `lessons.title_slide_settings` jsonb column (`title_size`, `title_color`, `footer_text`, `footer_logo_url`) |
| 032 | add_institution_update_policy | RLS UPDATE policy on `institutions` — admins can update their own institution; `platform_admin` can update any |
| 033 | course_completion_feedback | `course_feedback_responses` table + `courses.completion_survey_template_id` (optional completion survey shown on the completion slide) |
| 034 | cme_certificate_requests_and_legacy_claim | `cme_certificate_requests` table (status pending/issued/declined, one-pending-per-user, RLS: user self + admin); `has_completed_all_courses()`, `request_cme_certificate()` (eligibility-enforcing), `claim_my_legacy_profile()` (secure own-email retroactive claim), `admin_link_legacy_profile()` (admin manual link); `legacy_users` self-read policy; `claim_legacy_profile` EXECUTE revoked from clients |
| 035 | harden_cme_and_legacy_claim_security | Audit follow-up: `SET search_path=public` on `is_admin()`/`claim_legacy_profile()`; caller-binding guard on `has_completed_all_courses` (no probing other users); strip default PUBLIC/anon EXECUTE from the 4 new RPCs; institution-scope admin RLS on `cme_certificate_requests` (platform_admin exempt) + `WITH CHECK` |
| 036 | certificate_issuance_hardening | `issue_course_certificate(course_id)` SECURITY DEFINER RPC (server-verified lesson completion + template resolution course→institution-default) replaces the client-trusted cert INSERT; drops the open "Students can earn certificates" policy; partial unique index `(user_id, program_id)`; `award_program_certificates()` v2 (institution-default template fallback, only live+published courses counted, race-safe `ON CONFLICT`); `backfill_program_certificates(program_id)` admin RPC for retroactive program awards; institution-scoped admin RLS on `programs`/`program_courses` (platform_admin exempt) |
| 037 | analytics_events_and_certificate_revocation | Activates `analytics_events` (RLS + indexes); SECURITY DEFINER capture triggers: `lesson_completed`, `enrolled`/`unenrolled`, `certificate_issued`/`revoked`/`restored` (sign-ins inserted app-side at login/callback); `certificates.revoked_at/revoked_by/revoke_reason` — revocation is a status change, not DELETE; `issue_course_certificate` v2 restores a revoked cert when re-completed; program trigger/backfill ignore revoked certs and fire on restore; analytics views set `security_invoker` |
| 038 | admin_user_and_enrollment_controls | `users.is_active` (soft suspend; auth-level ban via `/api/admin/users/actions` service-role route); `admin_can_manage_user()`; `admin_get_user_auth_activity()` (surfaces `auth.users.last_sign_in_at` to institution admins); `admin_set_user_role()`; `admin_set_user_active()`; `admin_reset_course_progress()` (undo completion, optional cert revoke); `admin_enroll_users()` / `admin_unenroll_user()` — all logged to `analytics_events` |
| 039 | due_dates_sequential_programs_quiz_responses | `due_date` on `course_user_assignments`/`course_group_assignments`; `programs.sequential` (courses unlock in order); `quiz_block_responses` table (inline quiz_inline answers per user, UNIQUE block+user); one-time `content_activity_log` prune + `prune_content_activity_log()` admin RPC |
| 040 | admin_update_user_profile | `admin_update_user_profile()` — institution-scoped admin edits of full_name/occupation/affiliation/country |
| 041 | email_templates | `email_templates` table — institution-scoped editable email templates (`system` certificate/assignment + `custom`), seeded for GANSID + SCAGO; notify routes render the stored template with merge tags (`{{title}}`, `{{greeting}}`, …) falling back to `DEFAULT_SYSTEM_TEMPLATES` in `src/lib/email/render.ts` |
| 042 | tighten_event_quiz_and_email_template_rls | Security follow-up: sign-in event INSERT bound to caller's own `institution_id`; `quiz_block_responses` WITH CHECK binds `institution_id` + `attempt_count` range; `email_templates` admin policy institution-scoped (platform_admin exempt) |
| 043 | legacy_course_completions | `legacy_course_completions` table (EdApp per-user per-course export: completion date, progress %, time spent; `course_id` null = unmapped e.g. EdApp "Module 14" CME row); `materialize_legacy_completions()` turns rows into real progress + enrollments + backdated certificates on claim (program certs cascade via trigger; partial courses → first `round(pct × lessons)` lessons; idempotent, upgrade-only); `claim_legacy_profile()` + `admin_link_legacy_profile()` call it on every claim path; `admin_backfill_legacy_completions()` for users who claimed before an import. Import via `scripts/import-legacy-completions/index.ts` (service-role, `--dry-run` supported); SCAGO data imported 2026-06-10: 1,456 rows / 104 users / 481 completions |
| 044 | legacy_cme_autorequest_and_welcome | `materialize_legacy_completions()` v2: a completed EdApp "Module 14" row auto-files a PENDING `cme_certificate_requests` row on claim (program_label `EdApp import`, backdated `requested_at`, explanatory `notes`) — shown with an amber "EdApp import" badge in the admin Support → certificate-requests queue for confirm-and-issue; `legacy_users.welcome_acknowledged_at` + `acknowledge_legacy_welcome()` RPC (superseded by the 045 announcements system, kept for back-compat) |
| 045 | announcements_system | `announcements` + `announcement_dismissals` tables — institution-scoped, schedulable (starts_at/ends_at), audience-targeted (`all` / `first_time` = joined after launch / `legacy_claimed`) dashboard messages rendered as banner or modal with accent color, optional logo/CTA/report-issue button and `{{firstName}}`/`{{institutionName}}` merge tags; display modes `once` (auto-marked seen on first view) / `until_dismissed` / `always`. Seeded per institution: generic first-time welcome modal + the editable EdApp welcome-back banner (replaces the hardcoded `welcome-back-banner.tsx`). Student render: `announcement-host.tsx` + shared `announcement-display.tsx`; admin manager with form-left/live-preview-right at `/admin/announcements` (`announcements-manager.tsx`); lib in `lib/db/announcements.ts` |
| 046 | survey_assignments | `survey_assignments` table — attach a survey template to every course (`all_courses` institution default), a specific course, or a program; partial unique indexes (one default per institution, one per course/program); resolution precedence: `courses.completion_survey_template_id` override → course assignment → institution default (`resolveCompletionSurveys()` in `lib/db/survey-assignments.ts`); program surveys shown once when the learner completes the FINAL program course, stored in `course_feedback_responses` with new `program_id` column (unique per user+program). Central admin hub at `/admin/surveys` (`surveys-manager.tsx`: Templates tab reusing the block SurveyEditor + Assignments tab with resolved-status chips); granular per-user analytics: `getUserCourseProgressDetailed()` + `getUserQuizPerformance()` power the user-detail Progress tab v2 (summary chips, per-course started/last-active/completed dates, expandable lesson checklists with completion dates, quiz accuracy) |
| 047 | legacy_claim_refinements | `materialize_legacy_completions()` v3: sets transaction-local GUC `app.import_source='legacy_import'` so `log_analytics_event()` (also updated) tags every claim-generated event with `payload.source='legacy_import'` (`getEventCounts()` excludes them — no phantom trend spikes on claim day); `progress_percent >= 95` counts as complete (coarse EdApp percentages; near-finishers not forced to redo the final lesson under new quiz/survey gates); cert backdating falls back to import timestamp when `completed_at` missing; CME re-file guard includes `declined`; deterministic template pick. Widens `email_templates_system_type_check` + seeds the `legacy_claim_invite` system template (both institutions) — sent by `/api/admin/legacy/claim-invite` (admin-gated, no auth pre-creation: recipient signs up with the same email and auto-claims). Admin Users → Legacy tab: "Certs Waiting" column via `getLegacyCompletionSummaries()`, "Certificates waiting" filter, single/bulk "Claim invite" buttons, CSV export; user-detail Progress tab shows the linked user's raw EdApp import rows (`getLegacyCompletionsForUser()`) |
| 048 | accurate_last_active | `admin_get_user_auth_activity()` v2 adds `last_active_at` = `greatest(auth.users.last_sign_in_at, max(analytics_events.created_at), max(progress.completed_at))` — fixes the admin Users table showing two contradictory recency columns (auth `last_sign_in_at` doesn't update on session refresh; progress-only "Last Active" missed sign-ins/quizzes AND showed backdated dates for claimed legacy users). UI merged to a single honest "Last Active" column (raw sign-in kept in CSV export). New index `idx_analytics_events_user_created` |
| 049 | fix_student_progress_view | `v_student_progress` (analytics Student Leaderboard): `last_activity` now `greatest(latest lesson completion, latest analytics event)` (same backdated-legacy/staleness fix); adds `certificates_earned` output alias — the app read `certificates_earned` but the view only output `certificate_count`, so the leaderboard "Certs" column and CSV always showed 0; revoked certificates no longer counted |
| 050 | student_progress_view_accuracy | `v_student_progress` v3: `completed_lessons`/`last_activity` join LIVE lessons only (progress rows orphaned by lesson deletion no longer counted — counts stay honest as admins add/remove lessons); quiz stats moved off the empty legacy `quiz_attempts` table onto `quiz_block_responses` (leaderboard "Quizzes"/"Avg Score" were permanently 0) — now the same definition as the admin user-detail Progress tab; enrollment count scoped to live courses |
| 051 | course_stats_view_accuracy | `v_course_stats` (admin analytics course table): per-course `quiz_attempt_count`/`avg_quiz_score` from `quiz_block_responses` instead of the empty `quiz_attempts` table (were permanently 0/null; old subquery also had a latent per-lesson row-multiplication bug); `certificate_count` excludes revoked. Authoritative view snapshots now in `supabase/snapshots/analytics-views.sql` (they were never in version control — a rebuild from repo would have resurrected the always-zero bugs) |
| 052 | reset_clears_quiz_responses | `admin_reset_course_progress()` v2 also deletes the user's `quiz_block_responses` for the course (viewer rehydrates quiz gates from persisted answers, so without this a reset learner's quizzes came back pre-passed — reset = redo the quizzes). `course_feedback_responses` intentionally retained (re-completion re-issues the cert without re-taking the survey). Returns `quiz_responses_cleared` |
| 053 | admin_certificate_write_policies | Institution-scoped admin INSERT/UPDATE RLS policies on `certificates` (platform_admin exempt). The table had NO write policies: admin dashboard revoke/restore (client UPDATE) silently matched 0 rows and showed phantom success while the cert stayed active; manual award (INSERT) hard-errored. No DELETE policy on purpose — revocation is a status change (037). Verified live: admin revoke/restore now writes; students still can't touch their own certs |
| 054 | server_side_quiz_verification | `issue_course_certificate` v3 verifies REQUIRED quiz answers server-side (quiz/survey gates were browser-only — an API-savvy student could self-issue). `quiz_block_is_satisfiable(jsonb)` mirrors `quiz-inline/validation.ts` exactly (fail-open: misconfigured quizzes never block); visibility mirrors the viewer (published slides + null-slide fallback + zero-visible-slides fallback page); `required: false` blocks exempt. Grandfather clause: quizzes in lessons completed before 2026-07-11 02:47 UTC exempt (answers weren't persisted before migration 039) — verified zero existing users blocked; live-tested refusal-then-issue. `qa_db_invariants()` RPC (admin/service-role) powers `scripts/audit-db-invariants.mjs` — 14 live-schema regression checks (run after any migration) |
| 056 | dual_access_rls_scoping | Follow-up to 055 (found by an adversarial audit). Five STUDENT-facing RLS policies scoped to the caller's PRIMARY institution (`= users.institution_id`), breaking the secondary-institution experience under dual access. `get_my_institution_ids()` (membership set as UUIDs, mirrors `get_my_institution_slugs`; SECURITY DEFINER, authenticated-only) now scopes: **`quiz_block_responses` WITH CHECK** (was a HARD BLOCKER — a learner couldn't save quiz answers on a secondary-institution course → required quizzes never passed → no completion → no certificate; the viewer writes `institution_id` = the course's institution, which failed the primary-only check); **`survey_assignments`**/**`programs`**/**`announcements`**/**`user_groups`** SELECT (secondary institution's completion survey, program cards, and announcements were invisible; wrong-institution announcements also leaked in). `announcements` additionally gets an app-side active-portal filter in `getVisibleAnnouncements` (RLS now allows the whole membership set, so the app narrows to the viewed institution). Also hardened 055: dropped the unscoped "Admins read memberships" policy (an institution_admin could read other tenants' membership rows) — admin reads now go through the institution-scoped "Admins manage memberships"; stripped auto-granted anon EXECUTE from `get_my_institution_slugs`/`join_institution`/`get_my_institution_ids`. Live-verified as dapo: SCAGO quiz write succeeds, secondary reads resolve, RLS still isolates own rows. (The two follow-ups this originally deferred — per-institution CME and profile stats — are done in 057.) |
| 057 | dual_access_cme_and_progress | Closes the two remaining dual-access gaps from the 056 audit (both pre-existing single-institution assumptions). **CME per-institution**: `cme_one_pending_per_user` unique index → `(user_id, institution_id) WHERE pending`; `request_cme_certificate` now takes `(p_institution_id, p_program_label)`, verifies the caller is a member (`get_my_institution_ids()`), and scopes the existing-request/eligibility/insert to that institution (was primary-bound — a dual-access learner could never request a second institution's CME cert, and one institution's cert showed "issued" on the other). `getMyCmeRequest(userId, institutionId)` + `requestCmeCertificate(supabase, institutionId, label)` + `CmeRequestBanner` now take the active institution (threaded from the dashboard/profile). **Profile stats**: `get_my_student_progress(institution_id)` SECURITY DEFINER RPC (mirrors `v_student_progress` — live lessons, non-revoked certs, quiz_block_responses — but filtered to one institution, `auth.uid()`-bound); the profile "Learning Progress" card reads it instead of the institution-agnostic view (was summing both institutions on every portal). Both RPCs authenticated-only (anon stripped), `search_path=public`. Live-verified as dapo: GANSID stats = real (6/26/1), SCAGO stats = zero; CME membership guard holds |
| 055 | institution_memberships_dual_access | **Shared login, dual access** — one auth account can now belong to MULTIPLE institutions (a single Supabase project = globally-unique email, so a person can't have separate GANSID/SCAGO accounts; instead they share one login with per-institution membership). Makes the existing (empty, RLS-enabled-but-policy-less) `institution_memberships` table the ACCESS SET; backfills one row per existing `public.users` row from `users.institution_id` (which stays the PRIMARY/home institution for default landing). RLS: users read own rows, admins read all + institution-scoped manage (platform_admin exempt); no client writes (self-join via RPC). Three SECURITY DEFINER RPCs (all `SET search_path=public`): `get_my_institution_slugs()` → text[] the caller may enter (memberships ∪ primary); `join_institution(slug)` → idempotent self-add as student (the "sign in to access the other program too" path; authenticated-only, anon revoked); `signup_precheck(email,slug)` → `available`/`member`/`other_institution` + primary institution name so the signup form shows a friendly "you already have a GANSID account — just sign in to access SCAGO too" instead of a dead-end (anon-callable, pre-auth; parity with Supabase's existing "User already registered" leak). Content RLS unchanged (student visibility is enrollment/published-based, institution scoping is app-level). Consumed by `lib/db/memberships.ts`, membership-aware guards in `middleware.ts` + `student/page.tsx` (allow/redirect by membership set, active tenant = the viewed institution when a member), and the login signup/sign-in flow. Live-verified as dapo under RLS: `[gansid]`→`[gansid,scago]` after join, sees only own membership rows |
| 056 | dual_access_rls_scoping | Follow-up to 055. Scopes five STUDENT-facing RLS policies (`quiz_block_responses` WITH CHECK; `survey_assignments`/`programs`/`announcements`/`user_groups` SELECT) from the caller's PRIMARY institution to the MEMBERSHIP SET via new `get_my_institution_ids()` (UUID mirror of `get_my_institution_slugs`). Without it a dual-access learner couldn't save quiz answers on a secondary-institution course (required quizzes never pass → no cert) and secondary programs/surveys/announcements never resolved. Admin policies unchanged (dual access is student-only); `announcements` also gets an app-side active-institution filter so only the viewed portal's show |
| 057 | dual_access_cme_and_progress | Two more single-institution assumptions dual access exposed: CME requests were primary-bound (a learner couldn't request a SECOND institution's CME; a cert held in one showed "issued" in the other) → `request_cme_certificate(uuid,text)` keyed to the active portal institution + unique index `(user_id, institution_id) WHERE pending`; and the profile "Learning Progress" card aggregated `v_student_progress` across BOTH institutions → now institution-scoped (membership-verified via `get_my_institution_ids()`) |
| 058 | quiz_gating_visible_slides_only | `issue_course_certificate` v4: a quiz gates iff it's on a VISIBLE (published, non-deleted) slide OR is a slide-less legacy block — drops the old "zero-visible-slides fallback" that gated a fully-hidden lesson's quizzes. Paired with the viewer's `buildLessonPages` (`src/lib/content/lesson-pages.ts`), which renders NO pages for an all-draft/all-deleted lesson (the legacy fallback used to dump the whole block list → leaked unpublished content + gated it). Change only RELAXES gating; applied RPC-first so the older (stricter) viewer can never brick in the interim |
| 059 | cleanup_orphaned_blocks_on_deleted_slides | One-time DELETE of `lesson_blocks` orphaned on soft-deleted slides (pre-cascade backfill — 28 rows, verified 0 student responses attached). The orphan class it cleaned is prevented going forward by 060's consistent soft-delete |
| 060 | lesson_blocks_soft_delete | Adds `lesson_blocks.deleted_at` (+ partial index `idx_lesson_blocks_slide_live`) for slide **Trash & Restore**: `deleteSlide` soft-deletes the slide AND its blocks together (consistent delete state ends the "quizzes on deleted slides" orphan class), `restoreSlide` clears both, and EVERY block-read path filters `deleted_at IS NULL` (editor load, student viewer, survey analytics ×2, quiz-health ×2, `getBlocksByLesson`, legacy block-editor page). Undo toast in `course-editor-shell.tsx` (`store.restoreSlide` re-inserts at the original index). Slides-only scope (individual block delete stays hard-delete). Delete hides the slide FIRST / restore reveals it LAST, so a partial failure never leaves a visible slide with wrong blocks |
| 061 | cert_rpc_excludes_trashed_blocks | `issue_course_certificate` v5: adds explicit `b.deleted_at IS NULL` to `gating_blocks` so the server's quiz-visibility mirrors the client's block filter (060) directly, instead of relying on the "trashed block ⟹ trashed slide" invariant. No behaviour change today (trashed blocks are already excluded via `vis_slides`); removes a landmine where adding block-level soft-delete later would silently gate invisible quizzes and refuse certificates |
| 062 | slide_progress_and_sequential_lessons | **Per-slide progress + sequential lessons.** `slide_progress` table (one row per user+slide, `viewed_at`; RLS own-manage with institution-binding via `get_my_institution_ids()`, admin read) records each slide a learner has SEEN — the whole-lesson `progress` table still drives certificates, this is additive display/navigation state. The student progress bar is now SLIDE-granular (`viewed slides / total`, falls back to lesson-granular for slide-less legacy lessons) so it advances mid-lesson instead of sitting at 0% until a lesson finishes; the sidebar expands each lesson to its slides with viewed checkmarks + current-slide highlight and jump-to-slide. `courses.sequential_lessons` (default true) locks a lesson until the previous one is complete (a completed lesson is never locked; preview mode + the completion-slide "Next Lesson" button are exempt); toggle in the course settings modal (`get/setCourseSequentialLessons`). Helpers: `lib/db/slide-progress.ts` (`getViewedSlideIds`, `markSlideViewed`). Live-verified as dapo: slide_progress write/read under RLS isolates own rows; `sequential_lessons` defaulted true on all 25 courses. **Also fixes editor↔viewer block-order parity**: `sortBlocksByGrid` (gridY→gridX→order_index) in `buildLessonPages` makes the viewer order blocks the way the editor does (`slide-preview.tsx` sorts by grid, not order_index) — proven on the live "Vaso-occlusion" slide where order_index put the image last but gridY (editor) puts it 2nd. Gating fails OPEN when the progress fetch errors (a transient failure must never lock a learner out); locked lesson rows use `aria-disabled` (not native `disabled`, which would swallow the "complete the previous lesson" toast); sidebar jump-to-slide only targets ALREADY-VIEWED slides (revisit) so a forward jump can't skip a required quiz/interactive gate |
| 063 | legacy_slide_accurate_partial_completion | `materialize_legacy_completions` mapped an EdApp course % onto lesson-`floor` (`floor(pct × lessons)`), but EdApp's % is CONTENT-based — so when early lessons are long, lesson-floor OVER-credited (measured: 64% of the 33 partial legacy rows over-credited by up to a full lesson). An over-credited lesson also grandfathers its quizzes (materialized completions are backdated before the quiz-enforcement cutoff), so the learner would skip quizzes they never took. Fix: for PARTIAL completions, complete only lessons whose published slides ALL fall within `floor(pct × total_published_slides)` — the lessons the learner fully covered — never over-crediting; the borderline lesson stays incomplete so they re-review it and take its quizzes. ≥95%/full path, enrollment, cert issuance, CME auto-request, backdating and idempotency UNCHANGED; falls back to lesson-floor for slide-less courses. Only future claims affected (0 currently-claimed users have a partial course). The new per-slide progress needs no legacy backfill: `isSlideViewed` counts a slide done if its lesson is complete, so materialized lessons light up automatically |

### RLS Pattern — CRITICAL

All "admin can do X" policies MUST use `public.is_admin()`, not inline `EXISTS (SELECT 1 FROM users ...)`. The inline form causes infinite recursion.

```sql
-- CORRECT
CREATE POLICY "Admins can read all X" ON public.X FOR SELECT USING (public.is_admin());

-- WRONG — causes 500 for all users
CREATE POLICY "Admins can read all X" ON public.X FOR SELECT
  USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'));
```

The `is_admin()` function (updated in migration 024):
```sql
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'platform_admin', 'institution_admin'));
$$;
```

---

## Routing / Middleware

`src/middleware.ts` handles multi-tenancy:
- `/gansid/student/*` → rewrites to `/student/*`
- `/gansid/admin/*` → rewrites to `/admin/*`
- `/scago/student/*` → rewrites to `/student/*`
- `/scago/admin/*` → rewrites to `/admin/*`
- Admin users hitting `/student/*` get redirected to `/admin`
- Student users hitting `/admin/*` get redirected to `/student`

Student URL for testing: `http://localhost:3001/gansid/student`
SCAGO student URL: `http://localhost:3001/scago/student`
SCAGO admin URL: `http://localhost:3001/scago/admin`

**Supported tenant slugs:** `gansid`, `scago` (defined in `SUPPORTED_INSTITUTION_SLUGS`)
**Admin dashboard filters courses by institution** via `getTenantContext()` — `/gansid/admin` shows GANSID courses, `/scago/admin` shows SCAGO courses.
**`platform_admin` role** can access both tenants by switching the URL prefix.

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

`rich_text`, `image_gallery`, `cta`, `callout`, `quiz_inline`, `slider`, `video`, `audio`, `pdf`, `iframe`, `h5p`, `scratch_reveal`, `match_pairs`, `page_break`, `content_list`, `icon_list`, `survey`, `image_compare`, `table`

- **`image_compare`** — Before/after comparison with draggable divider (horizontal or vertical). Two **modes**: `image` (default — upload/URL per side) or `text` (two text panels with heading/body/bg/text colors, for "myth vs reality" style comparisons). Configurable handle, labels, aspect ratio, fit, prompt/caption, optional require-interaction. `src/lib/content/blocks/image-compare/`, `src/components/blocks/image-compare/`.
- **`audio`** — HTML5 audio-clip player with optional title, caption, and credit. Used for SCAGO patient-reflection MP3 clips. `src/lib/content/blocks/audio/`, `src/components/blocks/audio/`.
- **`icon_list`** — A grid of icon tiles (icon image + bold title + rich-text body per item); responsive columns, stacked/inline layout, optional card surface. Used for "supports"/"steps"/feature-highlight slides (e.g. SCAGO image-collection slides). `src/lib/content/blocks/icon-list/`, `src/components/blocks/icon-list/`.

- **`scratch_reveal`** — canvas scratch-off cover → reveals an image/text underneath, with confetti/sparkles. Before & after can each be image or text. `src/components/blocks/scratch-reveal/`.
- **`match_pairs`** ("Drag to Match") — @dnd-kit drag (pointer+touch) matching of prompt↔answer pairs; image or text on either side; left/right prompt placement. `src/components/blocks/match-pairs/`.
- **`content_list`** (`List` in the components panel) — The single list block: rich-text items with links, bullet/number styles, responsive or fixed font sizing, color pickers, optional staggered entrance animations. Used by Learning Objectives and References slide templates. `src/lib/content/blocks/content-list/`, `src/components/blocks/content-list/`.
- **`survey`** — Multi-question survey block (true/false, multiple choice, multi-select, text, textarea, rating, scale). Responses upserted to `survey_responses`. Reusable templates via `survey_templates` + toolbar in editor. Admin analytics in Analytics → Surveys tab. `src/lib/content/blocks/survey/`, `src/components/blocks/survey/`.
- **Rich text links:** the Tiptap editor has a Link button (URL popover), autolinks typed/pasted URLs, and the viewer renders links `target=_blank rel=noopener` while neutralising `javascript:`/`vbscript:`/`data:` hrefs.

### Quiz Inline — Question Types

Editor supports: `multiple_choice`, `true_false`, `select_all`, `categorize`, `slider`.

- **`required` (default true)** — "Required to continue" toggle in the quiz editor. Required quizzes block the Next button **on their own slide** (amber hint: "Answer the quiz on this slide correctly to continue") and lesson completion; `required: false` = practice quiz, never gates. The gate only ever counts quizzes on slides the student can actually see (`currentSlides`) — quiz blocks stranded on soft-deleted or draft slides can NOT brick a lesson (they survive slide deletion in `lesson_blocks`; this bricked real users pre-fix). Already-completed lessons never re-gate, and correct answers rehydrate from `quiz_block_responses` on reload.

- **`select_all`** — Checkbox UI; multiple correct answers stored as array in `correct_answer`. Editor + viewer (was viewer-only from SCAGO imports; now fully editable).
- **`categorize`** — Shared option pool + category checkboxes in editor. `src/lib/content/blocks/quiz-inline/categorize-utils.ts` handles pool/play-item logic and **exclusive** category assignment (item can only belong to one category). Viewer pool = union of category items only (orphan options in `options[]` are ignored). Type-cache preserves options/categories when switching question types.

### CTA Block — Content Links Only

The CTA block is for external content links (e.g., "Visit our website"). It does NOT handle slide navigation — that is built into the viewer footer. Schema: `{ text, button_label, url }`. Legacy CTA blocks with `action: 'complete_lesson'` or `'next_lesson'` render as nothing.

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

All brand colours are defined in `src/lib/tenant/branding.ts`. Each institution has its own palette.

### GANSID

| Token | Hex | Usage |
|---|---|---|
| Dark blue (primary) | `#1A3C6E` | Headers, nav, title slide gradient start, primary action buttons |
| Red (secondary) | `#DC2626` | Active lesson, progress bar, CTAs, "Next Lesson" button, sickle cell accent |
| Light blue / teal (highlight) | `#0099CA` | Course progress bar, badges, title slide gradient end |
| Orange (tertiary) | `#E87722` | Occasional accent — used sparingly |
| Near-black | `#0F172A` | Navbar, course header, "Back to Dashboard" button |
| Contact | `admin@inheritedblooddisorders.world` | |

### SCAGO

| Token | Hex | Usage |
|---|---|---|
| Red (primary) | `#C8262A` | Buttons, title slide gradient start, primary accent |
| Near-black (secondary) | `#1A1A1A` | Title slide gradient end, dark backgrounds |
| Cream (highlight) | `#F0E7CC` | Badges, soft backgrounds, highlighted elements |
| Black | `#000000` | Text, headers |
| White | `#FFFFFF` | Backgrounds, card surfaces |
| Contact | `hcp@sicklecellanemia.ca` | |

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
  | { kind: 'title' }               // Hero gradient + lesson title + description; uses lessons.title_slide_settings overrides
  | { kind: 'page'; slideId: string; blocks: LessonBlock[]; settings?: SlideSettings; slideType?: string; canvasData?: Record<string, unknown> | null }
  | { kind: 'completion' }          // Award icon + confetti animation; nav buttons are in the footer
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

### Navigation Footer

All slide navigation is in a consistent bottom footer bar (not in slide content):
- **Previous** button on the left (disabled on first slide)
- **Primary action** on the right, context-dependent:
  - Regular content slides: "Next" (navy)
  - Last content slide: "Complete Lesson" (red `#DC2626`)
  - Completion slide: "Next Lesson" (navy) or "Back to Dashboard" (near-black)
- **Slide settings** can override button labels via `settings.nav_label` and redirect via `settings.nav_url`
- CTA blocks are content-only (external links) — they do NOT handle navigation

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
| `TitleSlide` | `src/components/shared/title-slide.tsx` | Gradient/image hero; reads `title_slide_settings` from lesson + institution branding fallback. |
| `CompletionSlide` | `src/components/shared/completion-slide.tsx` | Award icon + "Lesson Complete". Editor-only (student has action buttons inline). |
| `SlideContentArea` | Exported from `slide-frame.tsx` | Content wrapper with student-matching padding (`px-6 py-5 gap-5`). |

### Slide Backgrounds

Stored in `slide.settings`:
- `settings.background` — `'gradient'` | `'#hexcolor'` | defaults to `'#FFFFFF'`
- `settings.background_image` — Full Supabase URL to an uploaded image (renders as absolute-positioned cover behind content with `bg-black/20` overlay)
- `settings.nav_label` — Custom button label override for the footer nav button (optional)
- `settings.nav_url` — External URL; if set, footer button opens this URL instead of navigating (optional)
- `settings.block_style` — Block container "skin": `'glass'` (**default**, light frosted glass — transparent on white slides) | `'glass-dark'` (smoked liquid glass + light text, for dark/photo backgrounds) | `'classic'` (white card) | `'none'` (transparent). Resolved by `getBlockContainerBase()` in `gridConstants.ts` (undefined → `DEFAULT_BLOCK_STYLE` = `'glass'`; course theme `default_block_style` also defaults to `'glass'`). Applied to every block cell in BOTH `slide-preview.tsx` (editor) and `course-viewer.tsx` (student). Glass classes live in `globals.css`. Padding lives INSIDE the container (`p-3 @md:p-4` on the content wrapper, not the cell — keeps RGL resize handles at the cell edge); `SlideContentArea` outer padding is intentionally minimal.

### Responsive slides via CONTAINER queries (device parity)

The slide content area is a query container (`.slide-cq` → `container-type: inline-size; container-name: slide` in `globals.css`). All responsive block behaviour keys off the **container** width, not the viewport, so the editor's device-preview (a width-constrained card) renders EXACTLY like a real device of that width. Breakpoints (`@container slide` / Tailwind `@md`/`@lg`/`@3xl`):
- **Body text**: `<30rem` container → L (1.125rem); `≥30rem` → XL (1.25rem). Net: phone L, tablet/desktop XL. (`prose-*` classes are inert — no typography plugin — so `.rich-text-viewer` font-size is set explicitly.)
- **Grid blocks** stack full-width at `<30rem`; **galleries** go 1→2→3 cols at `@lg`/`@3xl`.
- `bg-card` is **transparent** in this Tailwind v4 setup (no `--color-card` token) — quiz cards use explicit `bg-white` so they stay readable on dark glass.

The admin preview route has a **device toggle** (desktop/tablet/mobile). Desktop renders `CourseViewer` directly; tablet/mobile render it inside an `<iframe>` sized to the device (`?embed=1`), so real media queries fire → true device fidelity. The embedded viewer reports position via `postMessage` to keep the "Open Editor" resume link in sync. The iframe `src` is seeded from the INITIAL position only (depending on live position would reload-loop the iframe).

The `SlideStyleEditor` (`theme-editor/slide-style-editor.tsx`) provides both color presets and image upload.

Both the editor preview (`slide-preview.tsx`) and the student/preview viewer (`course-viewer.tsx`) use `getSlideBackground()` + background image overlays, and `SlideContentArea` for matching padding. The student viewer fetches `settings` from the `slides` table alongside `id` and `order_index`.

### Slide Templates

Defined in `src/lib/content/slide-templates.ts`. Each template has a unique `id` (picker key), a `type` (maps to `slides.slide_type`), `defaultBlocks`, and `defaultSettings`.

| id | type | Purpose |
|---|---|---|
| `title` | title | Lesson intro heading + description |
| `learning_objectives` | content | Heading + animated `content_list` bullets |
| `references` | content | Heading + decimal `content_list` citations (no animations) |
| `content` | content | Generic text slide |
| `media` | media | Video/image/embed |
| `quiz` | quiz | Default multiple-choice `quiz_inline` |
| `disclaimer` | disclaimer | Warning callout |
| `interactive` | interactive | iframe embed |
| `canvas` | canvas | Empty tldraw canvas |

- **`slide-template-picker.tsx`** — shown when adding a slide; passes template to `handleAddSlide()` in `course-editor-shell.tsx`.
- **`getTemplateById(id)`** — preferred for specialized templates (e.g. `learning_objectives`).
- **`getTemplateByType(type)`** — prefers template whose `id === type` before falling back to first match on `type` (avoids returning Learning Objectives when asking for generic `content`).
- After template slide creation, selection lands on the **slide** (not the first block).

### Title Slide Settings

Stored on `lessons.title_slide_settings` (jsonb, migration 031). Schema in `src/lib/content/title-slide-settings.ts`:

- `title_size` — `sm` | `md` | `lg` | `xl` | `2xl`
- `title_color` — hex override
- `footer_text` — custom attribution line below title
- `footer_logo_url` — optional logo URL (falls back to institution branding)

Edited in properties panel when a lesson is selected. Deep-merged in `editor-store.ts`. Wired through `lib/db/lessons.ts`, `lib/db/editor.ts`, `course-viewer.tsx`, and `title-slide.tsx`.

### Structure Panel DnD

Beyond canvas block DnD, the structure panel supports **slide reordering and cross-lesson moves** via `@dnd-kit`:

- **`sortable-slide-list.tsx`** — per-lesson sortable slides, `DropIndicator` between slides, empty-lesson droppable zones
- **`structure-panel.tsx`** — `DragOverlay`, drop indicators with `lessonId`, cross-lesson targeting highlights target lesson
- **Block selection** resolves parent lesson from block map → highlights owning lesson in tree
- **Cross-lesson moves** append slide to target lesson (insert-at-index between slides not yet implemented)
- **`copy-block-dialog.tsx`** — target picker shows `Slide N · Title` format

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

### Block Reorder (Arrow Buttons)

The structure panel and slide canvas both expose up/down arrows for blocks. Blocks are positioned by **grid coordinates** (`gridX`, `gridY` in block `data`), not `order_index` alone — so reorder handlers in `preview-panel.tsx` swap vertical grid slots with the neighbour above/below, then sync `order_index` via `reorderBlocks()` so the structure tree matches the canvas.

---

## tldraw Canvas Slides

Slides can be either **block-based** (vertical stack of blocks) or **canvas-based** (freeform tldraw layout). Set by `slide_type = 'canvas'`.

### Data Model
- `slides.canvas_data` (jsonb) — tldraw document snapshot, only populated for canvas slides
- Native tldraw shapes (text, drawings, arrows) live entirely in `canvas_data`
- Custom LMS shapes (quiz, callout, CTA, video) store spatial data in `canvas_data` and content data in `lesson_blocks` via `blockId` reference

### Custom Shapes
Registered in `src/lib/canvas/register-shapes.ts`:
- `lms-quiz` → quiz_inline blocks
- `lms-callout` → callout blocks
- `lms-cta` → CTA blocks
- `lms-video` → video blocks

### Key Components
- `canvas-slide-editor.tsx` — Dynamic import, wraps `<Tldraw>` with custom shapes + LMS block palette sidebar
- `canvas-slide-viewer.tsx` — Dynamic import, read-only tldraw (`isReadonly: true`, `hideUi`)
- `CanvasBlockContext` — React context providing `resolveBlock(blockId)` to custom shapes

### CRITICAL: Dynamic Import Required
tldraw requires browser APIs. Both canvas components MUST be dynamically imported with `ssr: false`:
```tsx
const CanvasSlideEditor = dynamic(() => import('./canvas-slide-editor'), { ssr: false });
```

### Design Frame
New canvas slides get a locked 1920x1080 geo rectangle as a design boundary. Content can extend beyond it but `zoomToFit()` targets the frame.

### Device Preview (editor canvas)
Editor toolbar has a desktop/tablet/mobile toggle. **Desktop** = the editable react-grid-layout canvas (`SlidePreview`). **Tablet/mobile** = `EmbedDeviceFrame` — the REAL `CourseViewer` rendered inside an `<iframe>` sized to the device, so the iframe's own width drives CSS media/container queries → byte-for-byte parity with a physical device. The frame follows the editor selection via `postMessage({type:'preview-navigate', slideId})` (no reload); the embedded viewer's listener (gated on `embedded`) jumps same-lesson instantly, cross-lesson via a pending-ref. Canvas slides always edit inline.

### Interactive components in the editor
The editor block content wrapper is `pointer-events-auto` (not `none`) so videos play, sliders drag, etc. RGL only moves blocks via `.block-drag-handle`, so interacting never moves a block; selection uses the hover handle.

---

## Preview (single, unified)

There is ONE preview: the toolbar **Preview** (Play) button → `LessonPreviewDialog` (portal, `fixed inset-0 z-[100]`). It opens on the slide you were editing (`resolvePreviewTarget()` in `editor/preview-target.ts` → `initialLessonId`/`initialSlideId`), has a desktop/tablet/mobile **device toggle**, and "Back to Editor" simply closes the portal (editor state preserved — no navigation). Desktop renders `CourseViewer` directly; tablet/mobile use `EmbedDeviceFrame`. (The old toolbar Eye button + full `/preview` *route* as a primary entry point were removed; the route still exists and serves the `?embed=1` iframe target for the device frames.)

- **Device sync:** `LessonPreviewDialog` accepts `initialDevice` and calls `onClose(lastDevice)` so the editor toolbar device toggle stays in sync after closing preview.
- **Embed mode:** `/admin/courses/[id]/preview?embed=1` renders only `<CourseViewer previewMode embedded>` under a `z-[60]` cover (hides the admin nav inside the iframe). `embedded` → full-height (no banner). It `postMessage`s `preview-location` out so a parent device-frame can sync a resume link.
- **Jump-on-load gotcha:** the one-time jump effect MUST wait for `pageLoading === false` AND until the target slide exists in loaded slides (else it fires on fetchData's synthesized fallback slides and burns its guard before real slides load).
- **iframe src must be seeded from the INITIAL slide only** — depending on the live position reload-loops the iframe. Live updates go through `postMessage`, never the src.
- **Single-image blocks render full-width:** `image-gallery/viewer.tsx` special-cases `images.length === 1` (`SingleImageView`); multi-image galleries keep the grid.

---

## Survey Platform

Multi-question surveys embedded as `survey` blocks in course content, with admin analytics and reusable templates.

### Data Model

- **`survey_responses`** — one row per user per survey block (`UNIQUE block_id, user_id`); `answers` jsonb keyed by question id
- **`survey_templates`** — institution-scoped reusable configs (`name`, `description`, `data` jsonb)

### Key Files

| File | Purpose |
|---|---|
| `src/lib/content/blocks/survey/schema.ts` | Zod schema + question types |
| `src/components/blocks/survey/viewer.tsx` | Student-facing form + submit/upsert |
| `src/components/blocks/survey/editor.tsx` | Block editor |
| `src/components/blocks/survey/survey-template-toolbar.tsx` | Load/save institution templates |
| `src/lib/db/surveys.ts` | Response CRUD + aggregation queries |
| `src/lib/db/survey-templates.ts` | Template CRUD |
| `src/components/admin/surveys-analytics-tab.tsx` | Analytics dashboard tab |
| `src/components/admin/user-detail-dialog.tsx` | Per-user survey response history |

### Block Context

Survey viewer receives course/lesson/block context from `CourseViewer` via `BlockRenderContext` for scoping responses. `previewMode` suppresses DB writes (same pattern as progress/certs).

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
12. **Editor save must not swallow errors, and must not flood** — `handleSave` (in `course-editor-shell.tsx`) is SELECTIVE (writes only entities whose fingerprint changed vs a load-time baseline) and CONCURRENCY-CAPPED (`SAVE_CONCURRENCY = 6`), with a re-entrancy guard (`savingRef`/`pendingRef`). Never revert to saving the whole course in one `Promise.all` — on a large module that fires hundreds of parallel requests, exhausts the browser socket pool (`net::ERR_INSUFFICIENT_RESOURCES`), and leaves slides permanently in draft. It tracks failure count and only calls `markSaved()` when all writes succeed; failures keep `isDirty = true` (a later edit/manual Save retries) and toast.
13. **Rich text sanitizer strips relative image paths** — SCORM-imported HTML may contain `<img src="fit_content_assets/...">` with relative paths that can't load. The sanitizer in `rich-text/viewer.tsx` removes `<img>` tags whose `src` doesn't start with `http://`, `https://`, or `data:`.
14. **tldraw components must be dynamically imported** with `ssr: false` — tldraw requires browser APIs and will crash during SSR. Always use `next/dynamic`.
15. **Navigation is viewer chrome, not block content** — Slide navigation (Next/Previous/Complete) is built into the course-viewer footer. Do not use CTA blocks for navigation. Slide settings (`nav_label`, `nav_url`) control button labels and external links.
16. **NEVER hardcode institution names, slugs, or UUIDs in components** — Always resolve from tenant context. Use `resolveInstitutionSlug()` in client components, `getTenantContext()` in server components. Fetch institution metadata (name, description) from the `institutions` table, not string literals.
17. **Client components must use `resolveInstitutionSlug(pathname)` for tenant detection** — `usePathname()` returns the rewritten path (no slug) after middleware. `resolveInstitutionSlug()` falls back to the `institution_slug` cookie (always set by middleware). Never use `getInstitutionSlugFromPath()` alone in client components.
18. **All navigation links must use `withInstitutionPath()`** — This function reads the cookie fallback automatically. Never hardcode `/gansid/admin/...` or `/admin/...` paths in JSX.
19. **All `lib/db/` query functions that return institution-scoped data must accept `institutionId` parameter** — Do not return cross-institution data. The caller resolves institution via `getTenantContext()` or cookie.
20. **`platform_admin` role bypasses institution scoping** — RLS policies on slides/slide_templates/activity_log allow `platform_admin` full access. The `is_admin()` SQL function recognizes `admin`, `platform_admin`, `institution_admin`.
21. **Institution branding lives in `src/lib/tenant/branding.ts`** — Logos, colors, taglines, program descriptions. Title slides, nav bars, login pages, and landing pages all read from this config. Add new institutions here.
22. **Slide templates use unique `id`** — Multiple templates can share the same `slide_type`; use `getTemplateById()` when targeting a specific template (e.g. `learning_objectives`).
23. **Categorize quiz options** — Items belong to exactly one category (`assignItemToCategory`); viewer ignores orphan options not assigned to any category.
24. **The student completion gate derives ONLY from the RENDERED slide set** (`currentSlides` / `getGatingQuizBlockIds` in `course-viewer.tsx`) — never from raw `lesson_blocks`. Quiz blocks on deleted/draft slides once counted toward the gate and bricked lessons for real users.
25. **Every client-side INSERT/UPDATE must have a verified RLS policy** — a missing UPDATE policy fails SILENTLY (0 rows updated, no error). After adding a client write path, prove the policy exists (the admin certificate revoke showed phantom success for exactly this reason — migration 053).
26. **Certificates are never issued by client INSERT for students** — only via `issue_course_certificate`, `materialize_legacy_completions()`, or the admin award path (under the migration-053 policies). Revocation is a status change, never DELETE.
27. **After touching sensitive flows** (quiz gating, completion, certificate lifecycle, admin reset, survey gating, enrollment/visibility, analytics counters, migrations/RLS), run the `qa-lms` agent protocol — `npx tsc --noEmit` + `npx vitest run` + `node scripts/audit-cert-attainability.mjs` (+ `audit-db-invariants.mjs` if present) — before pushing. See `docs/qa-playbook.md`.
28. **Draft/publish workflow in the editor** — `slides.status` (`draft`|`published`) is the unit of publishing; students only see `published` (RLS). New content (new slides, duplicates) is created as **draft**. Editing published content (a slide's own fields, or any block on it) flips THAT slide to draft **instantly** (Draft badge appears on the edit), until the admin clicks Publish — implemented via a `store.subscribe` listener in `course-editor-shell.tsx` (set up after load) that calls the store's `markSlidesDraft()`. The draft decision uses **content-only** fingerprints — `fpBlockContent` excludes grid geometry (`gridX/Y/W/H`) and `fpSlideContent` excludes `status`/`order_index` — so auto-fit-height (slide-preview shrinks stored `gridH` to measured content on load), manual resize/move, publishing, and reordering never spuriously unpublish. **Undo/redo is exempt from the flip**: the store tags snapshot restores with a transient `isRestoring` flag (set in `restoreSnapshot`, cleared on the next `set` inside `undo`/`redo`) and the subscription early-returns when it's set — otherwise undoing an edit (which restores the slide's exact prior `published` status via the pre-edit snapshot) would be misread as a fresh edit and re-draft the slide. `markSlidesDraft` never pushes to the undo stack, so an edit's undo reverts content and status together. Publish (`publishCourse`) flips the whole course's live slides to published. Draft badges + the content-health chip make unpublished content impossible to miss (so draft-by-default is safe, not a "phantom draft"). Separately, the selective SAVE (`fpSlide`/`fpBlock`, full incl. grid) still persists layout tweaks.

---

## Multi-Tenancy Architecture

### How Tenant Context Flows

```
Browser URL: /scago/admin/courses/123/editor
    ↓
Middleware (src/middleware.ts):
  1. Extracts "scago" from URL
  2. Sets cookie: institution_slug=scago
  3. Sets header: x-institution-slug=scago
  4. Rewrites URL to: /admin/courses/123/editor
    ↓
Server Components:
  getTenantContext() reads header → queries institutions table → returns { institutionSlug, institutionId }
    ↓
Client Components:
  resolveInstitutionSlug(pathname) → tries pathname (null after rewrite) → reads cookie → returns "scago"
  withInstitutionPath('/admin/courses', pathname) → prepends /scago → returns "/scago/admin/courses"
```

### Key Files

| File | Purpose |
|---|---|
| `src/middleware.ts` | Extracts slug from URL, sets cookie + header, rewrites URL |
| `src/lib/tenant/path.ts` | `resolveInstitutionSlug()`, `withInstitutionPath()`, `getInstitutionSlugFromCookie()` |
| `src/lib/tenant/server.ts` | `getTenantContext()` — server-only, reads header/cookie → queries DB |
| `src/lib/tenant/branding.ts` | Institution logos, colors, names, descriptions, contact info |

### Roles

| Role | Scope | Notes |
|---|---|---|
| `student` | One or more institutions | Sees each institution's catalog on its own prefix. **Dual access (migration 055):** membership set (`institution_memberships`, resolved via `get_my_institution_slugs()`) governs which prefixes a student may enter; `users.institution_id` is only the PRIMARY/home institution. Signing in on a portal self-joins it (`join_institution`). Middleware + `student/page.tsx` guard by the membership set, not the single primary. |
| `admin` | Single institution | Manages courses/users for their `institution_id`. (Per-institution admin membership is not wired up — role stays global; dual access is student-only for now.) |
| `institution_admin` | Single institution | Same as admin |
| `platform_admin` | All institutions | Switches tenant via URL prefix (`/scago/admin` vs `/gansid/admin`) |

### Storage Buckets

| Bucket | Institution | Purpose |
|---|---|---|
| `canva-exports` | GANSID | Slide backgrounds, certificate backgrounds, PDFs, logos |
| `scago-assets` | SCAGO | Course images (313 files), logos |

---

## Current Implementation Status (as of 2026-06-01)

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
- [x] tldraw canvas slides: freeform layout as alternative slide type (`slide_type = 'canvas'`)
- [x] Custom tldraw shapes for LMS blocks (quiz, callout, CTA, video) with React context block resolution
- [x] Canvas slide editor with tldraw toolbar + LMS block palette sidebar
- [x] Canvas slide viewer (read-only, pan/zoom, interactive content)
- [x] Device preview toggle (desktop/tablet/mobile) in editor toolbar
- [x] Navigation footer: consistent bottom bar for all slides (Previous / Next / Complete / Next Lesson)
- [x] Slide navigation settings: custom button labels and external links via slide properties
- [x] CTA block simplified to content links only (no more navigation actions)
- [x] Migration 020: `canvas_data` jsonb column + CHECK constraint for `'canvas'` slide type
- [x] Legacy user auto-claim: signup with matching email pre-fills occupation/affiliation/country, links legacy record, migrates group memberships
- [x] User demographic fields (occupation, affiliation, country) on profile page for all users
- [x] Canva Connect API OAuth flow (PKCE + token refresh) with API routes
- [x] Canva design creation, export, and Supabase Storage upload pipeline
- [x] Certificate template system: create, edit, preview, assign to courses, set institution default
- [x] Certificate renderer: HTML component with Canva or default GANSID-branded backgrounds + data field overlay
- [x] Certificate PDF generation via `@react-pdf/renderer` (server-side, cached in Supabase Storage)
- [x] Admin certificates dashboard (`/admin/certificates`): Templates, Awarded, Course Assignments tabs
- [x] Manual certificate awards: select template, users/groups, reason
- [x] Certificate number auto-generation via Postgres trigger (`GANSID-2026-XXXXX`)
- [x] Public certificate verification page (`/verify/[certificateNumber]`)
- [x] Student certificates page: rendered thumbnails, PDF download, share verification link
- [x] Course completion → certificate with template resolution + PDF pre-generation
- [x] **Course Programs**: group courses into a program (each course = a "module"); admin manages them in the Certificates → **Programs** tab (`programs-tab.tsx`, `lib/db/programs.ts`). Completing every course in a program auto-issues a **program certificate** via the migration-028 trigger (hardened in 036: institution-default template fallback, only live+published courses counted, partial unique index). Program certs (course_id null, program_id set) display the program title across admin/student/verify/PDF. Saving a program in the admin tab also runs `backfill_program_certificates()` (retroactive awards) and the tab shows per-program completion counts; the award modal can manually award program certs; the student dashboard shows per-program progress cards.
- [x] **Certificate issuance is server-verified** (migration 036): `CourseViewer` calls the `issue_course_certificate` RPC — never INSERT into `certificates` from client code for students. The RPC re-checks lesson completion server-side and resolves the template (course assignment → institution default). Issuance failures surface a toast.
- [x] `canva-exports` Supabase Storage bucket for slide backgrounds, certificate backgrounds, and PDFs
- [x] SCAGO tenant: institution created (`ba52611f-9ad5-44b7-824e-97725a177336`), middleware routing works
- [x] SCAGO course import: 13 courses, 49 lessons, 253 slides, 468 blocks from Markdown
- [x] SCAGO legacy users: 2,868 imported from EdApp CSV
- [x] Admin dashboard filters courses by tenant institution via `getTenantContext()`
- [x] `is_admin()` updated to recognize `platform_admin` and `institution_admin` roles
- [x] `platform_admin` role for cross-tenant admin access (`tech@sicklecellanemia.ca`)
- [x] `scago-assets` Supabase Storage bucket (public read, authenticated upload)
- [x] Markdown import pipeline (`scripts/import-scago/`) — reusable for future content updates
- [x] SCAGO images uploaded: 313 images (142 MB) to `scago-assets` bucket, URLs updated in all blocks
- [x] Institution-aware branding: title slides, nav bar logos, login pages, landing pages
- [x] `resolveInstitutionSlug()` — cookie-based fallback for tenant detection after middleware rewrite
- [x] All admin navigation uses `withInstitutionPath()` — no hardcoded institution paths
- [x] Analytics, Settings, Support pages filter by institution
- [x] RLS policies allow `platform_admin` cross-tenant access on slides/templates/activity_log
- [x] Legacy users pagination (50 per page) + fetch all rows (bypasses 1,000 limit)
- [x] Broken quiz blocks fixed (17 total — options added or converted to rich_text)
- [x] Multi-tenancy unit tests for path resolution, branding, cookie fallback
- [x] Signup flow institution-aware: `handle_new_user` trigger (migration 027) reads `institution_slug` from signup metadata, assigns correct `institution_id` for new users
- [x] Auth callback redirects to `/{slug}/admin` or `/{slug}/student` based on institution cookie
- [x] Privacy Policy and Terms of Service institution-aware — SCAGO includes charitable registration (#83332 0872 RR 0001), Mainpro+ credit terms, medical disclaimer, Ontario governing law
- [x] SCAGO landing page: full 13-module curriculum with glassmorphic cards, red author footer, Mainpro+ accreditation banner, contact section
- [x] Brand colors corrected per institution identity:
  - GANSID: primary dark blue `#1A3C6E`, red `#DC2626`, teal `#0099CA`, orange `#E87722`
  - SCAGO: primary red `#C8262A`, near-black `#1A1A1A`, cream `#F0E7CC`
  - Contact emails: `admin@inheritedblooddisorders.world` (GANSID), `hcp@sicklecellanemia.ca` (SCAGO)
- [x] SCAGO nav bar shows text-only "SCAGO Learning" (logo removed — white background didn't render well on dark nav)
- [x] Certificate templates institution-aware:
  - Default SCAGO certificate template seeded with cream/red color scheme
  - `CertificateRenderer` uses institution-specific color themes (GANSID navy-gold, SCAGO red-cream)
  - Certificate number trigger generates institution-prefixed IDs (`SCAGO-2026-XXXXX`)
- [x] Certificate template editor — full customization:
  - Background modes: Default theme, Solid Color, Gradient (from/to + direction), Image upload, Canva
  - Direct image upload to `canva-exports` bucket under `certificate-backgrounds/`
  - Logo config: URL, position (top-left/right, bottom-left/right), width, opacity; "Use SCAGO/GANSID logo" quick button
  - Font weight control on all text fields (Light, Normal, Semibold, Bold, Extra Bold)
  - Live preview updates instantly; `key` prop forces re-mount on background type changes
  - Save clears `canva_design_url` when background type changes (prevents renderer priority issue)
- [x] Certificate dashboard uses `getTenantContext()` — Templates, Awarded, and Course Assignments tabs all filter by tenant URL slug (not user's profile institution_id)
- [x] **Survey platform**: `survey` block type, `survey_responses` + `survey_templates` tables (migrations 029–030), institution-scoped templates, student upsert, admin analytics tab, user detail survey history
- [x] **Slide template picker**: Learning Objectives, References, and existing templates via `slide-templates.ts` + `slide-template-picker.tsx`; `handleAddSlide()` seeds `defaultBlocks`
- [x] **`content_list` block**: rich-text items, bullet styles, staggered animations; used by Learning Objectives / References templates
- [x] **Structure panel DnD**: slide numbers, cross-lesson drag with drop indicators + lesson highlight, empty-lesson drop targets, block→lesson highlight
- [x] **Quiz editor expansion**: `select_all` type in editor; categorize with shared option pool + category checkboxes + exclusive assignment (`categorize-utils.ts`)
- [x] **Title slide customization**: `lessons.title_slide_settings` (migration 031) — size, color, footer text, logo; properties panel + deep merge in editor store
- [x] **Preview improvements**: opens on current slide, device size syncs back to editor on close (`initialDevice` / `onClose(device)`)
- [x] **Copy/move block dialog**: shows `Slide N · Title` for target selection
- [x] **Editor save robustness**: per-block try/catch + toast on partial failures; MC option rename preserves `correct_answer`

### In Progress / Next
- [ ] Apply migration 031 to live Supabase if not yet applied (`title_slide_settings`)
- [ ] Cross-lesson slide moves: insert-at-index (currently appends to target lesson)
- [ ] Phase 3 remaining: inline block editing on canvas, slide CRUD polish
- [ ] Phase 4: Quiz expansion (standalone quiz grading, scores, retry logic)
- [ ] Phase 6: Advanced blocks (hotspot, sequence, drag-and-drop)
- [ ] Phase 7: Hardening — error boundaries, accessibility audit, performance

### Known Gaps
- `CourseViewer` still makes direct Supabase calls (should go through `lib/db/`)
- `src/app/admin/courses/[id]/page.tsx` same issue
- SCORM-imported images: inline relative paths (`fit_content_assets/...`) are stripped by the rich text sanitizer; the actual images exist as separate `image_gallery` blocks with working EdApp CDN URLs. A future data migration could upload them to Supabase Storage.
- Categories are global (no `institution_id` column) — shared across institutions by design
- Cross-lesson slide DnD appends to target lesson rather than inserting at drop index
- Use `getTemplateById()` for specialized templates — `getTemplateByType('content')` returns the generic Content template (by design: prefers `id === type`)

---

## Test Users

| Email | Role | Password |
|---|---|---|
| `tech@sicklecellanemia.ca` | platform_admin | (in Supabase auth) |

Supabase user ID for `tech@sicklecellanemia.ca`: `485e3136-1337-41c3-b8a2-d0d98accb541`

**Note:** This user has `institution_id = '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a'` (GANSID) but role `platform_admin` grants access to all institutions. Tenant context is determined by the URL prefix, not the user's institution_id.

---

## QA Flow Testing (`/qa-flow-test`)

End-to-end test of the student **completion → required survey → certificate** flow as a REAL student (admin preview mode suppresses DB writes, so it can never prove issuance). Run the `/qa-flow-test` slash command, or manually:

1. `node scripts/qa-flow-test.mjs create --slug=scago` → creates the disposable student `qa.certflow.test@example.com` (fixed email; random password printed; signup trigger assigns tenant + student role).
2. Sign in as it in the preview browser (login inputs are React-controlled — set values via the native setter + `input` events, not plain fill) and walk the **Test Course** (`ba14c955-53de-4c61-974c-e35ff0e0e0a3`; GANSID's is `d264b895-c7d6-4342-a083-17c5182194fe`). NEVER live courses.
3. Expected: quiz gates hold until answered correctly; final completion slide shows "MODULE COMPLETE" + amber "Your certificate is one step away" card + red "Complete Module Survey" footer button; progress stays incomplete until the survey; survey page shows the amber cert banner + "Submit Survey & Get Certificate"; submit → certificate celebration with a real cert number.
4. `node scripts/qa-flow-test.mjs cleanup` (**mandatory** — deletes cert/progress/survey/enrollment/events + the account; `status` shows what exists). This flow writes to the **live** Supabase project.

Do NOT auto-run on server launch — it costs a real cert number and live-DB writes each run; it's on-demand by design.

Full layered QA protocol (when to run which layer, sensitive-flow inventory, past incidents): `docs/qa-playbook.md` + the `qa-lms` agent (`.claude/agents/qa-lms.md`); read-only audits: `scripts/audit-cert-attainability.mjs` and `scripts/audit-db-invariants.mjs` (if present).
