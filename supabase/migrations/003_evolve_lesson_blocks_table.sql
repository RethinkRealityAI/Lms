-- Add visibility, display settings, and schema versioning to lesson blocks
-- Only run if lesson_blocks table exists
ALTER TABLE lesson_blocks
  ADD COLUMN IF NOT EXISTS is_visible BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS settings JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;
