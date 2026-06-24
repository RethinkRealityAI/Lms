import { z } from 'zod';

/**
 * Shared "media field" — a reusable image-or-video value embedded in other blocks
 * (content_list, image_gallery, callout, …) so media + text components stay consistent
 * instead of being stitched together from separate blocks.
 */

export const mediaKindSchema = z.enum(['image', 'video']);
/** Width buckets — from a tiny icon up to full width. */
export const mediaSizeSchema = z.enum(['icon', 'xs', 'sm', 'md', 'lg', 'full']);
/** Where the media sits relative to the companion content. */
export const mediaPositionSchema = z.enum(['top', 'bottom', 'left', 'right']);
export const mediaFitSchema = z.enum(['cover', 'contain']);

export const mediaFieldSchema = z.object({
  kind: mediaKindSchema.default('image'),
  /** Absolute URL — image file, video file, or a YouTube/Vimeo page URL. */
  url: z.string().default(''),
  alt: z.string().optional(),
  size: mediaSizeSchema.default('md'),
  fit: mediaFitSchema.default('contain'),
  /** Rounded corners on the media. */
  rounded: z.boolean().default(true),
  /** Optional caption shown under the media. */
  caption: z.string().optional(),
});

export type MediaKind = z.infer<typeof mediaKindSchema>;
export type MediaSize = z.infer<typeof mediaSizeSchema>;
export type MediaPosition = z.infer<typeof mediaPositionSchema>;
export type MediaFit = z.infer<typeof mediaFitSchema>;
export type MediaField = z.infer<typeof mediaFieldSchema>;

/** Default media field for new media slots. */
export const DEFAULT_MEDIA: MediaField = {
  kind: 'image', url: '', size: 'md', fit: 'contain', rounded: true,
};

/** True when the media field actually points at something. */
export function hasMedia(m?: MediaField | null): m is MediaField {
  return !!m && typeof m.url === 'string' && m.url.trim().length > 0;
}

/** Max width (px) for each size bucket. `full` = no cap (100%). */
export const MEDIA_SIZE_PX: Record<MediaSize, number | null> = {
  icon: 48,
  xs: 96,
  sm: 160,
  md: 280,
  lg: 440,
  full: null,
};

export const MEDIA_SIZE_LABEL: Record<MediaSize, string> = {
  icon: 'Icon',
  xs: 'XS',
  sm: 'S',
  md: 'M',
  lg: 'L',
  full: 'Full',
};

export function youtubeId(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : null;
}
export function vimeoId(url: string): string | null {
  const m = url.match(/vimeo\.com\/(?:[^/]+\/)*(\d+)/);
  return m ? m[1] : null;
}
