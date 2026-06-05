import { z } from 'zod';

export const imageGalleryDisplaySizeSchema = z.enum(['sm', 'md', 'lg', 'xl']);

export const imageWidthPresetSchema = z.enum(['full', 'lg', 'md', 'sm']);
export const imageAlignSchema = z.enum(['left', 'center', 'right']);

/** Per-breakpoint overridable sizing fields (all optional — absent = inherit). */
export const imageResponsiveOverrideSchema = z.object({
  objectFit: z.enum(['cover', 'contain']).optional(),
  displaySize: imageGalleryDisplaySizeSchema.optional(),
  columns: z.number().int().min(1).max(4).optional(),
  widthPreset: imageWidthPresetSchema.optional(),
  align: imageAlignSchema.optional(),
});

export const imageGalleryDataSchema = z.object({
  images: z.array(z.object({
    url: z.string().url(),
    caption: z.string().nullable().optional(),
    alt: z.string().optional(),
  })).default([]),
  /**
   * Display mode. `single` is the default — one image, full width. The gallery /
   * slider / carousel modes only kick in when the author explicitly chooses them.
   */
  mode: z.enum(['single', 'gallery', 'slider', 'carousel']).default('single'),
  /** Grid mode only: stack vertically vs. lay out side-by-side in columns. */
  gridLayout: z.enum(['stacked', 'sideBySide']).default('sideBySide').optional(),
  /** Grid mode only: number of columns when side-by-side (1–4). */
  columns: z.number().int().min(1).max(4).default(2).optional(),
  /** CSS aspect-ratio value: 'original' | '16/9' | '4/3' | '1/1' */
  aspectRatio: z.string().optional(),
  /** CSS object-fit — defaults to contain so full images show in the grid. */
  objectFit: z.enum(['cover', 'contain']).optional().default('contain'),
  /** Thumbnail / grid display scale */
  displaySize: imageGalleryDisplaySizeSchema.optional().default('md'),
  /** Open a full-screen or card lightbox on click. */
  enableLightbox: z.boolean().default(true).optional(),
  /** Show captions under images in the grid (when false, captions appear in the lightbox only). */
  captionInGrid: z.boolean().default(true).optional(),
  /**
   * "Click for more" interaction — hides grid captions, shows a hint overlay,
   * opens a refined card lightbox, and optionally tracks viewed images.
   */
  clickForMore: z.boolean().default(false).optional(),
  /** Hint shown on hover / below image when clickForMore is enabled */
  clickHint: z.string().default('Tap for more').optional(),
  /** Dim images and show a checkmark after they have been opened */
  markClicked: z.boolean().default(true).optional(),
  /** Student must open every image before the block counts as complete */
  requireAllClicked: z.boolean().default(false).optional(),
  /** Caption text color — omit or `'inherit'` to match the slide block surface style */
  captionColor: z.string().optional(),
  /** Inner container "skin" — legacy; BlockSurface owns styling now. */
  containerStyle: z.enum(['inherit', 'white', 'glass']).default('inherit').optional(),
  /**
   * Optional instructional text shown above or below the entire gallery.
   * Use to provide context, instructions, or descriptions for the image set.
   */
  prompt: z.string().optional(),
  /** Where to render the prompt relative to the image(s). `'none'` hides it. */
  promptPosition: z.enum(['none', 'top', 'bottom']).default('none').optional(),
  /** Desktop base: how wide the image/gallery is within its slide cell. */
  widthPreset: imageWidthPresetSchema.default('full').optional(),
  /** Desktop base: horizontal alignment when widthPreset < full. */
  align: imageAlignSchema.default('center').optional(),
  /** Per-breakpoint sizing overrides. Desktop = base fields above. */
  responsive: z.object({
    tablet: imageResponsiveOverrideSchema.optional(),
    mobile: imageResponsiveOverrideSchema.optional(),
  }).optional(),
});

export type ImageGalleryData = z.infer<typeof imageGalleryDataSchema>;
export type ImageGalleryDisplaySize = z.infer<typeof imageGalleryDisplaySizeSchema>;
export type ImageWidthPreset = z.infer<typeof imageWidthPresetSchema>;
export type ImageAlign = z.infer<typeof imageAlignSchema>;
export type ImageResponsiveOverride = z.infer<typeof imageResponsiveOverrideSchema>;
