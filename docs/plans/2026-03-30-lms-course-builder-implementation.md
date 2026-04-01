# LMS Course Builder Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Evolve the existing Next.js + Supabase LMS into a registry-driven, block-based course platform that imports GANSID EdApp SCORM content natively and supports extensible rich content types.

**Architecture:** Lesson content is modeled as ordered typed blocks (rich_text, image_gallery, quiz_inline, etc.) where each block type is a self-contained unit with a Zod schema, lazy-loaded viewer, and lazy-loaded editor. A Course > Module > Lesson > Blocks hierarchy replaces the flat Course > Lesson model. A Node.js CLI pipeline extracts EdApp SCORM `config.json` files into seed data ready for database insertion.

**Tech Stack:** Next.js 16, React 19, TypeScript 5, Supabase (Postgres + Auth + Storage), Tailwind CSS 4, shadcn/ui, Zod, Vitest, React Testing Library, Playwright, Node.js (pipeline scripts)

**Before starting:** Read `docs/plans/2026-03-29-scorm-first-lms-course-builder-design.md` for full context.

---

## Engineering Rules (Apply to Every Task)

1. **TDD:** Write the failing test first, then the implementation. Never write implementation without a test.
2. **File size:** No component > 200 lines, no function > 40 lines. Extract if exceeded.
3. **One export per file:** One exported React component per file.
4. **No Supabase outside `lib/db/`:** All database queries live in `src/lib/db/`. Pages and components call these functions.
5. **Guard functions:** All server actions and API routes call a guard from `src/lib/auth/guards.ts` at the top.
6. **No CHECK constraint on block/question types:** Validated by Zod at app layer.
7. **Error boundaries:** Every new block viewer is wrapped in a `BlockErrorBoundary`.
8. **Co-located tests:** Test file lives next to source file (`foo.ts` → `foo.test.ts`).

---

## Phase 0: Foundation

### Task 0.1: Install Test Infrastructure

**Files:**
- Create: `vitest.config.ts`
- Create: `src/test/setup.ts`
- Modify: `package.json`

**Step 1: Install dependencies**

```bash
cd "C:/Users/devel/OneDrive/Documents/RethinkReality/GANSID-LMS/Lms"
npm install --save-dev vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event playwright @playwright/test
```

**Step 2: Create vitest config**

Create `vitest.config.ts`:
```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

**Step 3: Create test setup file**

Create `src/test/setup.ts`:
```typescript
import '@testing-library/jest-dom';
```

**Step 4: Add test scripts to package.json**

In `package.json`, add to `"scripts"`:
```json
"test": "vitest run",
"test:watch": "vitest",
"test:e2e": "playwright test"
```

**Step 5: Create a smoke test to verify setup**

Create `src/test/smoke.test.ts`:
```typescript
describe('test setup', () => {
  it('runs', () => {
    expect(1 + 1).toBe(2);
  });
});
```

**Step 6: Run tests to verify setup works**

```bash
npm test
```

Expected: `1 passed`

**Step 7: Commit**

```bash
git add vitest.config.ts src/test/setup.ts src/test/smoke.test.ts package.json package-lock.json
git commit -m "chore: add Vitest + RTL + Playwright test infrastructure"
```

---

### Task 0.2: Create Database Query Layer (`lib/db/`)

This centralizes all Supabase access. No component or server action touches `supabase.from()` directly after this.

**Files:**
- Create: `src/lib/db/courses.ts`
- Create: `src/lib/db/lessons.ts`
- Create: `src/lib/db/modules.ts`
- Create: `src/lib/db/quizzes.ts`
- Create: `src/lib/db/progress.ts`
- Create: `src/lib/db/enrollments.ts`
- Create: `src/lib/db/index.ts`

**Step 1: Create courses query module**

Create `src/lib/db/courses.ts`:
```typescript
import { createClient } from '@/lib/supabase/server';
import type { Course } from '@/types';

export async function getCourseById(id: string): Promise<Course | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('courses')
    .select('*, category:categories(*)')
    .eq('id', id)
    .single();
  if (error) return null;
  return data as Course;
}

export async function getCoursesByInstitution(institutionId: string): Promise<Course[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('courses')
    .select('*, category:categories(*)')
    .eq('institution_id', institutionId)
    .order('created_at', { ascending: false });
  if (error) return [];
  return data as Course[];
}

export async function getPublishedCourses(): Promise<Course[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('courses')
    .select('*, category:categories(*)')
    .eq('is_published', true)
    .order('created_at', { ascending: false });
  if (error) return [];
  return data as Course[];
}
```

**Step 2: Create lessons query module**

Create `src/lib/db/lessons.ts`:
```typescript
import { createClient } from '@/lib/supabase/server';
import type { Lesson, LessonBlock } from '@/types';

export async function getLessonsByCourse(courseId: string): Promise<Lesson[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('lessons')
    .select('*')
    .eq('course_id', courseId)
    .order('order_index', { ascending: true });
  if (error) return [];
  return data as Lesson[];
}

export async function getLessonById(id: string): Promise<Lesson | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('lessons')
    .select('*')
    .eq('id', id)
    .single();
  if (error) return null;
  return data as Lesson;
}

export async function getBlocksByLesson(lessonId: string): Promise<LessonBlock[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('lesson_blocks')
    .select('*')
    .eq('lesson_id', lessonId)
    .order('order_index', { ascending: true });
  if (error) return [];
  return data as LessonBlock[];
}
```

**Step 3: Create progress query module**

Create `src/lib/db/progress.ts`:
```typescript
import { createClient } from '@/lib/supabase/server';
import type { Progress } from '@/types';

export async function getProgressByUserAndCourse(
  userId: string,
  lessonIds: string[]
): Promise<Progress[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('progress')
    .select('*')
    .eq('user_id', userId)
    .in('lesson_id', lessonIds);
  if (error) return [];
  return data as Progress[];
}

export async function markLessonComplete(
  userId: string,
  lessonId: string
): Promise<void> {
  const supabase = await createClient();
  await supabase
    .from('progress')
    .upsert(
      { user_id: userId, lesson_id: lessonId, completed: true, completed_at: new Date().toISOString() },
      { onConflict: 'user_id,lesson_id' }
    );
}
```

**Step 4: Create enrollments query module**

Create `src/lib/db/enrollments.ts`:
```typescript
import { createClient } from '@/lib/supabase/server';
import type { CourseEnrollment } from '@/types';

export async function getEnrollment(
  userId: string,
  courseId: string
): Promise<CourseEnrollment | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('course_enrollments')
    .select('*')
    .eq('user_id', userId)
    .eq('course_id', courseId)
    .single();
  if (error) return null;
  return data as CourseEnrollment;
}

export async function getEnrolledCourseIds(userId: string): Promise<string[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('course_enrollments')
    .select('course_id')
    .eq('user_id', userId);
  if (error) return [];
  return (data ?? []).map((e) => e.course_id);
}
```

**Step 5: Create empty modules and quizzes stubs (filled in later phases)**

Create `src/lib/db/modules.ts`:
```typescript
// Module queries — implemented in Phase 0.5 after schema migration
export {};
```

Create `src/lib/db/quizzes.ts`:
```typescript
// Quiz queries — implemented in Phase 4 after schema migration
export {};
```

**Step 6: Create barrel export**

Create `src/lib/db/index.ts`:
```typescript
export * from './courses';
export * from './lessons';
export * from './progress';
export * from './enrollments';
```

**Step 7: Commit**

```bash
git add src/lib/db/
git commit -m "feat: add lib/db query layer to centralize all Supabase access"
```

---

### Task 0.3: Auth Guard Utilities

**Files:**
- Create: `src/lib/auth/guards.ts`
- Create: `src/lib/auth/guards.test.ts`

**Step 1: Write failing tests first**

Create `src/lib/auth/guards.test.ts`:
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

// We test the pure logic helpers — the Supabase-dependent guards
// are tested via integration tests in e2e/

describe('isAdminRole', () => {
  it('returns true for platform_admin', async () => {
    const { isAdminRole } = await import('./guards');
    expect(isAdminRole('platform_admin')).toBe(true);
  });

  it('returns true for institution_admin', async () => {
    const { isAdminRole } = await import('./guards');
    expect(isAdminRole('institution_admin')).toBe(true);
  });

  it('returns true for legacy admin', async () => {
    const { isAdminRole } = await import('./guards');
    expect(isAdminRole('admin')).toBe(true);
  });

  it('returns false for student', async () => {
    const { isAdminRole } = await import('./guards');
    expect(isAdminRole('student')).toBe(false);
  });

  it('returns false for unknown role', async () => {
    const { isAdminRole } = await import('./guards');
    expect(isAdminRole('unknown')).toBe(false);
  });
});
```

**Step 2: Run to confirm failure**

```bash
npm test -- guards.test
```

Expected: FAIL — `isAdminRole` not exported from guards

**Step 3: Implement guards**

Check if `src/lib/auth/guards.ts` exists already. If it does, add exports to it. If not, create it:

```typescript
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import type { User } from '@/types';

const ADMIN_ROLES = new Set(['platform_admin', 'institution_admin', 'instructor', 'admin']);

export function isAdminRole(role: string): boolean {
  return ADMIN_ROLES.has(role);
}

export async function requireAuth(): Promise<User> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single();
  if (!profile) redirect('/login');
  return profile as User;
}

export async function requireAdminAuth(): Promise<User> {
  const user = await requireAuth();
  if (!isAdminRole(user.role)) redirect('/login');
  return user;
}

export async function requireEnrollment(
  userId: string,
  courseId: string
): Promise<void> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('course_enrollments')
    .select('id')
    .eq('user_id', userId)
    .eq('course_id', courseId)
    .single();
  if (!data) redirect('/student');
}
```

