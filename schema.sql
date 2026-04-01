-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'student')),
  full_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create categories table
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create courses table
CREATE TABLE IF NOT EXISTS courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  thumbnail_url TEXT,
  created_by UUID REFERENCES users(id) ON DELETE CASCADE,
  is_published BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create lessons table
CREATE TABLE IF NOT EXISTS lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  content_type TEXT NOT NULL CHECK (content_type IN ('video', 'pdf', 'iframe', '3d')),
  content_url TEXT NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create quizzes table
CREATE TABLE IF NOT EXISTS quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create questions table
CREATE TABLE IF NOT EXISTS questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID REFERENCES quizzes(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL CHECK (question_type IN ('mcq', 'fill_blank')),
  options TEXT[], -- Array of options for MCQ
  correct_answer TEXT NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0
);

-- Create course_enrollments table
CREATE TABLE IF NOT EXISTS course_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, course_id)
);

-- Create progress table
CREATE TABLE IF NOT EXISTS progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(user_id, lesson_id)
);

-- Create quiz_attempts table
CREATE TABLE IF NOT EXISTS quiz_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  quiz_id UUID REFERENCES quizzes(id) ON DELETE CASCADE,
  score INTEGER NOT NULL,
  total_questions INTEGER NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create course_reviews table
CREATE TABLE IF NOT EXISTS course_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(course_id, user_id)
);

-- Create lesson_comments table
CREATE TABLE IF NOT EXISTS lesson_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  comment_text TEXT NOT NULL,
  parent_id UUID REFERENCES lesson_comments(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create certificates table
CREATE TABLE IF NOT EXISTS certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  issued_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  certificate_url TEXT,
  UNIQUE(user_id, course_id)
);

-- Create verification_codes table for admin signup
CREATE TABLE IF NOT EXISTS verification_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'student')) DEFAULT 'admin',
  description TEXT,
  max_uses INTEGER NOT NULL DEFAULT 1,
  current_uses INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE
);

-- Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_codes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
CREATE POLICY "Anyone can read user profiles" ON users FOR SELECT USING (true);
CREATE POLICY "Users can update their own data" ON users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Anyone can insert their own user record" ON users FOR INSERT WITH CHECK (auth.uid() = id);

-- RLS Policies for categories table
CREATE POLICY "Anyone can read categories" ON categories FOR SELECT USING (true);
CREATE POLICY "Admins can create categories" ON categories FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admins can update categories" ON categories FOR UPDATE USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admins can delete categories" ON categories FOR DELETE USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

-- RLS Policies for courses table
CREATE POLICY "Anyone can read courses" ON courses FOR SELECT USING (true);
CREATE POLICY "Admins can create courses" ON courses FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admins can update their courses" ON courses FOR UPDATE USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admins can delete their courses" ON courses FOR DELETE USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

-- RLS Policies for lessons table
CREATE POLICY "Anyone can read lessons" ON lessons FOR SELECT USING (true);
CREATE POLICY "Admins can create lessons" ON lessons FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admins can update lessons" ON lessons FOR UPDATE USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admins can delete lessons" ON lessons FOR DELETE USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

-- RLS Policies for quizzes table
CREATE POLICY "Anyone can read quizzes" ON quizzes FOR SELECT USING (true);
CREATE POLICY "Admins can create quizzes" ON quizzes FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admins can update quizzes" ON quizzes FOR UPDATE USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admins can delete quizzes" ON quizzes FOR DELETE USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

-- RLS Policies for questions table
CREATE POLICY "Anyone can read questions" ON questions FOR SELECT USING (true);
CREATE POLICY "Admins can create questions" ON questions FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admins can update questions" ON questions FOR UPDATE USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admins can delete questions" ON questions FOR DELETE USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

-- RLS Policies for course_enrollments table
CREATE POLICY "Users can read their enrollments" ON course_enrollments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can enroll themselves" ON course_enrollments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can read all enrollments" ON course_enrollments FOR SELECT USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

