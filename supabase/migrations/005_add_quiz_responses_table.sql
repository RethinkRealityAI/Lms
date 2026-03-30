CREATE TABLE IF NOT EXISTS quiz_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id UUID NOT NULL REFERENCES quiz_attempts(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES questions(id),
  response_data JSONB NOT NULL DEFAULT '{}',
  is_correct BOOLEAN,
  points_awarded NUMERIC(6,2),
  answered_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(attempt_id, question_id)
);

ALTER TABLE quiz_responses ENABLE ROW LEVEL SECURITY;