**Step 4: Run tests to confirm pass**

```bash
npm test -- guards.test
```

Expected: 5 passed

**Step 5: Commit**

```bash
git add src/lib/auth/guards.ts src/lib/auth/guards.test.ts
git commit -m "feat: add centralized auth guard utilities with tests"
```

---

### Task 0.4: Completion Utility Functions

**Files:**
- Create: `src/lib/utils/completion.ts`
- Create: `src/lib/utils/completion.test.ts`

**Step 1: Write failing tests**

Create `src/lib/utils/completion.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import {
  calculateCompletionPercentage,
  calculateLessonProgress,
  calculateCourseProgress,
} from './completion';

describe('calculateCompletionPercentage', () => {
  it('returns 0 when none completed', () => {
    expect(calculateCompletionPercentage(0, 10)).toBe(0);
  });

  it('returns 100 when all completed', () => {
    expect(calculateCompletionPercentage(10, 10)).toBe(100);
  });

  it('returns 50 for half completed', () => {
    expect(calculateCompletionPercentage(5, 10)).toBe(50);
  });

  it('returns 0 when total is 0', () => {
    expect(calculateCompletionPercentage(0, 0)).toBe(0);
  });

  it('rounds to nearest integer', () => {
    expect(calculateCompletionPercentage(1, 3)).toBe(33);
  });
});

describe('calculateLessonProgress', () => {
  it('returns completed true when all required lessons done', () => {
    const lessons = [
      { id: 'a', completed: true, is_required: true },
      { id: 'b', completed: true, is_required: true },
    ];
    const result = calculateLessonProgress(lessons);
    expect(result.completed).toBe(true);
    expect(result.percentage).toBe(100);
  });

  it('ignores optional lessons in completion calculation', () => {
    const lessons = [
      { id: 'a', completed: true, is_required: true },
      { id: 'b', completed: false, is_required: false },
    ];
    const result = calculateLessonProgress(lessons);
    expect(result.completed).toBe(true);
  });

  it('returns completed false when required lesson not done', () => {
    const lessons = [
      { id: 'a', completed: true, is_required: true },
      { id: 'b', completed: false, is_required: true },
    ];
    const result = calculateLessonProgress(lessons);
    expect(result.completed).toBe(false);
    expect(result.percentage).toBe(50);
  });
});

describe('calculateCourseProgress', () => {
  it('sums lesson completion across modules', () => {
    const modules = [
      { id: 'm1', completedLessons: 2, totalLessons: 4 },
      { id: 'm2', completedLessons: 4, totalLessons: 4 },
    ];
    const result = calculateCourseProgress(modules);
    expect(result.percentage).toBe(75);
    expect(result.completed).toBe(false);
  });

  it('returns completed true when all modules done', () => {
    const modules = [
      { id: 'm1', completedLessons: 4, totalLessons: 4 },
    ];
    const result = calculateCourseProgress(modules);
    expect(result.completed).toBe(true);
    expect(result.percentage).toBe(100);
  });
});
```

**Step 2: Run to confirm failure**

```bash
npm test -- completion.test
```

Expected: FAIL

**Step 3: Implement**

Create `src/lib/utils/completion.ts`:
```typescript
export function calculateCompletionPercentage(completed: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((completed / total) * 100);
}

interface LessonProgressInput {
  id: string;
  completed: boolean;
  is_required?: boolean;
}

export function calculateLessonProgress(lessons: LessonProgressInput[]) {
  const required = lessons.filter((l) => l.is_required !== false);
  const completedRequired = required.filter((l) => l.completed);
  const percentage = calculateCompletionPercentage(completedRequired.length, required.length);
  return {
    completed: completedRequired.length === required.length && required.length > 0,
    percentage,
    completedCount: completedRequired.length,
    totalCount: required.length,
  };
}

interface ModuleProgressInput {
  id: string;
  completedLessons: number;
  totalLessons: number;
}

export function calculateCourseProgress(modules: ModuleProgressInput[]) {
  const total = modules.reduce((sum, m) => sum + m.totalLessons, 0);
  const completed = modules.reduce((sum, m) => sum + m.completedLessons, 0);
  const percentage = calculateCompletionPercentage(completed, total);
  return {
    completed: percentage === 100 && total > 0,
    percentage,
    completedLessons: completed,
    totalLessons: total,
  };
}
```

**Step 4: Run to confirm pass**

```bash
npm test -- completion.test
```

Expected: 9 passed

**Step 5: Commit**

```bash
git add src/lib/utils/completion.ts src/lib/utils/completion.test.ts
git commit -m "feat: add completion calculation utilities with tests"
```

---

### Task 0.5: Schema Migrations

**Files:**
- Create: `supabase/migrations/001_add_modules_table.sql`
- Create: `supabase/migrations/002_evolve_lessons_table.sql`
- Create: `supabase/migrations/003_evolve_lesson_blocks_table.sql`
- Create: `supabase/migrations/004_evolve_questions_table.sql`
- Create: `supabase/migrations/005_add_quiz_responses_table.sql`
- Create: `supabase/migrations/006_evolve_quizzes_table.sql`
- Create: `supabase/migrations/007_evolve_quiz_attempts_table.sql`

**Step 1: Create migrations directory**

```bash
mkdir -p supabase/migrations
```

**Step 2: Migration 001 — modules table**

Create `supabase/migrations/001_add_modules_table.sql`:
```sql
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
```

**Step 3: Migration 002 — evolve lessons**

Create `supabase/migrations/002_evolve_lessons_table.sql`:
```sql
-- Add module support and prerequisite logic to lessons
-- All columns nullable for backward compatibility
ALTER TABLE lessons
  ADD COLUMN IF NOT EXISTS module_id UUID REFERENCES modules(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS prerequisite_lesson_id UUID REFERENCES lessons(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_required BOOLEAN NOT NULL DEFAULT TRUE;

CREATE INDEX IF NOT EXISTS lessons_module_id_idx ON lessons(module_id);
```

**Step 4: Migration 003 — evolve lesson_blocks**

Create `supabase/migrations/003_evolve_lesson_blocks_table.sql`:
```sql
-- Add visibility, display settings, and schema versioning to lesson blocks
ALTER TABLE lesson_blocks
  ADD COLUMN IF NOT EXISTS is_visible BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS settings JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;
```

**Step 5: Migration 004 — evolve questions**

Create `supabase/migrations/004_evolve_questions_table.sql`:
```sql
-- Widen question model to JSONB for extensibility
ALTER TABLE questions
  ADD COLUMN IF NOT EXISTS question_data JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS correct_answer_data JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS points NUMERIC(6,2) NOT NULL DEFAULT 1.0,
  ADD COLUMN IF NOT EXISTS explanation TEXT;

-- Migrate existing MCQ data to new JSONB columns
UPDATE questions
SET
  question_data = jsonb_build_object('options', COALESCE(options, '{}'::text[])),
  correct_answer_data = jsonb_build_object('correct_answer', COALESCE(correct_answer, ''))
WHERE question_data = '{}';

-- Remove the CHECK constraint that limits question types
ALTER TABLE questions DROP CONSTRAINT IF EXISTS questions_question_type_check;
-- NOTE: We do NOT drop options/correct_answer columns yet — kept for rollback safety
```

**Step 6: Migration 005 — quiz_responses table**

Create `supabase/migrations/005_add_quiz_responses_table.sql`:
```sql
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
```

**Step 7: Migration 006 — evolve quizzes**

Create `supabase/migrations/006_evolve_quizzes_table.sql`:
```sql
ALTER TABLE quizzes
  ADD COLUMN IF NOT EXISTS max_attempts INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS passing_score_percentage NUMERIC(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS scoring_mode TEXT NOT NULL DEFAULT 'best'
    CHECK (scoring_mode IN ('best', 'latest', 'average', 'first')),
  ADD COLUMN IF NOT EXISTS time_limit_minutes INTEGER,
  ADD COLUMN IF NOT EXISTS shuffle_questions BOOLEAN NOT NULL DEFAULT FALSE;
```

**Step 8: Migration 007 — evolve quiz_attempts**

Create `supabase/migrations/007_evolve_quiz_attempts_table.sql`:
```sql
ALTER TABLE quiz_attempts
  ADD COLUMN IF NOT EXISTS attempt_number INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'submitted'
    CHECK (status IN ('in_progress', 'submitted', 'graded')),
  ADD COLUMN IF NOT EXISTS max_score NUMERIC(10,5),
  ADD COLUMN IF NOT EXISTS percentage NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS time_started TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS graded_by UUID REFERENCES users(id);
```

**Step 9: Apply migrations to Supabase**

Run each migration in the Supabase SQL editor (or use the CLI if configured):
```bash
# If using Supabase CLI:
supabase db push
# Or apply manually in Supabase Dashboard > SQL Editor
```

**Step 10: Update TypeScript types to match new schema**

In `src/types/index.ts`, add the new `Module` type and update existing types:

