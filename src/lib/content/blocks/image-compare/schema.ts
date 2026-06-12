import { z } from 'zod';

const compareImageSchema = z.object({
  url: z.string().default(''),
  alt: z.string().optional(),
  /** Text-panel mode only: rich-text/HTML body shown instead of an image. */
  text: z.string().optional(),
  /** Text-panel mode only: optional bold heading above the body. */
  heading: z.string().optional(),
  /** Text-panel mode only: panel background color. */
  bg_color: z.string().optional(),
  /** Text-panel mode only: panel text color. */
  text_color: z.string().optional(),
});

export const imageCompareDataSchema = z.object({
  /** `image` (default) compares two images; `text` compares two text panels. */
  mode: z.enum(['image', 'text']).default('image'),
  before: compareImageSchema.default({ url: '' }),
  after: compareImageSchema.default({ url: '' }),
  /** Handle position 0–100 (%). 0 = all before, 100 = all after. */
  initial_position: z.number().min(0).max(100).default(50),
  direction: z.enum(['horizontal', 'vertical']).default('horizontal'),
  aspect: z.enum(['16/9', '4/3', '1/1', '3/2']).default('16/9'),
  fit: z.enum(['contain', 'cover']).default('cover'),
  handle_style: z.enum(['bar', 'circle', 'arrows']).default('circle'),
  handle_color: z.string().default('#FFFFFF'),
  divider_color: z.string().default('#FFFFFF'),
  /** Optional badges (e.g. "Before" / "After") */
  before_label: z.string().optional(),
  after_label: z.string().optional(),
  show_labels: z.enum(['always', 'hover', 'never']).default('always'),
  /** Instruction above the comparison */
  prompt: z.string().optional(),
  /** Caption below the comparison */
  caption: z.string().optional(),
  /** Mark block complete only after the learner moves the slider */
  require_interaction: z.boolean().default(false),
});

export type ImageCompareData = z.infer<typeof imageCompareDataSchema>;
export type CompareImage = z.infer<typeof compareImageSchema>;
