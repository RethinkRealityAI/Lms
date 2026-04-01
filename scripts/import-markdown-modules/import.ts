import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const INSTITUTION_ID = '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a';
const SCORM_BASE =
  'C:/Users/devel/OneDrive/Documents/RethinkReality/GANSID-LMS/Course SCORM packages';
const OUTPUT_DIR = path.join(process.cwd(), 'scripts/import-markdown-modules/output');

// ─── Module definitions ────────────────────────────────────────────────────────

interface ModuleDef {
  number: number;
  title: string;
  slug: string;
  file: string;
}

const MODULES: ModuleDef[] = [
  {
    number: 3,
    title: 'Volunteer Management',
    slug: 'volunteer-management',
    file: 'Module 3/module3_volunteer_management.md',
  },
  {
    number: 4,
    title: 'Leadership',
    slug: 'leadership',
    file: 'Module 4/module4_leadership.md',
  },
  {
    number: 5,
    title: 'Project Management',
    slug: 'project-management',
    file: 'Module 5/module5_project_management.md',
  },
  {
    number: 6,
    title: 'Effective Communication',
    slug: 'effective-communication',
    file: 'Module 6/module6_effective-communication.md',
  },
  {
    number: 7,
    title: 'Development of Impactful Strategic Work Plans',
    slug: 'development-of-impactful-strategic-work-plans',
    file: 'Module 7/module7_development-of-impactful-strategic-work-plans.md',
  },
  {
    number: 8,
    title: 'Grant Writing',
    slug: 'grant-writing',
    file: 'Module 8/module8_grant-writing.md',
  },
  {
    number: 9,
    title: 'Leadership: What Works and What Does Not Work',
    slug: 'leadership-what-works-and-what-does-not-work',
    file: 'Module 9/module9_leadership-what-works-and-what-does-not-work.md',
  },
  {
    number: 10,
    title: "The Final Quiz — Patient Organizations' Capacity Building Training Program",
    slug: 'final-quiz-capacity-building',
    file: 'Module 10/module10_final-quiz.md',
  },
];

// ─── Types ─────────────────────────────────────────────────────────────────────

interface QuizOption {
  text: string;
  isCorrect: boolean;
}

interface QuizBlock {
  kind: 'quiz';
  slideTitle: string;
  question: string;
  options: QuizOption[];
  correctAnswer: string;
}

interface ContentBlock {
  kind: 'content';
  slideTitle: string;
  html: string;
}

type Block = QuizBlock | ContentBlock;

interface ParsedLesson {
  title: string;
  blocks: Block[];
}

interface ParsedModule {
  def: ModuleDef;
  lessons: ParsedLesson[];
}

const warnings: string[] = [];

// ─── Markdown → HTML converter ─────────────────────────────────────────────────

