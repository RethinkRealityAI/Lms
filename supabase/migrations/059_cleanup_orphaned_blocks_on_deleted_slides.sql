-- Migration 059: one-time cleanup of lesson_blocks orphaned on soft-deleted slides.
--
-- `lesson_blocks` has no deleted_at (hard delete only), but deleteSlide historically
-- soft-deleted only the slide and left its blocks behind. Those orphans never render
-- and (post-058) never gate, but the editor content-health panel surfaces the quiz
-- ones as "quizzes on deleted slides". src/lib/db/slides.ts deleteSlide now cascades
-- block deletion, so no NEW orphans are created; this clears the pre-existing ones.
--
-- Safe: verified at authoring time that these blocks have ZERO quiz_block_responses
-- and ZERO survey_responses attached, so the ON DELETE CASCADE removes no student data.
-- (Idempotent — a rebuilt/fresh DB simply has nothing to delete.)
DELETE FROM public.lesson_blocks b
USING public.slides s
WHERE s.id = b.slide_id
  AND s.deleted_at IS NOT NULL;