```typescript
// Add after Course interface:
export interface Module {
  id: string;
  course_id: string;
  institution_id?: string;
  title: string;
  description?: string;
  order_index: number;
  is_published: boolean;
  prerequisite_module_id?: string;
  unlock_date?: string;
  created_at: string;
  updated_at: string;
  lessons?: Lesson[];
}

// Update Lesson interface — add new fields:
export interface Lesson {
  id: string;
  institution_id?: string;
  course_id: string;
  module_id?: string;              // NEW
  title: string;
  description: string;
  content_type: 'video' | 'pdf' | 'iframe' | '3d';
  content_url: string;
  order_index: number;
  is_required: boolean;            // NEW
  prerequisite_lesson_id?: string; // NEW
  created_at: string;
}

// Update LessonBlock interface:
export interface LessonBlock {
  id: string;
  institution_id: string;
  lesson_id: string;
  block_type: string;              // Widened from LessonBlockType union
  title?: string;
  data: Record<string, unknown>;
  is_visible: boolean;             // NEW
  settings: Record<string, unknown>; // NEW
  version: number;                 // NEW
  order_index: number;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

// Update LessonBlockType to add new types:
export type LessonBlockType =
  | 'rich_text'
  | 'video'
  | 'image'
  | 'image_gallery'  // NEW
  | 'audio'          // NEW
  | 'pdf'
  | 'iframe'
  | 'model3d'
  | 'h5p'
  | 'canvas'
  | 'hotspot'        // NEW
  | 'quiz_inline'    // NEW
  | 'quiz_summary'
  | 'callout'        // NEW
  | 'download'
  | 'cta';

// Update Question interface:
export interface Question {
  id: string;
  quiz_id: string;
  question_type: string;                    // Widened
  question_text: string;
  question_data: Record<string, unknown>;   // NEW
  correct_answer_data: Record<string, unknown>; // NEW
  points: number;                           // NEW
  explanation?: string;                     // NEW
  options?: string[];                       // Kept for backward compat
  correct_answer?: string;                  // Kept for backward compat
  order_index: number;
}

// Add QuizResponse type:
export interface QuizResponse {
  id: string;
  attempt_id: string;
  question_id: string;
  response_data: Record<string, unknown>;
  is_correct?: boolean;
  points_awarded?: number;
  answered_at: string;
}

// Add to Quiz interface:
export interface Quiz {
  id: string;
  lesson_id: string;
  title: string;
  max_attempts: number;            // NEW
  passing_score_percentage: number; // NEW
  scoring_mode: 'best' | 'latest' | 'average' | 'first'; // NEW
  time_limit_minutes?: number;     // NEW
  shuffle_questions: boolean;      // NEW
  created_at: string;
}
```

**Step 11: Commit**

```bash
git add supabase/migrations/ src/types/index.ts
git commit -m "feat: add schema migrations for modules, block versioning, JSONB questions, quiz responses"
```

---

## Phase 0.6: SCORM Extraction Pipeline

### Task 0.6.1: Pipeline Infrastructure

**Files:**
- Create: `scripts/import-scorm/types.ts`
- Create: `scripts/import-scorm/extract.ts`
- Create: `scripts/import-scorm/extract.test.ts`

**Step 1: Define EdApp types**

Create `scripts/import-scorm/types.ts`:
```typescript
export interface EdAppContentItem {
  content: string;
  contentType: 'text' | 'image' | 'video';
  caption?: string;
}

export interface EdAppSlideData {
  title?: string;
  titleType?: string;
  content?: EdAppContentItem[];
  items?: EdAppSlideItem[];
  pins?: EdAppPin[];
  categories?: EdAppCategory[];
  buttonText?: string;
  doneText?: string;
  prompt?: string;
}

export interface EdAppSlideItem {
  content: string;
  contentType: 'text' | 'image';
  caption?: string;
  position?: string;
  imagePosition?: string;
}

export interface EdAppPin {
  x: number;
  y: number;
  title?: string;
  description?: string;
}

export interface EdAppCategory {
  name: string;
  items: string[];
}

export interface EdAppSlide {
  id: string;
  type: 'scrolling-media' | 'image-slider' | 'image-gallery' | 'text-sequence' | 'image-map' | 'categorise' | 'exit';
  subtype?: string;
  name: number;
  displayIndex: number;
  data: EdAppSlideData;
}

export interface EdAppConfig {
  id: string;
  title: string;
  index: number;
  slides: EdAppSlide[];
  config: {
    language: string;
    minimumScore?: number;
  };
}

export interface ExtractedLesson {
  edappId: string;
  title: string;
  orderIndex: number;
  slides: EdAppSlide[];
  mediaFiles: string[];
}
```

**Step 2: Write failing extract test**

Create `scripts/import-scorm/extract.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { parseEdAppConfig, extractMediaPaths } from './extract';

const mockConfig = {
  id: 'abc123',
  title: 'Test Lesson',
  index: 0,
  slides: [
    {
      id: 'slide-1',
      type: 'scrolling-media',
      name: 0,
      displayIndex: 1,
      data: {
        content: [
          { content: '<p>Hello world</p>', contentType: 'text' },
          { content: 'fit_content_assets/image.png', contentType: 'image' },
        ],
        title: '<p>Title</p>',
      },
    },
  ],
  config: { language: 'en' },
};

describe('parseEdAppConfig', () => {
  it('returns the lesson title', () => {
    const result = parseEdAppConfig(mockConfig);
    expect(result.title).toBe('Test Lesson');
  });

  it('returns the edapp id', () => {
    const result = parseEdAppConfig(mockConfig);
    expect(result.edappId).toBe('abc123');
  });

  it('returns slides', () => {
    const result = parseEdAppConfig(mockConfig);
    expect(result.slides).toHaveLength(1);
  });
});

describe('extractMediaPaths', () => {
  it('extracts image paths from scrolling-media content', () => {
    const paths = extractMediaPaths(mockConfig.slides);
    expect(paths).toContain('fit_content_assets/image.png');
  });

  it('returns unique paths only', () => {
    const slidesWithDupe = [
      ...mockConfig.slides,
      { ...mockConfig.slides[0], id: 'slide-2' },
    ];
    const paths = extractMediaPaths(slidesWithDupe);
    const unique = [...new Set(paths)];
    expect(paths.length).toBe(unique.length);
  });
});
```

**Step 3: Run to confirm failure**

```bash
npm test -- extract.test
```

Expected: FAIL

**Step 4: Implement extract.ts**

Create `scripts/import-scorm/extract.ts`:
```typescript
import AdmZip from 'adm-zip';
import path from 'path';
import type { EdAppConfig, EdAppSlide, ExtractedLesson } from './types';

export function parseEdAppConfig(config: EdAppConfig): ExtractedLesson {
  const mediaFiles = extractMediaPaths(config.slides);
  return {
    edappId: config.id,
    title: config.title,
    orderIndex: config.index,
    slides: config.slides,
    mediaFiles,
  };
}

export function extractMediaPaths(slides: EdAppSlide[]): string[] {
  const paths = new Set<string>();

  for (const slide of slides) {
    const data = slide.data;

    // scrolling-media content array
    if (data.content) {
      for (const item of data.content) {
        if (item.contentType === 'image' || item.contentType === 'video') {
          paths.add(item.content);
        }
      }
    }

    // image-slider / image-gallery items
    if (data.items) {
      for (const item of data.items) {
        if (item.contentType === 'image') {
          paths.add(item.content);
        }
      }
    }
  }

  return [...paths];
}

export function readScormConfig(zipPath: string): EdAppConfig {
  const zip = new AdmZip(zipPath);
  const configEntry = zip.getEntry('config.json');
  if (!configEntry) {
    throw new Error(`No config.json found in ${zipPath}`);
  }
  const content = configEntry.getData().toString('utf8');
  return JSON.parse(content) as EdAppConfig;
}
```

**Step 5: Install adm-zip dependency**

```bash
npm install adm-zip
npm install --save-dev @types/adm-zip
```

**Step 6: Run tests to confirm pass**

```bash
npm test -- extract.test
```

Expected: PASS

**Step 7: Commit**

```bash
git add scripts/import-scorm/ package.json package-lock.json
git commit -m "feat: add SCORM pipeline extract module with types and tests"
```

---

### Task 0.6.2: Slide Mapper

**Files:**
- Create: `scripts/import-scorm/map-slides.ts`
- Create: `scripts/import-scorm/map-slides.test.ts`

**Step 1: Write failing tests**

Create `scripts/import-scorm/map-slides.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { mapSlideToBlock } from './map-slides';

describe('mapSlideToBlock', () => {
  it('maps scrolling-media to rich_text', () => {
    const slide = {
      id: 'abc',
      type: 'scrolling-media' as const,
      name: 0,
      displayIndex: 1,
      data: {
        title: '<p>Title</p>',
        content: [
          { content: '<p>Hello</p>', contentType: 'text' as const },
        ],
      },
    };
    const block = mapSlideToBlock(slide, 0);
    expect(block.block_type).toBe('rich_text');
    expect(block.data.mode).toBe('scrolling');
  });

  it('maps image-slider to image_gallery with slider mode', () => {
    const slide = {
      id: 'abc',
      type: 'image-slider' as const,
      name: 1,
      displayIndex: 2,
      data: {
        items: [
          { content: 'fit_content_assets/img.png', contentType: 'image' as const, caption: 'Cap' },
        ],
      },
    };
    const block = mapSlideToBlock(slide, 1);
    expect(block.block_type).toBe('image_gallery');
    expect(block.data.mode).toBe('slider');
  });

  it('maps categorise to quiz_inline', () => {
    const slide = {
      id: 'abc',
      type: 'categorise' as const,
      name: 2,
      displayIndex: 3,
      data: {
        categories: [{ name: 'Cat A', items: ['item1', 'item2'] }],
      },
    };
    const block = mapSlideToBlock(slide, 2);
    expect(block.block_type).toBe('quiz_inline');
    expect(block.data.question_type).toBe('categorize');
  });

  it('maps exit to cta', () => {
    const slide = {
      id: 'abc',
      type: 'exit' as const,
      name: 3,
      displayIndex: 4,
      data: {
        content: 'Well done!',
        buttonText: 'Finish',
      },
    };
    const block = mapSlideToBlock(slide, 3);
    expect(block.block_type).toBe('cta');
    expect(block.data.action).toBe('complete_lesson');
  });

  it('returns fallback for unknown slide type', () => {
    const slide = {
      id: 'abc',
      type: 'unknown-type' as any,
      name: 0,
      displayIndex: 1,
      data: {},
    };
    const block = mapSlideToBlock(slide, 0);
    expect(block.block_type).toBe('rich_text');
    expect(block.data.mode).toBe('fallback');
  });
});
```

