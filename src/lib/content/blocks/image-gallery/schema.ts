import { z } from 'zod';

export const imageGalleryDataSchema = z.object({
  images: z.array(z.object({
    url: z.string(),
    caption: z.string().nullable().optional(),
    alt: z.string().optional(),
  })).default([]),
  mode: z.enum(['slider', 'gallery', 'carousel']).default('gallery'),
});

export type ImageGalleryData = z.infer<typeof imageGalleryDataSchema>;
