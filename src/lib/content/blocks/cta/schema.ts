import { z } from 'zod';

export const ctaButtonStyleSchema = z.enum(['solid', 'outline', 'soft']);
export const ctaFontSizeSchema = z.enum(['sm', 'md', 'lg', 'xl']);
export const ctaAlignSchema = z.enum(['left', 'center', 'right']);
export const ctaRadiusSchema = z.enum(['none', 'md', 'lg', 'full']);

export const ctaDataSchema = z.object({
  text: z.string().default(''),
  button_label: z.string().default('Click Here'),
  url: z.string().url().optional(),

  // ── Appearance ──
  /** Button fill / accent colour (hex). Falls back to brand navy. */
  button_color: z.string().optional(),
  /** Button label colour (hex). Falls back to white on solid, accent on outline/soft. */
  text_color: z.string().optional(),
  /** Colour for the optional description text above the button (hex). */
  description_color: z.string().optional(),
  /** Visual treatment of the button. */
  button_style: ctaButtonStyleSchema.default('solid'),
  /** Label + padding scale. */
  font_size: ctaFontSizeSchema.default('md'),
  /** Horizontal placement of the button (and description). */
  align: ctaAlignSchema.default('center'),
  /** Corner rounding. */
  radius: ctaRadiusSchema.default('lg'),
  /** Stretch the button to the full width of the block. */
  full_width: z.boolean().default(false),
  /** Show the trailing external-link icon. */
  show_icon: z.boolean().default(true),
});

export type CtaButtonStyle = z.infer<typeof ctaButtonStyleSchema>;
export type CtaFontSize = z.infer<typeof ctaFontSizeSchema>;
export type CtaAlign = z.infer<typeof ctaAlignSchema>;
export type CtaRadius = z.infer<typeof ctaRadiusSchema>;
export type CtaData = z.infer<typeof ctaDataSchema>;
