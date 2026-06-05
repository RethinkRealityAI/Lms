import { z } from 'zod';

export const quizInlineDataSchema = z.object({
  question_type: z.enum(['categorize', 'multiple_choice', 'true_false', 'select_all', 'swipe']),
  question: z.string().optional(),
  instructions: z.string().optional(),
  categories: z.array(z.object({
    name: z.string(),
    items: z.array(z.string()),
  })).optional(),
  options: z.array(z.string()).optional(),
  correct_answer: z.string().optional(),
  show_feedback: z.boolean().default(true),
  /** Custom message shown when the student answers correctly */
  feedback_correct: z.string().optional(),
  /** Custom message shown when the student answers incorrectly */
  feedback_incorrect: z.string().optional(),
  /** Optional explanation shown after answering (regardless of correctness) */
  explanation: z.string().optional(),
  /** Optional hint shown before answering */
  hint: z.string().optional(),
  /** Whether to shuffle option order each attempt */
  shuffle_options: z.boolean().optional(),
  /** Time limit in seconds (0 = no limit) */
  time_limit: z.number().optional(),
  /**
   * Swipe-type deck: a stack of question cards swiped one at a time. The two side
   * answers are shared across the deck (stored in `options` as [left, right]); each
   * card has its own statement and which side is correct. `question` acts as an
   * optional deck prompt shown above the cards.
   */
  swipe_cards: z.array(z.object({
    question: z.string().default(''),
    correct: z.enum(['left', 'right']).default('right'),
  })).optional(),
  /** Accent colour for the swipe deck (progress bar, score pill, buttons). Hex. */
  swipe_accent_color: z.string().optional(),
  /** Card background colour. Hex; falls back to frosted glass. */
  swipe_card_color: z.string().optional(),
  /** Card text colour. Hex; falls back to the surface text colour. */
  swipe_card_text_color: z.string().optional(),
});

export type QuizInlineData = z.infer<typeof quizInlineDataSchema>;
