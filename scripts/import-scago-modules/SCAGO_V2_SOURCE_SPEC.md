# SCAGO v2 Source Spec — converting the updated slide-by-slide Markdown → plan JSON

This ADDENDUM sits on top of `SCAGO_PLANNER_SPEC.md` (read that first — all its **fidelity rules
still apply**: verbatim transfer, no paraphrase/summary/placeholder, quiz `**Explanation**` →
`feedback_correct` never `explanation`, Summary & References each their own `content_list` slide,
`correct_answer` is always a STRING, tables stay tables, no gamifying informational content).

The NEW source files live in `scripts/import-scago/scago-module-NN-*.md`. Unlike the old prose
sources, these are **explicit slide-by-slide specs**: each slide is a `### Slide N — …` (or `### SN — …`)
header followed by a `**Type:**` line, often a `**LMS block:**` line, and the slide's content.
**Honor the author's explicit per-slide block mapping.** Where a `**LMS block:**` line names the target,
use it. Use this addendum to resolve the exact data shape.

## What ONE planner produces
One plan JSON for ONE lesson (a `## Lesson N …` section), written to
`scripts/import-scago-modules/plans/module-N/lesson-MM.json` where MM is the 0-based lesson order.
Plan shape (same contract the loader expects):
```json
{
  "lessonId": "<uuid>", "lessonOrderIndex": 0, "lessonTitle": "…",
  "lessonDescription": null, "titleSlideSettings": null,
  "slides": [
    { "orderIndex": 0, "slideType": "content", "title": "Section Header",
      "blocks": [ { "orderIndex": 0, "blockType": "rich_text", "data": { … } } ] }
  ],
  "candidates": []
}
```
`lessonId` + `lessonOrderIndex` + `lessonTitle` are GIVEN to you in the dispatch — copy them exactly.
`lessonDescription` = null (auto title slide renders the lesson title alone).

## Slide-level rules (which `### Slide` become LMS slides)
- **DROP the lesson/module `title` slide** (Slide 1, type `title`, the big module title + authors +
  accreditation). The viewer auto-renders the lesson title slide. Do not build it.
- **DROP `exit` slides** ("You have now completed Lesson N!") — the viewer auto-renders completion.
- **DROP conflict-of-interest disclaimers** ("We have no conflicts of interest…") UNLESS the slide is a
  real **Disclosures** content slide listing author disclosures (e.g. M11 S5) — keep those verbatim as a
  `content_list`/`rich_text` titled "Disclosures".
- **Mid-lesson section-divider `title` slides** (a `title`/`text-sequence` slide that is only a section
  name + subtitle, e.g. M10 "What is Mental Health?"): do NOT emit a near-empty slide. **Merge** it into the
  FOLLOWING content slide by using the divider's title as that slide's `title`. If the divider carries real
  body prose, keep it as a normal content slide instead.
- Every other `### Slide` → exactly one LMS slide, `slideType` one of `content` | `quiz` | `media`.
- **No empty/image-only slides.** Every slide needs ≥1 text block. If a slide is image-only in the source,
  attach those images to the nearest related content slide (text → image → text order), not a bare gallery.

## Pre/Post self-assessment surveys — KEEP, but combine
The updated source intentionally includes the pre-survey and post-survey self-assessments (Knowledge /
Comfort / Confidence, "on a scale of 1 to 10"). Unlike the old spec (which dropped them), **keep them** —
but combine each consecutive trio into ONE `survey` block on ONE slide:
- Pre-survey slides → one slide titled "Before We Begin" with a single `survey` block.
- Post-survey slides → one slide titled "Check Your Growth" with a single `survey` block.
- The `survey` block `data` = `{ "title": "…", "submit_label": "Submit", "questions": [ {scale q}, … ] }`.
  Each scale question (EXACT field names from `survey/schema.ts`): `{ "id": "knowledge"|"comfort"|"confidence",
  "type": "scale", "question": "<verbatim question text>", "required": false, "min_value": 1, "max_value": 10,
  "increment": 1, "min_label": "<Min label>", "max_label": "<Max label>" }`. The question text field is
  `question` (NOT `prompt`); the bounds are `min_value`/`max_value` (NOT `min`/`max`). Never invent keys.
- **DROP** end-of-module satisfaction/recommendation/bias feedback items ("How satisfied were you…",
  "Did Module N meet your learning needs", "Would you recommend…") — those are the platform completion survey.
- A standalone `free-text-survey` that is a reflective prompt MAY be kept as a `survey` block with one
  `textarea` question if it carries real reflective content; if it's module-feedback, drop it.

