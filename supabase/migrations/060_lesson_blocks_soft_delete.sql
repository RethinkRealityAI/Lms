-- Migration 060: soft-delete support on lesson_blocks (Trash & Restore for slides).
--
-- Slides already soft-delete (deleted_at). Blocks did not — deleteSlide hard-deleted
-- them, which (a) made slide deletion irreversible and (b) was the source of the
-- "quizzes on deleted slides" orphan class when the two delete semantics drifted.
-- Giving lesson_blocks its own deleted_at lets deleteSlide soft-delete the slide AND
-- its blocks together (consistent, reversible), and restoreSlide clears both. All
-- block-read paths filter `deleted_at IS NULL`.
ALTER TABLE public.lesson_blocks ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- Partial index for the hot "live blocks for a slide" lookup.
CREATE INDEX IF NOT EXISTS idx_lesson_blocks_slide_live
  ON public.lesson_blocks (slide_id) WHERE deleted_at IS NULL;
