# SCAGO Tenant Integration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up SCAGO as a fully operational second tenant on the GANSID LMS platform — institution in DB, admin access, 13 courses imported from Markdown with proper slide separation, images in Supabase Storage, legacy users imported, and admin dashboard scoped by institution.

**Architecture:** Adapt the existing Markdown import pipeline (`scripts/import-markdown-modules/import.ts`) for SCAGO's content format (different quiz markers: `✓`/`○` instead of `[✓]`/`[✗]`, explicit `> **Lesson N, Slide N**` slide boundaries, `![img](path)` images, `🎬 **Video:**` embeds). Upload 313 images to a `scago-assets` Supabase Storage bucket. Fix admin dashboard to filter by tenant context. Import ~2,868 legacy users from CSV.

**Tech Stack:** TypeScript (Node.js scripts), Supabase (Postgres + Storage + MCP), Next.js (middleware already supports SCAGO)

---

## File Map

| Action | File | Responsibility |
|--------|------|---------------|
| Create | `scripts/import-scago/parse-markdown.ts` | Parse SCAGO .md files → structured lesson/slide/block data |
| Create | `scripts/import-scago/generate-sql.ts` | Convert parsed data → SQL INSERT statements |
| Create | `scripts/import-scago/upload-images.ts` | Upload images to `scago-assets` Supabase Storage bucket |
| Create | `scripts/import-scago/import-legacy-users.ts` | Parse CSV → SQL for `legacy_users` table |
| Create | `scripts/import-scago/types.ts` | Shared TypeScript interfaces |
| Create | `scripts/import-scago/index.ts` | CLI entry point — orchestrates parse → upload → generate |
| Modify | `src/app/admin/page.tsx` | Add `getTenantContext()` filtering to course queries |
| Create | `supabase/migrations/024_scago_institution_and_admin.sql` | SCAGO institution row + admin user linkage |

---

### Task 1: SCAGO Institution & Admin Setup (Migration 024)

**Files:**
- Create: `supabase/migrations/024_scago_institution_and_admin.sql`

This migration ensures the SCAGO institution exists and links admin users.

- [ ] **Step 1: Write the migration SQL**

```sql
-- Migration 024: SCAGO institution and admin users
-- Ensure SCAGO institution exists
INSERT INTO public.institutions (name, slug, description, is_active)
VALUES ('SCAGO', 'scago', 'Sickle Cell Awareness Group of Ontario', true)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  is_active = EXCLUDED.is_active;

-- Link education@sicklecellanemia.ca as SCAGO admin
-- (will be created as legacy_user if they haven't signed up yet)
```

- [ ] **Step 2: Apply via Supabase MCP**

Run: `apply_migration` with project_id `ylmnbbrpaeiogdeqezlo`, name `scago_institution_and_admin`

Expected: Migration applies successfully, SCAGO institution row exists.

- [ ] **Step 3: Verify institution exists and get UUID**

Run: `execute_sql` → `SELECT id, slug, name FROM institutions WHERE slug = 'scago';`

Expected: Returns one row with a UUID. Save this UUID — it's needed for all subsequent tasks.

- [ ] **Step 4: Ensure tech@sicklecellanemia.ca can admin both tenants**

Run: `execute_sql` → `SELECT id, role, institution_id FROM public.users WHERE email = 'tech@sicklecellanemia.ca';`

If their role is not `platform_admin`, update:
```sql
UPDATE public.users SET role = 'platform_admin' WHERE email = 'tech@sicklecellanemia.ca';
```

- [ ] **Step 5: Commit migration file**

```bash
git add supabase/migrations/024_scago_institution_and_admin.sql
git commit -m "feat: add SCAGO institution and admin setup (migration 024)"
```

---

### Task 2: Admin Dashboard Institution Filtering

**Files:**
- Modify: `src/app/admin/page.tsx`

The admin dashboard currently shows all courses regardless of institution. Fix it to filter by tenant context.

- [ ] **Step 1: Read the current admin page**

Read `src/app/admin/page.tsx` — currently has no `getTenantContext()` call and queries `supabase.from('courses').select(...)` without filtering.

- [ ] **Step 2: Add institution filtering**

Add `getTenantContext()` import and filter courses by `institution_id`:

```tsx
import { getTenantContext } from '@/lib/tenant/server';

export default async function AdminPage() {
  const supabase = await createClient();
  const { institutionId } = await getTenantContext();

  const [{ data: courses }, { data: categories }] = await Promise.all([
    supabase
      .from('courses')
      .select('*, categories(name)')
      .eq('institution_id', institutionId)
      .order('display_order', { ascending: true }),
    supabase.from('categories').select('id, name').order('name'),
  ]);
  // ... rest unchanged
}
```

- [ ] **Step 3: Check for other admin pages that need the same fix**

Grep for admin pages that query courses without institution filtering. Check:
- `src/app/admin/courses/[id]/page.tsx` — single course by ID (OK, no institution filter needed)
- `src/app/admin/analytics/` — if it exists, check if it filters
- Any other admin list pages

For each page found, add the same `getTenantContext()` + `.eq('institution_id', institutionId)` pattern.

- [ ] **Step 4: Handle platform_admin seeing all institutions**

