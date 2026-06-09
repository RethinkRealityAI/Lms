# SCAGO Module Planner Spec (v1)

Rules every PLAN subagent MUST follow when converting one SCAGO lesson into a slide-plan JSON.
**Fidelity is the top priority.** You transfer the source content; you never author or paraphrase it.

## Source — ONE Markdown file (no index.html)
Each SCAGO module is a single `Module_N_*.md` in `SCAGO Modules/`. That Markdown is the **sole source
of truth** for all content AND for quiz feedback (feedback appears inline as `**Explanation:**`).
There is no second/condensed source — do not invent one, do not look elsewhere.

Read your assigned lesson section **in full** before planning. Transfer every educational body
section **verbatim** (word-for-word). Never omit, paraphrase, summarize, reword, or add content.

## SCAGO Markdown conventions (how to read the structure)
- **Lesson boundary:** `## Lesson N - Title`. You plan exactly ONE lesson (the section you're given).
- **Slide/section headers:** bold lines like `**Section Title**` (sometimes ending ` ---`). Each is the
  start of a new slide's content. Strip a trailing ` ---` from the header text.
- **Explicit slide markers:** `> **Lesson N, Slide N**` — a hard slide boundary (mainly precedes videos).
- **Image:** `![alt](../images/...)` → look the EXACT `../images/...` path up in the image manifest to
  get the absolute URL. Use only URLs that exist in the manifest.
- **Video:** `🎬 **Video:** [title](https://youtube...)` → a `video` block (`provider:"youtube"`, the url).
- **Bulleted/numbered lists:** `- ` / `1. ` → `content_list`. Inline bullets written with ` • ` inside a
  paragraph should be split into a `content_list`.
- **Quiz markers:** option lines with `✓` (correct), `✗`/`○` (incorrect). `**Explanation:**` = feedback.

## DROP these non-content artifacts (EdApp scaffolding, not lesson content)
- Author/accreditation line (`*Authors: ... Accredited by ...*`) and the repeated module title banner line.
- `**Statement:** Let's get started!` / `OK, let's go!` / `Continue` / `Ready to learn!` and similar nav fluff.
- Conflict-of-interest disclaimers (`We have no conflicts of interest...`).
- Self-assessment scales (`... on a scale of 1 to 10 is ___ .`) — pre and post.
- End-of-module survey items (`How satisfied were you...`, `Did Module N ... meet your learning needs`,
  `Would you recommend this module...`, `Did you perceive any degree of bias...`, the bare `○ Yes / ○ No`).
  These are handled by the platform's survey/feedback features, not lesson slides.

## Lesson-open structure
- **lessonDescription = null** (the auto title slide renders the lesson title alone; do not build a title slide).
- First content slide = **Learning Objectives** as a `content_list` (verbatim bullets).
- Then the **Introduction** prose (if present) as `rich_text` — its own slide or merged with the next section
  if short. After that, follow the source section order exactly.

## Slide titles — set the title, don't duplicate it inline
The viewer renders the **lesson title as a small eyebrow** and the **slide `title` as the prominent
headline** above the slide body. So:
- Set each content slide's `title` to its source section heading (the bold `**Section Header**`, with any
  trailing ` ---` stripped).
- **Do NOT also emit that heading as an inline `<h2>`/`<h3>` at the top of the slide's first `rich_text`
  block** — it would render the title twice. The first rich_text block should start with the body prose.
