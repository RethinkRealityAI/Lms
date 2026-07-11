import { z } from 'zod';

export const fillBlankModeSchema = z.enum(['word_bank', 'strikeout']);

export const fillBlankDataSchema = z.object({
  /**
   * Interaction mode:
   * - `word_bank` (default): blanks are gaps the learner fills from a word bank.
   * - `strikeout`: the learner taps the WRONG word in the sentence; it strikes through
   *   and the correct word is revealed inline.
   */
  mode: fillBlankModeSchema.default('word_bank'),
  /** Short instruction shown above the passage. */
  instructions: z.string().optional(),
  /**
   * The sentence or passage with marked words wrapped in [square brackets].
   * - Word-bank mode: `[answer]` — the inner text is the correct answer and a drop target.
   * - Strikeout mode: `[wrong|correct]` — `wrong` is the struck word shown to the learner,
   *   `correct` is revealed when they tap it. (Authors normally mark words by clicking
   *   them in the editor rather than typing brackets.)
   */
  text: z.string().default(''),
  /** Word-bank mode only: extra wrong words mixed into the bank to make it harder. */
  distractors: z.array(z.string()).default([]),
  /** Word-bank mode only: shuffle the bank so the order isn't a giveaway. */
  shuffle: z.boolean().default(true),
  show_feedback: z.boolean().default(true),
  /** Required to continue: gate the Next button until every blank is correct. */
  required: z.boolean().default(false),
  /** Message shown when every blank is correct / every word is corrected. */
  feedback_correct: z.string().optional(),
  /** Word-bank mode only: message shown when one or more blanks are wrong. */
  feedback_incorrect: z.string().optional(),
  /** Accent colour — progress, Check button, blank highlights. Hex. */
  accent_color: z.string().optional(),
  /** Word-bank chip background. Hex; blank = frosted glass. */
  chip_color: z.string().optional(),
  /** Text colour for the passage and chips. Hex; blank = surface text colour. */
  text_color: z.string().optional(),
});

export type FillBlankMode = z.infer<typeof fillBlankModeSchema>;
export type FillBlankData = z.infer<typeof fillBlankDataSchema>;

// ── Parsing ──────────────────────────────────────────────────────────────────

export interface FillBlankSegment {
  kind: 'text' | 'blank';
  /** Text segment: the literal text. Blank segment: the correct answer. */
  value: string;
  /** Strikeout blanks only: the wrong word displayed (struck) before it's corrected. */
  wrong?: string;
  /** 0-based blank index — only set on blank segments. */
  blankIndex?: number;
}

/** Split a `[wrong|correct]` (or `[correct]`) bracket body into its parts. */
export function parseBracketBody(body: string): { wrong?: string; correct: string } {
  const pipe = body.indexOf('|');
  if (pipe === -1) return { correct: body.trim() };
  return { wrong: body.slice(0, pipe).trim(), correct: body.slice(pipe + 1).trim() };
}

/**
 * Split a passage into ordered text + blank segments. A blank is any run wrapped
 * in single square brackets, e.g. `[answer]` or `[wrong|correct]` (brackets cannot
 * nest). For strikeout blanks the `wrong` part is the struck word and `value` is the
 * correct answer; for plain blanks `value` is the answer and `wrong` is undefined.
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
    const { wrong, correct } = parseBracketBody(m[1]);
    // A blank needs a correct answer. Strikeout blanks also need a wrong word; if the
    // wrong word is missing the blank is treated as literal text (incomplete authoring).
    if (correct) {
      segments.push({ kind: 'blank', value: correct, wrong, blankIndex: blankIndex++ });
    } else {
      // Empty / answerless brackets are treated as literal text, not a blank.
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

// ── Tokenizer (editor click-to-select) ──────────────────────────────────────

export interface FillBlankToken {
  kind: 'word' | 'blank' | 'sep';
  /** Display text — the word, the struck word (blank), or the literal separator. */
  text: string;
  /** Char offset of this token's span in the raw passage. */
  start: number;
  /** Exclusive end offset of this token's span in the raw passage. */
  end: number;
  /** Blank only: the correct answer. */
  correct?: string;
  /** Strikeout blank only: the wrong (struck) word. */
  wrong?: string;
  /** Blank only: 0-based blank index. */
  blankIndex?: number;
}

// A "word" is a run of letters/numbers (plus internal apostrophes/hyphens). Everything
// else (spaces, punctuation) is a non-toggleable separator preserved verbatim.
const WORD_SOURCE = "[\\p{L}\\p{N}][\\p{L}\\p{N}'’-]*";

/**
 * Tokenize a passage into positioned word / blank / separator tokens so the editor can
 * render each word as a click-to-toggle target and splice brackets by exact offset
 * (repeat words are handled correctly because tokens carry their own start/end).
 */
export function tokenizeFillBlank(text: string): FillBlankToken[] {
  const tokens: FillBlankToken[] = [];
  let blankIndex = 0;

  const pushPlain = (chunk: string, base: number) => {
    const wre = new RegExp(WORD_SOURCE, 'gu');
    let wlast = 0;
    let wm: RegExpExecArray | null;
    while ((wm = wre.exec(chunk)) !== null) {
      if (wm.index > wlast) {
        tokens.push({ kind: 'sep', text: chunk.slice(wlast, wm.index), start: base + wlast, end: base + wm.index });
      }
      tokens.push({ kind: 'word', text: wm[0], start: base + wm.index, end: base + wm.index + wm[0].length });
      wlast = wm.index + wm[0].length;
    }
    if (wlast < chunk.length) {
      tokens.push({ kind: 'sep', text: chunk.slice(wlast), start: base + wlast, end: base + chunk.length });
    }
  };

  const blankRe = /\[([^[\]]+)\]/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = blankRe.exec(text)) !== null) {
    if (m.index > last) pushPlain(text.slice(last, m.index), last);
    const { wrong, correct } = parseBracketBody(m[1]);
    if (correct || wrong) {
      tokens.push({
        kind: 'blank',
        text: wrong ?? correct,
        wrong,
        correct,
        blankIndex: blankIndex++,
        start: m.index,
        end: m.index + m[0].length,
      });
    } else {
      pushPlain(m[0], m.index); // empty brackets → literal
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) pushPlain(text.slice(last), last);
  return tokens;
}

/** Replace the [start,end) span of `text` with `replacement`. */
export function spliceText(text: string, start: number, end: number, replacement: string): string {
  return text.slice(0, start) + replacement + text.slice(end);
}
