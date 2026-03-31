# Visual Course Editor Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a unified three-panel visual course editor with live preview, drag-and-drop reordering, theme customization, slide templates, and multi-tenant isolation.

**Architecture:** Custom-built panel editor using React + shadcn/ui + Tailwind for the three-panel layout, `@dnd-kit` for drag-and-drop, Zustand for editor state with undo/redo, and Tiptap for rich text editing. The live preview reuses existing student viewer components for WYSIWYG accuracy. A new `slides` table sits between lessons and blocks. Theme cascade (institution > course > slide) uses Zod-validated schemas merged at runtime.

**Tech Stack:** Next.js 16, React 19, TypeScript 5, Supabase (Postgres + Auth), Tailwind CSS 4, shadcn/ui, Zod, Zustand, @dnd-kit/core + @dnd-kit/sortable, Tiptap, Vitest, React Testing Library

**Before starting:** Read `docs/plans/2026-03-30-visual-course-editor-design.md` for full design context.

---

## Engineering Rules (Apply to Every Task)

1. **TDD:** Write the failing test first, then the implementation. Never write implementation without a test.
2. **File size:** No component > 200 lines, no function > 40 lines. Extract if exceeded.
3. **One export per file:** One exported React component per file.
4. **No Supabase outside `lib/db/`:** All database queries live in `src/lib/db/`. Pages and components call these functions.
5. **Guard functions:** All server actions and API routes call a guard from `src/lib/auth/guards.ts` at the top.
6. **RLS admin policies use `public.is_admin()`** — never inline `FROM users` check.
7. **Error boundaries:** Every new block viewer/editor is wrapped in an error boundary.
8. **Co-located tests:** Test file lives next to source file (`foo.ts` → `foo.test.ts`).
9. **Multi-tenancy:** Every DB query includes `institution_id` filter. Every new table gets institution-scoped RLS.
10. **Params unwrap:** All dynamic route pages unwrap `params` with `React.use()`.

---

## Phase 1: Foundation (Editor Shell + Data Model)

### Task 1.1: Install New Dependencies

**Files:**
- Modify: `package.json`

**Step 1: Install editor dependencies**

```bash
cd "C:/Users/devel/OneDrive/Documents/RethinkReality/GANSID-LMS/Lms"
npm install zustand @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities @tiptap/react @tiptap/starter-kit @tiptap/extension-image @tiptap/extension-link @tiptap/extension-placeholder @tiptap/pm
```

**Step 2: Verify installation**

```bash
npm ls zustand @dnd-kit/core @tiptap/react
```

Expected: All three packages listed without errors.

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: install zustand, dnd-kit, and tiptap dependencies"
```

---

### Task 1.2: Database Migration — `slides` Table + Schema Changes

**Files:**
- Create: `supabase/migrations/012_add_slides_and_editor_columns.sql`

**Step 1: Write the migration SQL**

Apply via Supabase MCP `apply_migration`:

```sql
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
```

**Step 2: Apply via Supabase MCP**

Use `apply_migration` with name `012_add_slides_and_editor_columns`.

**Step 3: Verify tables exist**

Use Supabase MCP `execute_sql`:
```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('slides', 'slide_templates', 'content_activity_log')
ORDER BY table_name;
```

Expected: 3 rows returned.

**Step 4: Commit migration file**

```bash
git add supabase/migrations/012_add_slides_and_editor_columns.sql
git commit -m "feat: add slides table, theme columns, soft deletes, activity log (migration 012)"
```

---

### Task 1.3: TypeScript Types for New Entities

**Files:**
- Modify: `src/types/index.ts`

**Step 1: Write test for new types**

Create `src/types/index.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import type { Slide, SlideTemplate, ContentActivityLog, InstitutionTheme, SlideType } from './index';