function mdToHtml(text: string): string {
  const lines = text.split('\n');
  const result: string[] = [];
  let inUl = false;
  let inOl = false;

  const flushList = () => {
    if (inUl) {
      result.push('</ul>');
      inUl = false;
    }
    if (inOl) {
      result.push('</ol>');
      inOl = false;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    // Skip image placeholders and slide-type hints
    if (/^\[IMAGE\]$/i.test(line.trim())) continue;
    if (/^\*Explanation:/.test(line.trim())) continue;
    if (/^\*Source:/.test(line.trim())) continue;
    // Skip "That's it!" exit lesson slides
    if (/^nice work/i.test(line.trim())) continue;

    // Headings
    if (/^#### /.test(line)) {
      flushList();
      const content = applyInline(line.replace(/^#### /, ''));
      result.push(`<h4>${content}</h4>`);
      continue;
    }
    if (/^### /.test(line)) {
      flushList();
      const content = applyInline(line.replace(/^### /, ''));
      result.push(`<h3>${content}</h3>`);
      continue;
    }
    if (/^## /.test(line)) {
      flushList();
      const content = applyInline(line.replace(/^## /, ''));
      result.push(`<h2>${content}</h2>`);
      continue;
    }
    if (/^# /.test(line)) {
      flushList();
      const content = applyInline(line.replace(/^# /, ''));
      result.push(`<h1>${content}</h1>`);
      continue;
    }

    // Ordered list
    if (/^\d+\.\s/.test(line)) {
      if (inUl) { result.push('</ul>'); inUl = false; }
      if (!inOl) { result.push('<ol>'); inOl = true; }
      const content = applyInline(line.replace(/^\d+\.\s+/, ''));
      result.push(`<li>${content}</li>`);
      continue;
    }

    // Unordered list (- or * prefix)
    if (/^[-*]\s/.test(line)) {
      if (inOl) { result.push('</ol>'); inOl = false; }
      if (!inUl) { result.push('<ul>'); inUl = true; }
      const content = applyInline(line.replace(/^[-*]\s+/, ''));
      result.push(`<li>${content}</li>`);
      continue;
    }

    // Horizontal rule → skip
    if (/^---+$/.test(line.trim())) {
      flushList();
      continue;
    }

    // Table row → skip (too complex, just skip)
    if (/^\|/.test(line.trim())) {
      continue;
    }

    // Blank line
    if (line.trim() === '') {
      flushList();
      continue;
    }

    // Regular paragraph line
    flushList();
    const content = applyInline(line.trim());
    if (content) {
      result.push(`<p>${content}</p>`);
    }
  }

  flushList();
  return result.join('');
}

function applyInline(text: string): string {
  // Bold+italic combined: ***text***
  text = text.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
  // Bold: **text**
  text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  // Italic: *text* (not inside a word boundary that could be a list marker)
  text = text.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<em>$1</em>');
  // Remove ← *Correct* and similar annotations
  text = text.replace(/←\s*\*[^*]+\*/g, '');
  // Code: `code`
  text = text.replace(/`(.+?)`/g, '<code>$1</code>');
  return text.trim();
}

// ─── Quiz option parsing ───────────────────────────────────────────────────────

interface ParsedOption {
  text: string;
  isCorrect: boolean;
}

function parseOptions(lines: string[]): ParsedOption[] {
  const options: ParsedOption[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    // Matches: - [✓] **text** ← *Correct* or [✓] text or - [✗] text
    const correctMatch =
      trimmed.match(/^\[✓\]\s*\*?\*?(.*?)\*?\*?\s*(?:←\s*\*.*?\*)?$/) ||
      trimmed.match(/^-\s*\[✓\]\s*\*?\*?(.*?)\*?\*?\s*(?:←\s*\*.*?\*)?$/);
    const wrongMatch =
      trimmed.match(/^\[✗\]\s*(.*)$/) ||
      trimmed.match(/^-\s*\[✗\]\s*(.*)$/);

    if (correctMatch) {
      // Clean up: remove trailing ** or * leftovers
      let text = correctMatch[1]
        .replace(/←\s*\*[^*]*\*/g, '')
        .replace(/^\*\*|\*\*$/g, '')
        .replace(/^\*|\*$/g, '')
        .trim();
      options.push({ text, isCorrect: true });
    } else if (wrongMatch) {
      let text = wrongMatch[1]
        .replace(/←\s*\*[^*]*\*/g, '')
        .replace(/^\*\*|\*\*$/g, '')
        .replace(/^\*|\*$/g, '')
        .trim();
      options.push({ text, isCorrect: false });
    }
  }
  return options;
}

// ─── Quiz block parser ─────────────────────────────────────────────────────────

function buildQuizBlock(slideTitle: string, lines: string[]): QuizBlock | null {
  // Find question line: **Question text?** or #### question text or **Statement:** ...
  let question = '';
  let questionLineIdx = -1;

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();

    // Module 7/10: #### question text
    if (/^#### /.test(trimmed) && !trimmed.includes('[✓]') && !trimmed.includes('[✗]')) {
      question = trimmed.replace(/^#### /, '').trim();
      questionLineIdx = i;
      break;
    }

    // Module 3/4: **Question text?** on its own line
    if (/^\*\*[^*]+\*\*$/.test(trimmed) && !trimmed.includes('[✓]') && !trimmed.includes('[✗]')) {
      question = trimmed.replace(/^\*\*|\*\*$/g, '').trim();
      questionLineIdx = i;
      break;
    }

    // Module 6: **Title:** text on its own (slide title already captured)
    if (/^\*\*Title:\*\*/.test(trimmed)) {
      question = trimmed.replace(/^\*\*Title:\*\*\s*/, '').trim();
      questionLineIdx = i;
      break;
    }

    // Module 8: **Statement:** ... pattern
    if (/^\*\*Statement:\*\*/.test(trimmed)) {
      question = trimmed.replace(/^\*\*Statement:\*\*\s*/, '').trim();
      // Prefix with "Is the following statement true or false? "
      question = 'Is the following statement true or false? ' + question;
      questionLineIdx = i;
      break;
    }

    // Module 9/6: Title line from slide header already in slideTitle
    if (/^\[✓\]/.test(trimmed) || /^\[✗\]/.test(trimmed) || /^- \[✓\]/.test(trimmed) || /^- \[✗\]/.test(trimmed)) {
      // Options found without prior question line — use slideTitle
      question = slideTitle;
      questionLineIdx = i - 1;
      break;
    }
  }

  if (!question && slideTitle) {
    question = slideTitle;
    questionLineIdx = -1;
  }

  if (!question) return null;

  const optionLines = lines.filter(
    (l) =>
      /\[✓\]/.test(l) ||
      /\[✗\]/.test(l)
  );

  const options = parseOptions(optionLines);
  if (options.length === 0) return null;

  const correctOption = options.find((o) => o.isCorrect);
  const correctAnswer = correctOption?.text ?? '';

  if (!correctAnswer) {
    warnings.push(`Quiz block missing correct answer: "${question.slice(0, 60)}"`);
  }

  return {
    kind: 'quiz',
    slideTitle,
    question,
    options,
    correctAnswer,
  };
}

// ─── Slide section parser ─────────────────────────────────────────────────────

function isQuizSlide(text: string): boolean {
  return /\[✓\]/.test(text);
}

function parseSlideSections(lessonBody: string): Block[] {
  // Split on ### (slide boundaries) — but be careful not to destroy content
  // We split on lines that start with ### and treat each chunk as one block
  const blocks: Block[] = [];

  // Some modules have #### as quiz question markers without ### slide headers
  // Module 7 and 10 use #### for questions directly inside lesson body without ### slides

  // First try to split on ### slide headers
  const slideChunks = lessonBody.split(/\n(?=### )/);

  if (slideChunks.length <= 1) {
    // No ### slides — treat the whole lesson body as one content block
    // But check for #### quiz questions (Module 7 / 10 style)
    const quizQuestionMatches = lessonBody.match(/\n#### [^\n]+(?:\n(?!####)[^\n]*)*/g);

    // Extract quiz questions using #### pattern
    const lines = lessonBody.split('\n');
    let currentContentLines: string[] = [];
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];

      // Check if this line starts a quiz question (#### followed by question lines)
      if (/^#### /.test(line) && !line.includes('[IMAGE]')) {
        // Look ahead for [✓]/[✗] options
        let j = i + 1;
        const questionLines: string[] = [line];
        while (j < lines.length && !/^#### /.test(lines[j]) && !/^## /.test(lines[j])) {
          questionLines.push(lines[j]);
          j++;
        }

        const hasOptions = questionLines.some((l) => /\[✓\]/.test(l) || /\[✗\]/.test(l));

        if (hasOptions) {
          // Flush accumulated content first
          if (currentContentLines.length > 0) {
            const contentText = currentContentLines.join('\n').trim();
            if (contentText) {
              blocks.push({
                kind: 'content',
                slideTitle: '',
                html: mdToHtml(contentText),
              });
            }
            currentContentLines = [];
          }

          // Build quiz block
          const quizTitle = line.replace(/^#### /, '').trim();
          const quiz = buildQuizBlock(quizTitle, questionLines);
          if (quiz) {
            blocks.push(quiz);
          }
          i = j;
          continue;
        }
      }

      currentContentLines.push(line);
      i++;
    }

    // Flush remaining content
    if (currentContentLines.length > 0) {
      const contentText = currentContentLines.join('\n').trim();
      if (contentText) {
        blocks.push({
          kind: 'content',
          slideTitle: '',
          html: mdToHtml(contentText),
        });
      }
    }

    return blocks;
  }

  // Process each ### slide chunk
  for (const chunk of slideChunks) {
    if (!chunk.trim()) continue;

    const chunkLines = chunk.split('\n');
    let slideTitle = '';

    // Extract slide title from first line (### Slide N — Title or ### Slide N: Title [type])
    const firstLine = chunkLines[0].trim();
    if (/^### /.test(firstLine)) {
      // Clean up the slide title: remove ### prefix, slide type hints in brackets, etc.
      slideTitle = firstLine
        .replace(/^### /, '')
        // Remove [slide type] hints: [Scrolling mix], [Multiple Choice], etc.
        .replace(/\s*\[[^\]]+\]\s*$/, '')
        // Remove Slide N: or Slide N — prefix
        .replace(/^Slide \d+\s*[—:]\s*/i, '')
        // Remove Slide N [type] pattern
        .replace(/^Slide \d+\s*\[[^\]]+\]$/, '')
        .trim();
    }

    const bodyLines = chunkLines.slice(1);
    const bodyText = bodyLines.join('\n');

    // Skip exit lesson slides (they have no real content)
    if (
      /^(That's it!|Congratulations)/i.test(slideTitle) ||
      /nice work.*you've completed/i.test(bodyText.slice(0, 80).toLowerCase())
    ) {
      continue;
    }

    // Skip pure feedback/survey slides
    if (/\[Survey\]/i.test(firstLine) || /\[Exit Lesson\]/i.test(firstLine)) {
      continue;
    }

    // Determine if this is a quiz slide
    if (isQuizSlide(bodyText) || isQuizSlide(firstLine)) {
      // Try to get the question from the body
      // Some slides have **Title:** as the question (Module 6 pattern)
      let question = slideTitle;

      // Look for **Title:** line in body
      const titleInBody = bodyText.match(/^\*\*Title:\*\*\s*(.+)$/m);
      if (titleInBody && titleInBody[1].trim()) {
        question = titleInBody[1].trim();
      }

      // Look for **bold question** line
      const boldQuestion = bodyText.match(/^\*\*([^*]+\?)\*\*\s*$/m);
      if (boldQuestion) {
        question = boldQuestion[1].trim();
      }

      // Look for **Statement:** pattern
      const statementMatch = bodyText.match(/^\*\*Statement:\*\*\s*(.+)$/m);
      if (statementMatch) {
        question = 'Is the following statement true or false? ' + statementMatch[1].trim();
      }

      const quiz = buildQuizBlock(question || slideTitle, bodyLines);
      if (quiz) {
        blocks.push(quiz);
      } else {
        warnings.push(`Failed to parse quiz slide: "${slideTitle}"`);
        // Fall back to content
        const html = mdToHtml(bodyText);
        if (html.trim()) {
          blocks.push({ kind: 'content', slideTitle, html });
        }
      }
    } else {
      // Content slide
      const html = mdToHtml(bodyText);
      if (html.trim()) {
        blocks.push({ kind: 'content', slideTitle, html });
      }
    }
  }

  return blocks;
}

// ─── Lesson title cleaner ─────────────────────────────────────────────────────

function cleanLessonTitle(raw: string): string {
  // Remove "## Lesson N: Lesson N: Title" → "Title"
  // Remove "## Introduction" → "Introduction"
  // Remove "## Module Summary" → "Module Summary"
  let title = raw
    .replace(/^## /, '')
    .replace(/^Lesson \d+:\s+Lesson \d+:\s+/i, '')
    .replace(/^Lesson \d+:\s+/i, '')
    .trim();
  return title;
}

// ─── Main module parser ───────────────────────────────────────────────────────

function parseModule(def: ModuleDef): ParsedModule {
  const filePath = path.join(SCORM_BASE, def.file);
  const raw = fs.readFileSync(filePath, 'utf8');

  // Split on lines that start with ## (lesson boundaries)
  // The first chunk before any ## is the preamble — skip it
  const lessonChunks = raw.split(/\n(?=## )/);

  const lessons: ParsedLesson[] = [];

  for (const chunk of lessonChunks) {
    const trimmedChunk = chunk.trim();
    if (!trimmedChunk) continue;

    // Get the first line — should be ## Lesson... or ## Introduction etc.
    const firstLine = trimmedChunk.split('\n')[0];

    // Skip preamble (doesn't start with ##)
    if (!/^## /.test(firstLine)) continue;

    // Skip the "Module Summary" section (it's after all lessons)
    if (/^## Module Summary/i.test(firstLine)) continue;

    const lessonTitle = cleanLessonTitle(firstLine);
    const lessonBody = trimmedChunk.split('\n').slice(1).join('\n');

    const blocks = parseSlideSections(lessonBody);

    // If no meaningful blocks, still create the lesson with a minimal content block
    if (blocks.length === 0) {
      const plainText = lessonBody.replace(/^---+$/gm, '').trim();
      if (plainText) {
        blocks.push({
          kind: 'content',
          slideTitle: lessonTitle,
          html: mdToHtml(plainText),
        });
      } else {
        warnings.push(`Lesson "${lessonTitle}" in Module ${def.number} has no content — skipping`);
        continue;
      }
    }

    lessons.push({ title: lessonTitle, blocks });
  }

  if (lessons.length === 0) {
    warnings.push(`Module ${def.number} parsed 0 lessons!`);
  }

  return { def, lessons };
}

// ─── SQL escaping ─────────────────────────────────────────────────────────────

function sqlStr(s: string): string {
  // Use dollar-quoting for strings that contain single quotes
  if (s.includes("'") || s.includes('\\')) {
    // Use a unique tag to avoid collisions
    const tag = 'SQLDQ';
    if (!s.includes(`$${tag}$`)) {
      return `$${tag}$${s}$${tag}$`;
    }
    // Fallback: escape single quotes
    return `'${s.replace(/'/g, "''")}'`;
  }
  return `'${s}'`;
}

// ─── SQL generator ────────────────────────────────────────────────────────────

function generateSQL(modules: ParsedModule[]): string {
  const lines: string[] = [];

  lines.push('-- ============================================================');
  lines.push('-- GANSID LMS — Modules 3–10 seed');
  lines.push(`-- Generated: ${new Date().toISOString()}`);
  lines.push('-- ============================================================');
  lines.push('');
  lines.push('BEGIN;');
  lines.push('');

  for (const mod of modules) {
    const { def, lessons } = mod;
    const courseId = crypto.randomUUID();
    const moduleId = crypto.randomUUID();

    lines.push(`-- ──────────────────────────────────────────────────────────`);
    lines.push(`-- Module ${def.number}: ${def.title}`);
    lines.push(`-- ──────────────────────────────────────────────────────────`);
    lines.push('');

    // Course
    lines.push(`INSERT INTO courses (id, title, slug, description, institution_id, status, thumbnail_url, is_published, category_id)`);
    lines.push(`VALUES (`);
    lines.push(`  '${courseId}',`);
    lines.push(`  ${sqlStr(def.title)},`);
    lines.push(`  ${sqlStr(def.slug)},`);
    lines.push(`  ${sqlStr(`Module ${def.number} of the GANSID Capacity Building Curriculum.`)},`);
    lines.push(`  '${INSTITUTION_ID}',`);
    lines.push(`  'published',`);
    lines.push(`  NULL,`);
    lines.push(`  true,`);
    lines.push(`  NULL`);
    lines.push(`);`);
    lines.push('');

    // Module
    lines.push(`INSERT INTO modules (id, course_id, institution_id, title, description, order_index, is_published)`);
    lines.push(`VALUES (`);
    lines.push(`  '${moduleId}',`);
    lines.push(`  '${courseId}',`);
    lines.push(`  '${INSTITUTION_ID}',`);
    lines.push(`  ${sqlStr(def.title)},`);
    lines.push(`  ${sqlStr(`Module ${def.number}: ${def.title}`)},`);
    lines.push(`  0,`);
    lines.push(`  true`);
    lines.push(`);`);
    lines.push('');

    // Lessons
    for (let li = 0; li < lessons.length; li++) {
      const lesson = lessons[li];
      const lessonId = crypto.randomUUID();
      const slideId = crypto.randomUUID();

      lines.push(`-- Lesson ${li}: ${lesson.title}`);
      lines.push(`INSERT INTO lessons (id, course_id, module_id, title, order_index, content_type, is_required, institution_id)`);
      lines.push(`VALUES (`);
      lines.push(`  '${lessonId}',`);
      lines.push(`  '${courseId}',`);
      lines.push(`  '${moduleId}',`);
      lines.push(`  ${sqlStr(lesson.title)},`);
      lines.push(`  ${li},`);
      lines.push(`  'blocks',`);
      lines.push(`  true,`);
      lines.push(`  '${INSTITUTION_ID}'`);
      lines.push(`);`);
      lines.push('');

      // One slide per lesson
      lines.push(`INSERT INTO slides (id, lesson_id, slide_type, title, order_index, status, settings)`);
      lines.push(`VALUES (`);
      lines.push(`  '${slideId}',`);
      lines.push(`  '${lessonId}',`);
      lines.push(`  'content',`);
      lines.push(`  ${sqlStr(lesson.title)},`);
      lines.push(`  0,`);
      lines.push(`  'published',`);
      lines.push(`  '{}'`);
      lines.push(`);`);
      lines.push('');

      // Lesson blocks (one per markdown slide section)
      for (let bi = 0; bi < lesson.blocks.length; bi++) {
        const block = lesson.blocks[bi];
        const blockId = crypto.randomUUID();

        let blockType: string;
        let data: object;

        if (block.kind === 'quiz') {
          blockType = 'quiz_inline';
          data = {
            question: block.question,
            options: block.options.map((o) => o.text),
            correct_answer: block.correctAnswer,
            question_type: 'multiple_choice',
            show_feedback: true,
          };
        } else {
          blockType = 'rich_text';
          data = {
            html: block.html,
            mode: 'scrolling',
          };
        }

        const dataJson = JSON.stringify(data)
          // Escape any backslashes for SQL
          .replace(/\\/g, '\\\\')
          // Escape single quotes inside the JSON string
          .replace(/'/g, "''");

        lines.push(`INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)`);
        lines.push(`VALUES (`);
        lines.push(`  '${blockId}',`);
        lines.push(`  '${lessonId}',`);
        lines.push(`  '${slideId}',`);
        lines.push(`  '${INSTITUTION_ID}',`);
        lines.push(`  '${blockType}',`);
        lines.push(`  '${dataJson}'::jsonb,`);
        lines.push(`  ${bi},`);
        lines.push(`  true,`);
        lines.push(`  '{}',`);
        lines.push(`  1`);
        lines.push(`);`);
        lines.push('');
      }
    }
  }

  lines.push('COMMIT;');
  lines.push('');

  return lines.join('\n');
}

// ─── Main ──────────────────────────────────────────────────────────────────────

function main() {
  console.log('Parsing markdown modules...\n');

  const parsedModules: ParsedModule[] = [];

  for (const def of MODULES) {
    const filePath = path.join(SCORM_BASE, def.file);
    if (!fs.existsSync(filePath)) {
      warnings.push(`File not found: ${filePath}`);
      continue;
    }
    try {
      const parsed = parseModule(def);
      parsedModules.push(parsed);
      console.log(`  Module ${def.number}: ${def.title} — ${parsed.lessons.length} lessons`);
    } catch (err) {
      warnings.push(`Error parsing Module ${def.number}: ${String(err)}`);
    }
  }

  console.log('\nGenerating SQL...');
  const sql = generateSQL(parsedModules);

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const outputPath = path.join(OUTPUT_DIR, 'modules-3-10.sql');
  fs.writeFileSync(outputPath, sql, 'utf8');

  // ─── Statistics ───────────────────────────────────────────────────────────

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  IMPORT STATISTICS');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`  Courses to insert:       ${parsedModules.length}`);
  console.log(`  Modules to insert:       ${parsedModules.length}`);

  let totalLessons = 0;
  let totalBlocks = 0;
  let totalQuizBlocks = 0;
  let totalContentBlocks = 0;

  for (const mod of parsedModules) {
    const lessonCount = mod.lessons.length;
    const blockCount = mod.lessons.reduce((sum, l) => sum + l.blocks.length, 0);
    const quizCount = mod.lessons.reduce(
      (sum, l) => sum + l.blocks.filter((b) => b.kind === 'quiz').length,
      0
    );
    const contentCount = blockCount - quizCount;

    totalLessons += lessonCount;
    totalBlocks += blockCount;
    totalQuizBlocks += quizCount;
    totalContentBlocks += contentCount;

    console.log(
      `\n  Module ${mod.def.number}: ${mod.def.title}`
    );
    console.log(`    Lessons: ${lessonCount}`);
    console.log(`    Blocks:  ${blockCount} (${quizCount} quiz, ${contentCount} content)`);

    for (const lesson of mod.lessons) {
      const qc = lesson.blocks.filter((b) => b.kind === 'quiz').length;
      const cc = lesson.blocks.filter((b) => b.kind === 'content').length;
      console.log(`      "${lesson.title}": ${lesson.blocks.length} blocks (${qc} quiz, ${cc} content)`);
    }
  }

  console.log('\n───────────────────────────────────────────────────────────');
  console.log(`  Total lessons:           ${totalLessons}`);
  console.log(`  Total lesson_blocks:     ${totalBlocks}`);
  console.log(`    - rich_text blocks:    ${totalContentBlocks}`);
  console.log(`    - quiz_inline blocks:  ${totalQuizBlocks}`);
  console.log('───────────────────────────────────────────────────────────');

  if (warnings.length > 0) {
    console.log('\n  WARNINGS:');
    for (const w of warnings) {
      console.log(`    ⚠  ${w}`);
    }
  } else {
    console.log('\n  No warnings.');
  }

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log(`  SQL written to: ${outputPath}`);
  console.log('═══════════════════════════════════════════════════════════\n');
}

main();