**Step 2: Run to confirm failure**

```bash
npm test -- map-slides.test
```

Expected: FAIL

**Step 3: Implement**

Create `scripts/import-scorm/map-slides.ts`:
```typescript
import type { EdAppSlide } from './types';

interface MappedBlock {
  edapp_slide_id: string;
  block_type: string;
  order_index: number;
  title?: string;
  data: Record<string, unknown>;
}

export function mapSlideToBlock(slide: EdAppSlide, orderIndex: number): MappedBlock {
  const mapper = SLIDE_MAPPERS[slide.type];
  if (!mapper) {
    return {
      edapp_slide_id: slide.id,
      block_type: 'rich_text',
      order_index: orderIndex,
      data: { html: '', mode: 'fallback', original_type: slide.type },
    };
  }
  return mapper(slide, orderIndex);
}

export function mapSlidesToBlocks(slides: EdAppSlide[]): MappedBlock[] {
  return slides
    .filter((s) => s.type !== 'exit' || slides.indexOf(s) === slides.length - 1)
    .map((slide, i) => mapSlideToBlock(slide, i));
}

// --- Individual mappers ---

function mapScrollingMedia(slide: EdAppSlide, orderIndex: number): MappedBlock {
  const content = slide.data.content ?? [];
  const htmlParts: string[] = [];
  const media: Array<{ type: string; url: string; caption?: string }> = [];

  for (const item of content) {
    if (item.contentType === 'text') {
      htmlParts.push(item.content);
    } else if (item.contentType === 'image') {
      media.push({ type: 'image', url: item.content });
      htmlParts.push(`<img src="${item.content}" alt="" />`);
    }
  }

  return {
    edapp_slide_id: slide.id,
    block_type: 'rich_text',
    order_index: orderIndex,
    title: slide.data.title?.replace(/<[^>]+>/g, '') ?? undefined,
    data: { html: htmlParts.join('\n'), media, mode: 'scrolling' },
  };
}

function mapImageSlider(slide: EdAppSlide, orderIndex: number): MappedBlock {
  const images = (slide.data.items ?? [])
    .filter((item) => item.contentType === 'image')
    .map((item) => ({ url: item.content, caption: item.caption ?? null }));

  return {
    edapp_slide_id: slide.id,
    block_type: 'image_gallery',
    order_index: orderIndex,
    data: { images, mode: 'slider' },
  };
}

function mapImageGallery(slide: EdAppSlide, orderIndex: number): MappedBlock {
  const images = (slide.data.items ?? [])
    .filter((item) => item.contentType === 'image')
    .map((item) => ({ url: item.content, caption: item.caption ?? null }));

  return {
    edapp_slide_id: slide.id,
    block_type: 'image_gallery',
    order_index: orderIndex,
    data: { images, mode: 'gallery' },
  };
}

function mapTextSequence(slide: EdAppSlide, orderIndex: number): MappedBlock {
  const segments = (slide.data.items ?? []).map((item, i) => ({
    text: item.content,
    reveal_order: i,
  }));
  return {
    edapp_slide_id: slide.id,
    block_type: 'rich_text',
    order_index: orderIndex,
    data: { segments, mode: 'sequence' },
  };
}

function mapImageMap(slide: EdAppSlide, orderIndex: number): MappedBlock {
  return {
    edapp_slide_id: slide.id,
    block_type: 'hotspot',
    order_index: orderIndex,
    data: { image_url: '', regions: slide.data.pins ?? [] },
  };
}

function mapCategorise(slide: EdAppSlide, orderIndex: number): MappedBlock {
  return {
    edapp_slide_id: slide.id,
    block_type: 'quiz_inline',
    order_index: orderIndex,
    data: {
      question_type: 'categorize',
      categories: slide.data.categories ?? [],
      instructions: slide.data.prompt ?? 'Sort the items into the correct categories.',
    },
  };
}

function mapExit(slide: EdAppSlide, orderIndex: number): MappedBlock {
  return {
    edapp_slide_id: slide.id,
    block_type: 'cta',
    order_index: orderIndex,
    data: {
      action: 'complete_lesson',
      text: typeof slide.data.content === 'string' ? slide.data.content : 'You have completed this lesson.',
      button_label: slide.data.buttonText ?? 'Continue',
    },
  };
}

const SLIDE_MAPPERS: Partial<Record<EdAppSlide['type'], (s: EdAppSlide, i: number) => MappedBlock>> = {
  'scrolling-media': mapScrollingMedia,
  'image-slider': mapImageSlider,
  'image-gallery': mapImageGallery,
  'text-sequence': mapTextSequence,
  'image-map': mapImageMap,
  'categorise': mapCategorise,
  'exit': mapExit,
};
```

**Step 4: Run tests to confirm pass**

```bash
npm test -- map-slides.test
```

Expected: PASS

**Step 5: Commit**

```bash
git add scripts/import-scorm/map-slides.ts scripts/import-scorm/map-slides.test.ts
git commit -m "feat: add SCORM slide-to-block mapper with full EdApp type coverage and tests"
```

---

### Task 0.6.3: Quiz Data Mapper

**Files:**
- Create: `scripts/import-scorm/map-quizzes.ts`
- Create: `scripts/import-scorm/map-quizzes.test.ts`

**Step 1: Write failing tests**

Create `scripts/import-scorm/map-quizzes.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { mapGansidQuestion } from './map-quizzes';

describe('mapGansidQuestion', () => {
  it('maps multiple_choice question', () => {
    const q = {
      slide: 1,
      question: 'Which skill is essential?',
      question_type: 'multiple_choice',
      options: ['A', 'B', 'C', 'D'],
    };
    const result = mapGansidQuestion(q, 0);
    expect(result.question_type).toBe('multiple_choice');
    expect(result.question_data).toEqual({ options: ['A', 'B', 'C', 'D'] });
    expect(result.order_index).toBe(0);
  });

  it('maps true_false question', () => {
    const q = {
      slide: 2,
      question: 'Is this true or false?',
      statement: 'The sky is blue.',
      question_type: 'true_false',
      options: ['True', 'False'],
    };
    const result = mapGansidQuestion(q, 1);
    expect(result.question_type).toBe('true_false');
    expect(result.question_data).toMatchObject({ statement: 'The sky is blue.' });
  });

  it('maps likert_scale question', () => {
    const q = {
      slide: 3,
      question: 'How likely?',
      question_type: 'likert_scale',
      options: ['Very Likely', 'Likely', 'Neutral', 'Unlikely', 'Very Unlikely'],
    };
    const result = mapGansidQuestion(q, 2);
    expect(result.question_type).toBe('likert_scale');
    expect(result.question_data).toMatchObject({ scale_labels: q.options });
  });

  it('maps open_text question', () => {
    const q = {
      slide: 4,
      question: 'Any comments?',
      question_type: 'open_text',
      options: [],
    };
    const result = mapGansidQuestion(q, 3);
    expect(result.question_type).toBe('open_text');
    expect(result.correct_answer_data).toEqual({});
  });
});
```

**Step 2: Run to confirm failure**

```bash
npm test -- map-quizzes.test
```

Expected: FAIL

**Step 3: Implement**

Create `scripts/import-scorm/map-quizzes.ts`:
```typescript
interface GansidQuestion {
  slide: number;
  question: string;
  statement?: string;
  question_type: string;
  options: string[];
}

interface MappedQuestion {
  question_type: string;
  question_text: string;
  question_data: Record<string, unknown>;
  correct_answer_data: Record<string, unknown>;
  points: number;
  order_index: number;
}

export function mapGansidQuestion(q: GansidQuestion, orderIndex: number): MappedQuestion {
  const base = {
    question_type: q.question_type,
    question_text: q.statement ? `${q.question} — ${q.statement}` : q.question,
    order_index: orderIndex,
    points: 1.0,
    correct_answer_data: {} as Record<string, unknown>,
  };

  switch (q.question_type) {
    case 'multiple_choice':
      return {
        ...base,
        question_data: { options: q.options },
        correct_answer_data: {},  // Answer key not available in source data — to be set by admin
      };

    case 'true_false':
      return {
        ...base,
        question_data: { options: ['True', 'False'], statement: q.statement ?? '' },
        correct_answer_data: {},  // To be set by admin
      };

    case 'likert_scale':
      return {
        ...base,
        question_data: { scale_labels: q.options, scale_size: q.options.length },
        correct_answer_data: {},  // Not graded
        points: 0,
      };

    case 'open_text':
      return {
        ...base,
        question_data: { max_words: 500 },
        correct_answer_data: {},
        points: 0,
      };

    default:
      return {
        ...base,
        question_data: { options: q.options },
        correct_answer_data: {},
      };
  }
}

export function mapGansidLesson(lessonData: {
  lesson_number: number;
  title: string;
  questions: GansidQuestion[];
}): MappedQuestion[] {
  return lessonData.questions.map((q, i) => mapGansidQuestion(q, i));
}
```

