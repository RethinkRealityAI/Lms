-- Migration 020: Add canvas_data column for tldraw freeform canvas slides
ALTER TABLE slides ADD COLUMN IF NOT EXISTS canvas_data jsonb DEFAULT NULL;
COMMENT ON COLUMN slides.canvas_data IS 'tldraw document snapshot JSON. Only used when slide_type = canvas.';

-- Update CHECK constraint to allow 'canvas' slide type
ALTER TABLE slides DROP CONSTRAINT IF EXISTS slides_slide_type_check;
ALTER TABLE slides ADD CONSTRAINT slides_slide_type_check
  CHECK (slide_type = ANY (ARRAY['title', 'content', 'media', 'quiz', 'disclaimer', 'interactive', 'cta', 'canvas']));
