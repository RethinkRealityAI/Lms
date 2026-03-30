-- Add module support and prerequisite logic to lessons
-- All columns nullable for backward compatibility
ALTER TABLE lessons
  ADD COLUMN IF NOT EXISTS module_id UUID REFERENCES modules(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS prerequisite_lesson_id UUID REFERENCES lessons(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_required BOOLEAN NOT NULL DEFAULT TRUE;

CREATE INDEX IF NOT EXISTS lessons_module_id_idx ON lessons(module_id);
