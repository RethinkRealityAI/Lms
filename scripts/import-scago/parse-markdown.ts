import fs from 'fs';
import path from 'path';
import type {
  ModuleDef,
  ParsedModule,
  ParsedLesson,
  ParsedSlide,
  ParsedBlock,
  RichTextData,
  ImageGalleryData,
  VideoData,
  QuizInlineData,
} from './types';

// ─── Module Definitions ────────────────────────────────────────────────────────

export const SCAGO_MODULES: ModuleDef[] = [
  {
    number: 1,
    title: 'Fundamentals of Sickle Cell Disease',
    slug: 'fundamentals-of-sickle-cell-disease',
    file: 'Module_1_Fundamentals_of_Sickle_Cell_Disease.md',
    expectedLessons: 5,
  },
  {
    number: 2,
    title: 'Ontario Health Quality Standard for SCD',
    slug: 'ontario-health-quality-standard-for-scd',
    file: 'Module_2_Ontario_Health_Quality_Standard_for_Sickle_Cell_Dis.md',
    expectedLessons: 2,
  },
  {
    number: 3,
    title: 'Acute Pain in Sickle Cell Disease',
    slug: 'acute-pain-in-sickle-cell-disease',
    file: 'Module_3_Acute_Pain_in_Sickle_Cell_Disease.md',
    expectedLessons: 5,
  },
  {
    number: 4,
    title: 'Transfusions, Hydroxyurea, and Provincial Drug Coverage',
    slug: 'transfusions-hydroxyurea-and-provincial-drug-coverage',
    file: 'Module_4_Transfusions_Hydroxyurea_and_Provincial_Drug_Covera.md',
    expectedLessons: 4,
  },
  {
    number: 5,
    title: 'Common Complications in Sickle Cell Disease',
    slug: 'common-complications-in-sickle-cell-disease',
    file: 'Module_5_Common_Complications_in_Sickle_Cell_Disease.md',
    expectedLessons: 5,
  },
  {
    number: 6,
    title: 'Successful Transitions for AYAs with SCD',
    slug: 'successful-transitions-for-ayas-with-scd',
    file: 'Module_6_Successful_Transitions_for_Adolescents_and_Young_Ad.md',
    expectedLessons: 4,
  },
  {
    number: 7,
    title: 'Moving Towards Anti-Oppressive, Anti-Racist Healthcare in SCD',
    slug: 'moving-towards-anti-oppressive-anti-racist-healthcare-in-scd',
    file: 'Module_7_Moving_Towards_AntiOppressive_AntiRacist_Healthcare.md',
    expectedLessons: 4,
  },
  {
    number: 8,
    title: 'Sustainable Advocacy in Sickle Cell Disease',
    slug: 'sustainable-advocacy-in-sickle-cell-disease',
    file: 'Module_8_Sustainable_Advocacy_in_Sickle_Cell_Disease_SCD.md',
    expectedLessons: 4,
  },
  {
    number: 9,
    title: 'Fertility, Contraception, and Pregnancy in SCD',
    slug: 'fertility-contraception-and-pregnancy-in-scd',
    file: 'Module_9_Fertility_Contraception_and_Pregnancy_in_Sickle_Cel.md',
    expectedLessons: 4,
  },
  {
    number: 10,
    title: 'Mental Health and Wellness in SCD',
    slug: 'mental-health-and-wellness-in-scd',
    file: 'Module_10_Mental_Health_and_Wellness_in_Sickle_Cell_Disease_.md',
    expectedLessons: 3,
  },
  {
    number: 11,
    title: 'Latest Innovations in Sickle Cell Disease',
    slug: 'latest-innovations-in-sickle-cell-disease',
    file: 'Module_11_Latest_Innovations_in_Sickle_Cell_Disease.md',
    expectedLessons: 3,
  },
  {
    number: 12,
    title: 'Prevention of SCD and the Truth About Sickle Cell Trait',
    slug: 'prevention-of-scd-and-the-truth-about-sickle-cell-trait',
    file: 'Module_12_Prevention_of_Sickle_Cell_Disease_and_the_Truth_Ab.md',
    expectedLessons: 2,
  },
  {
    number: 13,
    title: 'Partnering with PCPs to Optimize Outcomes',
    slug: 'partnering-with-pcps-to-optimize-outcomes',
    file: 'Module_13_Partnering_with_Primary_Care_Providers_PCPs_to_Opt_v2.md',
    expectedLessons: 4,
  },
];

// ─── Warnings collector ────────────────────────────────────────────────────────

export const warnings: string[] = [];

