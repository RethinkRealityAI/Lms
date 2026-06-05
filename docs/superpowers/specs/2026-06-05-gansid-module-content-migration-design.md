# GANSID Modules 3–10 Content Migration — Design

**Date:** 2026-06-05
**Author:** Orchestrated by Claude (main loop) + Sonnet/Haiku subagents
**Status:** Approved design → ready for implementation plan
**Pilot:** Module 3 — "Volunteer Management" (course `9b228b9b-820f-4abb-92ac-d3a47091cab4`, module `51f798f4-60b2-49ae-9cdf-5b04f4916a25`)

---

## 1. Goal

Bring GANSID Modules 3–10 in the live LMS into faithful alignment with their authoritative Markdown sources in
`C:\Users\devel\OneDrive\Documents\RethinkReality\GANSID-LMS\Course SCORM packages\Module N\`.

The current DB content is **condensed and image-less** relative to source (e.g. Module 3: source = 50 slides across 10 lessons; DB = 22 slides, no images, null descriptions). We will rebuild the content so structure, ordering, prose, tables, knowledge checks, and images match the source, using the platform's full block library.

**Module 3 is the pilot.** Once it validates end-to-end, the same pipeline is replayed for Modules 4–10.

---

## 2. Source format (what we parse)

Each module folder contains:
- `README.md` — module overview + lesson/slide index.
- `module<N>_*.md` — full combined content.
- `lesson_NN_*.md` — per-lesson files. **These are the unit of work.**
- `images/lesson_NN/slide_MM_image_KK.{png,jpg}` — the local image set (the chosen upload source).

Each lesson MD has:
- **YAML frontmatter per slide** declaring `type` (hero/content/quiz), `component` hint (`steps_list`, `image_grid`, `quiz`), `image`/`images`, `has_table` + `table_headers`/`table_rows`, `has_info_box`, `questions` (with `q`/`correct`/`distractors`), `step_count`/`steps`, etc.
- **A Markdown body** with the full prose, headings, tables, tips (`> **Tip:**`), and knowledge-check Q&A.

The frontmatter makes mapping ~70% mechanical; the prose→block chunking and clean HTML authoring is the ~30% that needs model judgment.

---

## 3. Decisions (locked)

| Decision | Choice |
|---|---|
| DB rebuild strategy | **Keep the 10 lesson rows** (preserve IDs + any student progress). Delete + rebuild each lesson's slides + blocks fresh from source. |
| Image source | **Local** `Module N/images/lesson_NN/` set, uploaded to the GANSID `canva-exports` bucket; reference public URLs. |
| Fidelity | **Full source fidelity** — expand to the complete source slide structure (~50 slides for M3). |
| Components | Conservative static by default (rich_text, content_list, image_gallery, table, callout, quiz_inline) **PLUS auto-apply obvious interactive conversions** (see §6). Ambiguous cases flagged, not auto-built. |
| Upload mechanism | Via the Supabase MCP / existing image-upload path; **verify one image round-trips before bulk** (spike). |
| Publish status | Preserve each lesson/slide's current status; do not silently publish/unpublish. New slides inserted as `published` to match siblings (confirm per module). |

---

## 4. Architecture — per-lesson "plan → load → verify" pipeline

The orchestrator (main loop) drives lessons; it never authors content itself. Three agent roles:

```
For each lesson MD:
  1. PLAN   (Sonnet subagent)  reads lesson MD (+ image manifest) → emits validated JSON slide-plan. No DB access.
  2. LOAD   (orchestrator)     deletes lesson's slides+blocks, inserts plan via Supabase MCP execute_sql. Idempotent.
  3. VERIFY (Haiku subagent)   reads back DB rows, diffs counts + key fields vs plan → pass/fail report.