If `institutionId` is null (shouldn't happen normally), fall back to showing all courses. The `platform_admin` role user navigating to `/gansid/admin` sees GANSID courses; navigating to `/scago/admin` sees SCAGO courses. This is handled naturally by the URL → middleware → `getTenantContext()` chain.

- [ ] **Step 5: Test both tenant URLs**

Start dev server (`npm run dev -- -p 3001`), log in as `tech@sicklecellanemia.ca`:
- Navigate to `http://localhost:3001/gansid/admin` → should see GANSID courses only
- Navigate to `http://localhost:3001/scago/admin` → should see 0 courses (not yet imported)

- [ ] **Step 6: Commit**

```bash
git add src/app/admin/page.tsx
git commit -m "fix: filter admin dashboard courses by tenant institution"
```

---

### Task 3: SCAGO Markdown Parser

**Files:**
- Create: `scripts/import-scago/types.ts`
- Create: `scripts/import-scago/parse-markdown.ts`

Build the parser that reads SCAGO `.md` files and produces structured data. This adapts the existing GANSID parser (`scripts/import-markdown-modules/import.ts`) for SCAGO's different markdown format.

**Key format differences from GANSID:**
- Quiz markers: `✓`/`○` (not `[✓]`/`[✗]`)
- Slide boundaries: `> **Lesson N, Slide N**` blockquotes (not `### Slide N`)
- Images: `![alt](../images/Module_X/Lesson_Y/file.ext)` with local paths
- Videos: `🎬 **Video:** [title](url)` lines
- Before/After cards: `**Before:**` / `**After:**` patterns
- Self-assessment: "My knowledge... on a scale of..." patterns
- Lesson headers: `## Lesson N - Title` (dash, not colon)

- [ ] **Step 1: Create types file**

Create `scripts/import-scago/types.ts`:

```typescript
export interface ParsedBlock {
  block_type: 'rich_text' | 'image_gallery' | 'video' | 'quiz_inline';
  title?: string;
  data: Record<string, unknown>;
}

export interface ParsedSlide {
  title: string;
  blocks: ParsedBlock[];
}

export interface ParsedLesson {
  title: string;
  orderIndex: number;
  slides: ParsedSlide[];
}

export interface ParsedModule {
  number: number;
  title: string;
  slug: string;
  description: string;
  lessons: ParsedLesson[];
}

export interface ModuleDef {
  number: number;
  title: string;
  slug: string;
  fileName: string;
}
```

- [ ] **Step 2: Create the module definitions array**

In `parse-markdown.ts`, define all 13 SCAGO modules (skip 14, use v2 for 13):

```typescript
export const SCAGO_MODULES: ModuleDef[] = [
  { number: 1, title: 'Fundamentals of Sickle Cell Disease', slug: 'fundamentals-of-sickle-cell-disease', fileName: 'Module_1_Fundamentals_of_Sickle_Cell_Disease.md' },
  { number: 2, title: 'Ontario Health Quality Standard for Sickle Cell Disease', slug: 'ontario-health-quality-standard-for-scd', fileName: 'Module_2_Ontario_Health_Quality_Standard_for_Sickle_Cell_Dis.md' },
  { number: 3, title: 'Acute Pain in Sickle Cell Disease', slug: 'acute-pain-in-sickle-cell-disease', fileName: 'Module_3_Acute_Pain_in_Sickle_Cell_Disease.md' },
  { number: 4, title: 'Transfusions, Hydroxyurea, and Provincial Drug Coverage', slug: 'transfusions-hydroxyurea-and-drug-coverage', fileName: 'Module_4_Transfusions_Hydroxyurea_and_Provincial_Drug_Covera.md' },
  { number: 5, title: 'Common Complications in Sickle Cell Disease', slug: 'common-complications-in-scd', fileName: 'Module_5_Common_Complications_in_Sickle_Cell_Disease.md' },
  { number: 6, title: 'Successful Transitions for Adolescents and Young Adults with SCD', slug: 'successful-transitions-for-ayas-with-scd', fileName: 'Module_6_Successful_Transitions_for_Adolescents_and_Young_Ad.md' },
  { number: 7, title: 'Moving Towards Anti-Oppressive, Anti-Racist Healthcare in SCD', slug: 'anti-oppressive-anti-racist-healthcare-in-scd', fileName: 'Module_7_Moving_Towards_AntiOppressive_AntiRacist_Healthcare.md' },
  { number: 8, title: 'Sustainable Advocacy in Sickle Cell Disease', slug: 'sustainable-advocacy-in-scd', fileName: 'Module_8_Sustainable_Advocacy_in_Sickle_Cell_Disease_SCD.md' },
  { number: 9, title: 'Fertility, Contraception, and Pregnancy in SCD', slug: 'fertility-contraception-and-pregnancy-in-scd', fileName: 'Module_9_Fertility_Contraception_and_Pregnancy_in_Sickle_Cel.md' },
  { number: 10, title: 'Mental Health and Wellness in Sickle Cell Disease', slug: 'mental-health-and-wellness-in-scd', fileName: 'Module_10_Mental_Health_and_Wellness_in_Sickle_Cell_Disease_.md' },
  { number: 11, title: 'Latest Innovations in Sickle Cell Disease', slug: 'latest-innovations-in-scd', fileName: 'Module_11_Latest_Innovations_in_Sickle_Cell_Disease.md' },
  { number: 12, title: 'Prevention of SCD and the Truth About Sickle Cell Trait', slug: 'prevention-of-scd-and-sickle-cell-trait', fileName: 'Module_12_Prevention_of_Sickle_Cell_Disease_and_the_Truth_Ab.md' },
  { number: 13, title: 'Partnering with Primary Care Providers to Optimize Outcomes', slug: 'partnering-with-pcps-to-optimize-outcomes', fileName: 'Module_13_Partnering_with_Primary_Care_Providers_PCPs_to_Opt_v2.md' },
];
```

- [ ] **Step 3: Write the lesson splitter**

Split markdown on `## Lesson N` headers. The first chunk before any `## Lesson` is module preamble — skip it. Each chunk becomes a `ParsedLesson`.

```typescript
export function splitIntoLessons(markdown: string): { title: string; body: string }[] {
  const chunks = markdown.split(/\n(?=## Lesson \d+)/);
  const lessons: { title: string; body: string }[] = [];

  for (const chunk of chunks) {
    const trimmed = chunk.trim();
    if (!trimmed) continue;

    const firstLine = trimmed.split('\n')[0];
    // Must start with "## Lesson N"
    const match = firstLine.match(/^## Lesson \d+ - (.+)$/);
    if (!match) continue;

    const title = match[1].trim();
    const body = trimmed.split('\n').slice(1).join('\n');
    lessons.push({ title, body });
  }

  return lessons;
}
```

- [ ] **Step 4: Write the slide splitter**

Split lesson body into slides using these heuristics:
1. **Explicit markers:** `> **Lesson N, Slide N**` creates a boundary
2. **Video markers:** `🎬 **Video:**` gets its own slide
3. **Quiz grouping:** Consecutive quiz questions (lines with `✓`/`○`) are grouped onto one slide
4. **Content grouping:** Text + images between boundaries stay together
5. **References:** `**References:**` or `**# References:**` section → own slide
6. **Summary:** `**Summary:**` or `**# **Summary:**` → own slide
7. **Self-assessment scales:** "My knowledge/comfort/confidence..." at lesson start → intro slide

The function should produce an array of `ParsedSlide`, each containing its blocks.

```typescript
export function splitIntoSlides(lessonBody: string, lessonTitle: string): ParsedSlide[] {
  const lines = lessonBody.split('\n');
  const slides: ParsedSlide[] = [];
  let currentLines: string[] = [];
  let currentTitle = lessonTitle;

  function flushSlide() {
    if (currentLines.length === 0) return;
    const text = currentLines.join('\n').trim();
    if (!text) { currentLines = []; return; }

    const blocks = parseContentToBlocks(text);
    if (blocks.length > 0) {
      slides.push({ title: currentTitle, blocks });
    }
    currentLines = [];
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Explicit slide boundary: > **Lesson N, Slide N**
    if (/^>\s*\*\*Lesson \d+, Slide \d+\*\*/.test(trimmed)) {
      flushSlide();
      currentTitle = trimmed.replace(/^>\s*\*\*/, '').replace(/\*\*$/, '').trim();
      continue;
    }

    // References section boundary
    if (/^\*\*#?\s*References:?\*\*/.test(trimmed) || /^\*\*References:?\*\*/.test(trimmed)) {
      flushSlide();
      // Collect all remaining lines as references
      const refLines = lines.slice(i);
      currentTitle = 'References';
      currentLines = refLines;
      flushSlide();
      break; // References is always last
    }

    // Summary section boundary
    if (/^\*\*#?\s*\*?Summary:?\*?\*\*/.test(trimmed)) {
      flushSlide();
      currentTitle = 'Summary';
      currentLines.push(line);
      continue;
    }

    currentLines.push(line);
  }

  flushSlide();
  return slides;
}
```

- [ ] **Step 5: Write the block parser**

Parse a chunk of text into typed blocks:
- `![alt](path)` → `image_gallery` block (group consecutive images)
- `🎬 **Video:** [title](url)` → `video` block
- Lines with `✓`/`○` answer markers → `quiz_inline` block (group consecutive quizzes)
- `**Before:**`/`**After:**` → `rich_text` block with card layout
- Everything else → `rich_text` block

```typescript
function parseContentToBlocks(text: string): ParsedBlock[] {
  const blocks: ParsedBlock[] = [];
  const lines = text.split('\n');
  let i = 0;

  while (i < lines.length) {
    const line = lines[i].trim();

    // Skip empty lines
    if (!line) { i++; continue; }

    // Skip self-assessment scale lines
    if (/My \*?\*?knowledge\*?\*?.*scale of/i.test(line) ||
        /My \*?\*?comfort\*?\*?.*scale of/i.test(line) ||
        /My \*?\*?confidence\*?\*?.*scale of/i.test(line)) {
      i++;
      continue;
    }

    // Image: ![alt](path)
    if (/^!\[.*\]\(.*\)$/.test(line)) {
      const images: { url: string; alt: string }[] = [];
      while (i < lines.length) {
        const imgMatch = lines[i].trim().match(/^!\[(.*?)\]\((.*?)\)$/);
        if (!imgMatch) break;
        images.push({ alt: imgMatch[1], url: imgMatch[2] });
        i++;
      }
      blocks.push({
        block_type: 'image_gallery',
        data: { images: images.map(img => ({ url: img.url, caption: img.alt || null })), mode: 'gallery' },
      });
      continue;
    }

    // Video: 🎬 **Video:** [title](url) or just 🎬 with YouTube URL on same/next line
    if (/^🎬/.test(line)) {
      const urlMatch = line.match(/\[([^\]]*)\]\((https?:\/\/[^\)]+)\)/);
      if (urlMatch) {
        blocks.push({
          block_type: 'video',
          title: urlMatch[1].replace(/^#\s*/, '').trim(),
          data: { url: urlMatch[2], provider: 'youtube' },
        });
      }
      i++;
      continue;
    }

    // Quiz: look for question followed by ✓/○ answer lines
    if (isQuizStart(lines, i)) {
      const { block, endIndex } = parseQuizBlock(lines, i);
      if (block) blocks.push(block);
      i = endIndex;
      continue;
    }

    // Rich text: accumulate until we hit a different block type
    const richLines: string[] = [];
    while (i < lines.length) {
      const l = lines[i].trim();
      if (!l) { richLines.push(''); i++; continue; }
      if (/^!\[/.test(l) || /^🎬/.test(l) || isQuizStart(lines, i)) break;
      if (/^>\s*\*\*Lesson \d+/.test(l)) break;
      richLines.push(lines[i]);
      i++;
    }
    const html = mdToHtml(richLines.join('\n'));
    if (html.trim()) {
      blocks.push({ block_type: 'rich_text', data: { html, mode: 'scrolling' } });
    }
  }

  return blocks;
}
```

- [ ] **Step 6: Write quiz detection and parsing**

SCAGO quizzes use `✓` for correct and `○` for incorrect answers:

```typescript
function isQuizStart(lines: string[], index: number): boolean {
  // Look ahead: is there a question followed by ✓/○ answer lines within 5 lines?
  const searchWindow = Math.min(index + 8, lines.length);
  let hasQuestion = false;
  let hasAnswers = false;

  for (let j = index; j < searchWindow; j++) {
    const l = lines[j].trim();
    if (/^\*\*Question:\*\*/.test(l) || /^\*\*.*\?\*\*/.test(l)) hasQuestion = true;
    if (/^- [✓○]/.test(l)) hasAnswers = true;
  }

  // Also detect inline quiz: bold statement + ✓/○ answers without **Question:** prefix
  if (!hasQuestion) {
    for (let j = index; j < searchWindow; j++) {
      if (/^- [✓○]/.test(lines[j].trim())) {
        // Look back for a bold line as the question
        for (let k = j - 1; k >= index; k--) {
          if (/^\*\*[^*]+\*\*/.test(lines[k].trim())) {
            hasQuestion = true;
            break;
          }
        }
        break;
      }
    }
  }

  return hasQuestion && hasAnswers;
}

function parseQuizBlock(lines: string[], startIndex: number): { block: ParsedBlock | null; endIndex: number } {
  let question = '';
  let explanation = '';
  const options: { text: string; isCorrect: boolean }[] = [];
  let i = startIndex;

  // Find the question text
  while (i < lines.length) {
    const l = lines[i].trim();
    if (/^\*\*Question:\*\*/.test(l)) {
      question = l.replace(/^\*\*Question:\*\*\s*/, '').replace(/^#\s*/, '').trim();
      i++;
      break;
    }
    if (/^\*\*Explanation:\*\*/.test(l)) {
      explanation = l.replace(/^\*\*Explanation:\*\*\s*/, '').replace(/^#\s*/, '').trim();
      i++;
      continue;
    }
    // Bold question line before answer options
    if (/^\*\*[^*]+\*\*$/.test(l) && !question) {
      question = l.replace(/^\*\*|\*\*$/g, '').replace(/^#\s*/, '').trim();
      i++;
      // Check if next lines are answers
      if (i < lines.length && /^- [✓○]/.test(lines[i].trim())) break;
      continue;
    }
    if (/^- [✓○]/.test(l)) break; // Answers start without explicit question
    i++;
  }

  // Collect answer options
  while (i < lines.length) {
    const l = lines[i].trim();
    const correctMatch = l.match(/^- ✓\s*#?\s*(.+)$/);
    const incorrectMatch = l.match(/^- ○\s*#?\s*(.+)$/);

    if (correctMatch) {
      options.push({ text: correctMatch[1].trim(), isCorrect: true });
      i++;
    } else if (incorrectMatch) {
      options.push({ text: incorrectMatch[1].trim(), isCorrect: false });
      i++;
    } else if (/^\*\*Explanation:\*\*/.test(l)) {
      explanation = l.replace(/^\*\*Explanation:\*\*\s*/, '').replace(/^#\s*/, '').trim();
      i++;
    } else if (!l || /^\*\*/.test(l) || /^- [✓○]/.test(l)) {
      // If we hit another bold line or empty line after collecting answers, check for more quiz questions
      if (!l) { i++; continue; }
      // Check if another quiz question follows (group consecutive quizzes)
      break;
    } else {
      break;
    }
  }

  if (!question && options.length === 0) return { block: null, endIndex: i };

  // Use question or fall back to explanation
  if (!question && explanation) question = explanation;
  if (!question) question = 'Question';

  const correctAnswer = options.find(o => o.isCorrect)?.text ?? '';
  const isSelectAll = options.filter(o => o.isCorrect).length > 1;
  const isTrueFalse = options.length === 2 &&
    options.some(o => /^true$/i.test(o.text)) &&
    options.some(o => /^false$/i.test(o.text));

  return {
    block: {
      block_type: 'quiz_inline',
      data: {
        question,
        options: options.map(o => o.text),
        correct_answer: correctAnswer,
        question_type: isTrueFalse ? 'true_false' : (isSelectAll ? 'select_all' : 'multiple_choice'),
        show_feedback: true,
        explanation: explanation || undefined,
      },
    },
    endIndex: i,
  };
}
```

- [ ] **Step 7: Write the markdown-to-HTML converter**

Adapt from the existing GANSID converter but handle SCAGO-specific patterns (leading `#` in content lines, `**Before:**`/`**After:**` cards):

```typescript
function mdToHtml(text: string): string {
  // Same structure as scripts/import-markdown-modules/import.ts mdToHtml()
  // but additionally:
  // - Strip leading "# " from content lines (SCAGO uses # as bullet points)
  // - Handle **Before:**/**After:** as styled comparison blocks
  // - Preserve <em>/<strong> from existing markdown bold/italic
  // - Strip survey/feedback questions ("Did Module N meet your learning needs?", etc.)
  // ... (full implementation based on GANSID import.ts mdToHtml, adapted)
}
```

- [ ] **Step 8: Wire up the main parse function**

```typescript
export function parseModule(def: ModuleDef, baseDir: string): ParsedModule {
  const filePath = path.join(baseDir, def.fileName);
  const markdown = fs.readFileSync(filePath, 'utf8');

  const rawLessons = splitIntoLessons(markdown);
  const lessons: ParsedLesson[] = rawLessons.map((raw, index) => ({
    title: raw.title,
    orderIndex: index,
    slides: splitIntoSlides(raw.body, raw.title),
  }));

  return {
    number: def.number,
    title: def.title,
    slug: def.slug,
    description: `Module ${def.number} of the SCAGO Sickle Cell Disease Education Program for Healthcare Providers.`,
    lessons,
  };
}
```

- [ ] **Step 9: Test the parser on Module 1**

Run: `npx tsx scripts/import-scago/index.ts --parse-only --module 1`

Expected output: Statistics showing 5 lessons, multiple slides per lesson, correct block type counts. Verify no lesson has all content on a single slide.

- [ ] **Step 10: Commit parser**

```bash
git add scripts/import-scago/types.ts scripts/import-scago/parse-markdown.ts
git commit -m "feat: add SCAGO markdown parser with slide splitting and quiz detection"
```

---

### Task 4: Image Upload Pipeline

**Files:**
- Create: `scripts/import-scago/upload-images.ts`

Upload 313 images (142 MB) to a `scago-assets` Supabase Storage bucket, preserving folder structure.

- [ ] **Step 1: Create the scago-assets bucket**

Via Supabase MCP `execute_sql`:
```sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('scago-assets', 'scago-assets', true)
ON CONFLICT (id) DO NOTHING;
```

- [ ] **Step 2: Write the upload script**

```typescript
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const IMAGES_DIR = path.resolve(__dirname, '../../../SCAGO Modules/images');
const BUCKET = 'scago-assets';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function uploadAllImages(): Promise<Map<string, string>> {
  const urlMap = new Map<string, string>(); // relative path → public URL
  const allFiles = getAllFiles(IMAGES_DIR);

  console.log(`Found ${allFiles.length} images to upload`);

  for (let i = 0; i < allFiles.length; i++) {
    const absPath = allFiles[i];
    const relativePath = path.relative(IMAGES_DIR, absPath).replace(/\\/g, '/');
    const storagePath = relativePath; // e.g., Module_1_.../Lesson_01_.../file.png

    const fileBuffer = fs.readFileSync(absPath);
    const ext = path.extname(absPath).toLowerCase();
    const contentType = ext === '.png' ? 'image/png' : ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : 'application/octet-stream';

    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, fileBuffer, { contentType, upsert: true });

    if (error) {
      console.error(`  Failed: ${storagePath} — ${error.message}`);
      continue;
    }

    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);
    const publicUrl = urlData.publicUrl;

    // Map the relative path as used in markdown (../images/Module_X/...) to the public URL
    const markdownRelative = `../images/${relativePath}`;
    urlMap.set(markdownRelative, publicUrl);

    if ((i + 1) % 20 === 0) console.log(`  Uploaded ${i + 1}/${allFiles.length}`);
  }

  console.log(`Upload complete: ${urlMap.size} images`);
  return urlMap;
}

function getAllFiles(dir: string): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...getAllFiles(full));
    else files.push(full);
  }
  return files;
}
```

- [ ] **Step 3: Add image URL rewriting to the parser**

After parsing, walk all `image_gallery` blocks and replace relative `../images/...` paths with Supabase Storage URLs using the `urlMap` from the upload step.

```typescript
export function rewriteImageUrls(modules: ParsedModule[], urlMap: Map<string, string>): void {
  for (const mod of modules) {
    for (const lesson of mod.lessons) {
      for (const slide of lesson.slides) {
        for (const block of slide.blocks) {
          if (block.block_type === 'image_gallery') {
            const images = (block.data.images as any[]) ?? [];
            for (const img of images) {
              const resolved = urlMap.get(img.url);
              if (resolved) img.url = resolved;
            }
          }
        }
      }
    }
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add scripts/import-scago/upload-images.ts
git commit -m "feat: add SCAGO image upload pipeline to Supabase Storage"
```

---

### Task 5: SQL Generation

**Files:**
- Create: `scripts/import-scago/generate-sql.ts`

Generate SQL INSERT statements from the parsed module data, creating courses/modules/lessons/slides/lesson_blocks.

- [ ] **Step 1: Write the SQL generator**

Follow the same pattern as `scripts/import-markdown-modules/import.ts` `generateSQL()`:
- One course per module
- One DB module per course (1:1)
- Lessons with sequential `order_index`
- One slide per parsed slide (with sequential `order_index`)
- Lesson blocks linked to both lesson_id and slide_id

```typescript
import crypto from 'crypto';
import type { ParsedModule } from './types';

export function generateSQL(modules: ParsedModule[], institutionId: string): string {
  const lines: string[] = [];

  lines.push('-- SCAGO LMS — Course content seed');
  lines.push(`-- Generated: ${new Date().toISOString()}`);
  lines.push(`-- Institution: ${institutionId}`);
  lines.push('');
  lines.push('BEGIN;');
  lines.push('');

  for (const mod of modules) {
    const courseId = crypto.randomUUID();
    const moduleId = crypto.randomUUID();

    // Course INSERT
    lines.push(`INSERT INTO courses (id, title, slug, description, institution_id, status, is_published)`);
    lines.push(`VALUES ('${courseId}', ${sqlStr(mod.title)}, ${sqlStr(mod.slug)}, ${sqlStr(mod.description)}, '${institutionId}', 'published', true);`);
    lines.push('');

    // Module INSERT
    lines.push(`INSERT INTO modules (id, course_id, institution_id, title, description, order_index, is_published)`);
    lines.push(`VALUES ('${moduleId}', '${courseId}', '${institutionId}', ${sqlStr(mod.title)}, ${sqlStr(mod.description)}, 0, true);`);
    lines.push('');

    for (let li = 0; li < mod.lessons.length; li++) {
      const lesson = mod.lessons[li];
      const lessonId = crypto.randomUUID();

      lines.push(`INSERT INTO lessons (id, course_id, module_id, title, order_index, content_type, is_required, institution_id)`);
      lines.push(`VALUES ('${lessonId}', '${courseId}', '${moduleId}', ${sqlStr(lesson.title)}, ${li}, 'blocks', true, '${institutionId}');`);
      lines.push('');

      for (let si = 0; si < lesson.slides.length; si++) {
        const slide = lesson.slides[si];
        const slideId = crypto.randomUUID();

        lines.push(`INSERT INTO slides (id, lesson_id, slide_type, title, order_index, status, settings)`);
        lines.push(`VALUES ('${slideId}', '${lessonId}', 'content', ${sqlStr(slide.title)}, ${si}, 'published', '{}');`);
        lines.push('');

        for (let bi = 0; bi < slide.blocks.length; bi++) {
          const block = slide.blocks[bi];
          const blockId = crypto.randomUUID();
          const dataJson = JSON.stringify(block.data).replace(/\\/g, '\\\\').replace(/'/g, "''");

          lines.push(`INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, title, data, order_index, is_visible, settings, version)`);
          lines.push(`VALUES ('${blockId}', '${lessonId}', '${slideId}', '${institutionId}', '${block.block_type}', ${block.title ? sqlStr(block.title) : 'NULL'}, '${dataJson}'::jsonb, ${bi}, true, '{}', 1);`);
          lines.push('');
        }
      }
    }
  }

  lines.push('COMMIT;');
  return lines.join('\n');
}

function sqlStr(s: string): string {
  if (s.includes("'") || s.includes('\\')) {
    const tag = 'SQLDQ';
    if (!s.includes(`$${tag}$`)) return `$${tag}$${s}$${tag}$`;
    return `'${s.replace(/'/g, "''")}'`;
  }
  return `'${s}'`;
}
```

- [ ] **Step 2: Commit**

```bash
git add scripts/import-scago/generate-sql.ts
git commit -m "feat: add SCAGO SQL generator for courses/modules/lessons/slides/blocks"
```

---

### Task 6: CLI Entry Point & Full Pipeline

**Files:**
- Create: `scripts/import-scago/index.ts`

- [ ] **Step 1: Write the orchestration script**

```typescript
import path from 'path';
import fs from 'fs';
import { SCAGO_MODULES, parseModule } from './parse-markdown';
import { generateSQL } from './generate-sql';
import { uploadAllImages, rewriteImageUrls } from './upload-images';
import type { ParsedModule } from './types';

