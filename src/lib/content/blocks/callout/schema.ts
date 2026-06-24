import { z } from 'zod';
import { mediaFieldSchema, mediaPositionSchema } from '@/lib/content/blocks/shared/media';

export const calloutDataSchema = z.object({
  // Shared: which mode is active
  mode: z.enum(['callout', 'speech_bubble']).default('callout'),

  // ── Callout mode ──────────────────────────────────────────────────
  variant: z.enum(['info', 'warning', 'tip', 'success']).default('info'),
  html: z.string().default(''),
  title: z.string().optional(),
  /** Icon override (lucide name from CALLOUT_ICONS), or 'none' to hide. Blank = use the variant's default icon. */
  icon: z.string().optional(),
  /** Colour overrides — blank = use the variant's preset colour. */
  bg_color: z.string().optional(),
  border_color: z.string().optional(),
  text_color: z.string().optional(),
  icon_color: z.string().optional(),
  /** Optional image/video placed around the callout content. */
  media: mediaFieldSchema.optional(),
  /** Where the media sits relative to the callout text (default 'top'). */
  media_position: mediaPositionSchema.optional(),

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
