import { z } from 'zod';

export const ctaDataSchema = z.object({
  text: z.string().default(''),
  button_label: z.string().default('Click Here'),
  url: z.string().url().optional(),
});

export type CtaData = z.infer<typeof ctaDataSchema>;
