# GANSID Modules 3–10 Content Migration — Reusable Recipe

Pipeline to rebuild a GANSID module's lesson content from its authoritative Markdown
source (`../../Course SCORM packages/Module N/`) into the live LMS. Module 3 was the
validated pilot; this is the streamlined process for Modules 4–10.

Design doc: `docs/superpowers/specs/2026-06-05-gansid-module-content-migration-design.md`

**Planner rules (READ FIRST):** `PLANNER_SPEC.md` — fidelity rules every PLAN subagent must follow.

## Two sources per module
- **`lesson_*.md`** = authoritative FULL content (verbatim prose/lists/tables; never omit/paraphrase).
- **`index.html`** = the rendered module. Use it ONLY for (a) the exact `feedback` string per quiz
  question (the MD has none), and (b) deciding what is a real quiz. Do NOT copy its (condensed) prose.

## Invariants
- **Keep lesson rows** (preserve IDs + student progress). Only slides + blocks are rebuilt.
- Each lesson = one plan JSON (`plans/module-N/lesson-NN.json`) matching the contract in `load-plan.ts`.
- All media URLs absolute (from the image manifest). Quiz `correct_answer` ∈ `options`.
- Loading is idempotent: re-running a lesson hard-deletes its blocks+slides then re-inserts.
- `slides` has **no** `institution_id` column; `lesson_blocks` requires `institution_id` (GANSID `725f40e5-...`).

## Steps (per module)
```bash
cd Lms

# 1. Upload images + build manifest  (spike first run with --one)
npx tsx scripts/import-gansid-modules/upload-images.ts N

# 2. Map source lessons -> DB lesson IDs (run once, via Supabase MCP):
#    select id, order_index, title from lessons
#    where module_id = '<module uuid>' order by order_index;

# 3. PLAN — dispatch one Sonnet subagent per lesson file (judgment work).
#    Each reads: .claude/CONTENT_AGENT_GUIDE.md + the image manifest + its source MD,
#    and writes plans/module-N/lesson-NN.json. Prompt template = the Module 3 planner
#    prompts (full fidelity to the frontmatter `slides:` list; static-by-default with
#    auto-applied obvious interactive conversions; flag ambiguous ones).

# 4. Validate every plan (dry run)
for f in scripts/import-gansid-modules/plans/module-N/lesson-*.json; do
  npx tsx scripts/import-gansid-modules/load-plan.ts "$f" --dry; done

# 5. LOAD
for f in scripts/import-gansid-modules/plans/module-N/lesson-*.json; do
  npx tsx scripts/import-gansid-modules/load-plan.ts "$f"; done

# 6. VERIFY
#    a) DB inventory query (slides/blocks per lesson, orphan_blocks=0) via Supabase MCP.
#    b) Haiku subagent: diff each plan vs its source MD for dropped content / wrong answers.
#    c) Live preview spot-check: /gansid/admin/courses/<courseId>/preview (desktop + mobile).
```

## Gotchas learned on Module 3
- The frontmatter `slides:` list is the author's CONSOLIDATED structure (e.g. Recruitment = 3
  logical slides, not the README's 9 EdApp slides). Plan to the frontmatter, not the README count.
- **Body can contain Q's the frontmatter omits.** Module 3 Lesson 7 had `question_count: 1` but a
  second knowledge-check (a Formal/Informal table) lived in the body. ALWAYS read the full body,
  not just frontmatter. The Haiku verify step catches these — keep it.
- A 2-column "type → examples" table maps well to a `categorize` quiz; a short "term → definition"
  table maps to `match_pairs` (Drag to Match).
- Admins are redirected off `/student/*`; preview via the `/admin/.../preview` route instead.

## v2 review learnings (from Module 3 round 2 — now enforced by load-plan.ts)
- **Tables stay tables.** Never convert an informational table to match_pairs/categorize. Only build
  interactive/quiz blocks for actual knowledge checks. (Loader rejects nothing here — it's a planner rule.)
- **`table` block:** columns use `label` (NOT `header`); cells are PLAIN TEXT (no HTML/markdown — the
  viewer renders cell strings literally). Use `first_column_header: true` for emphasis. (Loader rejects
  `header` keys and HTML in cells.)
- **Quiz feedback:** single field only. `feedback_correct` = verbatim `index.html` feedback; for MD
  questions absent from index.html, write ONE succinct lesson-grounded sentence. **Never set
  `explanation`** (renders a redundant 2nd box — loader rejects it).
- **Keep ALL MD knowledge-check questions** (e.g. M3 L6 & L9 have 4 each) even if index.html condensed them.
- **Descriptions must be verbatim** (lesson Learning Goal / intro) or `null` — never paraphrased or
  invented. M3 L7 had no learning goal in source → null.
- **Intersperse images** between text blocks; don't dump galleries at slide end.
```
```
