import { z } from 'zod';

/** One side (the hidden "after" base, or the scratch-off "before" cover) */
const faceSchema = z.object({
  type: z.enum(['image', 'text']).default('image'),
  image_url: z.string().optional(),
  text: z.string().optional(),
  bg_color: z.string().default('#1A3C6E'),
  text_color: z.string().default('#FFFFFF'),
});

export const scratchRevealDataSchema = z.object({
  // The cover the learner scratches off
  before: faceSchema.default({ type: 'text', text: 'Scratch to reveal!', bg_color: '#1A3C6E', text_color: '#FFFFFF' }),
  // What's revealed underneath
  after: faceSchema.default({ type: 'text', text: 'Surprise! 🎉', bg_color: '#FFFFFF', text_color: '#0F172A' }),

  brush_size: z.number().min(10).max(120).default(42),
  /** % of the cover that must be cleared before it auto-reveals + celebrates */
  reveal_threshold: z.number().min(20).max(100).default(55),
  /** Celebration when revealed */
  animation: z.enum(['none', 'confetti', 'sparkles']).default('confetti'),
  /** Required to continue: gate the Next button until the learner reveals the card. */
  required: z.boolean().default(false),
  /** Optional instruction shown above the card */
  prompt: z.string().optional(),
  /** Aspect ratio of the card (w/h) */
  aspect: z.enum(['16/9', '4/3', '1/1', '3/2']).default('16/9'),
  /** How images fit the card. `contain` shows the whole image (default); `cover` fills/crops. */
  fit: z.enum(['contain', 'cover']).default('contain'),
});

export type ScratchRevealData = z.infer<typeof scratchRevealDataSchema>;
export type ScratchFace = z.infer<typeof faceSchema>;
