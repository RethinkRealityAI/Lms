-- Migration 012: Add slides table, theme columns, soft deletes, activity log
-- Part of the Visual Course Editor feature (Task 1.2)

-- 1. Add institution_id to users (for multi-tenant scoping)
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS institution_id uuid REFERENCES public.institutions(id);

-- 2. Add theme + settings to institutions
ALTER TABLE public.institutions
  ADD COLUMN IF NOT EXISTS theme jsonb DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS settings jsonb DEFAULT '{}';

-- 3. Add columns to courses
ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS theme_overrides jsonb DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'published' CHECK (status IN ('draft', 'published', 'archived')),
  ADD COLUMN IF NOT EXISTS published_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- 4. Add soft delete to modules
ALTER TABLE public.modules
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- 5. Add soft delete to lessons
ALTER TABLE public.lessons
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- 6. Create slides table
CREATE TABLE IF NOT EXISTS public.slides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id uuid NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  slide_type text NOT NULL DEFAULT 'content' CHECK (slide_type IN ('title', 'content', 'media', 'quiz', 'disclaimer', 'interactive', 'cta')),
  title text,
  order_index integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  settings jsonb DEFAULT '{}',
  deleted_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_slides_lesson_id ON public.slides(lesson_id);
CREATE INDEX IF NOT EXISTS idx_slides_order ON public.slides(lesson_id, order_index);

-- 7. Add slide_id and layout to lesson_blocks
ALTER TABLE public.lesson_blocks
  ADD COLUMN IF NOT EXISTS slide_id uuid REFERENCES public.slides(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS layout jsonb DEFAULT '{"width": "full", "align": "center"}';

CREATE INDEX IF NOT EXISTS idx_lesson_blocks_slide_id ON public.lesson_blocks(slide_id);

-- 8. Create slide_templates table
CREATE TABLE IF NOT EXISTS public.slide_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  default_blocks jsonb NOT NULL DEFAULT '[]',
  thumbnail_url text,
  institution_id uuid REFERENCES public.institutions(id),
  created_at timestamptz DEFAULT now()
);

-- 9. Create content_activity_log table
CREATE TABLE IF NOT EXISTS public.content_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid REFERENCES public.institutions(id),
  user_id uuid REFERENCES public.users(id),
  entity_type text NOT NULL CHECK (entity_type IN ('course', 'module', 'lesson', 'slide', 'block')),
  entity_id uuid NOT NULL,
  action text NOT NULL CHECK (action IN ('created', 'updated', 'deleted', 'published', 'reordered')),
  changes jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_activity_log_institution ON public.content_activity_log(institution_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_entity ON public.content_activity_log(entity_type, entity_id);

-- 10. Create current_institution_id() helper function
CREATE OR REPLACE FUNCTION public.current_institution_id()
RETURNS uuid LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT institution_id FROM public.users WHERE id = auth.uid();
$$;

-- 11. RLS on slides
ALTER TABLE public.slides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view published slides for enrolled courses"
  ON public.slides FOR SELECT
  USING (
    status = 'published'
    AND deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM public.lessons l
      JOIN public.courses c ON c.id = l.course_id
      JOIN public.course_enrollments e ON e.course_id = c.id
      WHERE l.id = slides.lesson_id
        AND e.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage slides for their institution"
  ON public.slides FOR ALL
  USING (
    public.is_admin()
    AND EXISTS (
      SELECT 1 FROM public.lessons l
      JOIN public.courses c ON c.id = l.course_id
      WHERE l.id = slides.lesson_id
        AND c.institution_id = public.current_institution_id()
    )
  );

-- 12. RLS on slide_templates
ALTER TABLE public.slide_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view global templates"
  ON public.slide_templates FOR SELECT
  USING (institution_id IS NULL);

CREATE POLICY "Users can view own institution templates"
  ON public.slide_templates FOR SELECT
  USING (institution_id = public.current_institution_id());

CREATE POLICY "Admins can manage own institution templates"
  ON public.slide_templates FOR ALL
  USING (
    public.is_admin()
    AND (institution_id IS NULL OR institution_id = public.current_institution_id())
  );

-- 13. RLS on content_activity_log
ALTER TABLE public.content_activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view own institution activity"
  ON public.content_activity_log FOR SELECT
  USING (
    public.is_admin()
    AND institution_id = public.current_institution_id()
  );

CREATE POLICY "Admins can insert activity for own institution"
  ON public.content_activity_log FOR INSERT
  WITH CHECK (
    public.is_admin()
    AND institution_id = public.current_institution_id()
  );

-- 14. Seed default slide templates
INSERT INTO public.slide_templates (name, description, default_blocks, institution_id) VALUES
  ('Title', 'Lesson introduction with heading and description', '[{"block_type": "rich_text", "data": {"html": "<h1>Lesson Title</h1><p>Description goes here</p>", "mode": "standard"}}]', NULL),
  ('Content', 'Text content with optional image', '[{"block_type": "rich_text", "data": {"html": "<h2>Title</h2><p>Your content here...</p>", "mode": "standard"}}, {"block_type": "image_gallery", "data": {"images": [], "mode": "single"}}]', NULL),
  ('Media', 'Full-width video or media embed', '[{"block_type": "video", "data": {"url": "", "title": ""}}]', NULL),
  ('Quiz', 'Multiple choice knowledge check', '[{"block_type": "quiz_inline", "data": {"question_type": "multiple_choice", "question": "Your question here?", "options": ["Option A", "Option B", "Option C", "Option D"], "correct_answer": "Option A", "show_feedback": true}}]', NULL),
  ('Disclaimer', 'Warning or legal notice', '[{"block_type": "callout", "data": {"variant": "warning", "title": "Disclaimer", "html": "<p>Important information here...</p>"}}]', NULL),
  ('Interactive', 'Embedded interactive content', '[{"block_type": "iframe", "data": {"url": "", "height": 600}}]', NULL),
  ('Call to Action', 'Navigation prompt with button', '[{"block_type": "rich_text", "data": {"html": "<h2>Ready to continue?</h2>", "mode": "standard"}}, {"block_type": "cta", "data": {"action": "next_lesson", "button_label": "Next Lesson", "text": ""}}]', NULL)
ON CONFLICT DO NOTHING;
