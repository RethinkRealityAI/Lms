import { z } from 'zod';
import { mediaFieldSchema, mediaPositionSchema } from '@/lib/content/blocks/shared/media';

export const contentListItemAnimationSchema = z.enum(['none', 'left', 'right', 'up', 'down']);
export const contentListBulletStyleSchema = z.enum([
  'disc',
  'circle',
  'square',
  'dash',
  'decimal',
  'none',
]);
export const contentListFontSizeSchema = z.enum(['auto', 'sm', 'md', 'lg', 'xl']);

/** How the list renders: a classic bulleted list, or an expand/collapse accordion. */
export const contentListDisplayModeSchema = z.enum(['list', 'accordion']);
/** Icon shown on each accordion header. */
export const accordionIconSchema = z.enum(['caret', 'plus']);
export const accordionIconPositionSchema = z.enum(['left', 'right']);
/** Which panels start open. */
export const accordionDefaultOpenSchema = z.enum(['none', 'first', 'all']);

export const contentListItemSchema = z.object({
  /** Accordion header text (accordion mode only). Falls back to a generic label if empty. */
  title: z.string().optional(),
  /** Rich-text body. In list mode this is the bullet; in accordion mode it's the panel content. */
  html: z.string().default(''),
  animation: contentListItemAnimationSchema.optional(),
});

export const contentListDataSchema = z.object({
  heading: z.string().optional(),
  items: z.array(contentListItemSchema).default([]),

  /** Display mode — `list` (default, backward compatible) or `accordion`. */
  display_mode: contentListDisplayModeSchema.default('list'),

  // ── List-mode styling ──
  bullet_style: contentListBulletStyleSchema.default('disc'),
  bullet_color: z.string().optional(),
  text_color: z.string().optional(),
  font_size: contentListFontSizeSchema.default('auto'),

  // ── Accordion-mode options ──
  /** Caret (chevron) or plus/minus toggle icon. */
  accordion_icon: accordionIconSchema.default('caret'),
  /** Place the toggle icon at the start or end of the header. */
  accordion_icon_position: accordionIconPositionSchema.default('right'),
  /** Allow several panels open at once. When false, opening one closes the others. */
  accordion_multiple: z.boolean().default(false),
  /** Which panels are expanded on first render. */
  accordion_default_open: accordionDefaultOpenSchema.default('none'),
  /** Accent colour for icons + the active header. Falls back to brand navy. */
  accordion_accent_color: z.string().optional(),

  // ── Animation (both modes share entrance animation; accordion always animates expand) ──
  /** Entrance animation is ON by default for new lists. */
  enable_animations: z.boolean().default(true),
  /** How long each item's entrance runs (ms). Falls back to 500 when unset. */
  animation_duration_ms: z.number().int().min(0).default(500),
  animation_stagger_ms: z.number().int().min(0).default(120),
  /** When true, `animation_direction` applies to EVERY item (the per-item control is hidden). */
  animation_uniform: z.boolean().default(false),
  /** The shared entrance direction used for all items when `animation_uniform` is true. */
  animation_direction: contentListItemAnimationSchema.optional(),

  // ── Optional companion media (image/video) placed around the list ──
  media: mediaFieldSchema.optional(),
  /** Where the media sits relative to the list (default 'left'). */
  media_position: mediaPositionSchema.optional(),
});

export type ContentListItemAnimation = z.infer<typeof contentListItemAnimationSchema>;
export type ContentListBulletStyle = z.infer<typeof contentListBulletStyleSchema>;
export type ContentListFontSize = z.infer<typeof contentListFontSizeSchema>;
export type ContentListDisplayMode = z.infer<typeof contentListDisplayModeSchema>;
export type AccordionIcon = z.infer<typeof accordionIconSchema>;
export type AccordionIconPosition = z.infer<typeof accordionIconPositionSchema>;
export type AccordionDefaultOpen = z.infer<typeof accordionDefaultOpenSchema>;
export type ContentListItem = z.infer<typeof contentListItemSchema>;
export type ContentListData = z.infer<typeof contentListDataSchema>;
