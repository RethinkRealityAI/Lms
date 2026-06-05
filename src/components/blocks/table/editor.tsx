'use client';

import { Plus, Trash2, ChevronUp, ChevronDown, AlignLeft, AlignCenter, AlignRight, Columns3, Rows3 } from 'lucide-react';
import type { BlockEditorProps } from '@/lib/content/block-registry';
import type { TableData, TableColumn, TableRow } from '@/lib/content/blocks/table/schema';

const inputClass =
  'w-full px-2.5 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent';

function newId(prefix: string) {
  try { return `${prefix}-${crypto.randomUUID().slice(0, 8)}`; }
  catch { return `${prefix}-${Date.now()}-${Math.round(Math.random() * 1e6)}`; }
}

const ALIGN_OPTS = [
  { v: 'left' as const, Icon: AlignLeft },
  { v: 'center' as const, Icon: AlignCenter },
  { v: 'right' as const, Icon: AlignRight },
];

export function TableEditor({ data, onChange }: BlockEditorProps<TableData>) {
  const columns = data.columns ?? [];
  const rows = data.rows ?? [];

  // ── Columns ────────────────────────────────────────────────────────────────
  const updateColumn = (id: string, patch: Partial<TableColumn>) =>
    onChange({ ...data, columns: columns.map((c) => (c.id === id ? { ...c, ...patch } : c)) });

  const addColumn = () =>
    onChange({ ...data, columns: [...columns, { id: newId('col'), label: '', align: 'left' }] });

  const removeColumn = (id: string) =>
    onChange({
      ...data,
      columns: columns.filter((c) => c.id !== id),
      // Tidy up any orphaned cell values for the removed column.
      rows: rows.map((r) => {
        const { [id]: _drop, ...rest } = r.cells ?? {};
        return { ...r, cells: rest };
      }),
    });

  const moveColumn = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= columns.length) return;
    const next = [...columns];
    [next[i], next[j]] = [next[j], next[i]];
    onChange({ ...data, columns: next });
  };

  // ── Rows ───────────────────────────────────────────────────────────────────
  const addRow = () => onChange({ ...data, rows: [...rows, { id: newId('row'), cells: {} }] });
  const removeRow = (id: string) => onChange({ ...data, rows: rows.filter((r) => r.id !== id) });
  const moveRow = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= rows.length) return;
    const next = [...rows];
    [next[i], next[j]] = [next[j], next[i]];
    onChange({ ...data, rows: next });
  };
  const setCell = (rowId: string, colId: string, value: string) =>
    onChange({
      ...data,
      rows: rows.map((r) => (r.id === rowId ? { ...r, cells: { ...r.cells, [colId]: value } } : r)),
    });

  return (
    <div className="space-y-4">
      {/* Title / description / footnote */}
      <div className="space-y-2">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Title (optional)</label>
          <input type="text" value={data.title ?? ''} placeholder="e.g. Symptom comparison"
            onChange={(e) => onChange({ ...data, title: e.target.value || undefined })} className={inputClass} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Description (optional)</label>
          <input type="text" value={data.description ?? ''} placeholder="A short line introducing the table"
            onChange={(e) => onChange({ ...data, description: e.target.value || undefined })} className={inputClass} />
        </div>
      </div>

      {/* Columns */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">
            <Columns3 className="w-3.5 h-3.5" /> Columns ({columns.length})
          </span>
          <button type="button" onClick={addColumn}
            className="px-2 py-1 text-xs bg-[#1E3A5F] text-white rounded-lg hover:bg-[#162d4a] transition-colors">
            + Add
          </button>
        </div>
        {columns.length === 0 && <p className="text-xs text-gray-400 italic">No columns yet — add one to start.</p>}
        {columns.map((col, i) => (
          <div key={col.id} className="rounded-xl border border-gray-200 bg-gray-50/60 p-2 space-y-1.5">
            <div className="flex items-center gap-1.5">
              <input type="text" value={col.label} placeholder={`Column ${i + 1}`}
                onChange={(e) => updateColumn(col.id, { label: e.target.value })}
                className={`${inputClass} flex-1 bg-white`} />
              <button type="button" onClick={() => moveColumn(i, -1)} disabled={i === 0}
                className="p-1 rounded hover:bg-gray-200 disabled:opacity-30" aria-label="Move column left"><ChevronUp className="w-3.5 h-3.5" /></button>
              <button type="button" onClick={() => moveColumn(i, 1)} disabled={i === columns.length - 1}
                className="p-1 rounded hover:bg-gray-200 disabled:opacity-30" aria-label="Move column right"><ChevronDown className="w-3.5 h-3.5" /></button>
              <button type="button" onClick={() => removeColumn(col.id)}
                className="p-1 rounded hover:bg-red-50 text-gray-300 hover:text-red-500" aria-label="Remove column"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
            <div className="flex rounded-md overflow-hidden border border-gray-200 w-max">
              {ALIGN_OPTS.map(({ v, Icon }) => (
                <button key={v} type="button" onClick={() => updateColumn(col.id, { align: v })}
                  title={`Align ${v}`}
                  className={`px-2 py-1 transition-all ${col.align === v ? 'bg-[#1A3C6E] text-white' : 'bg-white text-gray-400 hover:text-gray-600'}`}>
                  <Icon className="w-3 h-3" />
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Rows */}
      {columns.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              <Rows3 className="w-3.5 h-3.5" /> Rows ({rows.length})
            </span>
            <button type="button" onClick={addRow}
              className="px-2 py-1 text-xs bg-[#1E3A5F] text-white rounded-lg hover:bg-[#162d4a] transition-colors">
              + Add
            </button>
          </div>
          {rows.length === 0 && <p className="text-xs text-gray-400 italic">No rows yet — add one to fill in cells.</p>}
          {rows.map((row, i) => (
            <div key={row.id} className="rounded-xl border border-gray-200 p-2.5 space-y-2 bg-white">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Row {i + 1}</span>
                <div className="flex items-center gap-0.5">
                  <button type="button" onClick={() => moveRow(i, -1)} disabled={i === 0}
                    className="p-1 rounded hover:bg-gray-200 disabled:opacity-30" aria-label="Move row up"><ChevronUp className="w-3.5 h-3.5" /></button>
                  <button type="button" onClick={() => moveRow(i, 1)} disabled={i === rows.length - 1}
                    className="p-1 rounded hover:bg-gray-200 disabled:opacity-30" aria-label="Move row down"><ChevronDown className="w-3.5 h-3.5" /></button>
                  <button type="button" onClick={() => removeRow(row.id)}
                    className="p-1 rounded hover:bg-red-50 text-gray-300 hover:text-red-500 ml-0.5" aria-label="Remove row"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
              <div className="space-y-1.5">
                {columns.map((col, c) => (
                  <div key={col.id}>
                    <label className="block text-[10px] font-medium text-gray-400 mb-0.5 truncate">
                      {col.label || `Column ${c + 1}`}
                    </label>
                    <input type="text" value={row.cells?.[col.id] ?? ''}
                      onChange={(e) => setCell(row.id, col.id, e.target.value)}
                      placeholder="—" className={inputClass} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Options */}
      <div className="space-y-2.5 pt-1 border-t border-gray-100">
        <label className="flex items-center justify-between cursor-pointer">
          <span className="text-xs text-gray-600">Striped rows</span>
          <input type="checkbox" checked={data.striped ?? true}
            onChange={(e) => onChange({ ...data, striped: e.target.checked })} className="accent-[#1A3C6E] w-4 h-4" />
        </label>
        <label className="flex items-center justify-between cursor-pointer">
          <span className="text-xs text-gray-600">Bold first column</span>
          <input type="checkbox" checked={data.first_column_header ?? false}
            onChange={(e) => onChange({ ...data, first_column_header: e.target.checked })} className="accent-[#1A3C6E] w-4 h-4" />
        </label>
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-600">Density</span>
          <div className="flex rounded-lg overflow-hidden border border-gray-200">
            {(['comfortable', 'compact'] as const).map((d) => (
              <button key={d} type="button" onClick={() => onChange({ ...data, density: d })}
                className={`px-3 py-1 text-xs font-semibold capitalize transition-all ${(data.density ?? 'comfortable') === d ? 'bg-[#1A3C6E] text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}>
                {d}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Footnote */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Footnote (optional)</label>
        <input type="text" value={data.footnote ?? ''} placeholder="e.g. Source: WHO, 2024"
          onChange={(e) => onChange({ ...data, footnote: e.target.value || undefined })} className={inputClass} />
      </div>

      {/* Appearance */}
      <div className="space-y-2 pt-1 border-t border-gray-100">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Appearance</p>
        {([
          { key: 'accent_color', label: 'Header', fallback: '#1E3A5F', hint: 'Header row background' },
          { key: 'text_color', label: 'Text', fallback: '#1E293B', hint: 'Body text colour' },
        ] as const).map((rowDef) => {
          const val = (data[rowDef.key] as string | undefined) ?? '';
          return (
            <div key={rowDef.key} className="flex items-center gap-2">
              <input type="color" value={val || rowDef.fallback}
                onChange={(e) => onChange({ ...data, [rowDef.key]: e.target.value })}
                className="h-8 w-9 shrink-0 rounded border border-gray-200 cursor-pointer bg-white p-0.5"
                aria-label={`${rowDef.label} colour`} />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-gray-700 leading-tight">{rowDef.label}</p>
                <p className="text-[10px] text-gray-400 leading-tight truncate">{rowDef.hint}</p>
              </div>
              {val && (
                <button type="button" onClick={() => onChange({ ...data, [rowDef.key]: undefined })}
                  className="text-[10px] font-medium text-gray-400 hover:text-red-500 shrink-0">Reset</button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
