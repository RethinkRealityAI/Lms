# GANSID LMS — QA Playbook

Layered QA protocol for the sensitive flows of the LMS. The `qa-lms` subagent (`.claude/agents/qa-lms.md`) automates this; this document is the human-readable reference. Ground truth for DB state is the migration ledger in `CLAUDE.md`; authoritative analytics view definitions are in `supabase/snapshots/analytics-views.sql`.

## When to run which layer

| Layer | When | Cost |
|---|---|---|
| 1 — Static + unit | Every change, before every push | Free, local |
| 2 — Live-DB audits | Every change, before every push | Free, READ-ONLY against live DB |
| 3 — Disposable-student E2E | Only when a **sensitive flow** changed (see inventory below), or after any migration touching certificates/progress/quizzes/surveys/RLS | Writes to LIVE DB, consumes a real certificate number — deliberate use only, never automated |

## Commands

```bash
# Layer 1
npx tsc --noEmit
npx vitest run                                # 685+ tests, all must pass

# Layer 2 (read .env.local service-role key; READ-ONLY)
node scripts/audit-cert-attainability.mjs     # every published course must PASS
node scripts/audit-db-invariants.mjs          # if present — all invariants must hold

# Layer 3 (LIVE writes — cleanup is mandatory)
node scripts/qa-flow-test.mjs create --slug=scago
#   ...walk the Test Course in the preview browser (see below)...
node scripts/qa-flow-test.mjs cleanup         # MANDATORY
node scripts/qa-flow-test.mjs status          # shows what QA data currently exists
```

## Sensitive-flow inventory (with the historical bug that motivates each)

- **Quiz completion gate** — quiz blocks on deleted/draft slides once counted toward the gate and bricked lessons for real users; the gate must derive from rendered slides only (`currentSlides` / `getGatingQuizBlockIds`), never raw `lesson_blocks`.
- **Certificate revoke/restore** — `certificates` had no admin write RLS policies, so client-side revoke silently matched 0 rows and showed phantom success (fixed migration 053).
- **Certificate re-issue** — redoing a certified course must return `already_issued`; reset + redo must RESTORE the same cert number, never mint a new one (migration 037/036).
- **Admin progress reset** — must clear `progress` AND `quiz_block_responses`; the viewer rehydrates gates from persisted answers, so without it reset quizzes came back pre-passed (migration 052).
- **`completed_at` preservation** — redoing a lesson must never overwrite original completion dates; legacy EdApp imports are backdated and clobbering corrupts history.
- **Analytics honesty** — quiz stats once read the dead `quiz_attempts` table (always 0); the app read `certificates_earned` while the view emitted `certificate_count` (always-0 Certs column); 1000-row PostgREST cap silently truncated sums; review ratings were shown as quiz scores; MAU counted profile edits. Counters must name a real, populated source with exact counts.
- **Legacy claims** — claim-generated events must carry `payload.source='legacy_import'` and be excluded from trends, or claim day shows a phantom activity spike (migration 047).
- **Enrollment/visibility** — a student enrolled in a course later switched to `restricted` must still see it counted and displayed on the dashboard.
- **New migrations / RLS** — admin policies must use `public.is_admin()`; a missing UPDATE policy fails SILENTLY (0 rows, no error), so every new client write path needs its policy proven to exist.

## Disposable-student procedure (Layer 3)

1. `node scripts/qa-flow-test.mjs create --slug=scago` → creates `qa.certflow.test@example.com` (fixed email, random password printed; signup trigger assigns tenant + student role).
2. Sign in in the preview browser. Login inputs are React-controlled: set values via the native value setter + dispatched `input` events, AFTER hydration — poll for a `__reactProps` key on the input before interacting. The OneDrive dev-stall can delay hydration 15+ seconds.
3. Walk the **Test Course** only — SCAGO `ba14c955-53de-4c61-974c-e35ff0e0e0a3`, GANSID `d264b895-c7d6-4342-a083-17c5182194fe`. **NEVER live courses.**
4. Verify in order: quiz gates hold until answered correctly → "MODULE COMPLETE" slide with amber "Your certificate is one step away" card and red "Complete Module Survey" button → progress stays incomplete until survey → survey page shows amber cert banner + "Submit Survey & Get Certificate" → submit → certificate celebration with a real cert number.
5. **Cleanup discipline:** `node scripts/qa-flow-test.mjs cleanup` is mandatory — it deletes cert/progress/survey/quiz-responses/enrollment/events and the account. Run `status` first if unsure what exists. Never leave the QA account behind; this flow writes to the live Supabase project.

Read-only SQL lifecycle checks (policy existence, restore-not-remint) run through the migrations tooling by the coordinator only — the QA agent itself executes no SQL writes.

## Past incidents

| Incident | Root cause | Fix |
|---|---|---|
| Bricked lesson via deleted-slide quiz | Completion gate derived from raw `lesson_blocks`, counting quizzes on deleted/draft slides that never rendered | Gate derives from rendered slides only; `audit-cert-attainability.mjs` guards it |
| Phantom certificate revoke | `certificates` had no admin UPDATE RLS policy — client UPDATE matched 0 rows with no error, UI showed success | Migration 053 admin write policies; rule: prove RLS exists for every client write |
| Always-zero leaderboard columns | Quiz stats from the empty `quiz_attempts` table; view emitted `certificate_count` while app read `certificates_earned` | Migrations 049–051: `quiz_block_responses` source + output alias; snapshots in version control |
| Legacy claim analytics spikes | Claim-generated events were indistinguishable from real activity | Migration 047: `payload.source='legacy_import'` tag, excluded from `getEventCounts()` |
| `completed_at` clobbering on redo | Progress upsert overwrote original completion dates, corrupting backdated legacy records | Upsert preserves existing `completed_at` |
| 1000-row silent truncations | PostgREST default page cap silently capped bulk reads and summed views | `fetchAll` paging pattern in scripts; exact-count queries in analytics |

## Self-maintenance rule

When a new sensitive flow or bug class is discovered, append it to the sensitive-flows list in `.claude/agents/qa-lms.md` AND in this playbook in the same change. When a new invariant is added to the DB, extend `scripts/audit-db-invariants.mjs`. Keep CLAUDE.md's migration ledger the source of truth — cross-check the highest migration number there before assuming repo files are current (local `supabase/migrations` numbering has drifted; authoritative view definitions live in `supabase/snapshots/analytics-views.sql`).