describe('Editor types', () => {
  it('Slide type has required fields', () => {
    const slide: Slide = {
      id: 'test-id',
      lesson_id: 'lesson-id',
      slide_type: 'content',
      title: 'Test Slide',
      order_index: 0,
      status: 'draft',
      settings: {},
      deleted_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    expect(slide.slide_type).toBe('content');
  });

  it('SlideType union covers all types', () => {
    const types: SlideType[] = ['title', 'content', 'media', 'quiz', 'disclaimer', 'interactive', 'cta'];
    expect(types).toHaveLength(7);
  });

  it('InstitutionTheme has color fields', () => {
    const theme: InstitutionTheme = {
      primaryColor: '#1E3A5F',
      accentColor: '#DC2626',
      backgroundColor: '#FFFFFF',
      textColor: '#0F172A',
      fontFamily: 'Inter',
      fontScale: 1,
      borderRadius: 'md',
      slideTransition: 'fade',
    };
    expect(theme.primaryColor).toBe('#1E3A5F');
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npx vitest run src/types/index.test.ts
```

Expected: FAIL — types not exported.

**Step 3: Add types to `src/types/index.ts`**

Append to existing file:

```typescript
// --- Slide types ---

export type SlideType = 'title' | 'content' | 'media' | 'quiz' | 'disclaimer' | 'interactive' | 'cta';
export type SlideStatus = 'draft' | 'published';
export type CourseStatus = 'draft' | 'published' | 'archived';

export interface Slide {
  id: string;
  lesson_id: string;
  slide_type: SlideType;
  title: string | null;
  order_index: number;
  status: SlideStatus;
  settings: Record<string, unknown>;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SlideTemplate {
  id: string;
  name: string;
  description: string | null;
  default_blocks: Array<{ block_type: string; data: Record<string, unknown> }>;
  thumbnail_url: string | null;
  institution_id: string | null;
  created_at: string;
}

export interface ContentActivityLog {
  id: string;
  institution_id: string | null;
  user_id: string | null;
  entity_type: 'course' | 'module' | 'lesson' | 'slide' | 'block';
  entity_id: string;
  action: 'created' | 'updated' | 'deleted' | 'published' | 'reordered';
  changes: Record<string, { old: unknown; new: unknown }>;
  created_at: string;
}

// --- Theme types ---

export interface InstitutionTheme {
  primaryColor: string;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
  fontFamily: string;
  fontScale: number;
  logoUrl?: string;
  borderRadius: 'none' | 'sm' | 'md' | 'lg' | 'full';
  slideTransition: 'none' | 'fade' | 'slide';
}

// --- Editor state types ---

export type EntitySelection =
  | { type: 'course'; id: string }
  | { type: 'module'; id: string }
  | { type: 'lesson'; id: string }
  | { type: 'slide'; id: string }
  | { type: 'block'; id: string };

export interface EditorAction {
  type: string;
  entityType: string;
  entityId: string;
  previousState: unknown;
  newState: unknown;
  timestamp: number;
}
```

**Step 4: Run test to verify it passes**

```bash
npx vitest run src/types/index.test.ts
```

Expected: PASS.

**Step 5: Commit**

```bash
git add src/types/index.ts src/types/index.test.ts
git commit -m "feat: add Slide, SlideTemplate, InstitutionTheme, and editor state types"
```

---

### Task 1.4: Theme Schema + `resolveTheme()` Utility

**Files:**
- Create: `src/lib/content/theme.ts`
- Create: `src/lib/content/theme.test.ts`

**Step 1: Write the failing test**

Create `src/lib/content/theme.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { ThemeSchema, resolveTheme, DEFAULT_THEME, themeToCssVariables } from './theme';

describe('ThemeSchema', () => {
  it('fills defaults for empty object', () => {
    const result = ThemeSchema.parse({});
    expect(result.primaryColor).toBe('#1E3A5F');
    expect(result.accentColor).toBe('#DC2626');
    expect(result.fontFamily).toBe('Inter');
    expect(result.fontScale).toBe(1);
    expect(result.borderRadius).toBe('md');
    expect(result.slideTransition).toBe('fade');
  });

  it('accepts valid overrides', () => {
    const result = ThemeSchema.parse({ primaryColor: '#FF0000', fontScale: 1.25 });
    expect(result.primaryColor).toBe('#FF0000');
    expect(result.fontScale).toBe(1.25);
    expect(result.accentColor).toBe('#DC2626'); // default preserved
  });

  it('rejects invalid fontScale', () => {
    expect(() => ThemeSchema.parse({ fontScale: 5 })).toThrow();
  });
});

describe('resolveTheme', () => {
  it('returns defaults when no overrides', () => {
    const result = resolveTheme({});
    expect(result).toEqual(DEFAULT_THEME);
  });

  it('merges institution theme', () => {
    const result = resolveTheme({ institution: { primaryColor: '#111111' } });
    expect(result.primaryColor).toBe('#111111');
    expect(result.accentColor).toBe('#DC2626');
  });

  it('course overrides institution', () => {
    const result = resolveTheme({
      institution: { primaryColor: '#111111' },
      course: { primaryColor: '#222222' },
    });
    expect(result.primaryColor).toBe('#222222');
  });

  it('slide overrides course overrides institution', () => {
    const result = resolveTheme({
      institution: { primaryColor: '#111111' },
      course: { primaryColor: '#222222' },
      slide: { primaryColor: '#333333' },
    });
    expect(result.primaryColor).toBe('#333333');
  });

  it('partial overrides preserve other fields', () => {
    const result = resolveTheme({
      institution: { primaryColor: '#111111', fontFamily: 'Roboto' },
      course: { primaryColor: '#222222' },
    });
    expect(result.primaryColor).toBe('#222222');
    expect(result.fontFamily).toBe('Roboto');
  });
});

describe('themeToCssVariables', () => {
  it('converts theme to CSS variable object', () => {
    const vars = themeToCssVariables(DEFAULT_THEME);
    expect(vars['--theme-primary']).toBe('#1E3A5F');
    expect(vars['--theme-accent']).toBe('#DC2626');
    expect(vars['--theme-bg']).toBe('#FFFFFF');
    expect(vars['--theme-text']).toBe('#0F172A');
    expect(vars['--theme-font']).toBe('Inter');
    expect(vars['--theme-font-scale']).toBe('1');
    expect(vars['--theme-radius']).toBe('md');
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npx vitest run src/lib/content/theme.test.ts
```

Expected: FAIL — module not found.

**Step 3: Implement**

Create `src/lib/content/theme.ts`:

```typescript
import { z } from 'zod';
import type { InstitutionTheme } from '@/types';

export const ThemeSchema = z.object({
  primaryColor: z.string().default('#1E3A5F'),
  accentColor: z.string().default('#DC2626'),
  backgroundColor: z.string().default('#FFFFFF'),
  textColor: z.string().default('#0F172A'),
  fontFamily: z.string().default('Inter'),
  fontScale: z.number().min(0.75).max(1.5).default(1),
  logoUrl: z.string().url().optional(),
  borderRadius: z.enum(['none', 'sm', 'md', 'lg', 'full']).default('md'),
  slideTransition: z.enum(['none', 'fade', 'slide']).default('fade'),
});

export const DEFAULT_THEME: InstitutionTheme = ThemeSchema.parse({});

interface ResolveThemeInput {
  institution?: Partial<InstitutionTheme>;
  course?: Partial<InstitutionTheme>;
  slide?: Partial<InstitutionTheme>;
}

export function resolveTheme(input: ResolveThemeInput): InstitutionTheme {
  const merged = {
    ...stripUndefined(input.institution ?? {}),
    ...stripUndefined(input.course ?? {}),
    ...stripUndefined(input.slide ?? {}),
  };
  return ThemeSchema.parse(merged);
}

function stripUndefined(obj: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined)
  );
}

export function themeToCssVariables(theme: InstitutionTheme): Record<string, string> {
  return {
    '--theme-primary': theme.primaryColor,
    '--theme-accent': theme.accentColor,
    '--theme-bg': theme.backgroundColor,
    '--theme-text': theme.textColor,
    '--theme-font': theme.fontFamily,
    '--theme-font-scale': String(theme.fontScale),
    '--theme-radius': theme.borderRadius,
    '--theme-transition': theme.slideTransition,
  };
}
```

**Step 4: Run test to verify it passes**

```bash
npx vitest run src/lib/content/theme.test.ts
```

Expected: PASS — all 8 tests.

**Step 5: Commit**

```bash
git add src/lib/content/theme.ts src/lib/content/theme.test.ts
git commit -m "feat: add ThemeSchema, resolveTheme cascade, and CSS variable generator"
```

---

### Task 1.5: Database Query Layer — Slides + Institution-Scoped Queries

**Files:**
- Create: `src/lib/db/slides.ts`
- Create: `src/lib/db/slides.test.ts`
- Modify: `src/lib/db/courses.ts`
- Modify: `src/lib/db/index.ts`

**Step 1: Write the failing test**

Create `src/lib/db/slides.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import {
  getSlidesByLesson,
  createSlide,
  updateSlide,
  deleteSlide,
  reorderSlides,
} from './slides';

// Mock Supabase client
function createMockSupabase(data: unknown = [], error: unknown = null) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data, error }),
    then: undefined as unknown,
  };
  // Make the chain itself resolve for queries without .single()
  chain.order = vi.fn().mockResolvedValue({ data, error });
  chain.eq = vi.fn().mockReturnThis();
  chain.is = vi.fn().mockReturnThis();
  chain.select = vi.fn().mockReturnThis();
  chain.insert = vi.fn().mockReturnValue({ ...chain, select: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data, error }) }) });
  chain.update = vi.fn().mockReturnValue({ ...chain, eq: vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data, error }) }) }) });

  return {
    from: vi.fn().mockReturnValue(chain),
    rpc: vi.fn().mockResolvedValue({ data, error }),
  } as unknown;
}

describe('getSlidesByLesson', () => {
  it('queries slides filtered by lesson_id and not deleted', async () => {
    const mockSlides = [
      { id: 's1', lesson_id: 'l1', order_index: 0, deleted_at: null },
      { id: 's2', lesson_id: 'l1', order_index: 1, deleted_at: null },
    ];
    const supabase = createMockSupabase(mockSlides);
    const result = await getSlidesByLesson(supabase as any, 'l1');
    expect(supabase.from).toHaveBeenCalledWith('slides');
    expect(result).toBeDefined();
  });
});

