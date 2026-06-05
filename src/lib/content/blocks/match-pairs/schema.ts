import { z } from 'zod';

/** One side of a pair — an image or a short text */
const sideSchema = z.object({
  type: z.enum(['image', 'text']).default('text'),
  image_url: z.string().optional(),
  text: z.string().optional(),
});

export const matchPairsDataSchema = z.object({
  pairs: z.array(z.object({
    id: z.string(),
    /** The fixed item shown in its column */
    prompt: sideSchema.default({ type: 'text' }),
    /** The draggable item the learner matches to the prompt */
    match: sideSchema.default({ type: 'text' }),
  })).default([]),
  /** Which side the (fixed) prompts sit on; matches go on the other side */
  prompt_side: z.enum(['left', 'right']).default('left'),
  instructions: z.string().optional(),
  /** Shuffle the draggable matches so order isn't a giveaway */
  shuffle: z.boolean().default(true),
  show_feedback: z.boolean().default(true),
  /** Accent colour for selection highlights + the Check Answer button. Hex. */
  accent_color: z.string().optional(),
  /** Item-card background colour (the draggable items). Hex; blank = frosted glass. */
  item_color: z.string().optional(),
  /** Match-card background colour (the drop targets). Hex; blank = frosted glass. */
  match_color: z.string().optional(),
  /** Card text colour. Hex; blank = inherits the surface text colour. */
  text_color: z.string().optional(),
});

export type MatchPairsData = z.infer<typeof matchPairsDataSchema>;
export type MatchSide = z.infer<typeof sideSchema>;
