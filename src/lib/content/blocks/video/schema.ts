import { z } from 'zod';

export const videoDataSchema = z.object({
  url: z.string().url(),
  poster: z.string().url().optional(),
  autoplay: z.boolean().default(false),
  caption: z.string().optional(),
});

export type VideoData = z.infer<typeof videoDataSchema>;
