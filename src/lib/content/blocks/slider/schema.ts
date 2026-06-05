import { z } from 'zod';

export const sliderDataSchema = z.object({
  question: z.string().default(''),
  min_value: z.number().default(1),
  max_value: z.number().default(10),
  default_value: z.number().optional(),
  increment: z.number().min(0.001).default(1),
  decimals: z.number().int().min(0).max(4).default(0),
  min_label: z.string().optional(),
  max_label: z.string().optional(),
  prefix: z.string().optional(),
  suffix: z.string().optional(),
  prompt: z.string().optional(),
  show_ticks: z.boolean().default(true),
  required: z.boolean().default(false),
});

export type SliderData = z.infer<typeof sliderDataSchema>;
