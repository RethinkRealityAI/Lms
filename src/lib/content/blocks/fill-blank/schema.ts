import { z } from 'zod';

export const fillBlankDataSchema = z.object({
  /** Short instruction shown above the passage. */
  instructions: z.string().optional(),
  /**
   * The sentence or passage. Mark each blank by wrapping its correct answer in
   * [square brackets] — e.g. "Water is made of [hydrogen] and [oxygen]."
   * Each bracketed word becomes a drop target and its inner text is the correct
   * answer. The bracketed answers are automatically added to the word bank.
   */
  text: z.string().default(''),
  /** Extra wrong words mixed into the word bank to make it more challenging. */
  distractors: z.array(z.string()).default([]),
  /** Shuffle the word bank so the order isn't a giveaway. */
  shuffle: z.boolean().default(true),
  show_feedback: z.boolean().default(true),
  /** Message shown when every blank is filled correctly. */
  feedback_correct: z.string().optional(),
  /** Message shown when one or more blanks are wrong. */
  feedback_incorrect: z.string().optional(),
  /** Accent colour — progress, Check button, blank highlights. Hex. */
  accent_color: z.string().optional(),
  /** Word-bank chip background. Hex; blank = frosted glass. */
  chip_color: z.string().optional(),
  /** Text colour for the passage and chips. Hex; blank = surface text colour. */
  text_color: z.string().optional(),
});

export type FillBlankData = z.infer<typeof fillBlankDataSchema>;

// ── Parsing ──────────────────────────────────────────────────────────────────

export interface FillBlankSegment {
  kind: 'text' | 'blank';
  /** Text segment: the literal text. Blank segment: the correct answer. */
  value: string;
  /** 0-based blank index — only set on blank segments. */
  blankIndex?: number;
}

/**
 * Split a passage into ordered text + blank segments. A blank is any run wrapped
 * in single square brackets, e.g. `[answer]` (brackets cannot nest). The inner
 * text (trimmed) is the blank's correct answer.
 */
export function parseFillBlank(text: string): FillBlankSegment[] {
  const segments: FillBlankSegment[] = [];
  // Local regex (own lastIndex) so the parser is reentrant/side-effect free.
  const re = /\[([^[\]]+)\]/g;
  let last = 0;
  let blankIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) segments.push({ kind: 'text', value: text.slice(last, m.index) });
    const answer = m[1].trim();
    if (answer) {
      segments.push({ kind: 'blank', value: answer, blankIndex: blankIndex++ });
    } else {
      // Empty brackets `[]` are treated as literal text, not a blank.
      segments.push({ kind: 'text', value: m[0] });
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) segments.push({ kind: 'text', value: text.slice(last) });
  return segments;
}

/** Ordered list of correct answers, one per blank. */
export function getFillBlankAnswers(text: string): string[] {
  return parseFillBlank(text)
    .filter((s) => s.kind === 'blank')
    .map((s) => s.value);
}