Module-level, once:
  0. UPLOAD (Haiku/script)     uploads images/lesson_NN/* to canva-exports → relativePath→publicURL manifest.
  4. PREVIEW (orchestrator)    spot-check 2–3 lessons in live preview (preview_* tools) for visual sanity.
```

**Why plan-then-load (not subagents inserting SQL directly):** every lesson is reviewable before it touches the DB; clean retry/idempotency; the plan JSON files are the artifact replicated across modules 4–10.

**Agent model assignment:**
- **Sonnet** — the PLAN stage (judgment: prose chunking, HTML authoring, component selection).
- **Haiku** — UPLOAD manifest building and the VERIFY read-back/diff (mechanical).
- **Orchestrator (me)** — sequencing, the LOAD inserts via MCP, preview checks, freezing the reusable recipe.

Lessons are independent → PLAN/VERIFY stages can fan out in parallel across lessons; LOAD is serialized through the orchestrator to keep DB writes ordered and reviewable.

---

## 5. JSON slide-plan schema (the planner's contract)

```jsonc
{
  "lessonId": "<uuid>",          // existing lesson row, from DB lookup
  "lessonOrderIndex": 5,
  "lessonTitle": "Recruitment",
  "lessonDescription": "Explain the key steps of the recruitment phase...", // from source learning goal
  "slides": [
    {
      "orderIndex": 0,
      "slideType": "content",     // content|media|quiz|disclaimer|interactive|title
      "title": "The Four Key Activities of Recruitment",
      "settings": { "background": "#FFFFFF", "block_style": "glass" },
      "blocks": [
        {
          "orderIndex": 0,
          "blockType": "content_list",
          "data": { /* exact schema per CONTENT_AGENT_GUIDE.md, incl gridX/Y/W/H */ }
        }
      ]
    }
  ],
  "candidates": [                 // interactive opportunities NOT auto-applied (ambiguous)
    { "slideOrderIndex": 1, "suggestion": "scratch_reveal for the tip", "reason": "..." }
  ]
}
```

The plan is validated (structurally + against allowed block types/fields) before LOAD. Invalid plans are returned to the planner for one retry.

---

## 6. Component mapping rules

Baseline mapping follows `CONTENT_AGENT_GUIDE.md` §4. GANSID-specific rules:

**Static (default):**
- Paragraphs/headings → `rich_text` (clean Tiptap HTML: `h2/h3`, `p`, `strong`, `ul/ol`).
- `component: steps_list` / bullet-heavy slides → `content_list` (List block); learning-objective slides use the `learning_objectives` template styling (animated). References → `content_list` decimal.
- `has_table` → `table` block (map `table_headers` → columns, `table_rows` → rows with stable col/row ids).
- `> **Tip:**` / info boxes (`has_info_box`) → `callout` (variant tip/info).
- Single `image` → `image_gallery` mode `single`; `component: image_grid` / multiple `images` → `image_gallery` mode `gallery`.
- `type: quiz` with `questions[]` → one `quiz_inline` per question (multiple_choice; `correct` + `distractors` → options, `correct_answer` exact match). `select all` phrasing → `select_all`. True/false → `true_false`.
- `type: hero` (intro) → handled by the auto title slide; description set on the lesson, not a block. Disclaimer → `rich_text` (or `disclaimer` slide_type).

**Auto-apply interactive (obvious cases only):**
- A term/definition or method/description table with ~2–5 self-contained pairs → `match_pairs` (Drag-to-Match) instead of `table`, when both columns are short labels (not long prose).
- A set of labelled images each with an explanatory caption → `image_gallery` with `enableLightbox: true` + per-image captions ("click to find more information"); set `requireAllClicked` when the source gates progress.
- Knowledge checks → already `quiz_inline` (this is the existing behavior, not a new conversion).

**Flag-only (ambiguous):** scratch_reveal, fill_blank, image_compare, surveys, swipe — listed in `candidates[]` for human opt-in, never auto-built.

---

## 7. Image upload

1. **Spike first:** upload ONE `Module 3/images/lesson_00/slide_00_image_00.png` to `canva-exports` and confirm a public URL renders. Resolve the exact mechanism here (Supabase MCP path or the app's image-upload endpoint) before bulk.
2. **Bulk:** upload all `Module 3/images/lesson_NN/*`, building a manifest `{ "images/lesson_05/slide_02_image_01.jpg": "https://.../canva-exports/..." }`.
3. Planners receive the manifest and emit absolute public URLs only (relative paths are stripped by the sanitizer — see Engineering Rule 13).
4. Path convention in bucket: `gansid-modules/module-3/lesson_05/slide_02_image_01.jpg` (namespaced to avoid collisions).

---

## 8. Safety & idempotency

- **Keep lesson rows** — only slides/blocks are deleted+reinserted, so lesson IDs (and progress FKs) survive.
- LOAD per lesson is **idempotent**: `delete from lesson_blocks where lesson_id=$1; delete from slides where lesson_id=$1` (or soft-delete per existing convention — slides use `deleted_at`), then insert. Re-running a lesson reproduces the same result.
- All inserts carry `institution_id = 725f40e5-...` (GANSID), `content_url=''` on lessons, 0-based `order_index`.
- Quiz `correct_answer` validated to exactly match an option; `select_all` stored as JSON array.
- Each lesson is committed/verified before moving to the next, so a failure is contained to one lesson.

---

## 9. Verification

Per lesson (Haiku VERIFY agent): slide count, per-slide block count, block types in order, quiz answer integrity, image URLs are absolute — diffed against the plan. Mismatches block progression.

Per module (orchestrator): re-run the §1 inventory query (lessons/slides/blocks counts) and confirm it matches the source README totals; spot-check 2–3 lessons in the live preview (`preview_*`) at desktop + mobile.

---

## 10. Reusability for Modules 4–10

After Module 3 passes verification + preview:
- Freeze the PLAN prompt (with the §6 rules baked in), the JSON schema, the loader SQL, and the VERIFY checklist into a short reusable recipe doc.
- For each subsequent module: confirm source ↔ DB lesson alignment, run UPLOAD, then fan out PLAN → LOAD → VERIFY per lesson.
- Watch for module-specific quirks (Modules 4 and 9 are both "Leadership…" in the DB — confirm which maps to the source Module 4 before rebuilding; out of scope to dedupe unless asked).

---

## 11. Out of scope

- Deduplicating the two "Leadership" courses (Modules 4 & 9) unless explicitly requested.
- Modules 1 & 2 (already authored separately).
- The "Final Quiz" / "Test Course" entries.
- Building flagged-but-ambiguous interactive blocks without approval.
- Re-theming / visual redesign beyond per-slide background/block-style defaults.

---

## 12. Open items / risks

- **Upload mechanism** must be confirmed by the §7 spike before bulk image work.
- **Slide↔image alignment:** the local `images/lesson_NN/slide_MM_*` indices don't always line up 1:1 with rebuilt slide order; the planner maps images by the frontmatter `image`/`images` fields, not by positional guess.
- **New-slide status:** confirm published vs draft expectation per module (default: match existing siblings).