## Component mapping (source `**Type:**` → LMS block + data)
| Source type | LMS block | Notes |
|---|---|---|
| `title` (lesson/module) | — | DROP (auto title slide) |
| `title` (mid-lesson section) | — | merge title into next slide |
| `exit` | — | DROP (auto completion) |
| `list`, `content_list`, `text-sequence` | `content_list` | bullets verbatim; `bullet_style:"disc"` (objectives) / `"decimal"` (references). Each list item `{ "html": "…" }`. |
| `rich_text`, `scrollable`, `scrolling-media` | `rich_text` (+ `image_gallery`/`video`) | prose verbatim; split inline ` • ` bullets into a `content_list`. Images/videos referenced inline become their own block on the same slide, interleaved text→media→text. |
| `speech-bubble` | `callout` (speech_bubble mode) | `data:{ "mode":"speech_bubble", "bubble_text":"<quote>", "author_name":"…", "author_title":"<profession>", "avatar_url":"<url or omit>", "bubble_style":"light" }` |
| `callout`, disclosure | `callout` (callout mode) | `data:{ "mode":"callout", "variant":"info", "html":"<p>…</p>", "title":"…?" }` |
| `slider-survey`, `slider` (survey) | `survey` (scale) | combine per the pre/post rule above |
| `image-gallery`, `image`, `image-collection` (photo grid) | `image_gallery` | `mode:"gallery"` for multi, `"single"` for one; captions verbatim. |
| `image-slider` | `image_gallery` | `mode:"slider"`; one entry per card, `caption` = the card's verbatim text. |
| `image-waypoints` / `image-map` (click-for-more) | `image_gallery` | `mode:"single"`, `clickForMore:true`, `enableLightbox:true`; caption(s) verbatim. |
| `image-collection` (icon + title + body tiles) | **`icon_list`** | see shape below |
| `comparison` (two IMAGE panels, draggable) | `image_compare` | `mode:"image"`, before/after `{url, alt}` |
| `comparison` (two TEXT panels, draggable) | **`image_compare` text mode** | see shape below |
| `expandable-list`, `reveal` | `content_list` (accordion) | `display_mode:"accordion"`; each item `{ "title":"<header>", "html":"<revealed body>" }`. |
| `table` | `table` | real `| … |` rows only; cells PLAIN TEXT; columns use `label`. |
| `youtube-video-embed`, `video` | `video` | `{ "url":"<youtube/mp4 url>", "provider":"youtube" }` (or omit provider for mp4). |
| audio clip (`…raw/upload/…mp3`, "Audio:") | **`audio`** | `{ "url":"<verbatim mp3 url>", "title?":"…", "caption?":"…", "credit?":"…" }` — never drop audio |
| `match_pairs`, `connect` | `match_pairs` | only if the source item is itself a matching activity |
| `scratch_reveal`, `scratch-to-reveal` | `scratch_reveal` | only if the source is a real scratch interaction |
| `quiz_inline`, `multiple-choice`, `matrix`, `categorise`, `game-*`, `tap-in-order` | `quiz_inline` | see quiz rules in base spec. `tap-in-order` has no LMS equivalent → render the ordered steps as a `content_list` (decimal), NOT a quiz. `matrix`→ one `quiz_inline` per row or a `select_all`. `categorise` T/F → `true_false`. |
| `free-text` / `free-text-survey` (reflective) | `survey` (textarea) or DROP | keep real reflection; drop module feedback |
| `ratio`, `dial` | `rich_text` | no interactive equivalent — render the stated value/figure + caption as text (+ image if any) |

## NEW component data shapes

### `icon_list` (for `image-collection` icon+title+body tiles)
```json
{ "blockType": "icon_list", "data": {
  "items": [ { "icon_url": "https://…svg", "title": "Notification", "html": "The parent's/baby's healthcare provider will be notified…" } ],
  "columns": "auto", "icon_size": 64, "layout": "stacked", "card": true } }
```
- One item per tile. `title` = the tile's bold heading (verbatim). `html` = the tile body (verbatim).
- `icon_url` MUST be absolute (https). If the source truncates/omits an icon URL, omit `icon_url` (the tile
  renders a generic glyph) — never invent a URL.

### `image_compare` text-panel mode (for `comparison` with two TEXT panels)
```json
{ "blockType": "image_compare", "data": {
  "mode": "text",
  "before": { "heading": "PRIVILEGE ≠ SPOILED", "text": "<verbatim left-panel body>", "bg_color": "#1A3C6E", "text_color": "#FFFFFF" },
  "after":  { "heading": "PRIVILEGE = SYSTEMIC ADVANTAGE", "text": "<verbatim right-panel body>", "bg_color": "#0F172A", "text_color": "#FFFFFF" },
  "before_label": "Myth", "after_label": "Reality", "aspect": "4/3", "prompt": "Drag to compare" } }
```
- Use `mode:"text"` ONLY when BOTH panels are text. If the source `comparison`/`image_compare` uses images
  (e.g. M7 Slide 11 with image URLs), use the normal `mode:"image"` with `before.url`/`after.url`.

## Slide titles
Set each content slide's `title` to its source section header (`### Slide N — <Header>` text after the dash,
or the slide's `**Title:**` line). Do NOT also emit that header as an inline `<h2>` in the first block (the
loader strips a duplicate, but emit it correctly: title on the slide, body prose in the block).

## URLs — use the SOURCE url VERBATIM. Do NOT remap.
The updated source files already contain ABSOLUTE urls (almost all `https://media.edapp.com/...`). **Copy each
url EXACTLY as written in the source.** Do NOT rewrite, reconstruct, or "remap" any url to the Supabase
`scago-assets` bucket (e.g. `https://ylmnbbrpaeiogdeqezlo.supabase.co/...`). Inventing a Supabase path from an
edapp filename produces a BROKEN (404) image — it is a fidelity violation. There is NO image manifest for these
v2 files; the edapp urls are the canonical, working urls. If the source gives no url for an item, omit the
media (do not fabricate one).

## Audio → `audio` block
A slide with an audio clip (`media.edapp.com/raw/upload/...mp3`, or labelled "Audio:"/"Audio clip") →
`{ "blockType": "audio", "data": { "url": "<verbatim mp3 url>", "title": "<optional>", "caption": "<optional>",
"credit": "<optional>" } }`. Keep the surrounding prose as its own `rich_text` block on the same slide. Never
drop audio content.

## Absolute, repeat: NO summaries, NO placeholders, NO invented content.
Transfer body text WORD-FOR-WORD. The only generated text allowed is a single `feedback_correct` sentence
when a real quiz lacks an `**Explanation:**`. All image/video/icon URLs must be absolute (https) and come
from the source file. Flag anything ambiguous in `candidates[]` rather than guessing.
