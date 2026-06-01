import { z } from 'zod';

export const surveyQuestionTypes = [
  'true_false',
  'multiple_choice',
  'multi_select',
  'text',
  'textarea',
  'rating',
  'scale',
] as const;

export type SurveyQuestionType = (typeof surveyQuestionTypes)[number];

export const surveyQuestionSchema = z.object({
  id: z.string(),
  type: z.enum(surveyQuestionTypes),
  question: z.string().default(''),
  required: z.boolean().default(false),
  options: z.array(z.string()).optional(),
  min_value: z.number().optional(),
  max_value: z.number().optional(),
  min_label: z.string().optional(),
  max_label: z.string().optional(),
  increment: z.number().optional(),
});

export const surveyDataSchema = z.object({
  title: z.string().default('Survey'),
  description: z.string().optional(),
  submit_label: z.string().default('Submit Survey'),
  questions: z.array(surveyQuestionSchema).default([]),
});

export type SurveyQuestion = z.infer<typeof surveyQuestionSchema>;
export type SurveyData = z.infer<typeof surveyDataSchema>;

/** Stored answer shapes keyed by question id */
export type SurveyAnswerValue =
  | string
  | number
  | boolean
  | string[];

export type SurveyAnswers = Record<string, SurveyAnswerValue>;

export function createDefaultQuestion(type: SurveyQuestionType = 'multiple_choice'): SurveyQuestion {
  const base = {
    id: crypto.randomUUID(),
    type,
    question: '',
    required: false,
  };

  switch (type) {
    case 'true_false':
      return { ...base, options: ['True', 'False'] };
    case 'multiple_choice':
    case 'multi_select':
      return { ...base, options: ['Option 1', 'Option 2'] };
    case 'scale':
      return { ...base, min_value: 1, max_value: 10, increment: 1 };
    case 'rating':
      return base;
    default:
      return base;
  }
}

/** Copy template data into a block with fresh question IDs. */
export function cloneSurveyDataFromTemplate(templateData: SurveyData): SurveyData {
  return {
    title: templateData.title ?? 'Survey',
    description: templateData.description,
    submit_label: templateData.submit_label ?? 'Submit Survey',
    questions: (templateData.questions ?? []).map((q) => ({
      ...q,
      id: crypto.randomUUID(),
    })),
  };
}

export function questionTypeLabel(type: SurveyQuestionType): string {
  switch (type) {
    case 'true_false':
      return 'True / False';
    case 'multiple_choice':
      return 'Multiple Choice';
    case 'multi_select':
      return 'Multi-Select';
    case 'text':
      return 'Short Text';
    case 'textarea':
      return 'Long Text';
    case 'rating':
      return 'Star Rating';
    case 'scale':
      return 'Numeric Scale';
    default: {
      const _exhaustive: never = type;
      return _exhaustive;
    }
  }
}