const SCAGO_DIR = path.resolve(__dirname, '../../../SCAGO Modules');
const OUTPUT_DIR = path.join(__dirname, 'output');
const SCAGO_INSTITUTION_ID = '<SCAGO_UUID_FROM_TASK_1>'; // Replace after Task 1

async function main() {
  const args = process.argv.slice(2);
  const parseOnly = args.includes('--parse-only');
  const moduleFilter = args.find(a => a.startsWith('--module='))?.split('=')[1];

  const defs = moduleFilter
    ? SCAGO_MODULES.filter(m => m.number === Number(moduleFilter))
    : SCAGO_MODULES;

  console.log(`\nParsing ${defs.length} SCAGO modules...\n`);

  const modules: ParsedModule[] = [];
  for (const def of defs) {
    const parsed = parseModule(def, SCAGO_DIR);
    modules.push(parsed);

    const totalSlides = parsed.lessons.reduce((s, l) => s + l.slides.length, 0);
    const totalBlocks = parsed.lessons.reduce((s, l) => s + l.slides.reduce((s2, sl) => s2 + sl.blocks.length, 0), 0);
    console.log(`  Module ${def.number}: ${parsed.lessons.length} lessons, ${totalSlides} slides, ${totalBlocks} blocks`);
  }

  if (parseOnly) {
    printStats(modules);
    return;
  }

  // Upload images
  console.log('\nUploading images...');
  const urlMap = await uploadAllImages();

  // Rewrite image URLs
  rewriteImageUrls(modules, urlMap);

  // Generate SQL
  console.log('\nGenerating SQL...');
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const sql = generateSQL(modules, SCAGO_INSTITUTION_ID);
  const outputPath = path.join(OUTPUT_DIR, 'scago-courses.sql');
  fs.writeFileSync(outputPath, sql, 'utf8');

  printStats(modules);
  console.log(`\nSQL written to: ${outputPath}`);
  console.log('Apply via Supabase MCP: execute_sql with the file contents');
}