- A heading INSIDE a slide that names a different sub-section is fine (it's not the slide title).
- If a section is a bare header with no body in the source, just set the slide `title` and add its images
  (no empty rich_text heading block).
(The loader also auto-promotes a leading heading to the slide title / strips a duplicate, but emit it
correctly: title on the slide, body in the block.)

## Summary & References — each on its OWN slide, as a content_list
- The **Summary** section is its own slide; render its points as a `content_list` (`bullet_style:"disc"`).
- The **References** section is its own SEPARATE slide; render the citations as a `content_list`
  (`bullet_style:"decimal"`). One reference per item, verbatim.
- NEVER combine Summary and References on the same slide, and never render either as a `rich_text`
  wall of text. (The slide `title` "Summary"/"References" is the headline — don't repeat it inside.)

## Quiz mapping (SCAGO patterns)
1. **Numbered True/False set** — header `**Knowledge Check ... true or false**`, then one combined
   `**Explanation:** 1. ... 2. ... 3. ...`, then `**1. statement**` / `**2. ...**` each with `✗`/`✓` options.
   → ONE consolidated knowledge-check slide with one `quiz_inline` per numbered statement.
   `question_type:"true_false"`, `options:["True","False"]`, `correct_answer` = the option marked `✓`.
   `feedback_correct` = the **matching numbered sentence** from the combined Explanation (verbatim).
2. **Single True/False** — `**Is the following statement true or false?**`, `**Statement:** ...`,
   `- True` / `- False`, then `**Explanation:** This statement is true/false. ...`.
   → one `quiz_inline` true_false; `question` = the statement; `correct_answer` from the Explanation's
   "This statement is true/false"; `feedback_correct` = the full Explanation (verbatim).
3. **Multiple choice** — `**Question:** ...` (or a bold question ending `?`) followed by `✓`/`○` options.
   `question_type:"multiple_choice"`, options verbatim, `correct_answer` = the `✓` option (verbatim, must
   equal an option). `feedback_correct` = the nearest `**Explanation:**` (verbatim) if present.
4. **Single-option "reveal" question** (only a `✓` option, no distractors in the source) — do NOT build a
   1-option quiz and do NOT invent distractors. Render as `rich_text` (bold question + the answer), and add
   a `candidates[]` note. Same for **open reflection prompts** with no options (e.g. "What is one thing you
   could do...", "Fix this INCORRECT statement...") — render verbatim as `rich_text` (with the Explanation as
   the model answer beneath), never as `quiz_inline`.

## Absolute rules
- **No paraphrasing / no generated content.** The only text you may generate is a single succinct
  `feedback_correct` sentence ONLY when a real quiz question has no `**Explanation:**` — grounded strictly
  in that lesson's own words.
- **`correct_answer` is always a STRING, never an array.** For `select_all`, join the correct options
  with `"; "` (semicolon + space), e.g. `"Sepsis; Severe anemia; Splenic sequestration"` — the viewer
  does `correct_answer.split('; ')` and will CRASH on an array. Each item must exactly equal an option.
- **Single native feedback.** Put feedback in `feedback_correct` (optionally `feedback_incorrect`).
  **Never set the `explanation` field** (it renders a redundant second box; loader rejects it).
- **No quiz-like features for non-quiz content.** `match_pairs`, `categorize`, `scratch_reveal`,
  `image_compare`, etc. are FORBIDDEN unless the source item is itself a knowledge check intended as that
  interaction. Informational content is never gamified.
- **Tables stay tables.** A real Markdown table (`| ... |` rows) → `table` block. Never gamify it. (Module 6
  has no `|` tables; a bold header like "The 6 Core Elements..." with no inline rows is NOT a table — keep it
  as a `rich_text` header and attach its nearby images; do not fabricate table rows.)
- **No image-only slides.** Every content slide has ≥1 text block. Merge image stacks into the nearest related
  content slide; intersperse images between text (text → image → text), not all dumped at the end. Skip an
  image already shown on an adjacent slide.
- **Captions** from the `![alt]` text (and nearby "Photo credit:" / "Click on the image to zoom in" lines)
  may be kept as the image caption.

## Component mapping
| Source | Block |
|---|---|
| Paragraph / bold header | `rich_text` (verbatim; allowed tags: h2,h3,p,strong,em,ul,ol,li,blockquote,a,br) |
| Bullet / numbered / objectives list | `content_list` |
| Single image | `image_gallery` `mode:"single"`, no `aspectRatio`, `objectFit:"contain"`, `displaySize:"lg"` |
| Multiple images | `image_gallery` `mode:"gallery"`, interspersed |
| Video (`🎬`) | `video` (`provider:"youtube"`) |
| Tip / note / community-resource aside | `callout` |
| Knowledge check / quiz | `quiz_inline` (one per question; consolidate grouped checks onto one slide) |

## Block data essentials
- **`content_list` data shape (use EXACT field names — wrong names render empty bullets):**
  `{ "heading": "optional", "bullet_style": "disc"|"circle"|"square"|"dash"|"decimal"|"none",
  "items": [ { "html": "<verbatim item text/inline-HTML>" } ] }`. Item content goes in `html` (NOT
  `text`). Bullet style is `bullet_style` (NOT `style`/`listStyle`); use `"decimal"` for numbered
  lists (e.g. References) and `"disc"` for bullets. (The loader also normalizes common aliases, but
  emit the correct names.)
- Images: absolute URLs ONLY, from the module image manifest, mapped by the exact MD `../images/...` path.
- Grid: default full-width `{gridX:0,gridY:0,gridW:12,gridH:3}`; stacked blocks increment `gridY`.
- Slide `settings`: `{ "background": "#FFFFFF", "block_style": "glass" }` unless a reason to differ.

## Plan JSON contract
See `scripts/import-gansid-modules/load-plan.ts` header (the SCAGO loader shares it). Emit:
`{ lessonId, lessonOrderIndex, lessonTitle, lessonDescription, slides:[{orderIndex, slideType, title,
settings, blocks:[{orderIndex, blockType, title, data}]}], candidates:[{slideOrderIndex, suggestion, reason}] }`.
Write to `scripts/import-scago-modules/plans/module-N/lesson-NN.json` (lessonNN = 0-based order_index).

## Self-check before writing
1. Every educational body section is represented (no omission); nothing reworded vs the MD.
2. All EdApp scaffolding (author/CoI/scales/surveys/nav fluff) dropped.
3. Every quiz has a single verbatim `feedback_correct`, NO `explanation`, `correct_answer` ∈ `options`.
4. Grouped knowledge checks consolidated; reveal/reflection prompts are rich_text, not quizzes.
5. No image-only slides; multi-image slides intersperse images with text; all image URLs come from the manifest (https://).
6. JSON parses; slide `orderIndex` values are unique and contiguous from 0.
