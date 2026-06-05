import type { TableColumn, TableData, TableRow } from './schema';

function newId(prefix: string) {
  try {
    return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
  } catch {
    return `${prefix}-${Date.now()}-${Math.round(Math.random() * 1e6)}`;
  }
}

type LegacyColumn = TableColumn & { key?: string };

/** Loose/legacy table payload: columns may use `key`, rows may omit `id`, schema defaults may be absent. */
export type RawTableData = Partial<Omit<TableData, 'columns' | 'rows'>> & {
  columns?: Array<Partial<TableColumn> & { key?: string }>;
  rows?: Array<{ id?: string; cells?: Record<string, string> }>;
};

/**
 * Normalize imported / legacy table payloads so columns use `id` (not `key`)
 * and rows have stable ids. Cell keys are remapped when column ids change.
 */
export function normalizeTableData(data: RawTableData): TableData {
  const withDefaults = (cols: TableColumn[], rws: TableRow[]): TableData => ({
    title: data.title,
    description: data.description,
    footnote: data.footnote,
    columns: cols,
    rows: rws,
    striped: data.striped ?? true,
    first_column_header: data.first_column_header ?? false,
    density: data.density ?? 'comfortable',
    accent_color: data.accent_color,
    text_color: data.text_color,
  });

  const rawColumns = (data.columns ?? []) as LegacyColumn[];
  if (rawColumns.length === 0) {
    return withDefaults((data.columns as TableColumn[]) ?? [], (data.rows as TableRow[]) ?? []);
  }

  const keyRemap = new Map<string, string>();
  const columns: TableColumn[] = rawColumns.map((col, i) => {
    const legacyKey = col.key?.trim();
    const id = (col.id?.trim() || legacyKey || newId('col')).trim();
    if (legacyKey && legacyKey !== id) keyRemap.set(legacyKey, id);
    if (col.id?.trim() && legacyKey && col.id !== legacyKey) keyRemap.set(legacyKey, col.id);
    return {
      id,
      label: col.label ?? '',
      align: col.align ?? 'left',
    };
  });

  const columnIds = new Set(columns.map((c) => c.id));
  const rows: TableRow[] = (data.rows ?? []).map((row, i) => {
    const cells: Record<string, string> = {};
    for (const [cellKey, value] of Object.entries(row.cells ?? {})) {
      const target = keyRemap.get(cellKey) ?? (columnIds.has(cellKey) ? cellKey : cellKey);
      cells[target] = value;
    }
    // Backfill empty cells for each column
    for (const col of columns) {
      if (!(col.id in cells)) cells[col.id] = '';
    }
    return {
      id: row.id?.trim() || newId('row'),
      cells,
    };
  });

  return withDefaults(columns, rows);
}