function printStats(modules: ParsedModule[]) {
  let totalLessons = 0, totalSlides = 0, totalBlocks = 0;
  let richText = 0, images = 0, videos = 0, quizzes = 0;

  for (const mod of modules) {
    for (const lesson of mod.lessons) {
      totalLessons++;
      for (const slide of lesson.slides) {
        totalSlides++;
        for (const block of slide.blocks) {
          totalBlocks++;
          if (block.block_type === 'rich_text') richText++;
          if (block.block_type === 'image_gallery') images++;
          if (block.block_type === 'video') videos++;
          if (block.block_type === 'quiz_inline') quizzes++;
        }
      }
    }
  }

  console.log(`\n  Courses: ${modules.length}`);
  console.log(`  Lessons: ${totalLessons}`);
  console.log(`  Slides:  ${totalSlides}`);
  console.log(`  Blocks:  ${totalBlocks} (${richText} rich_text, ${images} image_gallery, ${videos} video, ${quizzes} quiz_inline)`);
}

main().catch(err => {
  console.error('Failed:', err.message);
  process.exit(1);
});
```

- [ ] **Step 2: Run parse-only to validate**

```bash
npx tsx scripts/import-scago/index.ts --parse-only
```

Expected: All 13 modules parsed with reasonable stats. Each lesson should have multiple slides. No single slide should have all of a lesson's content.

- [ ] **Step 3: Run full pipeline (upload + generate)**

```bash
npx tsx scripts/import-scago/index.ts
```

Expected: Images uploaded to `scago-assets` bucket, SQL file generated at `scripts/import-scago/output/scago-courses.sql`.

- [ ] **Step 4: Apply SQL via Supabase MCP**

Run: `execute_sql` with the contents of `scago-courses.sql` (may need to split into batches if too large for a single call).

- [ ] **Step 5: Verify courses exist**

Run: `execute_sql` →
```sql
SELECT c.title, count(l.id) as lessons, count(s.id) as slides
FROM courses c
JOIN modules m ON m.course_id = c.id
JOIN lessons l ON l.module_id = m.id
JOIN slides s ON s.lesson_id = l.id
WHERE c.institution_id = '<SCAGO_UUID>'
GROUP BY c.title
ORDER BY c.title;
```

Expected: 13 courses with correct lesson and slide counts.

- [ ] **Step 6: Commit everything**

```bash
git add scripts/import-scago/
git commit -m "feat: SCAGO course import pipeline — 13 courses with slides and blocks"
```

---

### Task 7: Legacy User Import

**Files:**
- Create: `scripts/import-scago/import-legacy-users.ts`

Import ~2,868 SCAGO users from CSV into the `legacy_users` table.

- [ ] **Step 1: Write the CSV parser and SQL generator**

```typescript
import fs from 'fs';
import path from 'path';

