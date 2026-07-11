# Future Features — Archive

Ideas parked for later, with enough context to pick up cold. Not scheduled.

---

## AI Course Copilot (grounded in the block system)

An AI assistant on both sides of the platform, grounded in the LMS's own
structured content (jsonb blocks + registry), so nothing it produces is
free-floating — it lands in the existing editor/viewer as normal blocks.

### Admin: source-material → draft module
Drop in raw source (PDF, Word doc, EdApp export) and generate a complete module
in the native format: slides, rich-text blocks, image galleries, quizzes with
per-answer feedback, learning objectives, references, completion survey — all
created as **draft** slides for human review (never auto-published), validated by
the existing content-health chip before publish.

Why the codebase is ready:
- Content is already structured jsonb blocks with a runtime registry
  (`register-all.ts`) — generation targets a known schema, not prose.
- Import pipelines already exist (`scripts/import-scorm`, `import-scago`, etc.).
- Quiz satisfiability validation (`quiz-inline/validation.ts`) + the
  content-health panel can gate generated content automatically.
- The qa-lms agent can smoke-test generated modules end-to-end.

Phase 1 (highest leverage, lowest risk): admin generation into DRAFT slides
only. Human reviews and publishes. Nothing reaches students without sign-off.

### Learner: in-course tutor grounded in the course
An in-course assistant that only knows the current course's content (slides +
quiz explanations as its grounding corpus). A learner stuck on a question can
ask "why is answer B wrong?" and get a Socratic explanation drawn from the
module itself, with one-tap escalation into the Support inbox
(`report-issue-dialog.tsx` / `/api/contact`) when it can't help.

### Analytics dividend
Every tutor question is a signal: a heatmap of which slides confuse learners,
feeding the next authoring cycle.

**Risks / notes:** grounding must be strict (course-scoped retrieval, no open
web) for a CME audience; generated content always enters as draft; cost scales
with generation volume so gate it behind an explicit admin action.