describe('createSlide', () => {
  it('inserts a slide with correct fields', async () => {
    const newSlide = {
      lesson_id: 'l1',
      slide_type: 'content' as const,
      title: 'Test Slide',
      order_index: 0,
      status: 'draft' as const,
      settings: {},
    };
    const supabase = createMockSupabase(newSlide);
    const result = await createSlide(supabase as any, newSlide);
    expect(supabase.from).toHaveBeenCalledWith('slides');
    expect(result).toBeDefined();
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npx vitest run src/lib/db/slides.test.ts
```

Expected: FAIL — module not found.

**Step 3: Implement `src/lib/db/slides.ts`**

```typescript
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Slide, SlideType, SlideStatus } from '@/types';

export async function getSlidesByLesson(
  supabase: SupabaseClient,
  lessonId: string
) {
  const { data, error } = await supabase
    .from('slides')
    .select('*')
    .eq('lesson_id', lessonId)
    .is('deleted_at', null)
    .order('order_index', { ascending: true });

  if (error) throw error;
  return data as Slide[];
}

interface CreateSlideInput {
  lesson_id: string;
  slide_type: SlideType;
  title?: string;
  order_index: number;
  status?: SlideStatus;
  settings?: Record<string, unknown>;
}

export async function createSlide(
  supabase: SupabaseClient,
  input: CreateSlideInput
) {
  const { data, error } = await supabase
    .from('slides')
    .insert({
      lesson_id: input.lesson_id,
      slide_type: input.slide_type,
      title: input.title ?? null,
      order_index: input.order_index,
      status: input.status ?? 'draft',
      settings: input.settings ?? {},
    })
    .select()
    .single();

  if (error) throw error;
  return data as Slide;
}

export async function updateSlide(
  supabase: SupabaseClient,
  slideId: string,
  changes: Partial<Pick<Slide, 'title' | 'slide_type' | 'status' | 'settings' | 'order_index'>>
) {
  const { data, error } = await supabase
    .from('slides')
    .update({ ...changes, updated_at: new Date().toISOString() })
    .eq('id', slideId)
    .select()
    .single();

  if (error) throw error;
  return data as Slide;
}

export async function deleteSlide(
  supabase: SupabaseClient,
  slideId: string
) {
  const { error } = await supabase
    .from('slides')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', slideId);

  if (error) throw error;
}

export async function reorderSlides(
  supabase: SupabaseClient,
  lessonId: string,
  slideIds: string[]
) {
  const updates = slideIds.map((id, index) =>
    supabase
      .from('slides')
      .update({ order_index: index, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('lesson_id', lessonId)
  );

  await Promise.all(updates);
}

export async function getSlideTemplates(
  supabase: SupabaseClient,
  institutionId?: string
) {
  let query = supabase
    .from('slide_templates')
    .select('*');

  if (institutionId) {
    query = query.or(`institution_id.is.null,institution_id.eq.${institutionId}`);
  } else {
    query = query.is('institution_id', null);
  }

  const { data, error } = await query.order('name');
  if (error) throw error;
  return data;
}
```

**Step 4: Export from `src/lib/db/index.ts`**

Add to existing exports:

```typescript
export * from './slides';
```

**Step 5: Run test to verify it passes**

```bash
npx vitest run src/lib/db/slides.test.ts
```

Expected: PASS.

**Step 6: Commit**

```bash
git add src/lib/db/slides.ts src/lib/db/slides.test.ts src/lib/db/index.ts
git commit -m "feat: add slides DB query layer with institution scoping"
```

---

### Task 1.6: Editor Store (Zustand)

**Files:**
- Create: `src/lib/stores/editor-store.ts`
- Create: `src/lib/stores/editor-store.test.ts`

**Step 1: Write the failing test**

Create `src/lib/stores/editor-store.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { createEditorStore, type EditorStore } from './editor-store';

describe('EditorStore', () => {
  let store: EditorStore;

  beforeEach(() => {
    store = createEditorStore();
  });

  describe('selection', () => {
    it('starts with no selection', () => {
      expect(store.getState().selectedEntity).toBeNull();
    });

    it('selects an entity', () => {
      store.getState().selectEntity({ type: 'course', id: 'c1' });
      expect(store.getState().selectedEntity).toEqual({ type: 'course', id: 'c1' });
    });

    it('clears selection', () => {
      store.getState().selectEntity({ type: 'course', id: 'c1' });
      store.getState().selectEntity(null);
      expect(store.getState().selectedEntity).toBeNull();
    });
  });

  describe('modules', () => {
    it('starts with empty modules', () => {
      expect(store.getState().modules).toEqual([]);
    });

    it('adds a module', () => {
      store.getState().addModule({ id: 'm1', title: 'Module 1', course_id: 'c1', order_index: 0 });
      expect(store.getState().modules).toHaveLength(1);
      expect(store.getState().modules[0].title).toBe('Module 1');
    });

    it('marks dirty on change', () => {
      expect(store.getState().isDirty).toBe(false);
      store.getState().addModule({ id: 'm1', title: 'Module 1', course_id: 'c1', order_index: 0 });
      expect(store.getState().isDirty).toBe(true);
    });
  });

  describe('undo/redo', () => {
    it('starts with empty stacks', () => {
      expect(store.getState().undoStack).toEqual([]);
      expect(store.getState().redoStack).toEqual([]);
    });

    it('pushes to undo stack on mutation', () => {
      store.getState().addModule({ id: 'm1', title: 'Module 1', course_id: 'c1', order_index: 0 });
      expect(store.getState().undoStack).toHaveLength(1);
    });

    it('undo reverts last change', () => {
      store.getState().addModule({ id: 'm1', title: 'Module 1', course_id: 'c1', order_index: 0 });
      expect(store.getState().modules).toHaveLength(1);
      store.getState().undo();
      expect(store.getState().modules).toHaveLength(0);
    });

    it('redo re-applies undone change', () => {
      store.getState().addModule({ id: 'm1', title: 'Module 1', course_id: 'c1', order_index: 0 });
      store.getState().undo();
      expect(store.getState().modules).toHaveLength(0);
      store.getState().redo();
      expect(store.getState().modules).toHaveLength(1);
    });
  });

  describe('slides', () => {
    it('adds a slide to a lesson', () => {
      store.getState().addSlide('l1', {
        id: 's1',
        lesson_id: 'l1',
        slide_type: 'content',
        title: 'Test',
        order_index: 0,
        status: 'draft',
        settings: {},
        deleted_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      const slides = store.getState().slides.get('l1');
      expect(slides).toHaveLength(1);
      expect(slides![0].title).toBe('Test');
    });

    it('reorders slides', () => {
      const baseSlide = {
        lesson_id: 'l1',
        slide_type: 'content' as const,
        status: 'draft' as const,
        settings: {},
        deleted_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      store.getState().addSlide('l1', { ...baseSlide, id: 's1', title: 'First', order_index: 0 });
      store.getState().addSlide('l1', { ...baseSlide, id: 's2', title: 'Second', order_index: 1 });

      store.getState().reorderSlides('l1', ['s2', 's1']);
      const slides = store.getState().slides.get('l1')!;
      expect(slides[0].id).toBe('s2');
      expect(slides[1].id).toBe('s1');
    });
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npx vitest run src/lib/stores/editor-store.test.ts
```

Expected: FAIL — module not found.

**Step 3: Implement**

Create `src/lib/stores/editor-store.ts`:

```typescript
import { createStore } from 'zustand/vanilla';
import type { Slide, EntitySelection, EditorAction, Module, Lesson, LessonBlock } from '@/types';

interface ModuleInput {
  id: string;
  title: string;
  course_id: string;
  order_index: number;
  description?: string;
}

interface EditorState {
  // Data
  courseId: string | null;
  modules: ModuleInput[];
  lessons: Map<string, Lesson[]>;
  slides: Map<string, Slide[]>;
  blocks: Map<string, LessonBlock[]>;

  // UI
  selectedEntity: EntitySelection | null;
  previewSlideIndex: number;
  isDirty: boolean;
  isSaving: boolean;

  // History
  undoStack: EditorAction[];
  redoStack: EditorAction[];

  // Actions
  selectEntity: (entity: EntitySelection | null) => void;
  addModule: (module: ModuleInput) => void;
  removeModule: (moduleId: string) => void;
  addSlide: (lessonId: string, slide: Slide) => void;
  removeSlide: (lessonId: string, slideId: string) => void;
  reorderSlides: (lessonId: string, slideIds: string[]) => void;
  updateSlide: (lessonId: string, slideId: string, changes: Partial<Slide>) => void;
  setPreviewSlideIndex: (index: number) => void;
  markSaved: () => void;
  undo: () => void;
  redo: () => void;
  loadCourse: (data: {
    courseId: string;
    modules: ModuleInput[];
    lessons: Map<string, Lesson[]>;
    slides: Map<string, Slide[]>;
    blocks: Map<string, LessonBlock[]>;
  }) => void;
}

type Snapshot = {
  modules: ModuleInput[];
  lessons: Map<string, Lesson[]>;
  slides: Map<string, Slide[]>;
  blocks: Map<string, LessonBlock[]>;
};

function takeSnapshot(state: EditorState): Snapshot {
  return {
    modules: [...state.modules],
    lessons: new Map(state.lessons),
    slides: new Map(Array.from(state.slides.entries()).map(([k, v]) => [k, [...v]])),
    blocks: new Map(state.blocks),
  };
}

export function createEditorStore() {
  return createStore<EditorState>((set, get) => ({
    courseId: null,
    modules: [],
    lessons: new Map(),
    slides: new Map(),
    blocks: new Map(),
    selectedEntity: null,
    previewSlideIndex: 0,
    isDirty: false,
    isSaving: false,
    undoStack: [],
    redoStack: [],

    selectEntity: (entity) => set({ selectedEntity: entity }),

    addModule: (module) => {
      const snapshot = takeSnapshot(get());
      set((state) => ({
        modules: [...state.modules, module],
        isDirty: true,
        undoStack: [...state.undoStack, { type: 'addModule', entityType: 'module', entityId: module.id, previousState: snapshot, newState: null, timestamp: Date.now() }],
        redoStack: [],
      }));
    },

    removeModule: (moduleId) => {
      const snapshot = takeSnapshot(get());
      set((state) => ({
        modules: state.modules.filter((m) => m.id !== moduleId),
        isDirty: true,
        undoStack: [...state.undoStack, { type: 'removeModule', entityType: 'module', entityId: moduleId, previousState: snapshot, newState: null, timestamp: Date.now() }],
        redoStack: [],
      }));
    },

    addSlide: (lessonId, slide) => {
      const snapshot = takeSnapshot(get());
      set((state) => {
        const existing = state.slides.get(lessonId) ?? [];
        const newSlides = new Map(state.slides);
        newSlides.set(lessonId, [...existing, slide]);
        return {
          slides: newSlides,
          isDirty: true,
          undoStack: [...state.undoStack, { type: 'addSlide', entityType: 'slide', entityId: slide.id, previousState: snapshot, newState: null, timestamp: Date.now() }],
          redoStack: [],
        };
      });
    },

    removeSlide: (lessonId, slideId) => {
      const snapshot = takeSnapshot(get());
      set((state) => {
        const existing = state.slides.get(lessonId) ?? [];
        const newSlides = new Map(state.slides);
        newSlides.set(lessonId, existing.filter((s) => s.id !== slideId));
        return {
          slides: newSlides,
          isDirty: true,
          undoStack: [...state.undoStack, { type: 'removeSlide', entityType: 'slide', entityId: slideId, previousState: snapshot, newState: null, timestamp: Date.now() }],
          redoStack: [],
        };
      });
    },

    reorderSlides: (lessonId, slideIds) => {
      const snapshot = takeSnapshot(get());
      set((state) => {
        const existing = state.slides.get(lessonId) ?? [];
        const reordered = slideIds
          .map((id) => existing.find((s) => s.id === id))
          .filter(Boolean) as Slide[];
        const newSlides = new Map(state.slides);
        newSlides.set(lessonId, reordered.map((s, i) => ({ ...s, order_index: i })));
        return {
          slides: newSlides,
          isDirty: true,
          undoStack: [...state.undoStack, { type: 'reorderSlides', entityType: 'slide', entityId: lessonId, previousState: snapshot, newState: null, timestamp: Date.now() }],
          redoStack: [],
        };
      });
    },

    updateSlide: (lessonId, slideId, changes) => {
      const snapshot = takeSnapshot(get());
      set((state) => {
        const existing = state.slides.get(lessonId) ?? [];
        const newSlides = new Map(state.slides);
        newSlides.set(lessonId, existing.map((s) => s.id === slideId ? { ...s, ...changes } : s));
        return {
          slides: newSlides,
          isDirty: true,
          undoStack: [...state.undoStack, { type: 'updateSlide', entityType: 'slide', entityId: slideId, previousState: snapshot, newState: null, timestamp: Date.now() }],
          redoStack: [],
        };
      });
    },

    setPreviewSlideIndex: (index) => set({ previewSlideIndex: index }),

    markSaved: () => set({ isDirty: false, isSaving: false }),

    undo: () => {
      const { undoStack } = get();
      if (undoStack.length === 0) return;
      const lastAction = undoStack[undoStack.length - 1];
      const currentSnapshot = takeSnapshot(get());
      const previousSnapshot = lastAction.previousState as Snapshot;
      set({
        modules: previousSnapshot.modules,
        lessons: previousSnapshot.lessons,
        slides: previousSnapshot.slides,
        blocks: previousSnapshot.blocks,
        undoStack: undoStack.slice(0, -1),
        redoStack: [...get().redoStack, { ...lastAction, previousState: currentSnapshot, newState: null, timestamp: Date.now() }],
        isDirty: true,
      });
    },

    redo: () => {
      const { redoStack } = get();
      if (redoStack.length === 0) return;
      const lastRedo = redoStack[redoStack.length - 1];
      const currentSnapshot = takeSnapshot(get());
      const redoSnapshot = lastRedo.previousState as Snapshot;
      set({
        modules: redoSnapshot.modules,
        lessons: redoSnapshot.lessons,
        slides: redoSnapshot.slides,
        blocks: redoSnapshot.blocks,
        redoStack: redoStack.slice(0, -1),
        undoStack: [...get().undoStack, { ...lastRedo, previousState: currentSnapshot, newState: null, timestamp: Date.now() }],
        isDirty: true,
      });
    },

    loadCourse: (data) => set({
      courseId: data.courseId,
      modules: data.modules,
      lessons: data.lessons,
      slides: data.slides,
      blocks: data.blocks,
      isDirty: false,
      undoStack: [],
      redoStack: [],
    }),
  }));
}

export type EditorStore = ReturnType<typeof createEditorStore>;
```

**Step 4: Run test to verify it passes**

```bash
npx vitest run src/lib/stores/editor-store.test.ts
```

Expected: PASS — all tests.

**Step 5: Commit**

```bash
git add src/lib/stores/editor-store.ts src/lib/stores/editor-store.test.ts
git commit -m "feat: add Zustand editor store with undo/redo, selection, and slide management"
```

---

### Task 1.7: Editor Shell Layout (Three-Panel)

**Files:**
- Create: `src/app/admin/courses/[id]/editor/page.tsx`
- Create: `src/components/editor/course-editor-shell.tsx`
- Create: `src/components/editor/structure-panel.tsx`
- Create: `src/components/editor/preview-panel.tsx`
- Create: `src/components/editor/properties-panel.tsx`
- Create: `src/components/editor/editor-toolbar.tsx`
- Create: `src/components/editor/editor-status-bar.tsx`

**Step 1: Create the route page**

Create `src/app/admin/courses/[id]/editor/page.tsx`:

```tsx
import React from 'react';
import { CourseEditorShell } from '@/components/editor/course-editor-shell';

export default function EditorPage({
  params: paramsPromise,
}: {
  params: Promise<{ id: string }>;
}) {
  const params = React.use(paramsPromise);
  return <CourseEditorShell courseId={params.id} />;
}
```

**Step 2: Create the editor shell**

Create `src/components/editor/course-editor-shell.tsx`:

```tsx
'use client';

import { useEffect, useState } from 'react';
import { EditorToolbar } from './editor-toolbar';
import { StructurePanel } from './structure-panel';
import { PreviewPanel } from './preview-panel';
import { PropertiesPanel } from './properties-panel';
import { EditorStatusBar } from './editor-status-bar';
import { createEditorStore, type EditorStore } from '@/lib/stores/editor-store';
import { EditorStoreContext } from './editor-store-context';

interface CourseEditorShellProps {
  courseId: string;
}

export function CourseEditorShell({ courseId }: CourseEditorShellProps) {
  const [store] = useState(() => createEditorStore());

  return (
    <EditorStoreContext.Provider value={store}>
      <div className="flex flex-col h-screen bg-gray-100">
        <EditorToolbar />
        <div className="flex flex-1 min-h-0 gap-0">
          <StructurePanel />
          <PreviewPanel />
          <PropertiesPanel />
        </div>
        <EditorStatusBar />
      </div>
    </EditorStoreContext.Provider>
  );
}
```

**Step 3: Create editor store React context**

Create `src/components/editor/editor-store-context.tsx`:

```tsx
'use client';

import { createContext, useContext } from 'react';
import { useStore } from 'zustand';
import type { EditorStore } from '@/lib/stores/editor-store';

export const EditorStoreContext = createContext<EditorStore | null>(null);

export function useEditorStore<T>(selector: (state: ReturnType<EditorStore['getState']>) => T): T {
  const store = useContext(EditorStoreContext);
  if (!store) throw new Error('useEditorStore must be used within EditorStoreContext');
  return useStore(store, selector);
}
```

**Step 4: Create toolbar stub**

Create `src/components/editor/editor-toolbar.tsx`:

```tsx
'use client';

import { Save, Undo2, Redo2, Eye, Send } from 'lucide-react';
import { useEditorStore } from './editor-store-context';

export function EditorToolbar() {
  const isDirty = useEditorStore((s) => s.isDirty);
  const isSaving = useEditorStore((s) => s.isSaving);
  const undo = useEditorStore((s) => s.undo);
  const redo = useEditorStore((s) => s.redo);
  const undoCount = useEditorStore((s) => s.undoStack.length);
  const redoCount = useEditorStore((s) => s.redoStack.length);

  return (
    <div className="flex items-center justify-between px-4 py-2 bg-white border-b border-gray-200 shrink-0">
      <div className="flex items-center gap-2">
        <h1 className="text-sm font-semibold text-gray-700">Course Editor</h1>
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={undo}
          disabled={undoCount === 0}
          className="p-2 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
          title="Undo (Ctrl+Z)"
        >
          <Undo2 className="w-4 h-4" />
        </button>
        <button
          onClick={redo}
          disabled={redoCount === 0}
          className="p-2 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
          title="Redo (Ctrl+Shift+Z)"
        >
          <Redo2 className="w-4 h-4" />
        </button>
        <div className="w-px h-6 bg-gray-200 mx-2" />
        <button className="p-2 rounded hover:bg-gray-100" title="Preview">
          <Eye className="w-4 h-4" />
        </button>
        <button
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#1E3A5F] rounded-lg hover:bg-[#162d4a] disabled:opacity-50"
          disabled={!isDirty || isSaving}
        >
          <Save className="w-4 h-4" />
          {isSaving ? 'Saving...' : 'Save'}
        </button>
        <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700">
          <Send className="w-4 h-4" />
          Publish
        </button>
      </div>
    </div>
  );
}
```

**Step 5: Create structure panel stub**

Create `src/components/editor/structure-panel.tsx`:

```tsx
'use client';

import { Plus } from 'lucide-react';
import { useEditorStore } from './editor-store-context';

export function StructurePanel() {
  const modules = useEditorStore((s) => s.modules);
  const selectedEntity = useEditorStore((s) => s.selectedEntity);
  const selectEntity = useEditorStore((s) => s.selectEntity);

  return (
    <div className="w-[260px] shrink-0 bg-white border-r border-gray-200 flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Structure</span>
        <button
          className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600"
          title="Add Module"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        {modules.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-sm">
            <p>No modules yet</p>
            <button className="mt-2 text-[#1E3A5F] hover:underline text-sm font-medium">
              + Add first module
            </button>
          </div>
        ) : (
          <div className="space-y-1">
            {modules.map((mod) => (
              <button
                key={mod.id}
                onClick={() => selectEntity({ type: 'module', id: mod.id })}
                className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
                  selectedEntity?.type === 'module' && selectedEntity.id === mod.id
                    ? 'bg-[#1E3A5F] text-white'
                    : 'hover:bg-gray-50 text-gray-700'
                }`}
              >
                {mod.title}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
```

**Step 6: Create preview panel stub**

Create `src/components/editor/preview-panel.tsx`:

```tsx
'use client';

import { Monitor, Tablet, Smartphone } from 'lucide-react';
import { useState } from 'react';

type DeviceMode = 'desktop' | 'tablet' | 'mobile';

const DEVICE_WIDTHS: Record<DeviceMode, number> = {
  desktop: 1024,
  tablet: 768,
  mobile: 375,
};

export function PreviewPanel() {
  const [device, setDevice] = useState<DeviceMode>('desktop');

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-gray-50">
      <div className="flex items-center justify-center gap-1 px-3 py-2 border-b border-gray-200 bg-white shrink-0">
        <button
          onClick={() => setDevice('desktop')}
          className={`p-1.5 rounded ${device === 'desktop' ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
          title="Desktop (1024px)"
        >
          <Monitor className="w-4 h-4" />
        </button>
        <button
          onClick={() => setDevice('tablet')}
          className={`p-1.5 rounded ${device === 'tablet' ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
          title="Tablet (768px)"
        >
          <Tablet className="w-4 h-4" />
        </button>
        <button
          onClick={() => setDevice('mobile')}
          className={`p-1.5 rounded ${device === 'mobile' ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
          title="Mobile (375px)"
        >
          <Smartphone className="w-4 h-4" />
        </button>
      </div>
      <div className="flex-1 flex items-start justify-center p-6 overflow-auto">
        <div
          className="bg-white rounded-lg shadow-lg border border-gray-200 min-h-[400px] transition-all duration-300"
          style={{ width: DEVICE_WIDTHS[device], maxWidth: '100%' }}
        >
          <div className="flex items-center justify-center h-full text-gray-400 text-sm p-8">
            <p>Select a slide to preview</p>
          </div>
        </div>
      </div>
    </div>
  );
}
```

**Step 7: Create properties panel stub**

Create `src/components/editor/properties-panel.tsx`:

```tsx
'use client';

import { useEditorStore } from './editor-store-context';

export function PropertiesPanel() {
  const selectedEntity = useEditorStore((s) => s.selectedEntity);

  return (
    <div className="w-[320px] shrink-0 bg-white border-l border-gray-200 flex flex-col overflow-hidden">
      <div className="px-3 py-2 border-b border-gray-100">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
          Properties
        </span>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        {!selectedEntity ? (
          <div className="text-center py-8 text-gray-400 text-sm">
            <p>Select an element to edit its properties</p>
          </div>
        ) : (
          <div className="text-sm text-gray-600">
            <p className="font-medium capitalize">{selectedEntity.type}</p>
            <p className="text-xs text-gray-400 mt-1">ID: {selectedEntity.id}</p>
          </div>
        )}
      </div>
    </div>
  );
}
```

**Step 8: Create status bar**

Create `src/components/editor/editor-status-bar.tsx`:

```tsx
'use client';

import { useEditorStore } from './editor-store-context';

export function EditorStatusBar() {
  const isDirty = useEditorStore((s) => s.isDirty);
  const isSaving = useEditorStore((s) => s.isSaving);
  const selectedEntity = useEditorStore((s) => s.selectedEntity);

  const statusText = isSaving
    ? 'Saving...'
    : isDirty
    ? 'Unsaved changes'
    : 'All changes saved';

  return (
    <div className="flex items-center justify-between px-4 py-1.5 bg-white border-t border-gray-200 text-xs text-gray-500 shrink-0">
      <span>{statusText}</span>
      {selectedEntity && (
        <span className="capitalize">
          {selectedEntity.type}: {selectedEntity.id.slice(0, 8)}...
        </span>
      )}
    </div>
  );
}
```

**Step 9: Verify the page renders**

Start dev server and navigate to `http://localhost:3001/gansid/admin/courses/6b4906f1-803b-40bb-8582-d591220e5d09/editor`

Expected: Three-panel layout visible with toolbar, empty structure panel, empty preview, and empty properties panel.

**Step 10: Commit**

```bash
git add src/app/admin/courses/\[id\]/editor/ src/components/editor/
git commit -m "feat: add three-panel editor shell layout with toolbar, panels, and status bar"
```

---

## Phase 2: Structure Management (CRUD + Reordering)

### Task 2.1: Load Course Data into Editor Store

**Files:**
- Create: `src/lib/db/editor.ts` — fetch all course data for editor in one call
- Modify: `src/components/editor/course-editor-shell.tsx` — load data on mount

**Step 1: Create `src/lib/db/editor.ts`**

```typescript
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Module, Lesson, Slide, LessonBlock } from '@/types';

export interface EditorCourseData {
  course: { id: string; title: string; description: string; theme_overrides: Record<string, unknown>; status: string };
  modules: Module[];
  lessons: Lesson[];
  slides: Slide[];
  blocks: LessonBlock[];
}

export async function loadEditorCourseData(
  supabase: SupabaseClient,
  courseId: string,
  institutionId: string
): Promise<EditorCourseData> {
  // Fetch course (scoped to institution)
  const { data: course, error: courseErr } = await supabase
    .from('courses')
    .select('*')
    .eq('id', courseId)
    .eq('institution_id', institutionId)
    .is('deleted_at', null)
    .single();

  if (courseErr || !course) throw new Error('Course not found');

  // Fetch modules
  const { data: modules } = await supabase
    .from('modules')
    .select('*')
    .eq('course_id', courseId)
    .is('deleted_at', null)
    .order('order_index');

  // Fetch lessons
  const { data: lessons } = await supabase
    .from('lessons')
    .select('*')
    .eq('course_id', courseId)
    .is('deleted_at', null)
    .order('order_index');

  // Fetch slides for all lessons
  const lessonIds = (lessons ?? []).map((l: Lesson) => l.id);
  let slides: Slide[] = [];
  if (lessonIds.length > 0) {
    const { data: slideData } = await supabase
      .from('slides')
      .select('*')
      .in('lesson_id', lessonIds)
      .is('deleted_at', null)
      .order('order_index');
    slides = slideData ?? [];
  }

  // Fetch blocks for all slides
  const slideIds = slides.map((s) => s.id);
  let blocks: LessonBlock[] = [];
  if (slideIds.length > 0) {
    const { data: blockData } = await supabase
      .from('lesson_blocks')
      .select('*')
      .in('slide_id', slideIds)
      .order('order_index');
    blocks = blockData ?? [];
  }

  return {
    course,
    modules: modules ?? [],
    lessons: lessons ?? [],
    slides,
    blocks,
  };
}
```

**Step 2: Update `course-editor-shell.tsx` to load data on mount**

Add data loading with loading/error states. Use `useEffect` to call `loadEditorCourseData` and populate the store via `store.getState().loadCourse()`.

**Step 3: Export from `src/lib/db/index.ts`**

```typescript
export * from './editor';
```

**Step 4: Commit**

```bash
git add src/lib/db/editor.ts src/lib/db/index.ts src/components/editor/course-editor-shell.tsx
git commit -m "feat: load course data into editor store on mount"
```

---

### Task 2.2: Structure Panel — Module/Lesson/Slide Tree with CRUD

**Files:**
- Create: `src/components/editor/module-tree.tsx`
- Create: `src/components/editor/module-node.tsx`
- Create: `src/components/editor/lesson-node.tsx`
- Create: `src/components/editor/slide-node.tsx`
- Create: `src/components/editor/add-entity-dialog.tsx`
- Modify: `src/components/editor/structure-panel.tsx`

Implement collapsible tree with:
- Module nodes (collapsible, show lesson count)
- Lesson nodes (collapsible, show slide count)
- Slide nodes (show slide type icon + title)
- Click to select → updates `selectedEntity` → properties panel reacts
- `+ Module`, `+ Lesson`, `+ Slide` buttons via shadcn Dialog
- Right-click context menu: Rename, Duplicate, Delete (soft delete)

**Step 1: Build `module-node.tsx` with collapsible children**

Use `ChevronRight`/`ChevronDown` icons, animate with Tailwind transition. Each node shows title, item count badge, and action buttons on hover.

**Step 2: Build `lesson-node.tsx` nested inside module**

Same pattern. Shows slide count.

**Step 3: Build `slide-node.tsx` as leaf**

Shows slide type icon (from a type-to-icon map) and title. Highlighted when selected.

**Step 4: Build `add-entity-dialog.tsx`**

shadcn `Dialog` with title input field. Used for adding modules, lessons. For slides, shows template picker instead (Task 2.3).

**Step 5: Wire up to structure panel**

Replace the stub content in `structure-panel.tsx` with `<ModuleTree>` component.

**Step 6: Test interaction**

Navigate to editor → add a module → add a lesson → verify tree renders correctly.

**Step 7: Commit**

```bash
git add src/components/editor/
git commit -m "feat: add module/lesson/slide tree with CRUD in structure panel"
```

---

### Task 2.3: Slide Template Picker

**Files:**
- Create: `src/components/editor/slide-template-drawer.tsx`
- Create: `src/components/editor/template-card.tsx`
- Create: `src/lib/content/slide-templates.ts`

**Step 1: Define templates in `src/lib/content/slide-templates.ts`**

```typescript
import type { SlideType } from '@/types';
import { FileText, Image, Video, HelpCircle, AlertTriangle, Globe, MousePointerClick } from 'lucide-react';

export interface SlideTemplateConfig {
  type: SlideType;
  name: string;
  description: string;
  icon: typeof FileText;
  defaultBlocks: Array<{ block_type: string; data: Record<string, unknown> }>;
  defaultSettings: Record<string, unknown>;
}

export const SLIDE_TEMPLATES: SlideTemplateConfig[] = [
  {
    type: 'title',
    name: 'Title',
    description: 'Lesson introduction with heading and description',
    icon: FileText,
    defaultBlocks: [
      { block_type: 'rich_text', data: { html: '<h1>Lesson Title</h1><p>Description goes here</p>', mode: 'standard' } },
    ],
    defaultSettings: { background: 'gradient', textColor: '#FFFFFF' },
  },
  {
    type: 'content',
    name: 'Content',
    description: 'Text content with optional image',
    icon: FileText,
    defaultBlocks: [
      { block_type: 'rich_text', data: { html: '<h2>Title</h2><p>Your content here...</p>', mode: 'standard' } },
    ],
    defaultSettings: { background: '#FFFFFF' },
  },
  {
    type: 'media',
    name: 'Media',
    description: 'Full-width video, image, or embed',
    icon: Video,
    defaultBlocks: [
      { block_type: 'video', data: { url: '', title: '' } },
    ],
    defaultSettings: { background: '#000000', textColor: '#FFFFFF' },
  },
  {
    type: 'quiz',
    name: 'Quiz',
    description: 'Multiple choice knowledge check',
    icon: HelpCircle,
    defaultBlocks: [
      { block_type: 'quiz_inline', data: { question_type: 'multiple_choice', question: 'Your question here?', options: ['Option A', 'Option B', 'Option C', 'Option D'], correct_answer: 'Option A', show_feedback: true } },
    ],
    defaultSettings: { background: '#F8FAFC' },
  },
  {
    type: 'disclaimer',
    name: 'Disclaimer',
    description: 'Warning or legal notice',
    icon: AlertTriangle,
    defaultBlocks: [
      { block_type: 'callout', data: { variant: 'warning', title: 'Disclaimer', html: '<p>Important information here...</p>' } },
    ],
    defaultSettings: { background: '#FFFBEB' },
  },
  {
    type: 'interactive',
    name: 'Interactive',
    description: 'Embedded interactive content',
    icon: Globe,
    defaultBlocks: [
      { block_type: 'iframe', data: { url: '', height: 600 } },
    ],
    defaultSettings: { background: '#FFFFFF' },
  },
  {
    type: 'cta',
    name: 'Call to Action',
    description: 'Navigation prompt with button',
    icon: MousePointerClick,
    defaultBlocks: [
      { block_type: 'rich_text', data: { html: '<h2>Ready to continue?</h2>', mode: 'standard' } },
      { block_type: 'cta', data: { action: 'next_lesson', button_label: 'Next Lesson', text: '' } },
    ],
    defaultSettings: { background: 'gradient' },
  },
];
```

**Step 2: Build `template-card.tsx`**

Card component showing icon, name, description. Click selects the template.

**Step 3: Build `slide-template-drawer.tsx`**

Uses shadcn `Sheet` or drawer pattern. Grid of `TemplateCard` components. On select: creates a new slide with the template's blocks and settings.

**Step 4: Wire "+ Slide" button to open drawer**

In `lesson-node.tsx`, the `+ Slide` button opens `SlideTemplateDrawer` with `lessonId` context.

**Step 5: Commit**

```bash
git add src/lib/content/slide-templates.ts src/components/editor/
git commit -m "feat: add slide template picker with 7 preset templates"
```

---

### Task 2.4: Drag-and-Drop Reordering

**Files:**
- Modify: `src/components/editor/structure-panel.tsx`
- Modify: `src/components/editor/module-node.tsx`
- Modify: `src/components/editor/lesson-node.tsx`
- Modify: `src/components/editor/slide-node.tsx`
- Create: `src/components/editor/sortable-item.tsx`

**Step 1: Create `sortable-item.tsx` wrapper**

```tsx
'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';

interface SortableItemProps {
  id: string;
  children: React.ReactNode;
}

export function SortableItem({ id, children }: SortableItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="flex items-center group">
      <button
        {...attributes}
        {...listeners}
        className="p-1 cursor-grab opacity-0 group-hover:opacity-100 transition-opacity"
        title="Drag to reorder"
      >
        <GripVertical className="w-3 h-3 text-gray-400" />
      </button>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}
```

**Step 2: Wrap structure panel in `DndContext` and `SortableContext`**

Use `@dnd-kit/core` `DndContext` with `closestCenter` collision detection. Nested `SortableContext` for each level (modules, lessons per module, slides per lesson).

**Step 3: Handle `onDragEnd` event**

Determine which entity type was dragged, calculate new order, call the appropriate store reorder action.

**Step 4: Test reordering**

Add multiple modules/lessons/slides → drag to reorder → verify store updates → undo → verify reverted.

**Step 5: Commit**

```bash
git add src/components/editor/
git commit -m "feat: add drag-and-drop reordering for modules, lessons, and slides"
```

---

### Task 2.5: Auto-Save with Debounce

**Files:**
- Create: `src/lib/hooks/use-auto-save.ts`
- Create: `src/lib/db/editor-save.ts`
- Modify: `src/components/editor/course-editor-shell.tsx`

**Step 1: Create `use-auto-save.ts` hook**

```typescript
import { useEffect, useRef } from 'react';

export function useAutoSave(
  isDirty: boolean,
  saveFn: () => Promise<void>,
  delayMs: number = 2000
) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!isDirty) return;

    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    timeoutRef.current = setTimeout(async () => {
      await saveFn();
    }, delayMs);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [isDirty, saveFn, delayMs]);
}
```

**Step 2: Create `editor-save.ts` — persists editor state to Supabase**

Diffs the current state against last saved state and only writes changed entities. Batches updates.

**Step 3: Wire auto-save into editor shell**

Use `useAutoSave(isDirty, save)` in `CourseEditorShell`. Status bar shows save state.

**Step 4: Add `beforeunload` warning**

```typescript
useEffect(() => {
  const handler = (e: BeforeUnloadEvent) => {
    if (isDirty) e.preventDefault();
  };
  window.addEventListener('beforeunload', handler);
  return () => window.removeEventListener('beforeunload', handler);
}, [isDirty]);
```

**Step 5: Commit**

```bash
git add src/lib/hooks/use-auto-save.ts src/lib/db/editor-save.ts src/components/editor/course-editor-shell.tsx
git commit -m "feat: add auto-save with 2s debounce and unsaved changes warning"
```

---

## Phase 3: Block Editors (Content Authoring)

### Task 3.1: Rich Text Editor (Tiptap)

**Files:**
- Create: `src/components/blocks/rich-text/editor.tsx`
- Create: `src/components/blocks/rich-text/editor.test.tsx`
- Modify: `src/lib/content/blocks/register-all.ts` — register EditorComponent

**Step 1: Write failing test**

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RichTextEditor } from './editor';

describe('RichTextEditor', () => {
  it('renders with initial HTML content', () => {
    render(
      <RichTextEditor
        data={{ html: '<p>Hello world</p>', mode: 'standard' }}
        onChange={vi.fn()}
      />
    );
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });
});
```

**Step 2: Implement Tiptap editor**

```tsx
'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import type { BlockEditorProps } from '@/lib/content/block-registry';

interface RichTextData {
  html: string;
  mode: string;
}

export function RichTextEditor({ data, onChange }: BlockEditorProps<RichTextData>) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Image,
      Link.configure({ openOnClick: false }),
      Placeholder.configure({ placeholder: 'Start typing...' }),
    ],
    content: data.html,
    onUpdate: ({ editor }) => {
      onChange({ ...data, html: editor.getHTML() });
    },
  });

  if (!editor) return null;

  return (
    <div className="border rounded-lg overflow-hidden">
      <RichTextToolbar editor={editor} />
      <EditorContent
        editor={editor}
        className="prose prose-sm max-w-none p-4 min-h-[200px] focus:outline-none"
      />
    </div>
  );
}

function RichTextToolbar({ editor }: { editor: ReturnType<typeof useEditor> }) {
  if (!editor) return null;

  return (
    <div className="flex items-center gap-1 p-2 border-b bg-gray-50 flex-wrap">
      <button
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        className={`px-2 py-1 text-xs rounded ${editor.isActive('heading', { level: 1 }) ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
      >
        H1
      </button>
      <button
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        className={`px-2 py-1 text-xs rounded ${editor.isActive('heading', { level: 2 }) ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
      >
        H2
      </button>
      <button
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={`px-2 py-1 text-xs rounded font-bold ${editor.isActive('bold') ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
      >
        B
      </button>
      <button
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={`px-2 py-1 text-xs rounded italic ${editor.isActive('italic') ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
      >
        I
      </button>
      <button
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={`px-2 py-1 text-xs rounded ${editor.isActive('bulletList') ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
      >
        List
      </button>
      <button
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={`px-2 py-1 text-xs rounded ${editor.isActive('orderedList') ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
      >
        1. List
      </button>
    </div>
  );
}
```

**Step 3: Register in `register-all.ts`**

Update the `rich_text` registration to include:
```typescript
EditorComponent: lazy(() => import('@/components/blocks/rich-text/editor').then(m => ({ default: m.RichTextEditor }))),
```

**Step 4: Commit**

```bash
git add src/components/blocks/rich-text/editor.tsx src/components/blocks/rich-text/editor.test.tsx src/lib/content/blocks/register-all.ts
git commit -m "feat: add Tiptap rich text block editor with formatting toolbar"
```

---

### Task 3.2: Image, Video, Callout, CTA, Iframe Editors

**Files (one editor per block type):**
- Create: `src/components/blocks/image-gallery/editor.tsx`
- Create: `src/components/blocks/video/editor.tsx`
- Create: `src/components/blocks/callout/editor.tsx`
- Create: `src/components/blocks/cta/editor.tsx`
- Create: `src/components/blocks/iframe/editor.tsx`
- Create: `src/components/blocks/pdf/editor.tsx`
- Create: `src/components/blocks/quiz-inline/editor.tsx`
- Modify: `src/lib/content/blocks/register-all.ts`

Each editor is a form component with labeled inputs matching the block's Zod schema fields. All call `onChange(updatedData)` on every field change for live preview updates.

**Pattern for each editor:**

```tsx
'use client';

import type { BlockEditorProps } from '@/lib/content/block-registry';

interface VideoData {
  url: string;
  title?: string;
  poster?: string;
  autoplay?: boolean;
}

export function VideoEditor({ data, onChange }: BlockEditorProps<VideoData>) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Video URL</label>
        <input
          type="url"
          value={data.url}
          onChange={(e) => onChange({ ...data, url: e.target.value })}
          placeholder="https://youtube.com/watch?v=... or direct video URL"
          className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
        <input
          type="text"
          value={data.title ?? ''}
          onChange={(e) => onChange({ ...data, title: e.target.value })}
          className="w-full px-3 py-2 border rounded-lg text-sm"
        />
      </div>
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={data.autoplay ?? false}
          onChange={(e) => onChange({ ...data, autoplay: e.target.checked })}
          className="rounded"
        />
        <label className="text-sm text-gray-700">Autoplay</label>
      </div>
    </div>
  );
}
```

**Quiz editor is the most complex:**
- Question text field
- Dynamic answer list (add/remove/reorder answers)
- Toggle correct answer
- Explanation text field
- Question type dropdown

Build each editor, register in `register-all.ts`, test that it renders and calls onChange.

**Commit after each 2-3 editors:**

```bash
git commit -m "feat: add image, video, and callout block editors"
git commit -m "feat: add CTA, iframe, PDF, and quiz block editors"
```

---

### Task 3.3: Block Editor in Properties Panel

**Files:**
- Create: `src/components/editor/block-editor-panel.tsx`
- Modify: `src/components/editor/properties-panel.tsx`

**Step 1: Build `block-editor-panel.tsx`**

Loads the `EditorComponent` from the block registry for the selected block type. Passes `data` and `onChange` that updates the store.

```tsx
'use client';

import { Suspense } from 'react';
import { getBlockType } from '@/lib/content/block-registry';
import { useEditorStore } from './editor-store-context';

export function BlockEditorPanel({ blockId, slideId, lessonId }: { blockId: string; slideId: string; lessonId: string }) {
  const blocks = useEditorStore((s) => s.blocks.get(slideId) ?? []);
  const block = blocks.find((b) => b.id === blockId);

  if (!block) return <p className="text-sm text-gray-400">Block not found</p>;

  const definition = getBlockType(block.block_type);
  if (!definition?.EditorComponent) {
    return <p className="text-sm text-gray-400">No editor available for {block.block_type}</p>;
  }

  const Editor = definition.EditorComponent;

  const handleChange = (newData: unknown) => {
    // Update block data in store → triggers preview re-render
    // Implementation depends on store.updateBlock() action
  };

  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-700 mb-3 capitalize">{definition.label}</h3>
      <Suspense fallback={<div className="animate-pulse bg-gray-100 rounded h-32" />}>
        <Editor data={block.data} onChange={handleChange} />
      </Suspense>
    </div>
  );
}
```

**Step 2: Update properties panel routing**

In `properties-panel.tsx`, switch on `selectedEntity.type`:
- `'course'` → course theme editor (Phase 4)
- `'module'` → module name/description form
- `'lesson'` → lesson name/description form
- `'slide'` → slide type + settings form
- `'block'` → `<BlockEditorPanel>`

**Step 3: Commit**

```bash
git add src/components/editor/
git commit -m "feat: wire block editors into properties panel with live data binding"
```

---

### Task 3.4: Click-to-Select in Preview

**Files:**
- Create: `src/components/editor/selection-overlay.tsx`
- Modify: `src/components/editor/preview-panel.tsx`

**Step 1: Build selection overlay**

Transparent overlay on top of the preview that:
- On hover: shows dashed blue outline around the hovered block + type label
- On click: calls `selectEntity('block', blockId)` → properties panel switches to block editor
- Uses `data-block-id` attributes on block wrappers for hit detection

**Step 2: Add `data-block-id` to LessonBlockRenderer output**

Wrap each block's viewer in a `div` with `data-block-id={block.id}` so the overlay can identify which block was clicked.

**Step 3: Commit**

```bash
git add src/components/editor/
git commit -m "feat: add click-to-select overlay in preview panel"
```

---

## Phase 4: Theme Editor (Visual Customization)

### Task 4.1: Course Theme Editor

**Files:**
- Create: `src/components/editor/theme-editor/course-theme-editor.tsx`
- Create: `src/components/editor/theme-editor/color-picker.tsx`
- Create: `src/components/editor/theme-editor/font-selector.tsx`
- Create: `src/components/editor/theme-editor/course-card-preview.tsx`

Build the properties panel view for when the course is selected. Includes:
- Color pickers for primaryColor, accentColor, backgroundColor, textColor
- Font family dropdown (Inter, Roboto, Open Sans, Lato, Poppins)
- Font scale slider (0.75 – 1.5)
- Border radius selector (visual toggle: none/sm/md/lg/full)
- Slide transition selector (none/fade/slide)
- Logo URL input
- Live course card preview at the top showing how the student catalog card looks

### Task 4.2: Slide Style Overrides

**Files:**
- Create: `src/components/editor/theme-editor/slide-style-editor.tsx`

Properties panel view when a slide is selected. Includes:
- Background color/gradient picker
- Text color override
- Padding selector
- Inherits from course theme — shows "Inherited" badge on fields using the default

### Task 4.3: Institution Theme Defaults (Admin Settings)

**Files:**
- Create: `src/app/admin/settings/theme/page.tsx`

Admin settings page where institution admins set their organization's default theme. Same color/font controls as the course theme editor. Saved to `institutions.theme`.

### Task 4.4: ThemeProvider in Preview + Student Viewer

**Files:**
- Create: `src/components/editor/theme-provider.tsx`
- Modify: `src/app/student/courses/[id]/page.tsx` — consume resolved theme

The `ThemeProvider` converts a resolved theme to CSS variables and applies them via a `style` prop. Both the editor preview and the student viewer use the same provider, guaranteeing visual parity.

**Commit after each task in this phase.**

---

## Phase 5: Polish & Publishing

### Task 5.1: Draft/Published Workflow

- "Publish" button in toolbar sets `courses.status = 'published'` and `slides.status = 'published'`
- Student viewer filters `WHERE status = 'published'`
- Visual indicator in editor when viewing draft content

### Task 5.2: Keyboard Shortcuts

- `Ctrl+Z` → undo
- `Ctrl+Shift+Z` or `Ctrl+Y` → redo
- `Ctrl+S` → manual save
- `Delete` → delete selected entity (with confirmation)
- `Arrow keys` → navigate slides in preview

### Task 5.3: Activity Log Recording

- Utility function `logActivity(supabase, { institutionId, userId, entityType, entityId, action, changes })`
- Called in every `lib/db/` mutation function
- Admin dashboard widget showing recent activity (future)

### Task 5.4: Legacy Content Migration

- SQL migration that creates a default slide per lesson for existing `lesson_blocks` that have `slide_id = NULL`
- Groups blocks by lesson, creates one "content" slide per lesson, assigns `slide_id`
- Student viewer continues to work with both old (no slide) and new (slide-based) content

### Task 5.5: RLS Audit for New Tables

- Verify RLS policies on `slides`, `slide_templates`, `content_activity_log`
- Test: student cannot see draft slides, admin from institution A cannot see institution B's slides
- Test via Supabase MCP `execute_sql` with `SET ROLE authenticated` and mock JWT

---

## Dependency Graph

```
Task 1.1 (deps)
Task 1.2 (migration) ──┐
Task 1.3 (types)       ├──→ Task 1.5 (DB layer) ──→ Task 2.1 (load data)
Task 1.4 (theme)       │                               │
                       │                               ▼
Task 1.6 (store) ─────┘                    Task 2.2 (structure CRUD)
                                                       │
Task 1.7 (shell) ──────────────────────────────────────┤
                                                       │
                                            Task 2.3 (templates)
                                                       │
                                            Task 2.4 (drag-drop)
                                                       │
                                            Task 2.5 (auto-save)
                                                       │
                                    ┌──────────────────┤
                                    │                  │
                              Task 3.1-3.2       Task 4.1-4.2
                              (block editors)    (theme editor)
                                    │                  │
                              Task 3.3-3.4             │
                              (wire up)                │
                                    │                  │
                                    └───────┬──────────┘
                                            │
                                      Task 5.1-5.5
                                      (polish)
```

---

## Summary

| Phase | Tasks | Key Deliverable |
|-------|-------|-----------------|
| 1 | 1.1–1.7 | Dependencies, DB schema, types, theme utility, store, editor shell |
| 2 | 2.1–2.5 | Data loading, tree CRUD, templates, drag-drop, auto-save |
| 3 | 3.1–3.4 | All block editors, properties panel wiring, click-to-select |
| 4 | 4.1–4.4 | Theme editors (course + slide + institution), ThemeProvider |
| 5 | 5.1–5.5 | Publish workflow, keyboard shortcuts, activity log, migration, RLS audit |