const CSV_PATH = path.resolve(__dirname, '../../../SCAGO Modules/Users/users (1).csv');
const SCAGO_INSTITUTION_ID = '<SCAGO_UUID_FROM_TASK_1>';

interface CsvUser {
  email: string;
  firstName: string | null;
  lastName: string | null;
  fullName: string | null;
  roles: string;
  userGroups: string;
  dateRegistered: string;
  occupation: string | null;
  country: string | null;
  organization: string | null;
}

function parseCsv(filePath: string): CsvUser[] {
  const raw = fs.readFileSync(filePath, 'utf8');
  const lines = raw.split('\n').slice(1); // Skip header
  const users: CsvUser[] = [];

  for (const line of lines) {
    if (!line.trim()) continue;

    // CSV parsing (handle commas inside quoted fields)
    const fields = parseCSVLine(line);
    const email = fields[0]?.trim().toLowerCase();
    if (!email) continue;

    const firstName = fields[2]?.trim() || null;
    const lastName = fields[3]?.trim() || null;
    const fullName = firstName && lastName ? `${firstName} ${lastName}` : firstName || lastName || null;

    users.push({
      email,
      firstName,
      lastName,
      fullName,
      roles: fields[5]?.trim() || 'Learner',
      userGroups: fields[4]?.trim() || '',
      dateRegistered: fields[6]?.trim() || new Date().toISOString(),
      occupation: fields[9]?.trim() || null,
      country: fields[15]?.trim() || null,
      organization: fields[12]?.trim() || null,
    });
  }

  return users;
}

