import { z } from 'zod';

export const pageBreakDataSchema = z.object({
  /** Optional label shown in the editor to help authors identify the break */
  label: z.string().optional(),
});

export type PageBreakData = z.infer<typeof pageBreakDataSchema>;
