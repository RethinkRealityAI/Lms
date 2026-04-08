-- Migration 020: Add canvas_data column for tldraw freeform canvas slides
ALTER TABLE slides ADD COLUMN IF NOT EXISTS canvas_data jsonb DEFAULT NULL;
COMMENT ON COLUMN slides.canvas_data IS 'tldraw document snapshot JSON. Only used when slide_type = canvas.';
