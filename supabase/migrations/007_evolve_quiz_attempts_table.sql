ALTER TABLE quiz_attempts
  ADD COLUMN IF NOT EXISTS attempt_number INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'submitted'
    CHECK (status IN ('in_progress', 'submitted', 'graded')),
  ADD COLUMN IF NOT EXISTS max_score NUMERIC(10,5),
  ADD COLUMN IF NOT EXISTS percentage NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS time_started TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS graded_by UUID REFERENCES users(id);
