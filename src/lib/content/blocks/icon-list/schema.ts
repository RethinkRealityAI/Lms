import { z } from 'zod';

/** A single icon tile: an icon/image, a bold title, and a rich-text body. */
export const iconListItemSchema = z.object({
  /** Absolute URL to an icon or small image (SVG/PNG). Optional — falls back to a generic glyph. */
  icon_url: z.string().optional(),
  /** Bold tile heading. */
  title: z.string().default(''),
  /** Rich-text body shown under the title. */
  html: z.string().default(''),
});

export const iconListColumnsSchema = z.enum(['auto', '1', '2', '3', '4']);

export const iconListDataSchema = z.object({
  items: z.array(iconListItemSchema).default([]),
  /** Tile column count on wide containers. `auto` = responsive (1 → 2 → 3 by container width). */
  columns: iconListColumnsSchema.default('auto'),
  /** Icon size in pixels (square). */
  icon_size: z.number().int().min(24).max(160).default(64),
  /** Layout of icon vs text inside each tile. */
  layout: z.enum(['stacked', 'inline']).default('stacked'),
  /** Accent color for icon background ring + title. Falls back to brand navy. */
  accent_color: z.string().optional(),
  /** Title text color override. */
  title_color: z.string().optional(),
  /** Body text color override (defaults to inherit from slide surface). */
  text_color: z.string().optional(),
  /** Draw a card surface behind each tile. */
  card: z.boolean().default(true),
});

export type IconListItem = z.infer<typeof iconListItemSchema>;
export type IconListColumns = z.infer<typeof iconListColumnsSchema>;
export type IconListData = z.infer<typeof iconListDataSchema>;
