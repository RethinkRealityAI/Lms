import { z } from 'zod';

export const tableColumnSchema = z.object({
  id: z.string(),
  /** Header label for this column. */
  label: z.string().default(''),
  /** Horizontal alignment for the header + its cells. */
  align: z.enum(['left', 'center', 'right']).default('left'),
});

export const tableRowSchema = z.object({
  id: z.string(),
  /** Cell text keyed by column id (so columns can be reordered/removed safely). */
  cells: z.record(z.string()).default({}),
});

export const tableDataSchema = z.object({
  /** Optional heading shown above the table. */
  title: z.string().optional(),
  /** Optional supporting line shown under the title. */
  description: z.string().optional(),
  /** Optional small caption shown beneath the table (e.g. a source note). */
  footnote: z.string().optional(),
  columns: z.array(tableColumnSchema).default([]),
  rows: z.array(tableRowSchema).default([]),
  /** Zebra-stripe alternating rows for readability. */
  striped: z.boolean().default(true),
  /** Render the first column as a bold row-header. */
  first_column_header: z.boolean().default(false),
  /** Cell padding density. */
  density: z.enum(['comfortable', 'compact']).default('comfortable'),
  /** Header background colour. Hex; blank = brand navy. */
  accent_color: z.string().optional(),
  /** Body text colour. Hex; blank = surface text colour. */
  text_color: z.string().optional(),
});

export type TableColumn = z.infer<typeof tableColumnSchema>;
export type TableRow = z.infer<typeof tableRowSchema>;
export type TableData = z.infer<typeof tableDataSchema>;