function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      fields.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  fields.push(current);
  return fields;
}

export function generateLegacyUserSQL(): string {
  const users = parseCsv(CSV_PATH);
  const lines: string[] = [];

  lines.push('-- SCAGO Legacy Users Seed');
  lines.push(`-- Generated: ${new Date().toISOString()}`);
  lines.push(`-- Total: ${users.length} users`);
  lines.push('');
  lines.push(`INSERT INTO public.legacy_users (institution_id, email, full_name, first_name, last_name, roles, occupation, affiliation, country, date_registered)`);
  lines.push('VALUES');

  const values = users.map(u => {
    const sqlVal = (v: string | null) => v ? `'${v.replace(/'/g, "''")}'` : 'NULL';
    return `  ('${SCAGO_INSTITUTION_ID}', ${sqlVal(u.email)}, ${sqlVal(u.fullName)}, ${sqlVal(u.firstName)}, ${sqlVal(u.lastName)}, ${sqlVal(u.roles)}, ${sqlVal(u.occupation)}, ${sqlVal(u.organization)}, ${sqlVal(u.country)}, ${sqlVal(u.dateRegistered)})`;
  });

  lines.push(values.join(',\n'));
  lines.push('ON CONFLICT (institution_id, email) DO NOTHING;');
  lines.push('');

  // Extract unique user groups
  const groupNames = new Set<string>();
  for (const u of users) {
    if (u.userGroups) {
      for (const g of u.userGroups.split(';')) {
        const name = g.trim();
        if (name && name !== 'Frozen User Group') groupNames.add(name);
      }
    }
  }

  if (groupNames.size > 0) {
    lines.push('-- User groups');
    for (const name of groupNames) {
      lines.push(`INSERT INTO public.user_groups (institution_id, name) VALUES ('${SCAGO_INSTITUTION_ID}', '${name.replace(/'/g, "''")}') ON CONFLICT (institution_id, name) DO NOTHING;`);
    }
  }

  return lines.join('\n');
}
```

- [ ] **Step 2: Generate and review**

```bash
npx tsx -e "import { generateLegacyUserSQL } from './scripts/import-scago/import-legacy-users'; import fs from 'fs'; fs.writeFileSync('scripts/import-scago/output/scago-legacy-users.sql', generateLegacyUserSQL());"
```

Review the output file — check user count, no duplicate emails, clean data.

- [ ] **Step 3: Apply via Supabase MCP**

Run: `execute_sql` with the contents (may need batching for ~2,868 rows).

- [ ] **Step 4: Verify**

```sql
SELECT count(*) FROM legacy_users WHERE institution_id = '<SCAGO_UUID>';
```

Expected: ~2,868 rows.

- [ ] **Step 5: Commit**

```bash
git add scripts/import-scago/import-legacy-users.ts scripts/import-scago/output/scago-legacy-users.sql
git commit -m "feat: import SCAGO legacy users from CSV (~2,868 users)"
```

---

### Task 8: Smoke Test & End-to-End Verification

**Files:** None (testing only)

- [ ] **Step 1: Start dev server and test SCAGO student view**

```bash
npm run dev -- -p 3001
```

Navigate to `http://localhost:3001/scago/student` — should show login page.

