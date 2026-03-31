-- Migration 013: Migrate legacy lesson blocks to slide-based architecture
-- Part of the Visual Course Editor feature (Task 5.4)
--
-- Creates one default 'content' slide per lesson for all lesson_blocks
-- that have slide_id = NULL (i.e. SCORM-imported legacy content).
-- Safe to run multiple times (idempotent): lessons that already have slides
-- and blocks already assigned to a slide are skipped.

WITH lessons_needing_slides AS (
  SELECT DISTINCT lb.lesson_id
  FROM public.lesson_blocks lb
  WHERE lb.slide_id IS NULL
),
inserted_slides AS (
  INSERT INTO public.slides (lesson_id, slide_type, title, order_index, status, settings)
  SELECT
    lns.lesson_id,
    'content',
    COALESCE(l.title, 'Content'),
    0,
    'published',
    '{}'::jsonb
  FROM lessons_needing_slides lns
  JOIN public.lessons l ON l.id = lns.lesson_id
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.slides s
    WHERE s.lesson_id = lns.lesson_id
      AND s.deleted_at IS NULL
  )
  RETURNING id, lesson_id
)
UPDATE public.lesson_blocks lb
SET slide_id = inserted_slides.id
FROM inserted_slides
WHERE lb.lesson_id = inserted_slides.lesson_id
  AND lb.slide_id IS NULL;