**Step 4: Run tests to confirm pass**

```bash
npm test -- map-quizzes.test
```

Expected: PASS

**Step 5: Commit**

```bash
git add scripts/import-scorm/map-quizzes.ts scripts/import-scorm/map-quizzes.test.ts
git commit -m "feat: add GANSID quiz data mapper with question type normalization and tests"
```

---

### Task 0.6.4: Pipeline CLI Entry Point

**Files:**
- Create: `scripts/import-scorm/index.ts`
- Create: `scripts/import-scorm/generate-seed.ts`

**Step 1: Create seed generator**

Create `scripts/import-scorm/generate-seed.ts`:
```typescript
import fs from 'fs';
import path from 'path';
import type { MappedBlock } from './map-slides'; // Add export to map-slides.ts

interface SeedLesson {
  edappId: string;
  title: string;
  orderIndex: number;
  blocks: ReturnType<typeof import('./map-slides').mapSlideToBlock>[];
}

export function writeSeedFile(
  outputDir: string,
  moduleTitle: string,
  lessons: SeedLesson[]
): string {
  fs.mkdirSync(outputDir, { recursive: true });
  const slug = moduleTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const outputPath = path.join(outputDir, `${slug}.seed.json`);
  const seed = {
    module: { title: moduleTitle, slug },
    lessons: lessons.map((l) => ({
      edappId: l.edappId,
      title: l.title,
      order_index: l.orderIndex,
      blocks: l.blocks,
    })),
    generatedAt: new Date().toISOString(),
  };
  fs.writeFileSync(outputPath, JSON.stringify(seed, null, 2));
  return outputPath;
}
```

**Step 2: Create CLI entry point**

Create `scripts/import-scorm/index.ts`:
```typescript
import path from 'path';
import fs from 'fs';
import { readScormConfig, parseEdAppConfig } from './extract';
import { mapSlidesToBlocks } from './map-slides';
import { writeSeedFile } from './generate-seed';

const [,, scormDir, outputDir = 'scripts/import-scorm/output'] = process.argv;

if (!scormDir) {
  console.error('Usage: npx tsx scripts/import-scorm/index.ts <path-to-scorm-dir> [output-dir]');
  process.exit(1);
}

const zipFiles = fs.readdirSync(scormDir).filter((f) => f.endsWith('.zip'));
if (zipFiles.length === 0) {
  console.error(`No .zip files found in ${scormDir}`);
  process.exit(1);
}

const lessons = zipFiles.map((zipFile) => {
  const zipPath = path.join(scormDir, zipFile);
  console.log(`Processing: ${zipFile}`);
  const config = readScormConfig(zipPath);
  const extracted = parseEdAppConfig(config);
  const blocks = mapSlidesToBlocks(extracted.slides);
  return { ...extracted, blocks };
});

const moduleTitle = path.basename(scormDir);
const outputPath = writeSeedFile(outputDir, moduleTitle, lessons);
console.log(`\nSeed file written to: ${outputPath}`);
console.log(`Lessons extracted: ${lessons.length}`);
console.log(`Total blocks: ${lessons.reduce((sum, l) => sum + l.blocks.length, 0)}`);
```

**Step 3: Add pipeline script to package.json**

In `package.json` scripts:
```json
"import-scorm": "npx tsx scripts/import-scorm/index.ts"
```

Install tsx:
```bash
npm install --save-dev tsx
```

**Step 4: Run the pipeline on Module 2**

```bash
npm run import-scorm "C:/Users/devel/OneDrive/Documents/RethinkReality/GANSID-LMS/Course SCORM packages/Module 2" scripts/import-scorm/output
```

Expected: `scripts/import-scorm/output/module-2.seed.json` created with 5 lessons

**Step 5: Inspect output and verify it looks correct**

```bash
node -e "const d=require('./scripts/import-scorm/output/module-2.seed.json'); console.log('Lessons:', d.lessons.length); d.lessons.forEach(l => console.log(' -', l.title, '| blocks:', l.blocks.length))"
```

**Step 6: Commit**

```bash
git add scripts/import-scorm/ package.json package-lock.json
git commit -m "feat: add SCORM pipeline CLI — extracts EdApp config.json to structured seed JSON"
```

---

## Phase 1: Block Registry Evolution

### Task 1.1: Evolve Block Registry to Full Definition Pattern

**Files:**
- Modify: `src/lib/content/block-registry.ts`
- Create: `src/lib/content/block-registry.test.ts`

**Step 1: Write failing tests**

Create `src/lib/content/block-registry.test.ts`:
```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { z } from 'zod';

describe('block registry', () => {
  beforeEach(async () => {
    // Fresh registry for each test
    const mod = await import('./block-registry');
    // If registry has a reset function, call it. Otherwise re-import.
  });

  it('registerBlockType adds a type to the registry', async () => {
    const { registerBlockType, getBlockType } = await import('./block-registry');
    registerBlockType({
      type: 'test_block',
      label: 'Test',
      description: 'A test block',
      icon: 'box',
      category: 'content',
      dataSchema: z.object({ text: z.string() }),
      defaultData: { text: '' },
      EditorComponent: null as any,
      ViewerComponent: null as any,
      version: 1,
    });
    const def = getBlockType('test_block');
    expect(def).toBeDefined();
    expect(def?.label).toBe('Test');
  });

  it('getBlockType returns undefined for unregistered type', async () => {
    const { getBlockType } = await import('./block-registry');
    expect(getBlockType('nonexistent')).toBeUndefined();
  });

  it('getAllBlockTypes returns all registered types', async () => {
    const { registerBlockType, getAllBlockTypes } = await import('./block-registry');
    const before = getAllBlockTypes().length;
    registerBlockType({
      type: 'another_test',
      label: 'Another',
      description: '',
      icon: 'box',
      category: 'media',
      dataSchema: z.object({}),
      defaultData: {},
      EditorComponent: null as any,
      ViewerComponent: null as any,
      version: 1,
    });
    expect(getAllBlockTypes().length).toBe(before + 1);
  });

  it('getBlockTypesByCategory filters correctly', async () => {
    const { getBlockTypesByCategory } = await import('./block-registry');
    const contentBlocks = getBlockTypesByCategory('content');
    expect(contentBlocks.every((b) => b.category === 'content')).toBe(true);
  });
});
```

**Step 2: Run to confirm failure**

```bash
npm test -- block-registry.test
```

Expected: FAIL

**Step 3: Rewrite block-registry.ts**

Replace the entire content of `src/lib/content/block-registry.ts`:
```typescript
import type { ZodSchema } from 'zod';
import React from 'react';

export type BlockCategory = 'content' | 'media' | 'interactive' | 'assessment' | 'navigation';

export interface BlockEditorProps<TData = Record<string, unknown>> {
  data: TData;
  block: { id: string; title?: string };
  onChange: (data: TData) => void;
}

export interface BlockViewerProps<TData = Record<string, unknown>> {
  data: TData;
  block: { id: string; title?: string; is_visible: boolean };
}

export interface BlockTypeDefinition<TData = Record<string, unknown>> {
  type: string;
  label: string;
  description: string;
  icon: string;
  category: BlockCategory;
  dataSchema: ZodSchema<TData>;
  defaultData: TData;
  EditorComponent: React.LazyExoticComponent<React.ComponentType<BlockEditorProps<TData>>> | null;
  ViewerComponent: React.LazyExoticComponent<React.ComponentType<BlockViewerProps<TData>>> | null;
  completionCriteria?: (data: TData) => boolean;
  singleton?: boolean;
  version: number;
  migrate?: (oldData: unknown, fromVersion: number) => TData;
}

const registry = new Map<string, BlockTypeDefinition>();

export function registerBlockType<T>(definition: BlockTypeDefinition<T>): void {
  registry.set(definition.type, definition as unknown as BlockTypeDefinition);
}

export function getBlockType(type: string): BlockTypeDefinition | undefined {
  return registry.get(type);
}

export function getAllBlockTypes(): BlockTypeDefinition[] {
  return Array.from(registry.values());
}

export function getBlockTypesByCategory(category: BlockCategory): BlockTypeDefinition[] {
  return getAllBlockTypes().filter((b) => b.category === category);
}

// Legacy export for backward compat with any code that used LESSON_BLOCK_REGISTRY
export const LESSON_BLOCK_REGISTRY = {
  getAll: getAllBlockTypes,
  get: getBlockType,
};
```

**Step 4: Run tests to confirm pass**

```bash
npm test -- block-registry.test
```

Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/content/block-registry.ts src/lib/content/block-registry.test.ts
git commit -m "feat: evolve block registry to full definition pattern with schema and component slots"
```

---

### Task 1.2: Core Block Schemas

**Files:**
- Create: `src/lib/content/blocks/rich-text/schema.ts`
- Create: `src/lib/content/blocks/rich-text/schema.test.ts`
- Create: `src/lib/content/blocks/image-gallery/schema.ts`
- Create: `src/lib/content/blocks/cta/schema.ts`
- Create: `src/lib/content/blocks/quiz-inline/schema.ts`
- Create: `src/lib/content/blocks/callout/schema.ts`
- Create: `src/lib/content/blocks/video/schema.ts`

**Step 1: Create rich-text schema**

Create `src/lib/content/blocks/rich-text/schema.ts`:
```typescript
import { z } from 'zod';

