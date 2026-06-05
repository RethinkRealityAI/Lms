-- Per-lesson title slide customization (size, color, footer, logo)
ALTER TABLE public.lessons
  ADD COLUMN IF NOT EXISTS title_slide_settings jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.lessons.title_slide_settings IS
  'Title slide overrides: title_size, title_color, footer_text, footer_logo_url';
