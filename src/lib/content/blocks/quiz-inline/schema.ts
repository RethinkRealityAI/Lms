import { z } from 'zod';

export const quizInlineDataSchema = z.object({
  question_type: z.enum(['categorize', 'multiple_choice', 'true_false']),
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
});

export type QuizInlineData = z.infer<typeof quizInlineDataSchema>;