-- RLS Policies for progress table
CREATE POLICY "Users can read their progress" ON progress FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their progress" ON progress FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can upsert their progress" ON progress FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins can read all progress" ON progress FOR SELECT USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

-- RLS Policies for quiz_attempts table
CREATE POLICY "Users can read their quiz attempts" ON quiz_attempts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their quiz attempts" ON quiz_attempts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can read all quiz attempts" ON quiz_attempts FOR SELECT USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

-- RLS Policies for course_reviews table
CREATE POLICY "Anyone can read reviews" ON course_reviews FOR SELECT USING (true);
CREATE POLICY "Users can create their own reviews" ON course_reviews FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own reviews" ON course_reviews FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own reviews" ON course_reviews FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for lesson_comments table
CREATE POLICY "Anyone can read comments" ON lesson_comments FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create comments" ON lesson_comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own comments" ON lesson_comments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own comments" ON lesson_comments FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for certificates table
CREATE POLICY "Users can read their own certificates" ON certificates FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can read all certificates" ON certificates FOR SELECT USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admins can create certificates" ON certificates FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

-- RLS Policies for verification_codes table
CREATE POLICY "Anyone can read active verification codes for validation" ON verification_codes 
  FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can create verification codes" ON verification_codes FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admins can update verification codes" ON verification_codes FOR UPDATE USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admins can delete verification codes" ON verification_codes FOR DELETE USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

-- Create indexes for better performance
CREATE INDEX idx_courses_category_id ON courses(category_id);
CREATE INDEX idx_lessons_course_id ON lessons(course_id);
CREATE INDEX idx_questions_quiz_id ON questions(quiz_id);
CREATE INDEX idx_enrollments_user_id ON course_enrollments(user_id);
CREATE INDEX idx_enrollments_course_id ON course_enrollments(course_id);
CREATE INDEX idx_progress_user_id ON progress(user_id);
CREATE INDEX idx_progress_lesson_id ON progress(lesson_id);
CREATE INDEX idx_quiz_attempts_user_id ON quiz_attempts(user_id);
CREATE INDEX idx_quiz_attempts_quiz_id ON quiz_attempts(quiz_id);
CREATE INDEX idx_reviews_course_id ON course_reviews(course_id);
CREATE INDEX idx_reviews_user_id ON course_reviews(user_id);
CREATE INDEX idx_comments_lesson_id ON lesson_comments(lesson_id);
CREATE INDEX idx_comments_user_id ON lesson_comments(user_id);
CREATE INDEX idx_certificates_user_id ON certificates(user_id);
CREATE INDEX idx_certificates_course_id ON certificates(course_id);
CREATE INDEX idx_verification_codes_code ON verification_codes(code);

-- ============================================
-- Verification Code Usage Increment Function
-- ============================================
-- This function increments the usage count of a verification code
CREATE OR REPLACE FUNCTION public.increment_code_usage(p_code TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE public.verification_codes
  SET current_uses = current_uses + 1
  WHERE code = p_code AND is_active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.increment_code_usage(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_code_usage(TEXT) TO anon;

-- ============================================
-- Database Trigger for Automatic Profile Creation
-- ============================================
-- This trigger automatically creates a user profile in the users table
-- whenever a new user signs up through Supabase Auth

-- Create function to handle new user signups
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert a new row into the users table
  -- using the metadata from auth.users
  INSERT INTO public.users (id, email, role, full_name, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'student'),
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NOW(),
    NOW()
  );
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't prevent user creation
    RAISE WARNING 'Error creating user profile: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop the trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger on auth.users table
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;

-- ============================================
-- Multi-Tenant Extensions
-- ============================================

-- Core institution tables
CREATE TABLE IF NOT EXISTS institutions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS institution_branding (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE UNIQUE,
  logo_url TEXT,
  primary_color TEXT,
  secondary_color TEXT,
  accent_color TEXT,
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS institution_domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  domain TEXT NOT NULL UNIQUE,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS institution_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('institution_admin', 'instructor', 'student')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (institution_id, user_id)
);

-- Content and operations extensions
CREATE TABLE IF NOT EXISTS media_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS h5p_contents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content_key TEXT NOT NULL UNIQUE,
  content_type TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS lesson_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  block_type TEXT NOT NULL,
  title TEXT,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS certificate_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  template_url TEXT,
  template_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (institution_id, name)
);

CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add institution scoping to existing tenant-owned tables
ALTER TABLE categories ADD COLUMN IF NOT EXISTS institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE;
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE;
ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE;
ALTER TABLE course_enrollments ADD COLUMN IF NOT EXISTS institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE;
ALTER TABLE progress ADD COLUMN IF NOT EXISTS institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE;
ALTER TABLE quiz_attempts ADD COLUMN IF NOT EXISTS institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE;
ALTER TABLE course_reviews ADD COLUMN IF NOT EXISTS institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE;
ALTER TABLE lesson_comments ADD COLUMN IF NOT EXISTS institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE;
ALTER TABLE certificates ADD COLUMN IF NOT EXISTS institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE;
ALTER TABLE verification_codes ADD COLUMN IF NOT EXISTS institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE;

-- Expand supported role values
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users
ADD CONSTRAINT users_role_check
CHECK (role IN ('platform_admin', 'institution_admin', 'instructor', 'student'));

-- Enable RLS on new tables
ALTER TABLE institutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE institution_branding ENABLE ROW LEVEL SECURITY;
ALTER TABLE institution_domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE institution_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE h5p_contents ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE certificate_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

-- Tenant helper functions
CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM users
    WHERE id = auth.uid()
      AND role = 'platform_admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.is_institution_member(p_institution_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  IF p_institution_id IS NULL THEN
    RETURN FALSE;
  END IF;

  IF public.is_platform_admin() THEN
    RETURN TRUE;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM institution_memberships im
    WHERE im.user_id = auth.uid()
      AND im.institution_id = p_institution_id
      AND im.is_active = TRUE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.is_institution_admin_or_instructor(p_institution_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  IF p_institution_id IS NULL THEN
    RETURN FALSE;
  END IF;

  IF public.is_platform_admin() THEN
    RETURN TRUE;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM institution_memberships im
    WHERE im.user_id = auth.uid()
      AND im.institution_id = p_institution_id
      AND im.is_active = TRUE
      AND im.role IN ('institution_admin', 'instructor')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

GRANT EXECUTE ON FUNCTION public.is_platform_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_institution_member(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_institution_admin_or_instructor(UUID) TO authenticated;

-- Backfill or create default institutions
INSERT INTO institutions (name, slug, description)
VALUES
  ('GANSID', 'gansid', 'Default GANSID institution'),
  ('SCAGO', 'scago', 'SCAGO institution')
ON CONFLICT (slug) DO NOTHING;

-- Backfill institution_id for existing rows to GANSID
UPDATE categories
SET institution_id = i.id
FROM institutions i
WHERE categories.institution_id IS NULL
  AND i.slug = 'gansid';

UPDATE courses
SET institution_id = i.id
FROM institutions i
WHERE courses.institution_id IS NULL
  AND i.slug = 'gansid';

UPDATE lessons l
SET institution_id = c.institution_id
FROM courses c
WHERE l.course_id = c.id
  AND l.institution_id IS NULL;

UPDATE quizzes q
SET institution_id = l.institution_id
FROM lessons l
WHERE q.lesson_id = l.id
  AND q.institution_id IS NULL;

UPDATE questions qs
SET institution_id = q.institution_id
FROM quizzes q
WHERE qs.quiz_id = q.id
  AND qs.institution_id IS NULL;

UPDATE course_enrollments ce
SET institution_id = c.institution_id
FROM courses c
WHERE ce.course_id = c.id
  AND ce.institution_id IS NULL;

UPDATE progress p
SET institution_id = l.institution_id
FROM lessons l
WHERE p.lesson_id = l.id
  AND p.institution_id IS NULL;

UPDATE quiz_attempts qa
SET institution_id = q.institution_id
FROM quizzes q
WHERE qa.quiz_id = q.id
  AND qa.institution_id IS NULL;

UPDATE course_reviews cr
SET institution_id = c.institution_id
FROM courses c
WHERE cr.course_id = c.id
  AND cr.institution_id IS NULL;

UPDATE lesson_comments lc
SET institution_id = l.institution_id
FROM lessons l
WHERE lc.lesson_id = l.id
  AND lc.institution_id IS NULL;

UPDATE certificates cert
SET institution_id = c.institution_id
FROM courses c
WHERE cert.course_id = c.id
  AND cert.institution_id IS NULL;

UPDATE verification_codes vc
SET institution_id = i.id
FROM institutions i
WHERE vc.institution_id IS NULL
  AND i.slug = 'gansid';

-- Enforce not-null institution scope after backfill
ALTER TABLE categories ALTER COLUMN institution_id SET NOT NULL;
ALTER TABLE courses ALTER COLUMN institution_id SET NOT NULL;
ALTER TABLE lessons ALTER COLUMN institution_id SET NOT NULL;
ALTER TABLE quizzes ALTER COLUMN institution_id SET NOT NULL;
ALTER TABLE questions ALTER COLUMN institution_id SET NOT NULL;
ALTER TABLE course_enrollments ALTER COLUMN institution_id SET NOT NULL;
ALTER TABLE progress ALTER COLUMN institution_id SET NOT NULL;
ALTER TABLE quiz_attempts ALTER COLUMN institution_id SET NOT NULL;
ALTER TABLE course_reviews ALTER COLUMN institution_id SET NOT NULL;
ALTER TABLE lesson_comments ALTER COLUMN institution_id SET NOT NULL;
ALTER TABLE certificates ALTER COLUMN institution_id SET NOT NULL;
ALTER TABLE verification_codes ALTER COLUMN institution_id SET NOT NULL;

-- Tenant indexes
CREATE INDEX IF NOT EXISTS idx_categories_institution_id ON categories(institution_id);
CREATE INDEX IF NOT EXISTS idx_courses_institution_id ON courses(institution_id);
CREATE INDEX IF NOT EXISTS idx_lessons_institution_id ON lessons(institution_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_institution_id ON quizzes(institution_id);
CREATE INDEX IF NOT EXISTS idx_questions_institution_id ON questions(institution_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_institution_id ON course_enrollments(institution_id);
CREATE INDEX IF NOT EXISTS idx_progress_institution_id ON progress(institution_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_institution_id ON quiz_attempts(institution_id);
CREATE INDEX IF NOT EXISTS idx_reviews_institution_id ON course_reviews(institution_id);
CREATE INDEX IF NOT EXISTS idx_comments_institution_id ON lesson_comments(institution_id);
CREATE INDEX IF NOT EXISTS idx_certificates_institution_id ON certificates(institution_id);
CREATE INDEX IF NOT EXISTS idx_verification_codes_institution_id ON verification_codes(institution_id);
CREATE INDEX IF NOT EXISTS idx_memberships_user_institution ON institution_memberships(user_id, institution_id);
CREATE INDEX IF NOT EXISTS idx_lesson_blocks_lesson_order ON lesson_blocks(lesson_id, order_index);
CREATE INDEX IF NOT EXISTS idx_analytics_events_institution_created ON analytics_events(institution_id, created_at DESC);

-- Replace permissive policies with tenant-aware policies
DROP POLICY IF EXISTS "Anyone can read categories" ON categories;
DROP POLICY IF EXISTS "Admins can create categories" ON categories;
DROP POLICY IF EXISTS "Admins can update categories" ON categories;
DROP POLICY IF EXISTS "Admins can delete categories" ON categories;

DROP POLICY IF EXISTS "Anyone can read courses" ON courses;
DROP POLICY IF EXISTS "Admins can create courses" ON courses;
DROP POLICY IF EXISTS "Admins can update their courses" ON courses;
DROP POLICY IF EXISTS "Admins can delete their courses" ON courses;

DROP POLICY IF EXISTS "Anyone can read lessons" ON lessons;
DROP POLICY IF EXISTS "Admins can create lessons" ON lessons;
DROP POLICY IF EXISTS "Admins can update lessons" ON lessons;
DROP POLICY IF EXISTS "Admins can delete lessons" ON lessons;

DROP POLICY IF EXISTS "Anyone can read quizzes" ON quizzes;
DROP POLICY IF EXISTS "Admins can create quizzes" ON quizzes;
DROP POLICY IF EXISTS "Admins can update quizzes" ON quizzes;
DROP POLICY IF EXISTS "Admins can delete quizzes" ON quizzes;

DROP POLICY IF EXISTS "Anyone can read questions" ON questions;
DROP POLICY IF EXISTS "Admins can create questions" ON questions;
DROP POLICY IF EXISTS "Admins can update questions" ON questions;
DROP POLICY IF EXISTS "Admins can delete questions" ON questions;

DROP POLICY IF EXISTS "Users can read their enrollments" ON course_enrollments;
DROP POLICY IF EXISTS "Users can enroll themselves" ON course_enrollments;
DROP POLICY IF EXISTS "Admins can read all enrollments" ON course_enrollments;

DROP POLICY IF EXISTS "Users can read their progress" ON progress;
DROP POLICY IF EXISTS "Users can update their progress" ON progress;
DROP POLICY IF EXISTS "Users can upsert their progress" ON progress;
DROP POLICY IF EXISTS "Admins can read all progress" ON progress;

DROP POLICY IF EXISTS "Users can read their quiz attempts" ON quiz_attempts;
DROP POLICY IF EXISTS "Users can insert their quiz attempts" ON quiz_attempts;
DROP POLICY IF EXISTS "Admins can read all quiz attempts" ON quiz_attempts;

DROP POLICY IF EXISTS "Anyone can read reviews" ON course_reviews;
DROP POLICY IF EXISTS "Users can create their own reviews" ON course_reviews;
DROP POLICY IF EXISTS "Users can update their own reviews" ON course_reviews;
DROP POLICY IF EXISTS "Users can delete their own reviews" ON course_reviews;

DROP POLICY IF EXISTS "Anyone can read comments" ON lesson_comments;
DROP POLICY IF EXISTS "Authenticated users can create comments" ON lesson_comments;
DROP POLICY IF EXISTS "Users can update their own comments" ON lesson_comments;
DROP POLICY IF EXISTS "Users can delete their own comments" ON lesson_comments;

DROP POLICY IF EXISTS "Users can read their own certificates" ON certificates;
DROP POLICY IF EXISTS "Admins can read all certificates" ON certificates;
DROP POLICY IF EXISTS "Admins can create certificates" ON certificates;

DROP POLICY IF EXISTS "Anyone can read active verification codes for validation" ON verification_codes;
DROP POLICY IF EXISTS "Admins can create verification codes" ON verification_codes;
DROP POLICY IF EXISTS "Admins can update verification codes" ON verification_codes;
DROP POLICY IF EXISTS "Admins can delete verification codes" ON verification_codes;

-- Categories
CREATE POLICY "Institution members can read categories" ON categories
  FOR SELECT USING (public.is_institution_member(institution_id));
CREATE POLICY "Institution admins can write categories" ON categories
  FOR ALL USING (public.is_institution_admin_or_instructor(institution_id))
  WITH CHECK (public.is_institution_admin_or_instructor(institution_id));

-- Courses
CREATE POLICY "Institution members can read courses" ON courses
  FOR SELECT USING (public.is_institution_member(institution_id));
CREATE POLICY "Institution admins can write courses" ON courses
  FOR ALL USING (public.is_institution_admin_or_instructor(institution_id))
  WITH CHECK (public.is_institution_admin_or_instructor(institution_id));

-- Lessons
CREATE POLICY "Institution members can read lessons" ON lessons
  FOR SELECT USING (public.is_institution_member(institution_id));
CREATE POLICY "Institution admins can write lessons" ON lessons
  FOR ALL USING (public.is_institution_admin_or_instructor(institution_id))
  WITH CHECK (public.is_institution_admin_or_instructor(institution_id));

-- Quizzes and Questions
CREATE POLICY "Institution members can read quizzes" ON quizzes
  FOR SELECT USING (public.is_institution_member(institution_id));
CREATE POLICY "Institution admins can write quizzes" ON quizzes
  FOR ALL USING (public.is_institution_admin_or_instructor(institution_id))
  WITH CHECK (public.is_institution_admin_or_instructor(institution_id));

CREATE POLICY "Institution members can read questions" ON questions
  FOR SELECT USING (public.is_institution_member(institution_id));
CREATE POLICY "Institution admins can write questions" ON questions
  FOR ALL USING (public.is_institution_admin_or_instructor(institution_id))
  WITH CHECK (public.is_institution_admin_or_instructor(institution_id));

-- Enrollment and learning data
CREATE POLICY "Users and institution staff can read enrollments" ON course_enrollments
  FOR SELECT USING (
    auth.uid() = user_id
    OR public.is_institution_admin_or_instructor(institution_id)
  );
CREATE POLICY "Users and institution staff can write enrollments" ON course_enrollments
  FOR ALL USING (
    auth.uid() = user_id
    OR public.is_institution_admin_or_instructor(institution_id)
  )
  WITH CHECK (
    auth.uid() = user_id
    OR public.is_institution_admin_or_instructor(institution_id)
  );

CREATE POLICY "Users and institution staff can read progress" ON progress
  FOR SELECT USING (
    auth.uid() = user_id
    OR public.is_institution_admin_or_instructor(institution_id)
  );
CREATE POLICY "Users can write progress in institution" ON progress
  FOR ALL USING (
    auth.uid() = user_id
    AND public.is_institution_member(institution_id)
  )
  WITH CHECK (
    auth.uid() = user_id
    AND public.is_institution_member(institution_id)
  );

CREATE POLICY "Users and institution staff can read quiz attempts" ON quiz_attempts
  FOR SELECT USING (
    auth.uid() = user_id
    OR public.is_institution_admin_or_instructor(institution_id)
  );
CREATE POLICY "Users can write quiz attempts in institution" ON quiz_attempts
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND public.is_institution_member(institution_id)
  );

-- Reviews and comments
CREATE POLICY "Institution members can read reviews" ON course_reviews
  FOR SELECT USING (public.is_institution_member(institution_id));
CREATE POLICY "Users can write own reviews in institution" ON course_reviews
  FOR ALL USING (
    auth.uid() = user_id
    AND public.is_institution_member(institution_id)
  )
  WITH CHECK (
    auth.uid() = user_id
    AND public.is_institution_member(institution_id)
  );

CREATE POLICY "Institution members can read comments" ON lesson_comments
  FOR SELECT USING (public.is_institution_member(institution_id));
CREATE POLICY "Users can write own comments in institution" ON lesson_comments
  FOR ALL USING (
    auth.uid() = user_id
    AND public.is_institution_member(institution_id)
  )
  WITH CHECK (
    auth.uid() = user_id
    AND public.is_institution_member(institution_id)
  );

-- Certificates and verification codes
CREATE POLICY "Users and institution staff can read certificates" ON certificates
  FOR SELECT USING (
    auth.uid() = user_id
    OR public.is_institution_admin_or_instructor(institution_id)
  );
CREATE POLICY "Institution admins can write certificates" ON certificates
  FOR ALL USING (public.is_institution_admin_or_instructor(institution_id))
  WITH CHECK (public.is_institution_admin_or_instructor(institution_id));

CREATE POLICY "Institution members can read active verification codes" ON verification_codes
  FOR SELECT USING (
    is_active = TRUE
    AND public.is_institution_member(institution_id)
  );
CREATE POLICY "Institution admins can write verification codes" ON verification_codes
  FOR ALL USING (public.is_institution_admin_or_instructor(institution_id))
  WITH CHECK (public.is_institution_admin_or_instructor(institution_id));

-- Institution tables policies
CREATE POLICY "Platform admins can manage institutions" ON institutions
  FOR ALL USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());
CREATE POLICY "Institution members can read their institution" ON institutions
  FOR SELECT USING (public.is_institution_member(id));

CREATE POLICY "Institution members can read branding" ON institution_branding
  FOR SELECT USING (public.is_institution_member(institution_id));
CREATE POLICY "Institution admins can write branding" ON institution_branding
  FOR ALL USING (public.is_institution_admin_or_instructor(institution_id))
  WITH CHECK (public.is_institution_admin_or_instructor(institution_id));

CREATE POLICY "Institution members can read domains" ON institution_domains
  FOR SELECT USING (public.is_institution_member(institution_id));
CREATE POLICY "Platform admins can write domains" ON institution_domains
  FOR ALL USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

CREATE POLICY "Users can read own memberships" ON institution_memberships
  FOR SELECT USING (auth.uid() = user_id OR public.is_platform_admin());
CREATE POLICY "Institution admins and platform admins can manage memberships" ON institution_memberships
  FOR ALL USING (
    public.is_platform_admin()
    OR public.is_institution_admin_or_instructor(institution_id)
  )
  WITH CHECK (
    public.is_platform_admin()
    OR public.is_institution_admin_or_instructor(institution_id)
  );

CREATE POLICY "Institution members can read media assets" ON media_assets
  FOR SELECT USING (public.is_institution_member(institution_id));
CREATE POLICY "Institution admins can write media assets" ON media_assets
  FOR ALL USING (public.is_institution_admin_or_instructor(institution_id))
  WITH CHECK (public.is_institution_admin_or_instructor(institution_id));

CREATE POLICY "Institution members can read h5p contents" ON h5p_contents
  FOR SELECT USING (public.is_institution_member(institution_id));
CREATE POLICY "Institution admins can write h5p contents" ON h5p_contents
  FOR ALL USING (public.is_institution_admin_or_instructor(institution_id))
  WITH CHECK (public.is_institution_admin_or_instructor(institution_id));

CREATE POLICY "Institution members can read lesson blocks" ON lesson_blocks
  FOR SELECT USING (public.is_institution_member(institution_id));
CREATE POLICY "Institution admins can write lesson blocks" ON lesson_blocks
  FOR ALL USING (public.is_institution_admin_or_instructor(institution_id))
  WITH CHECK (public.is_institution_admin_or_instructor(institution_id));

CREATE POLICY "Institution members can read certificate templates" ON certificate_templates
  FOR SELECT USING (public.is_institution_member(institution_id));
CREATE POLICY "Institution admins can write certificate templates" ON certificate_templates
  FOR ALL USING (public.is_institution_admin_or_instructor(institution_id))
  WITH CHECK (public.is_institution_admin_or_instructor(institution_id));

CREATE POLICY "Institution staff can read analytics events" ON analytics_events
  FOR SELECT USING (public.is_institution_admin_or_instructor(institution_id));
CREATE POLICY "Institution members can create analytics events" ON analytics_events
  FOR INSERT WITH CHECK (public.is_institution_member(institution_id));
