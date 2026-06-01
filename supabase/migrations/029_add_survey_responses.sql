-- Migration 029: Survey responses for multi-question survey blocks
-- Replaces legacy survey_responses (block_id, user_id, responses) with full schema.

-- Drop partial policies from any prior failed attempt
DROP POLICY IF EXISTS "Users can read own survey responses" ON public.survey_responses;
DROP POLICY IF EXISTS "Users can insert own survey responses" ON public.survey_responses;
DROP POLICY IF EXISTS "Users can update own survey responses" ON public.survey_responses;
DROP POLICY IF EXISTS "Admins can read all survey responses" ON public.survey_responses;

DROP TABLE IF EXISTS public.survey_responses;

CREATE TABLE public.survey_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  block_id UUID NOT NULL REFERENCES public.lesson_blocks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  answers JSONB NOT NULL DEFAULT '{}',
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (block_id, user_id)
);

CREATE INDEX idx_survey_responses_institution_id ON public.survey_responses(institution_id);
CREATE INDEX idx_survey_responses_course_id ON public.survey_responses(course_id);
CREATE INDEX idx_survey_responses_user_id ON public.survey_responses(user_id);
CREATE INDEX idx_survey_responses_block_id ON public.survey_responses(block_id);
CREATE INDEX idx_survey_responses_submitted_at ON public.survey_responses(submitted_at DESC);

ALTER TABLE public.survey_responses ENABLE ROW LEVEL SECURITY;

-- Students read/write their own responses
CREATE POLICY "Users can read own survey responses" ON public.survey_responses
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own survey responses" ON public.survey_responses
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own survey responses" ON public.survey_responses
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Admins read all responses (institution scoping enforced in app queries)
CREATE POLICY "Admins can read all survey responses" ON public.survey_responses
  FOR SELECT USING (public.is_admin());
