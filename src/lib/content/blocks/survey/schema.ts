import { z } from 'zod';

export const LIKERT_SCALES = {
  likelihood: ['Very Likely', 'Likely', 'Neutral', 'Unlikely', 'Very Unlikely'],
  agreement: ['Strongly Agree', 'Agree', 'Neutral', 'Disagree', 'Strongly Disagree'],
  satisfaction: ['Very Satisfied', 'Satisfied', 'Neutral', 'Dissatisfied', 'Very Dissatisfied'],
} as const;

export type LikertScale = keyof typeof LIKERT_SCALES;

export const surveyQuestionSchema = z.object({
  id: z.string(),
  type: z.enum(['likert', 'free_text']),
  question: z.string(),
  scale: z.enum(['likelihood', 'agreement', 'satisfaction']).optional(),
  required: z.boolean().optional(),
  placeholder: z.string().optional(),
});

export type SurveyQuestion = z.infer<typeof surveyQuestionSchema>;

export const surveyDataSchema = z.object({
  title: z.string().optional(),
  intro: z.string().optional(),
  questions: z.array(surveyQuestionSchema).default([]),
  submit_label: z.string().optional(),
  thank_you_message: z.string().optional(),
});

export type SurveyData = z.infer<typeof surveyDataSchema>;
