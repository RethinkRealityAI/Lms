# GANSID LMS — Implementation Checklist

**Last Updated:** 2026-03-30
**Project:** GANSID Learning Management System
**Stack:** Next.js 16, Supabase, TypeScript, Tailwind CSS 4
**Supabase project:** `ylmnbbrpaeiogdeqezlo`
**Dev port:** 3001

---

## Phase 0: Foundation ✅ COMPLETE

- [x] Next.js 16 + Supabase SSR project scaffold
- [x] Tailwind CSS 4 + shadcn/ui component library
- [x] Database schema (all core tables)
- [x] Auth: student signup, admin signup (verification codes), login, password reset
- [x] Multi-tenant middleware (`/gansid/` prefix rewrites)
- [x] Role-based routing: admin → `/admin`, student → `/student`
- [x] Vitest + React Testing Library setup
- [x] Block registry system (`register-all.ts`, `block-registry.ts`)
- [x] Lazy-loaded viewer components for all block types
- [x] SCORM import CLI pipeline (`scripts/import-scorm/`)

---

## Phase 1: SCORM Content Import ✅ COMPLETE

- [x] Migration 008: Add `slug` column to `courses`
- [x] Migration 009: Add `'blocks'` to `lessons.content_type` CHECK constraint
- [x] Migration 010: Fix RLS infinite recursion — `public.is_admin()` SECURITY DEFINER function
- [x] Migration 011: Update all remaining admin policies to use `is_admin()` (certificates, progress, categories, lessons, questions, quiz_attempts, quizzes)
- [x] Module 1 seeded: **Fundamentals of Effective Advocacy** (11 lessons, 60+ blocks)
- [x] Module 2 seeded: **Fundraising Strategies that Drive Results** (5 lessons, 30+ blocks)
- [x] Test user `tech@sicklecellanemia.ca` enrolled in both courses
- [x] Lesson ordering fixed (Module 1: 0–10 sequential)
- [x] `register-all.ts` imported in `lesson-block-renderer.tsx` (client-side registration fix)
- [x] `params` Promise unwrapping fix applied to all 5 dynamic route pages

### Verified Working
- [x] Student dashboard shows both courses at `/gansid/student`
- [x] Course page lists lessons in correct order
- [x] `rich_text` blocks render HTML content
- [x] `cta` blocks render completion button
- [x] `image_gallery` blocks registered (slider/gallery mode)
- [x] No RLS 500 errors for student user

---

## Phase 2: Student Experience 🟡 PARTIALLY COMPLETE

- [x] Course enrollment / unenrollment flow
- [x] Lesson progress tracking (mark as complete)
- [x] Progress bar on course page
- [x] Course reviews (star rating + text)
- [x] Certificate generation on course completion
- [ ] Progress page at `/student/progress`
- [ ] Certificates page at `/student/certificates` (500 error being investigated)
- [ ] Student profile editing
- [ ] Course search / filtering on dashboard

---

## Phase 3: Admin Authoring ⬜ NOT STARTED

- [ ] Admin dashboard stats (enrolled users, completion rates)
- [ ] Module CRUD (create, edit, reorder, delete)
- [ ] Lesson CRUD (create, edit, reorder, delete)
- [ ] Block editor shell (add/remove/reorder blocks)
- [ ] Rich text block editor (with image upload)
- [ ] Image gallery editor
- [ ] CTA block editor
- [ ] File uploads to Supabase Storage
- [ ] Course thumbnail upload
- [ ] User management (view students, enrollment status)

---

## Phase 4: Quiz Expansion ⬜ NOT STARTED

- [ ] Inline quiz blocks (multiple choice, categorize)
- [ ] Quiz grading and score persistence
- [ ] Quiz attempts table
- [ ] Pass/fail criteria per lesson
- [ ] Quiz review mode (see correct answers)
- [ ] Admin quiz builder UI

---

## Phase 5: Multi-Tenant Polish ⬜ NOT STARTED

- [ ] Per-tenant branding (logo, colors)
- [ ] Tenant admin can only see their institution's data
- [ ] Tenant-scoped enrollment codes
- [ ] Custom domain support

---

## Phase 6: Advanced Blocks ⬜ NOT STARTED

- [ ] Hotspot block (image with clickable regions)
- [ ] Sequence block (drag-to-order interaction)
- [ ] H5P viewer integration
- [ ] Video block with progress tracking
- [ ] 3D model viewer block

---

## Phase 7: Hardening ⬜ NOT STARTED

- [ ] Error boundaries on all block viewers
- [ ] Accessibility audit (WCAG 2.1 AA)
- [ ] Performance: image optimization, lazy loading
- [ ] E2E tests (Playwright)
- [ ] Production deployment checklist
- [ ] SMTP email configuration
- [ ] Analytics / learning reporting

---

## Applied Database Migrations

| Migration | Status | Description |
|---|---|---|
| 001–007 | ✅ | Initial schema, RLS, auth trigger, indexes |
| 008 | ✅ | `courses.slug` column |
| 009 | ✅ | `'blocks'` in `lessons.content_type` CHECK |
| 010 | ✅ | `public.is_admin()` SECURITY DEFINER + fix users/courses/enrollments RLS |
| 011 | ✅ | Fix certificates/progress/categories/lessons/questions/quiz_attempts/quizzes RLS |

---

## Key Files Reference

| Purpose | Path |
|---|---|
| Project context for Claude | `CLAUDE.md` |
| Block type registration | `src/lib/content/blocks/register-all.ts` |
| Block renderer | `src/components/lesson-block-renderer.tsx` |
| Student course page | `src/app/student/courses/[id]/page.tsx` |
| Admin course page | `src/app/admin/courses/[id]/page.tsx` |
| Middleware (tenant routing) | `src/middleware.ts` |
| SCORM import CLI | `scripts/import-scorm/index.ts` |
| SCORM import skill | `~/.claude/skills/gansid-scorm-import/SKILL.md` |
| Implementation plan | `docs/plans/2026-03-30-lms-course-builder-implementation.md` |

---

## Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=https://ylmnbbrpaeiogdeqezlo.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
# No service role key — use Supabase MCP for seeding/migrations
```

---

## Troubleshooting Quick Reference

| Symptom | Cause | Fix |
|---|---|---|
| 500 on any Supabase table | RLS infinite recursion | Admin policy uses inline `FROM users`; update to `public.is_admin()` |
| "Content unavailable (rich_text)" | Block not registered client-side | Import `register-all.ts` in `lesson-block-renderer.tsx` |
| `params is a Promise` error | Next.js 15+ breaking change | Use `React.use(paramsPromise)` in dynamic route pages |
| Lessons all at order_index 0 | EdApp SCORM exports `config.index = 0` | Reassign sequentially after extraction |
| Courses show "NO COURSES" | RLS blocks course/enrollment queries | Check migration 010 + 011 applied |
| `column is_published does not exist` | Column removed from schema | Remove from INSERT statements |
