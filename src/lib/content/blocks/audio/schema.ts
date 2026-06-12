import { z } from 'zod';

export const audioDataSchema = z.object({
  /** Absolute URL to an audio file (mp3, m4a, wav, ogg). */
  url: z.string().default(''),
  /** Optional title shown above the player. */
  title: z.string().optional(),
  /** Optional caption / transcript note shown below the player. */
  caption: z.string().optional(),
  /** Optional credit / attribution line. */
  credit: z.string().optional(),
  /** Autoplay is off by default (browsers block it anyway). */
  autoplay: z.boolean().default(false),
});

export type AudioData = z.infer<typeof audioDataSchema>;
