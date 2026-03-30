import { z } from 'zod';

export const richTextDataSchema = z.object({
  html: z.string().default(''),
  mode: z.enum(['scrolling', 'sequence', 'standard', 'fallback']).default('standard'),
  media: z.array(z.object({
    type: z.enum(['image', 'video']),
    url: z.string(),
    caption: z.string().optional(),
  })).optional(),
  segments: z.array(z.object({
    text: z.string(),
    reveal_order: z.number(),
  })).optional(),
});

export type RichTextData = z.infer<typeof richTextDataSchema>;
