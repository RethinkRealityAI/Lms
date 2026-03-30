ALTER TABLE quizzes
  ADD COLUMN IF NOT EXISTS max_attempts INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS passing_score_percentage NUMERIC(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS scoring_mode TEXT NOT NULL DEFAULT 'best'
    CHECK (scoring_mode IN ('best', 'latest', 'average', 'first')),
  ADD COLUMN IF NOT EXISTS time_limit_minutes INTEGER,
  ADD COLUMN IF NOT EXISTS shuffle_questions BOOLEAN NOT NULL DEFAULT FALSE;
