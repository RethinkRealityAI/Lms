-- Add modules table between courses and lessons
CREATE TABLE IF NOT EXISTS modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  institution_id UUID REFERENCES institutions(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  is_published BOOLEAN NOT NULL DEFAULT TRUE,
  prerequisite_module_id UUID REFERENCES modules(id) ON DELETE SET NULL,
  unlock_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS modules_course_id_idx ON modules(course_id);
CREATE INDEX IF NOT EXISTS modules_institution_id_idx ON modules(institution_id);

ALTER TABLE modules ENABLE ROW LEVEL SECURITY;
