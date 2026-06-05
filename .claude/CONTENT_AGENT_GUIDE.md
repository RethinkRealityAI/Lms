# GANSID LMS — Content Agent Guide

> **Audience:** AI agents that need to programmatically create or migrate course content into the LMS.  
> **Purpose:** Maps every block type, its exact data schema, and the full DB call chain for creating courses from scratch or porting content from external platforms (EdApp, Articulate, H5P, Google Docs, etc.).

---

## Table of Contents

1. [Data Hierarchy](#1-data-hierarchy)
2. [Complete Creation Workflow](#2-complete-creation-workflow)
3. [Block Type Reference](#3-block-type-reference)
4. [Content Mapping Decision Guide](#4-content-mapping-decision-guide)
5. [Slide Templates](#5-slide-templates)
6. [Grid Layout System](#6-grid-layout-system)
7. [Theme System](#7-theme-system)
8. [End-to-End Example: Migrate a Module](#8-end-to-end-example-migrate-a-module)
9. [Key Constraints & Gotchas](#9-key-constraints--gotchas)

---

## 1. Data Hierarchy

```
Institution
└── Course  (courses table, institution_id FK)
    └── Module  (modules table, course_id FK)
        └── Lesson  (lessons table, module_id + course_id FK)
            └── Slide  (slides table, lesson_id FK, ordered by order_index)
                ├── [title slide]     — auto-rendered, no blocks needed
                ├── [content slides]  — 1..N Blocks per slide
                └── [completion slide] — auto-rendered, no blocks needed
```

**Key rules:**
- Every lesson automatically gets a **title slide** (first) and **completion slide** (last) rendered by the viewer. You do NOT create blocks for these.
- A **slide** is a "page" of content. A lesson may have multiple slides.
- **Blocks** are the actual content components placed on slides.
- Block position on a slide is stored in `block.data.gridX/Y/W/H` (12-column CSS grid).
- `order_index` is 0-based and determines display order.

---

## 2. Complete Creation Workflow

### Required: Supabase Client

All DB functions accept a `SupabaseClient` as their first argument. In a server context use `@/lib/supabase/server`, in client use `@/lib/supabase/client`.

```typescript
import { createClient } from '@/lib/supabase/server'; // server-side
const supabase = await createClient();
```

### Step-by-step: Create a full course

```typescript
import { createClient } from '@/lib/supabase/server';

const supabase = await createClient();
const INSTITUTION_ID = 'ba52611f-9ad5-44b7-824e-97725a177336'; // SCAGO
// GANSID: '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a'

// ── 1. Create Course ───────────────────────────────────────────────────────
const { data: course } = await supabase
  .from('courses')
  .insert({
    institution_id: INSTITUTION_ID,
    title: 'My New Course',
    description: 'Course description here',
    status: 'draft',                  // 'draft' | 'published' | 'archived'
    access_mode: 'all',               // 'all' | 'restricted'
    theme_settings: {},               // CourseThemeSettings (optional)
  })
  .select()
  .single();

// ── 2. Create Module ───────────────────────────────────────────────────────
const { data: module } = await supabase
  .from('modules')
  .insert({
    course_id: course.id,
    institution_id: INSTITUTION_ID,
    title: 'Module 1 - Introduction',
    order_index: 0,
  })
  .select()
  .single();

// ── 3. Create Lesson ───────────────────────────────────────────────────────
const { data: lesson } = await supabase
  .from('lessons')
  .insert({
    module_id: module.id,
    course_id: course.id,
    institution_id: INSTITUTION_ID,
    title: 'Lesson 1 - Overview',
    description: 'Brief description shown on the title slide',
    content_type: 'blocks',           // Always 'blocks' for block-based lessons
    content_url: '',                  // Required field, use '' for block lessons
    order_index: 0,
    title_slide_settings: {           // Optional: customize title slide
      title_size: 'lg',               // 'sm'|'md'|'lg'|'xl'|'2xl'
      title_color: '#FFFFFF',
      footer_text: 'SCAGO',
      footer_logo_url: null,
    },
  })
  .select()
  .single();

// ── 4. Create Slide ────────────────────────────────────────────────────────
const { data: slide } = await supabase
  .from('slides')
  .insert({
    lesson_id: lesson.id,
    institution_id: INSTITUTION_ID,
    slide_type: 'content',            // see SlideType enum below
    title: 'What is Sickle Cell Disease?',
    order_index: 0,
    status: 'published',
    settings: {
      background: '#FFFFFF',          // hex | 'gradient' | undefined
      block_style: 'glass',           // 'glass'|'glass-dark'|'classic'|'none'
    },
  })
  .select()
  .single();

// ── 5. Create Block(s) on the Slide ────────────────────────────────────────
await supabase
  .from('lesson_blocks')
  .insert({
    lesson_id: lesson.id,
    slide_id: slide.id,
    institution_id: INSTITUTION_ID,
    block_type: 'rich_text',
    order_index: 0,
    is_visible: true,
    data: {
      html: '<h2>What is Sickle Cell Disease?</h2><p>Sickle cell disease (SCD) is...</p>',
      mode: 'standard',
      // Grid position (optional — defaults to full-width row 0)
      gridX: 0, gridY: 0, gridW: 12, gridH: 3,
    },
  });
```

### SlideType values

| Value | Use when |
|-------|----------|
| `'content'` | General text/media/interactive content |
| `'title'` | Manually creating a title page (viewer adds one automatically) |
| `'media'` | Slide dominated by a video or image |
| `'quiz'` | Knowledge check / assessment slide |
| `'disclaimer'` | Legal notice, warning, or acknowledgement |
| `'interactive'` | Embedded H5P, iframe, or scratch/match activity |
| `'canvas'` | Freeform tldraw layout (no blocks — use `canvas_data`) |

---

## 3. Block Type Reference

All blocks share these common `data` fields for grid positioning:

```typescript
// Embed in any block's data object to control position/size
{
  gridX: 0,    // Column start (0–11)
  gridY: 0,    // Row start (0–N)
  gridW: 12,   // Column span (1–12; 12 = full width)
  gridH: 3,    // Row span (auto-height blocks ignore this)
  contentAlign: 'top' | 'center' | 'bottom',  // vertical alignment in cell
}
```

---

### 🔤 `rich_text` — Rich Text Block

**Category:** content | **Use for:** paragraphs, headings, formatted text, links

```typescript
interface RichTextData {
  html: string;                           // REQUIRED: Tiptap-compatible HTML
  mode?: 'standard' | 'scrolling' | 'sequence' | 'fallback';  // default: 'standard'
}
```

**Example:**
```typescript
{
  block_type: 'rich_text',
  data: {
    html: '<h2>Key Concepts</h2><p>Sickle cell disease affects <strong>red blood cells</strong>.</p><ul><li>Point one</li><li>Point two</li></ul>',
    mode: 'standard',
    gridX: 0, gridY: 0, gridW: 12, gridH: 3,
  }
}
```

**Supported HTML tags:** `h1–h4`, `p`, `strong`, `em`, `u`, `s`, `ul/ol/li`, `blockquote`, `a href`, `br`, `hr`, `table/tr/td/th`, inline styles.

**Security note:** Links with `href` starting with `javascript:`, `vbscript:`, or `data:` are stripped by the viewer sanitizer.

---

### 🖼️ `image_gallery` — Image / Gallery Block

**Category:** media | **Use for:** single images, photo grids, carousels

```typescript
interface ImageGalleryData {
  images: Array<{
    url: string;                        // REQUIRED: absolute URL (https://)
    caption?: string | null;            // HTML caption rendered below image
    alt?: string;
  }>;
  mode?: 'single' | 'gallery' | 'slider' | 'carousel';  // default: 'single'
  aspectRatio?: string;                 // e.g. '16/9', '4/3', '1/1'
  objectFit?: 'cover' | 'contain';      // default: 'contain'
  displaySize?: 'sm' | 'md' | 'lg' | 'xl';              // default: 'md'
  enableLightbox?: boolean;             // default: true
  requireAllClicked?: boolean;          // completion gating
  prompt?: string;                      // instructional text above gallery
  promptPosition?: 'none' | 'top' | 'bottom';
}
```

**Decision:** Use `mode: 'single'` for one image, `'gallery'` for multiple, `'slider'` for horizontal scroll.

**Example:**
```typescript
{
  block_type: 'image_gallery',
  data: {
    images: [
      { url: 'https://example.com/red-blood-cell.jpg', caption: 'Normal red blood cell' },
      { url: 'https://example.com/sickle-cell.jpg', caption: 'Sickle-shaped cell' },
    ],
    mode: 'gallery',
    aspectRatio: '4/3',
    objectFit: 'cover',
  }
}
```

---

### 🎬 `video` — Video Block

**Category:** media | **Use for:** YouTube, Vimeo, or direct MP4 URLs

```typescript
interface VideoData {
  url: string;                          // REQUIRED: YouTube/Vimeo/direct MP4 URL
  poster?: string;                      // Thumbnail URL
  caption?: string;                     // Text shown below video
  title?: string;
  autoplay?: boolean;                   // default: false
  start?: number;                       // Start time in seconds
  end?: number;                         // End time in seconds
}
```

**Example:**
```typescript
{
  block_type: 'video',
  data: {
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    title: 'Introduction to Sickle Cell Disease',
    caption: 'Watch this 5-minute overview before proceeding.',
  }
}
```

---

### 💬 `callout` — Callout / Speech Bubble

**Category:** content | **Use for:** tips, warnings, disclaimers, expert quotes

```typescript
interface CalloutData {
  mode?: 'callout' | 'speech_bubble';  // default: 'callout'
  // --- CALLOUT mode ---
  variant?: 'info' | 'warning' | 'tip' | 'success';  // default: 'info'
  html?: string;                        // Rich text content
  title?: string;                       // Bold heading
  // --- SPEECH BUBBLE mode ---
  bubble_text?: string;                 // Quote / speech content
  author_name?: string;
  author_title?: string;
  avatar_url?: string;
  direction?: 'left' | 'right';
  bubble_style?: 'light' | 'dark' | 'accent';
  avatar_style?: 'circle' | 'square' | 'rounded';
}
```

**Examples:**
```typescript
// Info callout
{ block_type: 'callout', data: { variant: 'tip', title: 'Clinical Pearl', html: '<p>Always check HbS levels before...</p>' } }

// Doctor quote
{ block_type: 'callout', data: { mode: 'speech_bubble', bubble_text: 'Early screening is critical for outcomes.', author_name: 'Dr. Smith', author_title: 'Hematologist', direction: 'right' } }
```

---

### ❓ `quiz_inline` — Inline Quiz / Knowledge Check

**Category:** assessment | **Use for:** multiple choice, true/false, categorize, select-all, swipe

```typescript
interface QuizInlineData {
  question_type: 'multiple_choice' | 'true_false' | 'select_all' | 'categorize' | 'swipe';
  question?: string;
  instructions?: string;
  // --- multiple_choice, true_false ---
  options?: string[];                   // Answer choices
  correct_answer?: string;              // Must match one item in options exactly
  // --- select_all ---
  options?: string[];                   // All choices
  correct_answer?: string[];            // Array of correct choices
  // --- categorize ---
  categories?: Array<{
    name: string;
    items: string[];                    // Items that belong to this category
  }>;
  options?: string[];                   // All draggable items (union of category items)
  // --- swipe ---
  swipe_cards?: Array<{
    question: string;
    correct: 'left' | 'right';         // Which swipe direction is correct
  }>;
  // --- Feedback (all types) ---
  show_feedback?: boolean;              // default: true
  feedback_correct?: string;
  feedback_incorrect?: string;
  explanation?: string;
  shuffle_options?: boolean;
}
```

**Examples:**
```typescript
// Multiple choice
{
  block_type: 'quiz_inline',
  data: {
    question_type: 'multiple_choice',
    question: 'Which gene mutation causes sickle cell disease?',
    options: ['HBB gene', 'HBA gene', 'CFTR gene', 'BRCA1 gene'],
    correct_answer: 'HBB gene',
    show_feedback: true,
    feedback_correct: 'Correct! The HBB gene codes for beta-globin.',
    feedback_incorrect: 'Not quite. Review the genetics section.',
  }
}

// True/false
{
  block_type: 'quiz_inline',
  data: {
    question_type: 'true_false',
    question: 'Sickle cell disease is caused by a recessive mutation.',
    options: ['True', 'False'],
    correct_answer: 'True',
  }
}

// Select all that apply
{
  block_type: 'quiz_inline',
  data: {
    question_type: 'select_all',
    question: 'Which are complications of SCD? (select all)',
    options: ['Stroke', 'Vaso-occlusive crisis', 'Hypertension', 'Acute chest syndrome'],
    correct_answer: ['Stroke', 'Vaso-occlusive crisis', 'Acute chest syndrome'],
  }
}

// Categorize
{
  block_type: 'quiz_inline',
  data: {
    question_type: 'categorize',
    question: 'Sort these into the correct category',
    categories: [
      { name: 'Symptoms', items: ['Pain crisis', 'Fatigue', 'Jaundice'] },
      { name: 'Treatments', items: ['Hydroxyurea', 'Blood transfusion', 'Stem cell transplant'] },
    ],
    options: ['Pain crisis', 'Fatigue', 'Jaundice', 'Hydroxyurea', 'Blood transfusion', 'Stem cell transplant'],
  }
}
```

---

### 📊 `slider` — Numeric Slider Input

**Category:** interactive | **Use for:** rating scales, dosage selectors, likelihood questions

```typescript
interface SliderData {
  question: string;                     // REQUIRED: prompt shown above slider
  min_value?: number;                   // default: 1
  max_value?: number;                   // default: 10
  default_value?: number;               // Starting thumb position
  increment?: number;                   // Snap increment, default: 1
  decimals?: number;                    // Decimal places shown, default: 0
  min_label?: string;                   // Label at left end
  max_label?: string;                   // Label at right end
  prefix?: string;                      // e.g. '$'
  suffix?: string;                      // e.g. '%' or ' mg/dL'
  show_ticks?: boolean;                 // default: true
  required?: boolean;                   // default: false
}
```

**Example:**
```typescript
{
  block_type: 'slider',
  data: {
    question: 'How confident are you in managing a vaso-occlusive crisis?',
    min_value: 1,
    max_value: 10,
    min_label: 'Not confident',
    max_label: 'Very confident',
    show_ticks: true,
  }
}
```

---

### 🔗 `cta` — Call to Action (External Link)

**Category:** navigation | **Use for:** links to external resources, handouts, references

```typescript
interface CtaData {
  text?: string;                        // Optional description above button
  button_label?: string;                // Button text, default: 'Click Here'
  url?: string;                         // External URL (opens in new tab)
  button_color?: string;                // Hex override
  button_style?: 'solid' | 'outline' | 'soft';  // default: 'solid'
  font_size?: 'sm' | 'md' | 'lg' | 'xl';
  align?: 'left' | 'center' | 'right';
  full_width?: boolean;
}
```

**⚠️ Important:** CTA is for EXTERNAL links only. It does NOT navigate between slides.

```typescript
{
  block_type: 'cta',
  data: {
    text: 'Download the full clinical guidelines document',
    button_label: 'Download PDF',
    url: 'https://example.com/guidelines.pdf',
    button_style: 'solid',
    align: 'center',
  }
}
```

---

### 🃏 `match_pairs` — Drag to Match

**Category:** assessment | **Use for:** term-definition matching, image-text pairing

```typescript
interface MatchPairsData {
  pairs: Array<{
    id: string;                         // Unique ID (use crypto.randomUUID())
    prompt: { type: 'text' | 'image'; text?: string; image_url?: string };
    match: { type: 'text' | 'image'; text?: string; image_url?: string };
  }>;
  prompt_side?: 'left' | 'right';       // Which column shows the prompt
  instructions?: string;
  shuffle?: boolean;                    // default: true
  show_feedback?: boolean;              // default: true
}
```

**Example:**
```typescript
{
  block_type: 'match_pairs',
  data: {
    pairs: [
      { id: 'p1', prompt: { type: 'text', text: 'HbSS' }, match: { type: 'text', text: 'Most severe form of SCD' } },
      { id: 'p2', prompt: { type: 'text', text: 'HbSC' }, match: { type: 'text', text: 'Milder form with hemoglobin C' } },
      { id: 'p3', prompt: { type: 'text', text: 'HbS β-thal' }, match: { type: 'text', text: 'SCD with beta-thalassemia' } },
    ],
    instructions: 'Match each genotype to its description.',
    shuffle: true,
  }
}
```

---

### ✏️ `fill_blank` — Fill in the Blank

**Category:** assessment | **Use for:** vocabulary, clinical terminology, recall exercises

```typescript
interface FillBlankData {
  text: string;                         // REQUIRED: Use [answer] to mark blanks
  distractors?: string[];               // Wrong options mixed in with answers
  instructions?: string;
  shuffle?: boolean;                    // Shuffle word bank, default: true
  show_feedback?: boolean;              // default: true
  feedback_correct?: string;
  feedback_incorrect?: string;
}
```

**Syntax:** Wrap the correct answer in square brackets: `The gene responsible is [HBB].`  
Multiple blanks: `SCD is caused by a [recessive] mutation in the [HBB] gene.`

```typescript
{
  block_type: 'fill_blank',
  data: {
    instructions: 'Drag each word into the correct blank.',
    text: 'Sickle cell disease is caused by a mutation in the [HBB] gene, resulting in abnormal [hemoglobin] that causes red blood cells to become [rigid].',
    distractors: ['CFTR', 'albumin', 'flexible'],
  }
}
```

---

### 📋 `content_list` — Animated List / Accordion

**Category:** content | **Use for:** learning objectives, references, bullet-point summaries, FAQs

```typescript
interface ContentListData {
  heading?: string;
  items: Array<{
    title?: string;                     // Accordion header (if display_mode = 'accordion')
    html: string;                       // Rich text content of item
    animation?: 'none' | 'left' | 'right' | 'up' | 'down';
  }>;
  display_mode?: 'list' | 'accordion'; // default: 'list'
  bullet_style?: 'disc' | 'circle' | 'square' | 'dash' | 'decimal' | 'none';
  font_size?: 'auto' | 'sm' | 'md' | 'lg' | 'xl';
  enable_animations?: boolean;          // Staggered slide-in animations
  animation_stagger_ms?: number;        // Delay between items, default: 120
  // Accordion options
  accordion_icon?: 'caret' | 'plus';
  accordion_multiple?: boolean;         // Allow multiple open at once
  accordion_default_open?: 'none' | 'first' | 'all';
}
```

**Examples:**
```typescript
// Learning objectives (animated)
{
  block_type: 'content_list',
  data: {
    items: [
      { html: '<p>Define sickle cell disease and its genetic basis</p>', animation: 'left' },
      { html: '<p>Identify common complications in adults</p>', animation: 'right' },
      { html: '<p>Apply evidence-based pain management protocols</p>', animation: 'up' },
    ],
    bullet_style: 'disc',
    enable_animations: true,
    animation_stagger_ms: 150,
  }
}

// References (numbered, no animation)
{
  block_type: 'content_list',
  data: {
    items: [
      { html: '<p><strong>Kato, G.J.</strong> et al. (2018). Sickle cell disease. <em>Nature Reviews Disease Primers</em>, 4, 18010.</p>' },
      { html: '<p><strong>WHO.</strong> (2023). Sickle Cell Disease. <a href="https://www.who.int" target="_blank">who.int</a></p>' },
    ],
    bullet_style: 'decimal',
    enable_animations: false,
  }
}

// FAQ accordion
{
  block_type: 'content_list',
  data: {
    display_mode: 'accordion',
    items: [
      { title: 'Is SCD curable?', html: '<p>Stem cell transplant is the only cure, though gene therapy trials are underway.</p>' },
      { title: 'What triggers a crisis?', html: '<p>Cold, stress, dehydration, and infection are common triggers.</p>' },
    ],
    accordion_icon: 'caret',
    accordion_multiple: false,
    accordion_default_open: 'none',
  }
}
```

---

### 📝 `survey` — Multi-Question Survey

**Category:** assessment | **Use for:** pre/post assessments, confidence checks, feedback collection

```typescript
interface SurveyData {
  title?: string;                       // default: 'Survey'
  description?: string;
  submit_label?: string;                // default: 'Submit Survey'
  questions: Array<{
    id: string;                         // Unique ID (use crypto.randomUUID())
    type: 'true_false' | 'multiple_choice' | 'multi_select' | 'text' | 'textarea' | 'rating' | 'scale';
    question: string;
    required?: boolean;
    options?: string[];                 // For multiple_choice, multi_select
    min_value?: number;                 // For rating, scale
    max_value?: number;
    min_label?: string;
    max_label?: string;
    increment?: number;
  }>;
}
```

**Example:**
```typescript
{
  block_type: 'survey',
  data: {
    title: 'Pre-Module Assessment',
    description: 'These questions help us understand your starting knowledge.',
    questions: [
      {
        id: 'q1',
        type: 'multiple_choice',
        question: 'Which hemoglobin variant is associated with the most severe form of SCD?',
        options: ['HbSS', 'HbSC', 'HbS β-thal', 'HbAS'],
        required: true,
      },
      {
        id: 'q2',
        type: 'scale',
        question: 'Rate your current confidence managing SCD patients',
        min_value: 1,
        max_value: 5,
        min_label: 'Not confident',
        max_label: 'Very confident',
      },
      {
        id: 'q3',
        type: 'textarea',
        question: 'What are your biggest challenges managing SCD in your practice?',
      },
    ],
  }
}
```

---

### 🖼️ `image_compare` — Before / After Comparison

**Category:** interactive | **Use for:** medical imaging comparisons, before/after clinical photos

```typescript
interface ImageCompareData {
  before: { url: string; alt?: string };  // REQUIRED
  after: { url: string; alt?: string };   // REQUIRED
  initial_position?: number;              // 0–100, default: 50
  direction?: 'horizontal' | 'vertical'; // default: 'horizontal'
  aspect?: '16/9' | '4/3' | '1/1' | '3/2';
  fit?: 'contain' | 'cover';
  handle_style?: 'bar' | 'circle' | 'arrows';
  before_label?: string;
  after_label?: string;
  show_labels?: 'always' | 'hover' | 'never';
  prompt?: string;
  require_interaction?: boolean;          // Must drag before continuing
}
```

---

### ✨ `scratch_reveal` — Scratch to Reveal

**Category:** interactive | **Use for:** gamified reveals, hidden answers, engaging intros

```typescript
interface ScratchRevealData {
  before: {
    type: 'text' | 'image';
    text?: string;
    image_url?: string;
    bg_color?: string;
    text_color?: string;
  };
  after: {
    type: 'text' | 'image';
    text?: string;
    image_url?: string;
    bg_color?: string;
    text_color?: string;
  };
  brush_size?: number;                  // 10–120, default: 42
  reveal_threshold?: number;            // % scratched to trigger, default: 55
  animation?: 'none' | 'confetti' | 'sparkles';
  prompt?: string;
  aspect?: '16/9' | '4/3' | '1/1' | '3/2';
}
```

---

### 📄 `pdf` — PDF Viewer

**Category:** media | **Use for:** handouts, guidelines, protocol documents

```typescript
interface PdfData {
  url: string;                          // REQUIRED: absolute URL to PDF
}
```

---

### 🌐 `iframe` — Embedded Web Content

**Category:** interactive | **Use for:** external tools, simulations, forms, H5P (when not native)

```typescript
interface IframeData {
  url: string;                          // REQUIRED: https:// URL to embed
  height?: number;                      // Pixel height, default: auto
}
```

---

### ⚡ `h5p` — H5P Activity

**Category:** interactive | **Use for:** pre-built H5P interactive content

```typescript
interface H5pData {
  contentKey: string;                   // H5P content identifier
  [key: string]: unknown;               // Passthrough for H5P-specific config
}
```

---

### ➖ `page_break` — Page Break

**Category:** layout | **Use for:** splitting long lessons into navigable sub-pages

```typescript
interface PageBreakData {
  label?: string;                       // Optional label for the page break
}
```

**Note:** Page breaks split a slide's blocks into multiple swipeable "sub-pages." Students navigate between them with dot indicators.

---

### 📊 `table` — Data Table

**Category:** content | **Use for:** comparison tables, drug dosages, reference data

```typescript
interface TableData {
  title?: string;
  description?: string;
  footnote?: string;
  columns: Array<{
    id: string;                         // Column identifier (e.g. 'col-1')
    label: string;
    align?: 'left' | 'center' | 'right';
  }>;
  rows: Array<{
    id: string;                         // Row identifier (e.g. 'row-1')
    cells: Record<string, string>;      // { 'col-1': 'value', 'col-2': 'value' }
  }>;
  striped?: boolean;                    // default: true
  first_column_header?: boolean;        // Bold first column as row headers
  density?: 'comfortable' | 'compact';
  accent_color?: string;
}
```

**Example:**
```typescript
{
  block_type: 'table',
  data: {
    title: 'SCD Genotype Comparison',
    columns: [
      { id: 'genotype', label: 'Genotype', align: 'left' },
      { id: 'severity', label: 'Severity', align: 'center' },
      { id: 'hgb', label: 'Hgb (g/dL)', align: 'center' },
    ],
    rows: [
      { id: 'r1', cells: { genotype: 'HbSS', severity: 'Severe', hgb: '6–8' } },
      { id: 'r2', cells: { genotype: 'HbSC', severity: 'Moderate', hgb: '10–12' } },
      { id: 'r3', cells: { genotype: 'HbS β0-thal', severity: 'Severe', hgb: '6–9' } },
    ],
    striped: true,
    first_column_header: true,
  }
}
```

---

## 4. Content Mapping Decision Guide

Use this when parsing content from another platform and deciding which block to use.

### Text Content

| Source content | Target block | Notes |
|----------------|-------------|-------|
| Paragraph / body text | `rich_text` | Convert to HTML |
| Heading + body | `rich_text` | Use `<h2>` + `<p>` |
| Bullet / numbered list | `content_list` | Or `rich_text` with `<ul>/<ol>` |
| Learning objectives | `content_list` | Enable animations for engagement |
| References / citations | `content_list` | Use `bullet_style: 'decimal'`, no animations |
| Tip / Note / Warning box | `callout` | Pick `variant` from info/tip/warning/success |
| Quote / expert opinion | `callout` | Use `mode: 'speech_bubble'` |
| FAQ section | `content_list` | Use `display_mode: 'accordion'` |
| Comparison table | `table` | Map rows/columns directly |
| Data table | `table` | |

### Media Content

| Source content | Target block | Notes |
|----------------|-------------|-------|
| Single image | `image_gallery` | `mode: 'single'` |
| Multiple images | `image_gallery` | `mode: 'gallery'` or `'slider'` |
| Before/after images | `image_compare` | Medical imaging, clinical photos |
| YouTube/Vimeo video | `video` | Pass URL directly |
| MP4 / hosted video | `video` | Requires absolute URL |
| PDF document | `pdf` | Requires absolute URL |
| External web tool | `iframe` | Set appropriate height |

### Interactive / Assessment Content

| Source content | Target block | Notes |
|----------------|-------------|-------|
| Multiple choice question | `quiz_inline` | `question_type: 'multiple_choice'` |
| True/False question | `quiz_inline` | `question_type: 'true_false'` |
| "Select all that apply" | `quiz_inline` | `question_type: 'select_all'` |
| Term matching / drag-drop | `match_pairs` | Pairs of prompt+answer |
| Categorization drag-drop | `quiz_inline` | `question_type: 'categorize'` |
| Fill-in-the-blank | `fill_blank` | Use `[answer]` syntax |
| Rating scale | `slider` | Or survey `scale` question |
| Pre/post survey | `survey` | Multi-question form with analytics |
| Feedback form | `survey` | Use `text`/`textarea` questions |
| Gamified reveal | `scratch_reveal` | For high-engagement moments |
| Swipe left/right | `quiz_inline` | `question_type: 'swipe'` |
| External H5P | `h5p` | Requires H5P contentKey |
| External game/sim | `iframe` | Embed via URL |
| External link/resource | `cta` | One button per external link |
| Numeric input/slider | `slider` | With question label and range |

### Slide Layout Decisions

| Scenario | Recommendation |
|----------|---------------|
| Single piece of content | Full-width block (`gridW: 12`) |
| Text + image side-by-side | Two blocks: text `gridW:6`, image `gridW:6` |
| Long text needs paging | Add `page_break` blocks between sections |
| Dark background slide | Set `settings.block_style: 'glass-dark'` |
| Photo background slide | Set `settings.background_image`, use `glass-dark` |
| Pure quiz slide | Single `quiz_inline` block, full width |
| Clinical scenario | `callout` (case) + `quiz_inline` (question) stacked |

---

## 5. Slide Templates

Use these pre-built templates when creating slides. They set both `slide_type` and provide `defaultBlocks`.

| Template ID | Slide Type | Best for |
|------------|-----------|----------|
| `title` | `title` | Lesson introduction (rarely needed—viewer adds auto) |
| `learning_objectives` | `content` | Start of every lesson |
| `references` | `content` | End of every lesson |
| `content` | `content` | General text/media slide |
| `media` | `media` | Video-centric slide |
| `quiz` | `quiz` | Knowledge check |
| `disclaimer` | `disclaimer` | Legal/medical warnings |
| `interactive` | `interactive` | Embedded activities |
| `canvas` | `canvas` | Freeform tldraw layout |

To use a template's blocks when inserting:
```typescript
import { getTemplateById } from '@/lib/content/slide-templates';

const template = getTemplateById('learning_objectives');
// template.defaultBlocks → ready-to-insert block data array
// template.defaultSettings → slide settings to apply
```

---

## 6. Grid Layout System

The content canvas uses a **12-column grid**. Every block's position is stored in its `data` object.

```typescript
// Full-width block (most common)
{ gridX: 0, gridY: 0, gridW: 12, gridH: 3 }

// Left half
{ gridX: 0, gridY: 0, gridW: 6, gridH: 4 }

// Right half
{ gridX: 6, gridY: 0, gridW: 6, gridH: 4 }

// Two-thirds / one-third
{ gridX: 0, gridY: 0, gridW: 8, gridH: 4 }  // text
{ gridX: 8, gridY: 0, gridW: 4, gridH: 4 }  // image

// Stacked: block below another
{ gridX: 0, gridY: 0, gridW: 12, gridH: 3 }  // first block
{ gridX: 0, gridY: 3, gridW: 12, gridH: 3 }  // second block (gridY = sum of above)
```

**Auto-height blocks** (height is content-driven, gridH is ignored):
`rich_text`, `content_list`, `table`, `callout`, `quiz_inline`, `slider`, `match_pairs`, `fill_blank`, `cta`, `video`, `image_gallery`, `image_compare`, `scratch_reveal`, `iframe`, `pdf`, `h5p`, `survey`

**For auto-height blocks**, omit gridH or set to 3 (it will be ignored).

**gridY tip:** For stacked content, set each block's gridY to the sum of all preceding blocks' gridH values. For auto-height blocks, use sequential integers (0, 1, 2, 3...) to establish order — actual height is computed at render time.

---

## 7. Theme System

### Slide-level settings (stored in `slides.settings`)

```typescript
{
  background: '#FFFFFF' | '#1E3A5F' | 'gradient' | undefined,
  background_image: 'https://...',    // Full Supabase storage URL
  background_fit: 'cover' | 'contain',
  block_style: 'glass' | 'glass-dark' | 'classic' | 'none',
  title_color: '#FFFFFF',             // Slide title text override
}
```

### Block style guide

| Style | Use when |
|-------|----------|
| `glass` (default) | White or light background — frosted glass effect |
| `glass-dark` | Dark or photo background — smoked glass, light text |
| `classic` | Plain white card — high contrast, accessible |
| `none` | Transparent — blocks blend with background |

---

## 8. End-to-End Example: Migrate a Module

This example shows how to map a typical EdApp/Articulate lesson into the GANSID LMS.

```typescript
import { createClient } from '@/lib/supabase/server';

const supabase = await createClient();
const INSTITUTION_ID = 'ba52611f-9ad5-44b7-824e-97725a177336';

async function importLesson(lessonData: {
  title: string;
  description: string;
  slides: Array<{
    type: 'text' | 'image' | 'video' | 'quiz' | 'list';
    content: Record<string, unknown>;
  }>;
}, moduleId: string, courseId: string, orderIndex: number) {

  // 1. Create lesson
  const { data: lesson } = await supabase.from('lessons').insert({
    module_id: moduleId,
    course_id: courseId,
    institution_id: INSTITUTION_ID,
    title: lessonData.title,
    description: lessonData.description,
    content_type: 'blocks',
    content_url: '',
    order_index: orderIndex,
  }).select().single();

  // 2. Create slides for each content item
  for (let i = 0; i < lessonData.slides.length; i++) {
    const sourceSlide = lessonData.slides[i];

    // Map slide type
    const slideType = {
      text: 'content', image: 'media', video: 'media',
      quiz: 'quiz', list: 'content',
    }[sourceSlide.type] as SlideType;

    const { data: slide } = await supabase.from('slides').insert({
      lesson_id: lesson.id,
      institution_id: INSTITUTION_ID,
      slide_type: slideType,
      title: sourceSlide.content.title as string || null,
      order_index: i,
      status: 'published',
      settings: { background: '#FFFFFF', block_style: 'glass' },
    }).select().single();

    // 3. Map content → block(s)
    const blocks = mapContentToBlocks(sourceSlide, lesson.id, slide.id);
    if (blocks.length > 0) {
      await supabase.from('lesson_blocks').insert(blocks);
    }
  }

  return lesson;
}

function mapContentToBlocks(slide: any, lessonId: string, slideId: string) {
  const base = { lesson_id: lessonId, slide_id: slideId, institution_id: INSTITUTION_ID, is_visible: true };

  switch (slide.type) {
    case 'text':
      return [{
        ...base,
        block_type: 'rich_text',
        order_index: 0,
        data: { html: slide.content.html, mode: 'standard', gridX: 0, gridY: 0, gridW: 12, gridH: 3 },
      }];

    case 'image':
      return [{
        ...base,
        block_type: 'image_gallery',
        order_index: 0,
        data: {
          images: [{ url: slide.content.imageUrl, caption: slide.content.caption }],
          mode: 'single',
          objectFit: 'contain',
          gridX: 0, gridY: 0, gridW: 12, gridH: 3,
        },
      }];

    case 'video':
      return [{
        ...base,
        block_type: 'video',
        order_index: 0,
        data: { url: slide.content.videoUrl, title: slide.content.title, gridX: 0, gridY: 0, gridW: 12, gridH: 3 },
      }];

    case 'quiz':
      return [{
        ...base,
        block_type: 'quiz_inline',
        order_index: 0,
        data: {
          question_type: 'multiple_choice',
          question: slide.content.question,
          options: slide.content.options,
          correct_answer: slide.content.correctAnswer,
          show_feedback: true,
          explanation: slide.content.explanation,
          gridX: 0, gridY: 0, gridW: 12, gridH: 3,
        },
      }];

    case 'list':
      return [{
        ...base,
        block_type: 'content_list',
        order_index: 0,
        data: {
          items: slide.content.items.map((item: string) => ({ html: `<p>${item}</p>`, animation: 'none' })),
          bullet_style: 'disc',
          enable_animations: false,
          gridX: 0, gridY: 0, gridW: 12, gridH: 3,
        },
      }];

    default:
      return [];
  }
}
```

---

## 9. Key Constraints & Gotchas

### Database

- **`content_url`** is required but nullable for block lessons — always insert as `''` (empty string), never omit.
- **`institution_id`** is required on nearly every insert: `courses`, `modules`, `lessons`, `slides`, `lesson_blocks`.
- **`order_index`** is 0-based and must be unique within its parent. Use `count()` before inserting to get the next index.
- **Soft deletes:** Slides use `deleted_at` (soft delete). Blocks use hard delete. Don't set `deleted_at` manually.
- **RLS policies:** All writes require an authenticated session with `admin`, `institution_admin`, or `platform_admin` role. The `institutions` table now has an UPDATE policy (migration 032).

### Block Data

- **All image URLs must be absolute** (`https://`). Relative paths are stripped by the sanitizer.
- **`quiz_inline` `correct_answer` for `multiple_choice`** must exactly match one string in `options`.
- **`quiz_inline` `correct_answer` for `select_all`** must be a JSON array (stored as JSONB), not a string.
- **`match_pairs` and `survey` pair/question IDs** must be unique strings — use `crypto.randomUUID()`.
- **`fill_blank` syntax:** Blanks are marked with `[answer]` in the `text` field. Extractable programmatically via `getFillBlankAnswers(text)` from the schema file.
- **`page_break`** splits blocks into sub-pages. All blocks ABOVE the page_break go on page 1, blocks BELOW go on page 2, etc.

### Grid System

- **GridW must not exceed 12** — blocks wider than the grid will overflow.
- **GridX + GridW ≤ 12** — a block starting at column 6 can be at most 6 wide.
- **GridY for auto-height blocks:** Set sequential values (0, 1, 2...) — the actual pixel height is computed at render time.
- **Two blocks on same row:** Only works if their columns don't overlap. Must have identical gridY values.

### Content Fidelity Tips

- **SCORM relative image paths** (`fit_content_assets/image.jpg`) cannot be displayed — upload to Supabase Storage and use the public URL instead.
- **Audio-only content:** No native audio block exists. Use `video` block with an audio file URL, or `iframe` for an audio player.
- **Drag-and-drop that isn't match/fill:** Use `iframe` to embed the original interactive, or decompose into the closest matching block type.
- **H5P content:** Use the `h5p` block with its `contentKey` if the H5P platform is integrated; otherwise use `iframe` with the H5P embed URL.
- **Hotspot images:** No native hotspot block — use `image_gallery` with captions, or decompose into `image_gallery` + `content_list`.
