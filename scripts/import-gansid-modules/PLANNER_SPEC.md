# GANSID Module Planner Spec (v2)

Rules every PLAN subagent MUST follow when converting a source lesson into a slide-plan JSON.
v2 incorporates corrections from the Module 3 review. **Fidelity is the top priority.**

## Sources (two, combined so NOTHING is missing)
1. **Lesson Markdown** (`Module N/lesson_*.md`) = the **SOURCE OF TRUTH for all content/details**.
   All prose, lists, tables, headings, and quiz questions/options come from here, **verbatim**.
   Never omit a body section. Never paraphrase, summarize, reword, or add content. Light HTML only.
2. **`Module N/index.html`** = the rendered module — used for **structure/format + feedback**:
   - The **verbatim `feedback` string** for each quiz question (the MD has none).
   - **Structure/format guidance**: how slides are grouped, image placement, and the
     **authority on what is a real quiz** (`type: "quiz"`; also honor MD "Knowledge Check" Q&A).
   index.html is usually a CONDENSED version — do NOT copy its prose, and never let it cause MD
   content to be dropped.

   **Cross-check rule:** the final plan must include the UNION of substantive content across both
   sources — every MD body section (MD wins on completeness) PLUS any quiz/feedback that only exists
   in index.html. If one source has something the other lacks, KEEP it. Read BOTH fully before
   planning; if a lesson spans a combined file (e.g. `lesson_00_to_04_*.md`), read the right section.

## Absolute rules (from review)
- **NO paraphrasing / NO generated content.** Transfer MD text word-for-word. The only generation
  permitted: a single succinct feedback sentence ONLY when a quiz question has no feedback in
  index.html — and it must be grounded strictly in that lesson's own words.
- **Tables stay tables.** Any source `<table>` / markdown table → `table` block. NEVER convert a
  table to `match_pairs`, `categorize`, or any interactive/quiz block.
- **No quiz-like features for non-quiz content.** `match_pairs`, `categorize`, `scratch_reveal`,
  `fill_blank`, `swipe`, `image_compare` are FORBIDDEN unless the source item is an actual
  knowledge-check/quiz whose intent is that interaction. Informational content is never gamified.
  (Default knowledge checks are `multiple_choice` / `true_false` / `select_all`.)
- **Single native feedback.** Set `feedback_correct` (and optionally `feedback_incorrect`) to the
  VERBATIM index.html `feedback` string. **Do NOT set the `explanation` field** — it renders a
  redundant second box.
- **Quiz options when MD and index.html disagree.** Use the MORE COMPLETE option set, but ONLY if
  every one of its options is grounded in the lesson content (a real, plausible answer drawn from the
  material) — this is usually index.html's set. If the larger set contains an option that is NOT from
  the content (random/invented), use the smaller content-grounded set (the MD's). NEVER invent
  options. The `correct_answer` must always be one of the chosen options, verbatim.
- **Intersperse images.** When a slide has multiple images and heavy text, ORDER blocks so images
  break up the text (text → image → text → image), not all images dumped at the end. Single hero
  images go near the top of their slide.
- **Captions kept.** Descriptive image captions + alt are allowed (per author preference).

## Slide structure
- Follow the MD frontmatter `slides:` list for slide count and order (the author's consolidated
  structure). For each slide, include ALL of that slide's body content (every `content_section` /
  body paragraph / list / table). Do not drop sections to "fit" the frontmatter.
- The auto title slide + completion slide render automatically — never create blocks for them.
  Put the lesson intro / "Learning Goal" text (verbatim) into `lessonDescription`.
- **No image-only slides.** Every content slide must include at least one text block (`rich_text`, `content_list`, `table`, or `callout`). Place images on the content slide they belong to.
- **Consolidate grouped knowledge checks.** Runs of consecutive quiz/KC slides → one slide with multiple `quiz_inline` blocks.

## Component mapping
| Source | Block |
|---|---|
| Paragraphs / headings | `rich_text` (verbatim text, clean HTML) |
| Bullet / numbered / step list, learning objectives | `content_list` |
| Table | `table` (ALWAYS) — columns use `id` + `label` (NOT `key` or `header`); each row needs an `id`; cells keyed by column `id`. Cells are PLAIN TEXT (no HTML/markdown). Use `first_column_header: true` to emphasize the first column instead of bold markup. |
| Tip / Note / info-box | `callout` |
| Single image | `image_gallery` with `mode: "single"` (full width), **no** `aspectRatio` (original), `objectFit: "contain"`, `displaySize: "lg"` |
| Multiple images | `image_gallery` mode gallery, interspersed |
| Knowledge check / quiz | `quiz_inline`, one block per question |
| **Grouped knowledge checks** | When consecutive slides in the source are all quiz/KC questions (with no content between them), put **all questions on ONE slide** as multiple `quiz_inline` blocks. If KC questions appear in separate sections of the lesson (e.g. 3 after section A, 2 after section B), create **one consolidated KC slide per group** at each position — never one question per slide for a run of grouped checks. |
| Image-only source slide | **Never create an image-only slide.** Merge images into the nearest related content slide (intersperse with text). For MD image stacks with no body, add index.html body text if available; skip duplicate images already shown on adjacent slides. |

## Block data essentials
- Images: absolute URLs ONLY, from the module image manifest, mapped by the MD image path.
- **Single-image galleries:** `mode: "single"`, omit `aspectRatio` (original), `objectFit: "contain"`, `displaySize: "lg"`. (Also enforced by `load-plan.ts` on insert.)
- Quiz: `options` + `correct_answer` verbatim from source; `correct_answer` must exactly equal one
  option; `show_feedback: true`; `feedback_correct` = verbatim index.html feedback; NO `explanation`.
- Grid: full-width `{gridX:0,gridY:0,gridW:12,gridH:3}` default; stacked blocks increment `gridY`.
- HTML tags allowed: h2,h3,p,strong,em,ul,ol,li,blockquote,a,br,table,tr,td,th.

## Plan JSON contract
See `load-plan.ts` header. `candidates[]` may note genuinely ambiguous interactive opportunities
for human opt-in — but never build them.

## Self-check before writing
1. Every MD body section is represented (no omission).
2. No text was reworded vs the MD (verbatim).
3. Every table is a `table` block; no informational content uses a quiz/interactive block.
4. Every quiz has a single verbatim feedback and NO `explanation`.
5. Multiple-image slides intersperse images between text.
6. quiz correct_answer ∈ options; all image URLs are https://; JSON parses.
7. No image-only slides; grouped KC questions consolidated on one slide per run.
