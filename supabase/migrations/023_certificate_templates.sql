-- Certificate templates
CREATE TABLE IF NOT EXISTS certificate_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  canva_design_id TEXT,
  canva_design_url TEXT,
  layout_config JSONB NOT NULL DEFAULT '{
    "width": 1056,
    "height": 816,
    "orientation": "landscape",
    "fields": {
      "student_name": { "x": 528, "y": 320, "fontSize": 36, "fontWeight": "bold", "color": "#1E3A5F", "align": "center" },
      "course_title": { "x": 528, "y": 380, "fontSize": 24, "color": "#0F172A", "align": "center" },
      "completion_date": { "x": 528, "y": 440, "fontSize": 18, "color": "#64748B", "align": "center" },
      "certificate_number": { "x": 900, "y": 750, "fontSize": 12, "color": "#94A3B8", "align": "right" },
      "institution_name": { "x": 528, "y": 500, "fontSize": 14, "color": "#64748B", "align": "center" }
    }
  }'::jsonb,
  is_default BOOLEAN DEFAULT false,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Only one default per institution
CREATE UNIQUE INDEX IF NOT EXISTS idx_certificate_templates_default
  ON certificate_templates (institution_id) WHERE is_default = true;

-- RLS for certificate_templates
ALTER TABLE certificate_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage certificate templates"
  ON certificate_templates FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Authenticated users can read certificate templates"
  ON certificate_templates FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Course-to-template assignment
CREATE TABLE IF NOT EXISTS course_certificate_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL UNIQUE REFERENCES courses(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES certificate_templates(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES users(id),
  assigned_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE course_certificate_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage course certificate templates"
  ON course_certificate_templates FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Authenticated users can read course certificate templates"
  ON course_certificate_templates FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Enhance existing certificates table
ALTER TABLE certificates ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES certificate_templates(id);
ALTER TABLE certificates ADD COLUMN IF NOT EXISTS awarded_by UUID REFERENCES users(id);
ALTER TABLE certificates ADD COLUMN IF NOT EXISTS award_reason TEXT;
ALTER TABLE certificates ADD COLUMN IF NOT EXISTS certificate_number TEXT UNIQUE;
ALTER TABLE certificates ADD COLUMN IF NOT EXISTS pdf_url TEXT;

-- Certificate number sequence
CREATE SEQUENCE IF NOT EXISTS certificate_number_seq;

-- Auto-generate certificate numbers
CREATE OR REPLACE FUNCTION generate_certificate_number()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  inst_slug TEXT;
  seq_val BIGINT;
BEGIN
  SELECT slug INTO inst_slug FROM institutions WHERE id = NEW.institution_id;
  seq_val := nextval('certificate_number_seq');
  NEW.certificate_number := UPPER(COALESCE(inst_slug, 'CERT')) || '-' || EXTRACT(YEAR FROM NOW())::TEXT || '-' || LPAD(seq_val::TEXT, 5, '0');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_certificate_number ON certificates;
CREATE TRIGGER trg_certificate_number
  BEFORE INSERT ON certificates
  FOR EACH ROW
  WHEN (NEW.certificate_number IS NULL)
  EXECUTE FUNCTION generate_certificate_number();

-- Seed default GANSID certificate template
INSERT INTO certificate_templates (institution_id, name, description, is_default, layout_config)
VALUES (
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'GANSID Default Certificate',
  'Default certificate of completion with GANSID branding',
  true,
  '{
    "width": 1056,
    "height": 816,
    "orientation": "landscape",
    "fields": {
      "student_name": { "x": 528, "y": 340, "fontSize": 36, "fontWeight": "bold", "color": "#FFFFFF", "align": "center" },
      "course_title": { "x": 528, "y": 400, "fontSize": 22, "color": "#E2E8F0", "align": "center" },
      "completion_date": { "x": 528, "y": 460, "fontSize": 16, "color": "#94A3B8", "align": "center" },
      "certificate_number": { "x": 940, "y": 770, "fontSize": 11, "color": "#64748B", "align": "right" },
      "institution_name": { "x": 528, "y": 520, "fontSize": 13, "color": "#94A3B8", "align": "center" }
    }
  }'::jsonb
)
ON CONFLICT DO NOTHING;