// ─── Inline markdown to HTML helpers ───────────────────────────────────────────

function applyInline(text: string): string {
  // Strip `# ` content markers that appear inside bold tags: **# text** → **text**
  text = text.replace(/\*\*#\s+/g, '**');
  // Strip standalone `# ` markers at the start (already partially handled by stripHashPrefix)
  text = text.replace(/^#\s+/, '');
  // Strip `# ` that appears after a sentence boundary (mid-line # markers used as bullet separators)
  text = text.replace(/\s#\s(?=[A-Z])/g, ' ');
  // Bold+italic combined: ***text***
  text = text.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
  // Bold: **text**
  text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  // Italic: *text*
  text = text.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<em>$1</em>');
  // Code: `code`
  text = text.replace(/`(.+?)`/g, '<code>$1</code>');
  // Links: [text](url)
  text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  return text.trim();
}

/**
 * Strip leading `# ` markers that SCAGO uses as bullet-style content prefixes.
 * This must run BEFORE heading detection to avoid false `<h1>` matches.
 */
function stripHashPrefix(line: string): string {
  // Lines that start with `# ` as a content marker (not a heading)
  // We detect these when the text after `# ` doesn't look like a heading context
  return line.replace(/^# /, '');
}

export function mdToHtml(text: string): string {
  const rawLines = text.split('\n');
  const result: string[] = [];
  let inUl = false;
  let inOl = false;

  const flushList = () => {
    if (inUl) { result.push('</ul>'); inUl = false; }
    if (inOl) { result.push('</ol>'); inOl = false; }
  };

  for (let i = 0; i < rawLines.length; i++) {
    let line = rawLines[i];

    // Skip empty lines
    if (line.trim() === '') {
      flushList();
      continue;
    }

    // Skip horizontal rules
    if (/^---+$/.test(line.trim())) {
      flushList();
      continue;
    }

    // Skip image lines (handled separately as image_gallery blocks)
    if (/^!\[.*\]\(.*\)/.test(line.trim())) continue;

    // Skip video lines (handled separately as video blocks)
    if (/^🎬/.test(line.trim())) continue;

    // Skip blockquote slide markers
    if (/^>\s*\*\*Lesson \d+, Slide \d+\*\*/.test(line.trim())) continue;

    // Skip table rows
    if (/^\|/.test(line.trim())) continue;

    // Skip self-assessment scale lines
    if (/on a scale of [01] to 10 is/i.test(line)) continue;
    if (/on a scale of \d+ to \d+ is/i.test(line) && /___/.test(line)) continue;

    // Skip survey/feedback questions
    if (/Did Module \d+.*meet your learning needs/i.test(line)) continue;
    if (/How satisfied were you/i.test(line)) continue;

    // Ordered list
    if (/^\d+\.\s/.test(line)) {
      if (inUl) { result.push('</ul>'); inUl = false; }
      if (!inOl) { result.push('<ol>'); inOl = true; }
      let content = line.replace(/^\d+\.\s+/, '');
      content = stripHashPrefix(content);
      result.push(`<li>${applyInline(content)}</li>`);
      continue;
    }

    // Unordered list (- or * prefix, but NOT quiz markers ✓/○/✗)
    if (/^[-*]\s/.test(line) && !/^[-*]\s*[✓○✗]/.test(line)) {
      if (inOl) { result.push('</ol>'); inOl = false; }
      if (!inUl) { result.push('<ul>'); inUl = true; }
      let content = line.replace(/^[-*]\s+/, '');
      content = stripHashPrefix(content);
      result.push(`<li>${applyInline(content)}</li>`);
      continue;
    }

    // Headings (### and ####; ## is lesson boundary, # is content prefix in SCAGO)
    if (/^#### /.test(line)) {
      flushList();
      const content = applyInline(stripHashPrefix(line.replace(/^#### /, '')));
      result.push(`<h4>${content}</h4>`);
      continue;
    }
    if (/^### /.test(line)) {
      flushList();
      const content = applyInline(stripHashPrefix(line.replace(/^### /, '')));
      result.push(`<h3>${content}</h3>`);
      continue;
    }

    // Regular paragraph — strip leading # marker
    flushList();
    let content = stripHashPrefix(line.trim());
    content = applyInline(content);
    if (content) {
      result.push(`<p>${content}</p>`);
    }
  }

  flushList();
  return result.join('');
}

// ─── Line normalization ────────────────────────────────────────────────────────

/**
 * Normalize a line by stripping SCAGO `# ` markers and cleaning up broken bold patterns.
 * Used for quiz detection and question extraction.
 */
function normalizeLine(line: string): string {
  let n = line.trim();
  // Remove `# ` after ** markers: **# **text** → **text**
  n = n.replace(/\*\*#\s+\*\*/g, '**');
  // Remove `# ` inside bold: **# text** → **text**
  n = n.replace(/\*\*#\s+/g, '**');
  // Remove standalone leading # marker
  n = n.replace(/^#\s+/, '');
  // Collapse multiple ** into proper bold markers: **** → **
  n = n.replace(/\*{4,}/g, '**');
  // Remove empty bold: ** ** → empty
  n = n.replace(/\*\*\s*\*\*/g, '');
  return n.trim();
}

// ─── Quiz detection and parsing ────────────────────────────────────────────────

/**
 * Check if a line begins a quiz question block.
 * Quiz indicators: lines with ✓ or ○ or ✗ markers in the surrounding context.
 */
export function isQuizStart(lines: string[], index: number): boolean {
  const line = normalizeLine(lines[index]);

  // "**Question:**" line
  if (/^\*\*Question:\*\*/.test(line)) return true;
  if (/^\*\*# Question:\*\*/.test(line)) return true;

  // Bold question text followed by quiz options within next few lines
  if (/^\*\*.*\?\*\*/.test(line) || /^\*\*#\s.*\?\*\*/.test(line) || (/\?/.test(line) && /^\*\*/.test(line))) {
    // Look ahead for quiz option markers
    for (let j = index + 1; j < Math.min(index + 10, lines.length); j++) {
      if (/^\s*[-*]?\s*[✓○✗]/.test(lines[j]) || /^\s*-\s+✓/.test(lines[j]) || /^\s*-\s+○/.test(lines[j])) {
        return true;
      }
    }
  }

  // Bold text (possibly with # prefix) followed by options
  if (/^\*\*.*\*\*$/.test(line) || /^\*\*#\s.*\*\*$/.test(line) || (/^\*\*/.test(line) && /\*\*$/.test(line))) {
    for (let j = index + 1; j < Math.min(index + 10, lines.length); j++) {
      const nextLine = lines[j].trim();
      if (/^\s*[-*]?\s*[✓○✗]/.test(nextLine)) return true;
      // Stop looking if we hit another bold header or blank+bold
      if (nextLine === '') continue;
      if (/^\*\*.*\*\*$/.test(nextLine) && j > index + 1) break;
    }
  }

  return false;
}

interface QuizParseResult {
  block: ParsedBlock;
  endIndex: number;
}

/**
 * Parse a quiz block starting at the given line index.
 * Returns the quiz block and the index after the last consumed line.
 */
export function parseQuizBlock(lines: string[], startIndex: number): QuizParseResult | null {
  let question = '';
  let explanation = '';
  const options: { text: string; isCorrect: boolean }[] = [];
  let i = startIndex;

  // Collect the question text (normalize to strip # markers)
  const firstLine = normalizeLine(lines[i]);

  // Handle "**Question:** # text" pattern
  const questionPrefixMatch = firstLine.match(/^\*\*(?:#\s*)?Question:\*\*\s*#?\s*(.+)/);
  if (questionPrefixMatch) {
    question = questionPrefixMatch[1].replace(/\*\*/g, '').trim();
    i++;
  } else {
    // Bold question text: **# text** or **text**
    let qText = firstLine.replace(/^\*\*#?\s*/, '').replace(/\*\*$/, '').replace(/^\*\*/, '').trim();
    // Strip # prefix
    qText = qText.replace(/^#\s*/, '');
    // Remove wrapping * or _
    qText = qText.replace(/^\*+|\*+$/g, '').replace(/^_+|_+$/g, '').trim();
    question = qText;
    i++;
  }

  // Check for *# Select all that apply* hint or explanation before options
  let isSelectAll = false;
  while (i < lines.length) {
    const line = lines[i].trim();
    if (line === '') { i++; continue; }

    // "Select all that apply" hint
    if (/select all that apply/i.test(line)) {
      isSelectAll = true;
      i++;
      continue;
    }

    // Explanation line before options
    if (/^\*\*Explanation:\*\*/.test(line)) {
      explanation = line.replace(/^\*\*Explanation:\*\*\s*/, '').replace(/^#\s*/, '').trim();
      i++;
      continue;
    }

    // Sub-question or "Statement:" line
    if (/^\*\*Statement:\*\*/.test(line)) {
      const stmtText = line.replace(/^\*\*Statement:\*\*\s*/, '').replace(/^#\s*/, '').trim();
      question = question ? question + ' ' + stmtText : stmtText;
      i++;
      continue;
    }

    // Italic sub-question line: *# text* or *text* (extra context for the question)
    if (/^\*[^*]/.test(line) && /\*$/.test(line)) {
      let subQ = line.replace(/^\*#?\s*/, '').replace(/\*$/, '').trim();
      if (subQ) {
        question = question ? question + ' ' + subQ : subQ;
      }
      i++;
      continue;
    }

    // Skip non-empty lines that don't match any pattern but might appear
    // before options (e.g., context text without markers)
    // Only skip if we can see quiz markers ahead
    let hasOptionsAhead = false;
    for (let j = i; j < Math.min(i + 5, lines.length); j++) {
      if (/^\s*[-*]?\s*[✓○✗]/.test(lines[j])) {
        hasOptionsAhead = true;
        break;
      }
    }
    if (hasOptionsAhead && !/^\s*[-*]?\s*[✓○✗]/.test(line)) {
      // Skip this line (context text before options)
      i++;
      continue;
    }

    break;
  }

  // Parse options — lines starting with - ✓, - ○, - ✗, or indented   - ✓/○/✗
  while (i < lines.length) {
    const line = lines[i].trim();

    // Option with ✓ (correct)
    const correctMatch = line.match(/^[-*]?\s*✓\s*#?\s*(.+)/);
    if (correctMatch) {
      let text = correctMatch[1].replace(/^\*\*|\*\*$/g, '').replace(/^#\s*/, '').trim();
      options.push({ text, isCorrect: true });
      i++;
      continue;
    }

    // Option with ○ (incorrect)
    const incorrectMatch = line.match(/^[-*]?\s*○\s*#?\s*(.+)/);
    if (incorrectMatch) {
      let text = incorrectMatch[1].replace(/^\*\*|\*\*$/g, '').replace(/^#\s*/, '').trim();
      options.push({ text, isCorrect: false });
      i++;
      continue;
    }

    // Option with ✗ (incorrect — used in true/false)
    const wrongMatch = line.match(/^[-*]?\s*✗\s*#?\s*(.+)/);
    if (wrongMatch) {
      let text = wrongMatch[1].replace(/^\*\*|\*\*$/g, '').replace(/^#\s*/, '').trim();
      options.push({ text, isCorrect: false });
      i++;
      continue;
    }

    // Plain True/False options without markers (e.g., "- # True", "- # False")
    // Only match if we already have a question and no options yet
    if (options.length === 0 && /^[-*]\s*#?\s*(True|False)$/i.test(line)) {
      // Look for ✓/○ markers in surrounding lines — if none, skip as plain content
      break;
    }

    // Non-option line — stop parsing options
    if (line === '' && options.length > 0) {
      // Blank line after options — check if more options follow
      const nextNonEmpty = lines.slice(i + 1).findIndex(l => l.trim() !== '');
      if (nextNonEmpty >= 0) {
        const nextLine = lines[i + 1 + nextNonEmpty].trim();
        if (/^[-*]?\s*[✓○✗]/.test(nextLine)) {
          i++;
          continue;
        }
      }
      break;
    }

    if (line !== '' && !/^[-*]?\s*[✓○✗]/.test(line)) {
      break;
    }

    i++;
  }

  // Consume trailing explanation if present
  while (i < lines.length) {
    const line = lines[i].trim();
    if (line === '') { i++; continue; }
    if (/^\*\*Explanation:\*\*/.test(line)) {
      explanation = line.replace(/^\*\*Explanation:\*\*\s*/, '').replace(/^#\s*/, '').trim();
      i++;
      continue;
    }
    break;
  }

  if (options.length === 0) return null;

  // Determine question type
  const correctCount = options.filter(o => o.isCorrect).length;
  let questionType: 'multiple_choice' | 'true_false' | 'select_all';

  const optionTexts = options.map(o => o.text.toLowerCase());
  const isTFOptions = optionTexts.length === 2 &&
    ((optionTexts.includes('true') && optionTexts.includes('false')));

  if (isTFOptions) {
    questionType = 'true_false';
  } else if (isSelectAll || correctCount > 1) {
    questionType = 'select_all';
  } else {
    questionType = 'multiple_choice';
  }

  const correctAnswers = options.filter(o => o.isCorrect).map(o => o.text);
  const correctAnswer = correctAnswers.join('; ');

  if (!correctAnswer) {
    warnings.push(`Quiz missing correct answer: "${question.slice(0, 60)}"`);
  }

  const quizData: QuizInlineData = {
    question,
    options: options.map(o => o.text),
    correct_answer: correctAnswer,
    question_type: questionType,
    show_feedback: true,
  };
  if (explanation) {
    quizData.explanation = explanation;
  }

  return {
    block: { kind: 'quiz_inline', data: quizData },
    endIndex: i,
  };
}

// ─── Multi-question quiz parsing (true/false sets) ─────────────────────────────

interface NumberedQuizResult {
  blocks: ParsedBlock[];
  endIndex: number;
}

function parseNumberedQuizQuestions(lines: string[], startIndex: number): NumberedQuizResult | null {
  // Pattern: numbered questions like "**1. Statement...**" followed by indented ✓/✗ options
  const blocks: ParsedBlock[] = [];
  let i = startIndex;
  let explanation = '';

  // Check for a preceding explanation block
  if (i > 0 && /^\*\*Explanation:\*\*/.test(lines[i - 1]?.trim() || '')) {
    // Already consumed before calling this
  }

  // Look for pre-explanation
  const firstLine = lines[i].trim();
  if (/^\*\*Explanation:\*\*/.test(firstLine)) {
    explanation = firstLine.replace(/^\*\*Explanation:\*\*\s*/, '').replace(/^#\s*/, '').trim();
    i++;
  }

  while (i < lines.length) {
    const line = lines[i].trim();
    if (line === '') { i++; continue; }

    // Numbered question: **1. question text**
    const numberedMatch = line.match(/^\*\*(\d+)\.\s*(.+?)\*\*$/);
    if (numberedMatch) {
      const questionText = numberedMatch[2].replace(/^#\s*/, '').trim();
      i++;

      const options: { text: string; isCorrect: boolean }[] = [];
      // Parse indented options
      while (i < lines.length) {
        const optLine = lines[i].trim();
        const correctOpt = optLine.match(/^\s*[-*]?\s*✓\s*#?\s*(.+)/);
        const incorrectOpt = optLine.match(/^\s*[-*]?\s*✗\s*#?\s*(.+)/);
        const incorrectCircle = optLine.match(/^\s*[-*]?\s*○\s*#?\s*(.+)/);

        if (correctOpt) {
          options.push({ text: correctOpt[1].trim(), isCorrect: true });
          i++;
        } else if (incorrectOpt) {
          options.push({ text: incorrectOpt[1].trim(), isCorrect: false });
          i++;
        } else if (incorrectCircle) {
          options.push({ text: incorrectCircle[1].trim(), isCorrect: false });
          i++;
        } else if (optLine === '') {
          i++;
          continue;
        } else {
          break;
        }
      }

      if (options.length > 0) {
        const optionTexts = options.map(o => o.text.toLowerCase());
        const isTF = optionTexts.length === 2 && optionTexts.includes('true') && optionTexts.includes('false');
        const correctAnswer = options.filter(o => o.isCorrect).map(o => o.text).join('; ');

        const quizData: QuizInlineData = {
          question: questionText,
          options: options.map(o => o.text),
          correct_answer: correctAnswer,
          question_type: isTF ? 'true_false' : 'multiple_choice',
          show_feedback: true,
        };
        if (explanation) {
          quizData.explanation = explanation;
        }

        blocks.push({ kind: 'quiz_inline', data: quizData });
      }
      continue;
    }

    // Not a numbered question — stop
    break;
  }

  if (blocks.length === 0) return null;
  return { blocks, endIndex: i };
}

// ─── Content block parsing ─────────────────────────────────────────────────────

/**
 * Parse a chunk of text into typed blocks (rich_text, image_gallery, video, quiz_inline).
 */
export function parseContentToBlocks(text: string): ParsedBlock[] {
  const lines = text.split('\n');
  const blocks: ParsedBlock[] = [];
  let contentLines: string[] = [];
  let pendingImages: { url: string; caption: string | null }[] = [];

  const flushContent = () => {
    if (contentLines.length > 0) {
      const html = mdToHtml(contentLines.join('\n'));
      if (html.trim()) {
        blocks.push({
          kind: 'rich_text',
          data: { html, mode: 'scrolling' } as RichTextData,
        });
      }
      contentLines = [];
    }
  };

  const flushImages = () => {
    if (pendingImages.length > 0) {
      blocks.push({
        kind: 'image_gallery',
        data: { images: [...pendingImages], mode: 'gallery' } as ImageGalleryData,
      });
      pendingImages = [];
    }
  };

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // Skip empty lines (accumulate in content)
    if (trimmed === '') {
      contentLines.push(line);
      i++;
      continue;
    }

    // Skip self-assessment scale lines
    if (/on a scale of [01] to 10 is/i.test(trimmed) || (/on a scale of \d+ to \d+ is/i.test(trimmed) && /___/.test(trimmed))) {
      i++;
      continue;
    }

    // Skip survey/feedback
    if (/Did Module \d+.*meet your learning needs/i.test(trimmed)) { i++; continue; }
    if (/How satisfied were you/i.test(trimmed)) { i++; continue; }

    // Skip slide boundary markers
    if (/^>\s*\*\*Lesson \d+, Slide \d+\*\*/.test(trimmed)) {
      i++;
      continue;
    }

    // Video line
    if (/^🎬/.test(trimmed)) {
      flushContent();
      flushImages();

      const urlMatch = trimmed.match(/\[([^\]]*)\]\((https?:\/\/[^)]+)\)/);
      if (urlMatch) {
        const videoUrl = normalizeYoutubeUrl(urlMatch[2]);
        blocks.push({
          kind: 'video',
          data: { url: videoUrl, provider: 'youtube' } as VideoData,
        });
      }
      i++;
      continue;
    }

    // Image line
    if (/^!\[.*\]\(.*\)/.test(trimmed)) {
      flushContent();
      const imgMatch = trimmed.match(/^!\[([^\]]*)\]\(([^)]+)\)/);
      if (imgMatch) {
        pendingImages.push({
          url: imgMatch[2],
          caption: imgMatch[1] || null,
        });
      }
      i++;
      continue;
    }

    // If we have pending images and hit non-image content, flush images
    if (pendingImages.length > 0 && !/^!\[/.test(trimmed)) {
      flushImages();
    }

    // Quiz detection: numbered true/false questions (e.g., "**1. Statement**" followed by ✓/✗)
    const numberedQuizMatch = trimmed.match(/^\*\*\d+\.\s*.+\*\*$/);
    if (numberedQuizMatch) {
      // Look ahead to see if next lines have ✓/✗ options
      let hasOptions = false;
      for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
        if (/^\s*[-*]?\s*[✓✗○]/.test(lines[j].trim())) {
          hasOptions = true;
          break;
        }
      }
      if (hasOptions) {
        flushContent();
        flushImages();
        const result = parseNumberedQuizQuestions(lines, i);
        if (result) {
          blocks.push(...result.blocks);
          i = result.endIndex;
          continue;
        }
      }
    }

    // Quiz detection: question with ✓/○ options
    if (isQuizStart(lines, i)) {
      flushContent();
      flushImages();
      const result = parseQuizBlock(lines, i);
      if (result) {
        blocks.push(result.block);
        i = result.endIndex;
        continue;
      }
    }

    // Regular content line
    contentLines.push(line);
    i++;
  }

  flushContent();
  flushImages();

  return blocks;
}

// ─── YouTube URL normalizer ────────────────────────────────────────────────────

function normalizeYoutubeUrl(url: string): string {
  // Remove timestamp parameters for cleaner embed URLs
  try {
    const parsed = new URL(url);
    // Keep the base video URL
    if (parsed.hostname.includes('youtube.com') && parsed.searchParams.has('v')) {
      return `https://www.youtube.com/watch?v=${parsed.searchParams.get('v')}`;
    }
    if (parsed.hostname === 'youtu.be') {
      return `https://www.youtube.com/watch?v=${parsed.pathname.slice(1)}`;
    }
  } catch {
    // Return as-is if URL parsing fails
  }
  return url;
}

// ─── Lesson title cleaner ──────────────────────────────────────────────────────

function cleanLessonTitle(raw: string): string {
  return raw
    .replace(/^## /, '')
    .replace(/^Lesson \d+\s*[-–—:]\s*/i, '')
    .trim();
}

// ─── Slide splitting ───────────────────────────────────────────────────────────

/**
 * Determine if a line is a "skip" line (self-assessment, survey, conflict of interest, etc.)
 */
function isSkipLine(line: string): boolean {
  const trimmed = line.trim();
  if (/on a scale of [01] to 10 is/i.test(trimmed)) return true;
  if (/on a scale of \d+ to \d+ is/i.test(trimmed) && /___/.test(trimmed)) return true;
  if (/Did Module \d+.*meet your learning needs/i.test(trimmed)) return true;
  if (/How satisfied were you/i.test(trimmed)) return true;
  if (/I have no conflicts of interest/i.test(trimmed)) return true;
  if (/^\*\*Statement:\*\*\s*#?\s*(Let'?s get started|OK,?\s*let'?s go|Start the journey|Time to Review|Let's check them out)/i.test(trimmed)) return true;
  if (/^\*\*We have no conflicts of interest/i.test(trimmed)) return true;
  if (/^\*\*I have no conflicts of interest/i.test(trimmed)) return true;
  return false;
}

/**
 * Determine if a section of text is primarily "intro fluff" that should be condensed.
 * (Author line, statement, scale questions, conflict disclaimers)
 */
function isIntroFluff(text: string): boolean {
  const lines = text.split('\n').filter(l => l.trim() !== '');
  const fluffCount = lines.filter(l => isSkipLine(l)).length;
  // If more than half the non-empty lines are fluff, it's intro
  return lines.length > 0 && fluffCount > lines.length * 0.4;
}

/**
 * Split a lesson body into slides using explicit `> **Lesson N, Slide N**` markers
 * when available, or heuristic splitting otherwise.
 */
export function splitIntoSlides(lessonBody: string, lessonTitle: string): ParsedSlide[] {
  const slides: ParsedSlide[] = [];

  // Check for explicit slide markers
  const hasSlideMarkers = />\s*\*\*Lesson \d+, Slide \d+\*\*/.test(lessonBody);

  if (hasSlideMarkers) {
    // Split on slide markers
    const chunks = lessonBody.split(/\n(?=>\s*\*\*Lesson \d+, Slide \d+\*\*)/);

    // First chunk is content before the first explicit marker
    for (let ci = 0; ci < chunks.length; ci++) {
      const chunk = chunks[ci].trim();
      if (!chunk) continue;

      // Remove the slide marker line itself
      const chunkLines = chunk.split('\n');
      const filteredLines = chunkLines.filter(l => !/^>\s*\*\*Lesson \d+, Slide \d+\*\*/.test(l.trim()));
      const cleanChunk = filteredLines.join('\n').trim();

      if (!cleanChunk) continue;
      if (isIntroFluff(cleanChunk)) continue;

      const blocks = parseContentToBlocks(cleanChunk);
      if (blocks.length > 0) {
        slides.push({ title: '', blocks });
      }
    }
  } else {
    // Heuristic splitting — split on natural content breaks
    const heuristicSlides = heuristicSplitLesson(lessonBody, lessonTitle);
    slides.push(...heuristicSlides);
  }

  // If we ended up with zero slides, try the whole body as one slide
  if (slides.length === 0) {
    const blocks = parseContentToBlocks(lessonBody);
    if (blocks.length > 0) {
      slides.push({ title: lessonTitle, blocks });
    }
  }

  // Post-process: if any single slide has too many blocks, split it
  const finalSlides: ParsedSlide[] = [];
  for (const slide of slides) {
    if (slide.blocks.length > 6) {
      const splitResult = splitLargeSlide(slide);
      finalSlides.push(...splitResult);
    } else {
      finalSlides.push(slide);
    }
  }

  return finalSlides.length > 0 ? finalSlides : slides;
}

/**
 * Heuristic splitting for lessons without explicit slide markers.
 * Groups content by: intro, content+images, quizzes, videos, summary, references.
 */
function heuristicSplitLesson(lessonBody: string, lessonTitle: string): ParsedSlide[] {
  const lines = lessonBody.split('\n');
  const slides: ParsedSlide[] = [];
  let currentChunkLines: string[] = [];
  let currentChunkType: 'content' | 'quiz' | 'intro' = 'content';
  let linesSinceLastSplit = 0;

  const flushChunk = () => {
    const text = currentChunkLines.join('\n').trim();
    if (!text) { currentChunkLines = []; return; }
    if (isIntroFluff(text)) { currentChunkLines = []; return; }

    const blocks = parseContentToBlocks(text);
    if (blocks.length > 0) {
      slides.push({ title: '', blocks });
    }
    currentChunkLines = [];
    linesSinceLastSplit = 0;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Skip empty lines — keep them but don't count
    if (trimmed === '') {
      currentChunkLines.push(line);
      continue;
    }

    // References section — flush current and start references slide
    if (/^\*\*#?\s*References:?\*\*/.test(trimmed) || /^\*\*#\s*References:?\*\*/.test(trimmed)) {
      flushChunk();
      // Collect all reference lines
      currentChunkLines.push(line);
      i++;
      while (i < lines.length) {
        currentChunkLines.push(lines[i]);
        i++;
      }
      flushChunk();
      continue;
    }

    // Summary section — flush and make its own slide
    if (/^\*\*#?\s*Summary:?\*\*/.test(trimmed)) {
      flushChunk();
      currentChunkLines.push(line);
      i++;
      // Collect summary content until next bold header or references
      while (i < lines.length) {
        const nextTrimmed = lines[i].trim();
        if (/^\*\*#?\s*References:?\*\*/.test(nextTrimmed)) break;
        if (/^\*\*#?\s*Summary:?\*\*/.test(nextTrimmed)) break;
        currentChunkLines.push(lines[i]);
        i++;
      }
      flushChunk();
      i--; // Will be incremented by loop
      continue;
    }

    // Video line — own slide
    if (/^🎬/.test(trimmed)) {
      flushChunk();
      currentChunkLines.push(line);
      flushChunk();
      continue;
    }

    // Quiz start — flush content, then collect quiz
    if (isQuizStart(lines, i) || /^\*\*\d+\.\s*.+\*\*$/.test(trimmed)) {
      // Check if this is really a numbered quiz
      let isNumberedQuiz = false;
      if (/^\*\*\d+\.\s*.+\*\*$/.test(trimmed)) {
        for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
          if (/^\s*[-*]?\s*[✓✗○]/.test(lines[j].trim())) {
            isNumberedQuiz = true;
            break;
          }
        }
      }

      if (isQuizStart(lines, i) || isNumberedQuiz) {
        if (currentChunkType !== 'quiz') {
          flushChunk();
        }
        currentChunkType = 'quiz';
      }
    } else if (currentChunkType === 'quiz' && !/^\s*[-*]?\s*[✓○✗]/.test(trimmed) && !/^\*\*Explanation:\*\*/.test(trimmed)) {
      // End of quiz section
      flushChunk();
      currentChunkType = 'content';
    }

    // Bold section header — potential split point
    if (/^\*\*[^*]+\*\*$/.test(trimmed) && !isQuizStart(lines, i) && currentChunkType !== 'quiz') {
      // Split if current chunk is large enough
      const nonEmptyLines = currentChunkLines.filter(l => l.trim() !== '').length;
      if (nonEmptyLines >= 6) {
        flushChunk();
      }
    }

    currentChunkLines.push(line);
    linesSinceLastSplit++;

    // Split if chunk is getting very large (content slides)
    if (currentChunkType === 'content' && linesSinceLastSplit > 25) {
      const nonEmptyLines = currentChunkLines.filter(l => l.trim() !== '').length;
      if (nonEmptyLines >= 8) {
        flushChunk();
      }
    }
  }

  flushChunk();
  return slides;
}

/**
 * Split a single large slide into smaller ones.
 */
function splitLargeSlide(slide: ParsedSlide): ParsedSlide[] {
  const result: ParsedSlide[] = [];
  let currentBlocks: ParsedBlock[] = [];
  const MAX_BLOCKS = 6;

  for (const block of slide.blocks) {
    currentBlocks.push(block);

    // Split at natural boundaries
    if (currentBlocks.length >= MAX_BLOCKS) {
      // Try to split at a non-image, non-quiz boundary
      result.push({ title: slide.title, blocks: [...currentBlocks] });
      currentBlocks = [];
    }
  }

  if (currentBlocks.length > 0) {
    result.push({ title: slide.title, blocks: currentBlocks });
  }

  return result;
}

// ─── Lesson splitter ───────────────────────────────────────────────────────────

export function splitIntoLessons(markdown: string): { title: string; body: string }[] {
  const chunks = markdown.split(/\n(?=## Lesson \d+)/);
  const lessons: { title: string; body: string }[] = [];

  for (const chunk of chunks) {
    const trimmed = chunk.trim();
    if (!trimmed) continue;

    const firstLine = trimmed.split('\n')[0];
    if (!/^## Lesson \d+/.test(firstLine)) continue;

    const title = cleanLessonTitle(firstLine);
    const body = trimmed.split('\n').slice(1).join('\n');
    lessons.push({ title, body });
  }

  return lessons;
}

// ─── Main module parser ────────────────────────────────────────────────────────

export function parseModule(def: ModuleDef, baseDir: string): ParsedModule {
  const filePath = path.join(baseDir, def.file);
  const raw = fs.readFileSync(filePath, 'utf8');

  const lessonChunks = splitIntoLessons(raw);
  const lessons: ParsedLesson[] = [];

  for (const chunk of lessonChunks) {
    const slides = splitIntoSlides(chunk.body, chunk.title);

    if (slides.length === 0) {
      warnings.push(`Lesson "${chunk.title}" in Module ${def.number} has no slides — skipping`);
      continue;
    }

    lessons.push({ title: chunk.title, slides });
  }

  if (lessons.length !== def.expectedLessons) {
    warnings.push(
      `Module ${def.number}: expected ${def.expectedLessons} lessons, got ${lessons.length}`
    );
  }

  return { def, lessons };
}
