import { z } from 'zod';

export const videoDataSchema = z.object({
  url: z.string().url(),
  poster: z.string().url().optional(),
  autoplay: z.boolean().default(false),
  caption: z.string().optional(),
  /** Optional title shown in the player's top bar (EdApp-style chrome). */
  title: z.string().optional(),
  /** Start playback at this many seconds in. */
  start: z.number().min(0).optional(),
  /** Stop playback at this many seconds. */
  end: z.number().min(0).optional(),
  /** Advance to the next slide automatically once the video finishes. */
  auto_progress: z.boolean().optional(),
  /** Show a "Skip video" affordance so learners can move on. */
  show_skip: z.boolean().optional(),
});

export type VideoData = z.infer<typeof videoDataSchema>;
