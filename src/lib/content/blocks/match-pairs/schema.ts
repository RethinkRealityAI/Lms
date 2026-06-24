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

// ── Normalization ─────────────────────────────────────────────────────────────
// Older imports (and the SCAGO markdown pipeline) stored pairs as a shorthand
// `{ left, right }` with plain strings, no `id`, and the instruction text under a
// top-level `prompt` key. The viewer/editor expect `{ id, prompt: Side, match: Side }`
// with a top-level `instructions`. Normalizing on read makes those blocks render and
// edit without crashing, and lets them self-heal the next time they're saved.

/** Coerce any value into a valid MatchSide (string → text side; object → typed side). */
export function normalizeMatchSide(raw: unknown): MatchSide {
  if (raw == null) return { type: 'text' };
  if (typeof raw === 'string') return { type: 'text', text: raw };
  if (typeof raw === 'object') {
    const o = raw as Record<string, unknown>;
    const imageUrl = typeof o.image_url === 'string' && o.image_url ? o.image_url
      : typeof o.url === 'string' && o.url ? (o.url as string) : undefined;
    const type: MatchSide['type'] = o.type === 'image' || (o.type == null && imageUrl) ? 'image' : 'text';
    const text = typeof o.text === 'string' ? o.text
      : typeof o.value === 'string' ? (o.value as string)
      : typeof o.label === 'string' ? (o.label as string) : undefined;
    return { type, ...(imageUrl ? { image_url: imageUrl } : {}), ...(text != null ? { text } : {}) };
  }
  return { type: 'text' };
}

/** Coerce any stored match-pairs data into the canonical shape (preserves layout/extra keys). */
export function normalizeMatchPairsData(input: unknown): MatchPairsData {
  const d = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
  const rawPairs = Array.isArray(d.pairs) ? d.pairs : [];
  const pairs = rawPairs.map((p, i) => {
    const po = (p && typeof p === 'object' ? p : {}) as Record<string, unknown>;
    const promptRaw = po.prompt !== undefined ? po.prompt : po.left;
    const matchRaw = po.match !== undefined ? po.match : po.right;
    const id = typeof po.id === 'string' && po.id ? (po.id as string) : `mp-${i}`;
    return { id, prompt: normalizeMatchSide(promptRaw), match: normalizeMatchSide(matchRaw) };
  });
  const instructions = typeof d.instructions === 'string' && d.instructions
    ? (d.instructions as string)
    : typeof d.prompt === 'string' && d.prompt ? (d.prompt as string) : undefined;
  // Drop the legacy top-level `prompt` (now `instructions`); keep everything else
  // (grid position, colours, etc.) so the block doesn't lose its layout.
  const { prompt: _legacyPrompt, pairs: _p, instructions: _i, ...rest } = d;
  return {
    ...rest,
    pairs,
    prompt_side: d.prompt_side === 'right' ? 'right' : 'left',
    shuffle: d.shuffle === undefined ? true : Boolean(d.shuffle),
    show_feedback: d.show_feedback === undefined ? true : Boolean(d.show_feedback),
    ...(instructions ? { instructions } : {}),
  } as MatchPairsData;
}
