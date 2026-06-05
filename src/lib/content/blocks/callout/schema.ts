import { z } from 'zod';

export const calloutDataSchema = z.object({
  // Shared: which mode is active
  mode: z.enum(['callout', 'speech_bubble']).default('callout'),

  // ── Callout mode ──────────────────────────────────────────────────
  variant: z.enum(['info', 'warning', 'tip', 'success']).default('info'),
  html: z.string().default(''),
  title: z.string().optional(),

  // ── Speech bubble mode ────────────────────────────────────────────
  bubble_text: z.string().default(''),
  author_name: z.string().optional(),
  author_title: z.string().optional(),
  avatar_url: z.string().optional(),
  direction: z.enum(['left', 'right']).default('right'),
  bubble_style: z.enum(['light', 'dark', 'accent']).default('light'),
  avatar_style: z.enum(['circle', 'square', 'rounded']).default('circle'),
});

export type CalloutData = z.infer<typeof calloutDataSchema>;
