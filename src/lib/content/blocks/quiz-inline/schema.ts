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
});

export type QuizInlineData = z.infer<typeof quizInlineDataSchema>;
