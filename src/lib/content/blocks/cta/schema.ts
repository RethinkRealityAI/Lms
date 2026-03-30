import { z } from 'zod';

export const ctaDataSchema = z.object({
  text: z.string().default(''),
  action: z.enum(['complete_lesson', 'next_lesson', 'external_url']).default('complete_lesson'),
  button_label: z.string().default('Continue'),
  url: z.string().url().optional(),
}).superRefine((val, ctx) => {
  if (val.action === 'external_url' && !val.url) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'url is required when action is external_url',
      path: ['url'],
    });
  }
});

export type CtaData = z.infer<typeof ctaDataSchema>;
