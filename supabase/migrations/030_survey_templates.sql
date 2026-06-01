-- Migration 030: Reusable survey templates (institution-scoped)

CREATE TABLE IF NOT EXISTS public.survey_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  data JSONB NOT NULL DEFAULT '{}',
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_survey_templates_institution_id ON public.survey_templates(institution_id);
CREATE INDEX IF NOT EXISTS idx_survey_templates_created_at ON public.survey_templates(created_at DESC);

ALTER TABLE public.survey_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage survey templates" ON public.survey_templates
  FOR ALL USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Authenticated users can read survey templates" ON public.survey_templates
  FOR SELECT USING (auth.uid() IS NOT NULL);
