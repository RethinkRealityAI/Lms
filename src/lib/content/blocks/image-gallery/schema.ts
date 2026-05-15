import { z } from 'zod';

export const imageGalleryDataSchema = z.object({
  images: z.array(z.object({
    url: z.string().url(),
    caption: z.string().nullable().optional(),
    alt: z.string().optional(),
  })).default([]),
  mode: z.enum(['slider', 'gallery', 'carousel']).default('gallery'),
  /** CSS aspect-ratio value: 'original' | '16/9' | '4/3' | '1/1' */
  aspectRatio: z.string().optional(),
  /** CSS object-fit: 'cover' | 'contain' */
  objectFit: z.enum(['cover', 'contain']).optional(),
});

export type ImageGalleryData = z.infer<typeof imageGalleryDataSchema>;