export const richTextDataSchema = z.object({
  html: z.string().default(''),
  mode: z.enum(['scrolling', 'sequence', 'standard', 'fallback']).default('standard'),
  media: z.array(z.object({
    type: z.enum(['image', 'video']),
    url: z.string(),
    caption: z.string().optional(),
  })).optional(),
  segments: z.array(z.object({
    text: z.string(),
    reveal_order: z.number(),
  })).optional(),
});

export type RichTextData = z.infer<typeof richTextDataSchema>;
```

Create `src/lib/content/blocks/rich-text/schema.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { richTextDataSchema } from './schema';

describe('richTextDataSchema', () => {
  it('accepts valid rich text data', () => {
    const result = richTextDataSchema.safeParse({ html: '<p>Hello</p>', mode: 'standard' });
    expect(result.success).toBe(true);
  });

  it('defaults html to empty string', () => {
    const result = richTextDataSchema.safeParse({});
    expect(result.success).toBe(true);
    expect(result.data?.html).toBe('');
  });

  it('rejects invalid mode', () => {
    const result = richTextDataSchema.safeParse({ html: '', mode: 'invalid' });
    expect(result.success).toBe(false);
  });
});
```

**Step 2: Create image-gallery schema**

Create `src/lib/content/blocks/image-gallery/schema.ts`:
```typescript
import { z } from 'zod';

export const imageGalleryDataSchema = z.object({
  images: z.array(z.object({
    url: z.string(),
    caption: z.string().nullable().optional(),
    alt: z.string().optional(),
  })).default([]),
  mode: z.enum(['slider', 'gallery', 'carousel']).default('gallery'),
});

export type ImageGalleryData = z.infer<typeof imageGalleryDataSchema>;
```

**Step 3: Create CTA schema**

Create `src/lib/content/blocks/cta/schema.ts`:
```typescript
import { z } from 'zod';

export const ctaDataSchema = z.object({
  text: z.string().default(''),
  action: z.enum(['complete_lesson', 'next_lesson', 'external_url']).default('complete_lesson'),
  button_label: z.string().default('Continue'),
  url: z.string().url().optional(),
});

export type CtaData = z.infer<typeof ctaDataSchema>;
```

**Step 4: Create quiz-inline schema**

Create `src/lib/content/blocks/quiz-inline/schema.ts`:
```typescript
import { z } from 'zod';

export const quizInlineDataSchema = z.object({
  question_type: z.enum(['categorize', 'multiple_choice', 'true_false']),
  instructions: z.string().optional(),
  categories: z.array(z.object({
    name: z.string(),
    items: z.array(z.string()),
  })).optional(),
  options: z.array(z.string()).optional(),
  correct_answer: z.string().optional(),
  show_feedback: z.boolean().default(true),
});

export type QuizInlineData = z.infer<typeof quizInlineDataSchema>;
```

**Step 5: Create callout schema**

Create `src/lib/content/blocks/callout/schema.ts`:
```typescript
import { z } from 'zod';

export const calloutDataSchema = z.object({
  variant: z.enum(['info', 'warning', 'tip', 'success']).default('info'),
  html: z.string().default(''),
  title: z.string().optional(),
});

export type CalloutData = z.infer<typeof calloutDataSchema>;
```

**Step 6: Create video schema**

Create `src/lib/content/blocks/video/schema.ts`:
```typescript
import { z } from 'zod';

export const videoDataSchema = z.object({
  url: z.string().url(),
  poster: z.string().url().optional(),
  autoplay: z.boolean().default(false),
  caption: z.string().optional(),
});

export type VideoData = z.infer<typeof videoDataSchema>;
```

**Step 7: Run all schema tests**

```bash
npm test -- schema.test
```

Expected: All schema tests pass

**Step 8: Commit**

```bash
git add src/lib/content/blocks/
git commit -m "feat: add Zod schemas for all core block types (rich-text, image-gallery, cta, quiz-inline, callout, video)"
```

---

### Task 1.3: Block Viewer Components

**Files:**
- Create: `src/components/blocks/rich-text/viewer.tsx`
- Create: `src/components/blocks/image-gallery/viewer.tsx`
- Create: `src/components/blocks/cta/viewer.tsx`
- Create: `src/components/blocks/callout/viewer.tsx`
- Create: `src/components/blocks/quiz-inline/viewer.tsx`

**Step 1: Create BlockErrorBoundary component**

Create `src/components/blocks/block-error-boundary.tsx`:
```typescript
'use client';

import React from 'react';

interface Props {
  blockType: string;
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class BlockErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error) {
    console.error(`Block error [${this.props.blockType}]:`, error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-lg border border-dashed border-muted-foreground/30 p-4 text-sm text-muted-foreground">
          Content block unavailable ({this.props.blockType})
        </div>
      );
    }
    return this.props.children;
  }
}
```

**Step 2: Create rich-text viewer**

Create `src/components/blocks/rich-text/viewer.tsx`:
```typescript
'use client';

import type { BlockViewerProps } from '@/lib/content/block-registry';
import type { RichTextData } from '@/lib/content/blocks/rich-text/schema';

export default function RichTextViewer({ data }: BlockViewerProps<RichTextData>) {
  if (data.mode === 'sequence' && data.segments) {
    return (
      <div className="space-y-4">
        {data.segments.map((seg, i) => (
          <div key={i} className="prose max-w-none" dangerouslySetInnerHTML={{ __html: seg.text }} />
        ))}
      </div>
    );
  }

  return (
    <div
      className="prose prose-sm max-w-none dark:prose-invert"
      dangerouslySetInnerHTML={{ __html: data.html }}
    />
  );
}
```

**Step 3: Create image-gallery viewer**

Create `src/components/blocks/image-gallery/viewer.tsx`:
```typescript
'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { BlockViewerProps } from '@/lib/content/block-registry';
import type { ImageGalleryData } from '@/lib/content/blocks/image-gallery/schema';

export default function ImageGalleryViewer({ data }: BlockViewerProps<ImageGalleryData>) {
  const [current, setCurrent] = useState(0);
  const images = data.images ?? [];

  if (images.length === 0) return null;

  if (data.mode === 'slider') {
    return (
      <div className="relative overflow-hidden rounded-lg">
        <img
          src={images[current].url}
          alt={images[current].alt ?? ''}
          className="w-full object-cover"
        />
        {images[current].caption && (
          <p className="mt-2 text-sm text-muted-foreground">{images[current].caption}</p>
        )}
        {images.length > 1 && (
          <div className="mt-3 flex items-center justify-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrent((c) => Math.max(0, c - 1))}
              disabled={current === 0}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-muted-foreground">
              {current + 1} / {images.length}
            </span>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrent((c) => Math.min(images.length - 1, c + 1))}
              disabled={current === images.length - 1}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    );
  }

  // Gallery mode
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {images.map((img, i) => (
        <div key={i} className="overflow-hidden rounded-lg">
          <img src={img.url} alt={img.alt ?? ''} className="w-full object-cover" />
          {img.caption && (
            <p className="mt-1 text-xs text-muted-foreground">{img.caption}</p>
          )}
        </div>
      ))}
    </div>
  );
}
```

**Step 4: Create callout viewer**

Create `src/components/blocks/callout/viewer.tsx`:
```typescript
'use client';

import { Info, AlertTriangle, Lightbulb, CheckCircle } from 'lucide-react';
import type { BlockViewerProps } from '@/lib/content/block-registry';
import type { CalloutData } from '@/lib/content/blocks/callout/schema';

const VARIANT_CONFIG = {
  info: { icon: Info, className: 'bg-blue-50 border-blue-200 text-blue-900 dark:bg-blue-950/30 dark:border-blue-800 dark:text-blue-100' },
  warning: { icon: AlertTriangle, className: 'bg-yellow-50 border-yellow-200 text-yellow-900 dark:bg-yellow-950/30 dark:border-yellow-800 dark:text-yellow-100' },
  tip: { icon: Lightbulb, className: 'bg-green-50 border-green-200 text-green-900 dark:bg-green-950/30 dark:border-green-800 dark:text-green-100' },
  success: { icon: CheckCircle, className: 'bg-emerald-50 border-emerald-200 text-emerald-900 dark:bg-emerald-950/30 dark:border-emerald-800 dark:text-emerald-100' },
};

export default function CalloutViewer({ data }: BlockViewerProps<CalloutData>) {
  const { icon: Icon, className } = VARIANT_CONFIG[data.variant ?? 'info'];
  return (
    <div className={`flex gap-3 rounded-lg border p-4 ${className}`}>
      <Icon className="mt-0.5 h-5 w-5 shrink-0" />
      <div>
        {data.title && <p className="mb-1 font-semibold">{data.title}</p>}
        <div className="prose-sm" dangerouslySetInnerHTML={{ __html: data.html }} />
      </div>
    </div>
  );
}
```

**Step 5: Create CTA viewer**

Create `src/components/blocks/cta/viewer.tsx`:
```typescript
'use client';

import { Button } from '@/components/ui/button';
import { CheckCircle } from 'lucide-react';
import type { BlockViewerProps } from '@/lib/content/block-registry';
import type { CtaData } from '@/lib/content/blocks/cta/schema';

interface Props extends BlockViewerProps<CtaData> {
  onComplete?: () => void;
}

