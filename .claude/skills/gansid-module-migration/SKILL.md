---
name: gansid-module-migration
description: Use when migrating or rebuilding GANSID course module content (Modules 3–10) into the LMS from the authoritative Markdown sources in "Course SCORM packages/Module N/". Covers the full image-upload → plan → load → verify pipeline with strict content fidelity (verbatim from MD, verbatim quiz feedback from index.html, tables stay tables, no gamifying non-quiz content). Invoke for "rebuild module N", "import GANSID module content", "the LMS content doesn't match the MD", or fixing fidelity/component issues in migrated modules.
---

# GANSID Module Content Migration

Rebuild a GANSID module's lesson content from its authoritative source into the live LMS, with
strict fidelity. The orchestrator (you) drives subagents; you never author content yourself.

**Institution:** GANSID `725f40e5-a317-4b8f-80b8-1df6cf3bbe2a` · images → `canva-exports` bucket.
**Source root:** `../Course SCORM packages/Module N/` (sibling of the `Lms` repo).
**Scripts + rules:** `Lms/scripts/import-gansid-modules/` — `PLANNER_SPEC.md` (planner rulebook),
`upload-images.ts`, `load-plan.ts` (the plan-JSON contract + loader), `README.md` (runbook).

## Sources — combine both, drop nothing (read PLANNER_SPEC.md in full first)
- **`lesson_*.md` = source of truth for ALL content** (verbatim prose/lists/tables/quiz Q&A).
- **`index.html` = structure/format + verbatim quiz `feedback`** (the MD has no feedback). It's a
  condensed render — never let it drop MD content. Final plan = UNION of both.

## Non-negotiable fidelity rules (enforced by load-plan.ts where noted)
1. Verbatim from MD. No paraphrase, no summary, no invented content, no omitted body section.
2. Tables → `table` block ALWAYS (columns use `label`, cells PLAIN TEXT, `first_column_header` for
   emphasis). NEVER convert informational tables to match_pairs/categorize. *(loader rejects `header`
   keys + HTML in cells.)*
3. Interactive/quiz blocks ONLY for real knowledge checks. No gamifying informational content.
4. Quiz: one `quiz_inline` per question; `correct_answer` ∈ `options`; single feedback only —
   `feedback_correct` = verbatim index.html feedback (else one succinct lesson-grounded sentence);
   **never set `explanation`.** *(loader rejects `explanation` + bad correct_answer.)* Keep ALL MD
   knowledge-check questions even if index.html condensed them.
5. Images: absolute manifest URLs only; intersperse between text blocks (don't dump at slide end). **No image-only slides** — merge images into the nearest related content slide; skip duplicates already on adjacent slides. **Single-image blocks:** `mode: "single"`, no `aspectRatio` (original), `objectFit: "contain"`, `displaySize: "lg"` (enforced by `load-plan.ts`).
6. `lessonDescription` = verbatim lesson Learning Goal/intro, or `null`. Never paraphrased/invented.
7. **Consolidated knowledge checks:** when consecutive source slides are all KC/quiz questions, put them on **one slide** with multiple `quiz_inline` blocks. Separate KC groups in different lesson sections → one consolidated KC slide per group (questions still appear after the content they follow).
8. Keep lesson rows (preserve IDs/progress); only slides+blocks are rebuilt. Loads are idempotent.

## Pipeline (per module)
1. **Upload images:** `npx tsx scripts/import-gansid-modules/upload-images.ts N`
   (first time, spike with `--one` and curl the URL for HTTP 200). Produces the image manifest.
2. **Map lessons → DB ids** (Supabase MCP): `select id, order_index, title from lessons where
   module_id='<uuid>' order by order_index;` Pair each with its source `lesson_*.md`.
3. **PLAN (Sonnet subagents, one per lesson):** each reads `PLANNER_SPEC.md` + the image manifest +
   its `lesson_*.md` + `index.html`, and writes `plans/module-N/lesson-NN.json` (contract in
   `load-plan.ts`). Full source fidelity; combine MD + index.html.
4. **Validate:** `for f in plans/module-N/lesson-*.json; do tsx load-plan.ts "$f" --dry; done`
5. **Load:** same loop without `--dry` (deletes+reinserts each lesson's slides/blocks, keeps lesson).
6. **VERIFY:**
   - DB inventory (Supabase MCP): slides/blocks per lesson, `orphan_blocks=0`, `match_pairs`/
     `categorize` only where intended, `explanation`-free quizzes, tables present.
   - **Fidelity audit (Sonnet subagent):** diff each plan's text vs the MD (word-for-word, no
     omission) and quiz feedback vs index.html. Fix any finding, reload that lesson.
   - **Live preview:** `/gansid/admin/courses/<courseId>/preview` (admins are redirected off
     `/student/*`). Drive via preview_eval; spot-check tables, images load, single feedback.

## Module quirks
- Find the course/module ids: `select c.id course, m.id module from modules m join courses c on
  m.course_id=c.id where c.institution_id='725f40e5-...' and c.title ilike '%Module N%';`
- Lesson files are 0-indexed (`lesson_07_*` = the 8th lesson). Some modules combine early lessons
  into one file (e.g. `lesson_00_to_04_*.md`).
- Modules 4 and 9 are both "Leadership…" in the DB — confirm which maps to source Module 4 before
  rebuilding. Don't dedupe unless asked.

## When something's wrong
Use systematic-debugging. The most common Module-3 mistakes (now guarded): tables gamified, two
feedback boxes (`explanation`), table cells with HTML, paraphrased descriptions, condensed
index.html dropping MD content. Re-run the offending lesson's planner with the specific fix, reload.