- [ ] **Step 2: Test SCAGO admin view**

Log in as `tech@sicklecellanemia.ca`, navigate to `http://localhost:3001/scago/admin`.

Expected: 13 SCAGO courses visible with correct titles.

- [ ] **Step 3: Verify course content — spot check Module 1**

Click into Module 1 (Fundamentals of SCD) → preview the course.

Verify:
- 5 lessons in sidebar
- Each lesson has multiple slides (not all content on one slide)
- Images load from Supabase Storage
- Quiz slides render with answer options
- Video slides show YouTube embeds

- [ ] **Step 4: Verify GANSID isolation**

Navigate to `http://localhost:3001/gansid/admin` — should show GANSID courses only (no SCAGO courses mixed in).

- [ ] **Step 5: Test legacy user visibility**

In SCAGO admin → Users tab → Legacy Users tab. Should show ~2,868 imported users.

- [ ] **Step 6: Update CLAUDE.md with SCAGO context**

Add SCAGO institution UUID, module list, and migration 024 to the CLAUDE.md documentation.

- [ ] **Step 7: Final commit**

```bash
git add CLAUDE.md
git commit -m "docs: add SCAGO tenant to CLAUDE.md — institution, courses, migration 024"
```

---

## Execution Order & Dependencies

```
Task 1 (DB setup) → provides SCAGO institution UUID
  ↓
Task 2 (Admin filtering) — independent, can parallel with Task 3
Task 3 (Parser) → produces parsed module data
  ↓
Task 4 (Image upload) → produces URL map
  ↓
Task 5 (SQL gen) → uses parsed data + URL map
  ↓
Task 6 (CLI + apply SQL) → courses in DB
  ↓
Task 7 (Legacy users) — independent of Tasks 3-6
  ↓
Task 8 (Smoke test) — depends on all above
```

Tasks 2 and 7 can run in parallel with Tasks 3-6.
