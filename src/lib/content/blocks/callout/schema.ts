import { z } from 'zod';

export const calloutDataSchema = z.object({
  variant: z.enum(['info', 'warning', 'tip', 'success']).default('info'),
  html: z.string().default(''),
  title: z.string().optional(),
});

export type CalloutData = z.infer<typeof calloutDataSchema>;