export default function CtaViewer({ data, onComplete }: Props) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-xl border bg-muted/30 p-8 text-center">
      <CheckCircle className="h-12 w-12 text-green-500" />
      {data.text && <p className="text-lg font-medium">{data.text}</p>}
      <Button onClick={onComplete} size="lg">
        {data.button_label ?? 'Continue'}
      </Button>
    </div>
  );
}
```

**Step 6: Create quiz-inline viewer (categorize)**

Create `src/components/blocks/quiz-inline/viewer.tsx`:
```typescript
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { BlockViewerProps } from '@/lib/content/block-registry';
import type { QuizInlineData } from '@/lib/content/blocks/quiz-inline/schema';

export default function QuizInlineViewer({ data }: BlockViewerProps<QuizInlineData>) {
  const [submitted, setSubmitted] = useState(false);

  if (data.question_type === 'categorize' && data.categories) {
    return <CategorizeViewer data={data} submitted={submitted} onSubmit={() => setSubmitted(true)} />;
  }

  return (
    <div className="rounded-lg border p-4 text-sm text-muted-foreground">
      Interactive question (type: {data.question_type})
    </div>
  );
}

function CategorizeViewer({
  data,
  submitted,
  onSubmit,
}: {
  data: QuizInlineData;
  submitted: boolean;
  onSubmit: () => void;
}) {
  return (
    <div className="space-y-4 rounded-xl border p-6">
      {data.instructions && (
        <p className="text-sm font-medium text-muted-foreground">{data.instructions}</p>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        {(data.categories ?? []).map((cat) => (
          <div key={cat.name} className="rounded-lg border bg-muted/30 p-4">
            <h4 className="mb-3 font-semibold">{cat.name}</h4>
            <div className="flex flex-wrap gap-2">
              {cat.items.map((item) => (
                <Badge key={item} variant="secondary">{item}</Badge>
              ))}
            </div>
          </div>
        ))}
      </div>
      {!submitted && (
        <Button onClick={onSubmit} className="w-full">Check Answer</Button>
      )}
    </div>
  );
}
```

**Step 7: Commit**

```bash
git add src/components/blocks/
git commit -m "feat: add block viewer components for rich-text, image-gallery, cta, callout, quiz-inline"
```

---

### Task 1.4: Evolve LessonBlockRenderer

**Files:**
- Modify: `src/components/lesson-block-renderer.tsx`

**Step 1: Update renderer to use registry + error boundaries**

Replace the content of `src/components/lesson-block-renderer.tsx`:

```typescript
'use client';

import React, { Suspense } from 'react';
import type { LessonBlock, Lesson } from '@/types';
import { getBlockType } from '@/lib/content/block-registry';
import { BlockErrorBoundary } from '@/components/blocks/block-error-boundary';
import { Skeleton } from '@/components/ui/skeleton';

interface LessonBlockRendererProps {
  block: LessonBlock;
  lessonTitle: string;
  onComplete?: () => void;
}

export function LessonBlockRenderer({ block, lessonTitle, onComplete }: LessonBlockRendererProps) {
  if (!block.is_visible) return null;

  const definition = getBlockType(block.block_type);

  if (!definition || !definition.ViewerComponent) {
    return (
      <div className="rounded-lg border border-dashed border-muted-foreground/30 p-4 text-sm text-muted-foreground">
        Content unavailable ({block.block_type})
      </div>
    );
  }

  const Viewer = definition.ViewerComponent;

  return (
    <BlockErrorBoundary blockType={block.block_type}>
      <Suspense fallback={<Skeleton className="h-32 w-full rounded-lg" />}>
        <Viewer
          data={block.data}
          block={{
            id: block.id,
            title: block.title ?? lessonTitle,
            is_visible: block.is_visible,
          }}
          onComplete={onComplete}
        />
      </Suspense>
    </BlockErrorBoundary>
  );
}

// Keep backward compat export — unchanged
export function createFallbackBlockFromLesson(lesson: Lesson): LessonBlock {
  const blockType =
    lesson.content_type === '3d' ? 'model3d' :
    lesson.content_type === 'iframe' ? 'iframe' :
    lesson.content_type;

  return {
    id: `fallback-${lesson.id}`,
    institution_id: '',
    lesson_id: lesson.id,
    block_type: blockType,
    title: lesson.title,
    data: { url: lesson.content_url, title: lesson.title, description: lesson.description ?? '' },
    is_visible: true,
    settings: {},
    version: 1,
    order_index: 0,
    created_by: '',
    created_at: lesson.created_at,
    updated_at: lesson.created_at,
  };
}
```

**Step 2: Register all block types with their viewer components**

Create `src/lib/content/blocks/register-all.ts`:
```typescript
import { z } from 'zod';
import React from 'react';
import { registerBlockType } from '@/lib/content/block-registry';
import { richTextDataSchema } from './rich-text/schema';
import { imageGalleryDataSchema } from './image-gallery/schema';
import { ctaDataSchema } from './cta/schema';
import { calloutDataSchema } from './callout/schema';
import { quizInlineDataSchema } from './quiz-inline/schema';
import { videoDataSchema } from './video/schema';

// Rich Text
registerBlockType({
  type: 'rich_text',
  label: 'Rich Text',
  description: 'Narrative and instructional content with optional media.',
  icon: 'type',
  category: 'content',
  dataSchema: richTextDataSchema,
  defaultData: { html: '', mode: 'standard' as const },
  ViewerComponent: React.lazy(() => import('@/components/blocks/rich-text/viewer')),
  EditorComponent: null,
  completionCriteria: () => true,
  version: 1,
});

// Image Gallery
registerBlockType({
  type: 'image_gallery',
  label: 'Image Gallery',
  description: 'Swipeable image gallery or slider.',
  icon: 'images',
  category: 'media',
  dataSchema: imageGalleryDataSchema,
  defaultData: { images: [], mode: 'gallery' as const },
  ViewerComponent: React.lazy(() => import('@/components/blocks/image-gallery/viewer')),
  EditorComponent: null,
  completionCriteria: () => true,
  version: 1,
});

// CTA
registerBlockType({
  type: 'cta',
  label: 'Call to Action',
  description: 'End-of-lesson action button.',
  icon: 'mouse-pointer-click',
  category: 'navigation',
  dataSchema: ctaDataSchema,
  defaultData: { text: '', action: 'complete_lesson' as const, button_label: 'Continue' },
  ViewerComponent: React.lazy(() => import('@/components/blocks/cta/viewer')),
  EditorComponent: null,
  version: 1,
});

// Callout
registerBlockType({
  type: 'callout',
  label: 'Callout',
  description: 'Info, warning, or tip highlight box.',
  icon: 'info',
  category: 'content',
  dataSchema: calloutDataSchema,
  defaultData: { variant: 'info' as const, html: '' },
  ViewerComponent: React.lazy(() => import('@/components/blocks/callout/viewer')),
  EditorComponent: null,
  completionCriteria: () => true,
  version: 1,
});

// Quiz Inline
registerBlockType({
  type: 'quiz_inline',
  label: 'Inline Quiz',
  description: 'Interactive question embedded within a lesson.',
  icon: 'help-circle',
  category: 'assessment',
  dataSchema: quizInlineDataSchema,
  defaultData: { question_type: 'multiple_choice' as const, show_feedback: true },
  ViewerComponent: React.lazy(() => import('@/components/blocks/quiz-inline/viewer')),
  EditorComponent: null,
  version: 1,
});

// Video
registerBlockType({
  type: 'video',
  label: 'Video',
  description: 'Hosted or CDN video.',
  icon: 'play-circle',
  category: 'media',
  dataSchema: videoDataSchema,
  defaultData: { url: '', autoplay: false },
  ViewerComponent: React.lazy(() => import('@/components/blocks/video/viewer')),
  EditorComponent: null,
  completionCriteria: () => true, // Will track watch % later
  version: 1,
});

// --- Legacy types with inline viewers (keep working, upgrade later) ---

registerBlockType({
  type: 'pdf',
  label: 'PDF',
  description: 'Document viewer.',
  icon: 'file-text',
  category: 'media',
  dataSchema: z.object({ url: z.string() }),
  defaultData: { url: '' },
  ViewerComponent: React.lazy(() => import('@/components/blocks/pdf/viewer')),
  EditorComponent: null,
  version: 1,
});

registerBlockType({
  type: 'iframe',
  label: 'iFrame',
  description: 'Embedded external content.',
  icon: 'code',
  category: 'interactive',
  dataSchema: z.object({ url: z.string(), height: z.number().optional() }),
  defaultData: { url: '' },
  ViewerComponent: React.lazy(() => import('@/components/blocks/iframe/viewer')),
  EditorComponent: null,
  version: 1,
});

registerBlockType({
  type: 'h5p',
  label: 'H5P Activity',
  description: 'Interactive H5P learning object.',
  icon: 'zap',
  category: 'interactive',
  dataSchema: z.object({ contentKey: z.string() }),
  defaultData: { contentKey: '' },
  ViewerComponent: React.lazy(() => import('@/components/blocks/h5p/viewer')),
  EditorComponent: null,
  version: 1,
});
```

**Step 3: Create simple viewer wrappers for legacy block types**

Create `src/components/blocks/pdf/viewer.tsx`:
```typescript
'use client';
export default function PdfViewer({ data, block }: { data: { url: string }; block: { title?: string } }) {
  return <iframe src={data.url} className="w-full rounded-lg" style={{ height: 600 }} title={block.title} />;
}
```

Create `src/components/blocks/iframe/viewer.tsx`:
```typescript
'use client';
export default function IframeViewer({ data, block }: { data: { url: string; height?: number }; block: { title?: string } }) {
  return <iframe src={data.url} className="w-full rounded-lg" style={{ height: data.height ?? 600 }} title={block.title} />;
}
```

Create `src/components/blocks/h5p/viewer.tsx`:
```typescript
'use client';
import { H5PPlayer } from '@/components/h5p/h5p-player';
export default function H5PViewer({ data, block }: { data: { contentKey: string }; block: { title?: string } }) {
  return <H5PPlayer title={block.title ?? ''} contentKey={String(data.contentKey)} metadata={data} />;
}
```

Create `src/components/blocks/video/viewer.tsx`:
```typescript
'use client';
export default function VideoViewer({ data }: { data: { url: string; poster?: string; caption?: string } }) {
  return (
    <div className="space-y-2">
      <video src={data.url} poster={data.poster} controls className="w-full rounded-lg" style={{ maxHeight: 500 }}>
        Your browser does not support the video tag.
      </video>
      {data.caption && <p className="text-sm text-muted-foreground">{data.caption}</p>}
    </div>
  );
}
```

**Step 4: Import register-all in the app root layout**

In `src/app/layout.tsx` (or wherever the root layout is), add at the top:
```typescript
import '@/lib/content/blocks/register-all';
```

**Step 5: Commit**

```bash
git add src/components/blocks/ src/lib/content/blocks/ src/components/lesson-block-renderer.tsx src/app/layout.tsx
git commit -m "feat: evolve LessonBlockRenderer to registry-driven pattern with error boundaries and lazy loading"
```

---

## Phase 2: Student Experience with Module Layer

### Task 2.1: Fix Certificates Bug

**Files:**
- Modify: `src/app/student/certificates/page.tsx`

**Step 1: Add missing import**

In `src/app/student/certificates/page.tsx`, find the import from `lucide-react` and add `Loader2`:

```typescript
import { Award, Download, Calendar, ExternalLink, Loader2 } from 'lucide-react';
```

**Step 2: Run the build to verify no TS errors**

```bash
npm run build 2>&1 | grep -i error
```

Expected: No errors related to certificates page

**Step 3: Commit**

```bash
git add src/app/student/certificates/page.tsx
git commit -m "fix: add missing Loader2 import to certificates page"
```

---

### Task 2.2: Add Module DB Queries

**Files:**
- Modify: `src/lib/db/modules.ts`
- Create: `src/lib/db/modules.test.ts` (integration test scaffold)

**Step 1: Implement modules.ts**

Replace `src/lib/db/modules.ts`:
```typescript
import { createClient } from '@/lib/supabase/server';
import type { Module } from '@/types';

export async function getModulesByCourse(courseId: string): Promise<Module[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('modules')
    .select('*')
    .eq('course_id', courseId)
    .eq('is_published', true)
    .order('order_index', { ascending: true });
  if (error) return [];
  return data as Module[];
}

export async function getModulesWithLessonsByCourse(
  courseId: string
): Promise<(Module & { lessons: import('@/types').Lesson[] })[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('modules')
    .select('*, lessons(*)')
    .eq('course_id', courseId)
    .eq('is_published', true)
    .order('order_index', { ascending: true });
  if (error) return [];
  return data as any;
}
```

**Step 2: Export from db index**

In `src/lib/db/index.ts`, add:
```typescript
export * from './modules';
```

**Step 3: Commit**

```bash
git add src/lib/db/modules.ts src/lib/db/index.ts
git commit -m "feat: add module DB query layer"
```

---

### Task 2.3: Module-Aware Course View

This is the key student-facing change — adds the module sidebar with completion indicators to the existing course detail page.

**Files:**
- Create: `src/components/features/lesson-sidebar.tsx`
- Modify: `src/app/student/courses/[id]/page.tsx`

**Step 1: Create LessonSidebar component**

Create `src/components/features/lesson-sidebar.tsx`:
```typescript
'use client';

import { CheckCircle, Lock, ChevronDown, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import type { Module, Lesson, Progress } from '@/types';
import { calculateLessonProgress } from '@/lib/utils/completion';

interface Props {
  modules: (Module & { lessons: Lesson[] })[];
  progress: Progress[];
  activeLessonId?: string;
  onSelectLesson: (lesson: Lesson) => void;
}

export function LessonSidebar({ modules, progress, activeLessonId, onSelectLesson }: Props) {
  const completedIds = new Set(progress.filter((p) => p.completed).map((p) => p.lesson_id));

  return (
    <nav className="w-72 shrink-0 space-y-2 overflow-y-auto pr-2">
      {modules.map((mod) => (
        <ModuleSection
          key={mod.id}
          module={mod}
          completedIds={completedIds}
          activeLessonId={activeLessonId}
          onSelectLesson={onSelectLesson}
        />
      ))}
    </nav>
  );
}

function ModuleSection({
  module,
  completedIds,
  activeLessonId,
  onSelectLesson,
}: {
  module: Module & { lessons: Lesson[] };
  completedIds: Set<string>;
  activeLessonId?: string;
  onSelectLesson: (lesson: Lesson) => void;
}) {
  const [open, setOpen] = useState(true);
  const lessonsWithProgress = module.lessons.map((l) => ({
    ...l,
    completed: completedIds.has(l.id),
  }));
  const { percentage } = calculateLessonProgress(lessonsWithProgress);

  return (
    <div className="rounded-lg border bg-card">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between p-3 text-left"
      >
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{module.title}</p>
          <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>
        {open ? <ChevronDown className="ml-2 h-4 w-4 shrink-0" /> : <ChevronRight className="ml-2 h-4 w-4 shrink-0" />}
      </button>

      {open && (
        <ul className="border-t pb-1">
          {module.lessons.map((lesson) => {
            const done = completedIds.has(lesson.id);
            const active = lesson.id === activeLessonId;
            return (
              <li key={lesson.id}>
                <button
                  onClick={() => onSelectLesson(lesson)}
                  className={cn(
                    'flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors hover:bg-muted/50',
                    active && 'bg-primary/10 text-primary font-medium'
                  )}
                >
                  {done ? (
                    <CheckCircle className="h-4 w-4 shrink-0 text-green-500" />
                  ) : (
                    <div className="h-4 w-4 shrink-0 rounded-full border-2 border-muted-foreground/30" />
                  )}
                  <span className="truncate">{lesson.title}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
```

**Step 2: Update lib/db exports**

In `src/lib/db/index.ts`, ensure modules is exported.

**Step 3: Commit**

```bash
git add src/components/features/lesson-sidebar.tsx
git commit -m "feat: add LessonSidebar component with module grouping and completion progress indicators"
```

---

## Phase 3: Admin Authoring (Outline)

> Full task breakdown follows the same TDD pattern. Key tasks:

- **Task 3.1:** Admin module CRUD (create, reorder, delete modules within a course)
- **Task 3.2:** Lesson block list view in admin (list blocks, add/remove, reorder via drag)
- **Task 3.3:** Block editor shell (opens per-type editor in a slide-over panel)
- **Task 3.4:** Rich-text block editor (Tiptap or `contenteditable`)
- **Task 3.5:** Image gallery block editor (upload images, set mode)
- **Task 3.6:** Admin dashboard stats cards (total students, enrollments, completion rates)
- **Task 3.7:** Media library UI (`/admin/media` — browse `media_assets`, select for blocks)

---

## Phase 4: Quiz Expansion (Outline)

> Full task breakdown follows the same TDD pattern. Key tasks:

- **Task 4.1:** Question type registry (mirrors block registry pattern — schema + viewer + editor per type)
- **Task 4.2:** MCQ and true/false question viewers
- **Task 4.3:** Likert scale and open-text question viewers
- **Task 4.4:** Quiz attempt flow with per-question `quiz_responses` recording
- **Task 4.5:** Quiz results page (student) with per-question breakdown
- **Task 4.6:** Admin quiz editor — add/edit/reorder questions with type-specific editors

---

## Phase 5–7: Outline

- **Phase 5:** Multi-tenant polish (institution branding, admin UI, RLS scoping)
- **Phase 6:** Advanced blocks (H5P authoring, React Three Fiber, tldraw)
- **Phase 7:** Hardening (E2E tests, analytics dashboards, PDF certificates, structured logging)

---

## Quick Reference: Key Commands

```bash
# Run unit tests
npm test

# Run tests in watch mode
npm run test:watch

# Run E2E tests
npm run test:e2e

# Run SCORM import pipeline
npm run import-scorm "<path-to-module-zip-dir>" scripts/import-scorm/output

# Type check
npx tsc --noEmit

# Build
npm run build
```

## Quick Reference: File Conventions

| What | Where |
|------|-------|
| DB queries | `src/lib/db/<table>.ts` |
| Auth guards | `src/lib/auth/guards.ts` |
| Pure utilities | `src/lib/utils/<name>.ts` |
| Block schema | `src/lib/content/blocks/<type>/schema.ts` |
| Block registration | `src/lib/content/blocks/register-all.ts` |
| Block viewer | `src/components/blocks/<type>/viewer.tsx` |
| Block editor | `src/components/blocks/<type>/editor.tsx` |
| Feature components | `src/components/features/<name>.tsx` |
| UI primitives | `src/components/ui/<name>.tsx` |
| Tests | Co-located with source: `<file>.test.ts` |
| Migrations | `supabase/migrations/<N>_<description>.sql` |
| Seed scripts | `supabase/seed/<description>.sql` |
| Import pipeline | `scripts/import-scorm/` |
