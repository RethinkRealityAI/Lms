-- Widen question model to JSONB for extensibility
ALTER TABLE questions
  ADD COLUMN IF NOT EXISTS question_data JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS correct_answer_data JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS points NUMERIC(6,2) NOT NULL DEFAULT 1.0,
  ADD COLUMN IF NOT EXISTS explanation TEXT;

-- Migrate existing MCQ/fill_blank data to new JSONB columns
UPDATE questions
SET
  question_data = jsonb_build_object('options', COALESCE(options, '{}'::text[])),
  correct_answer_data = jsonb_build_object('correct_answer', COALESCE(correct_answer, ''))
WHERE question_data = '{}';

-- Remove the restrictive CHECK constraint to allow new question types
ALTER TABLE questions DROP CONSTRAINT IF EXISTS questions_question_type_check;
-- NOTE: options and correct_answer columns are kept for rollback safety
