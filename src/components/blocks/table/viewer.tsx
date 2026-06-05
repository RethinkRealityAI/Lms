'use client';

import { useMemo, type CSSProperties } from 'react';
import { cn } from '@/lib/utils';
import type { BlockViewerProps } from '@/lib/content/block-registry';
import type { TableData } from '@/lib/content/blocks/table/schema';
import { BLOCK_CONTENT_SHELL, SURFACE_HEADING, surfaceMutedClass } from '@/lib/content/block-surface-tokens';

/** Pick black or white text for legibility on a given hex background. */
function readableText(hex: string): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return '#ffffff';
  const n = parseInt(m[1], 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  const L = 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
  return L > 0.55 ? '#0f172a' : '#ffffff';
}

const ALIGN_CLASS: Record<string, string> = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
};

export default function TableViewer({ data }: BlockViewerProps<TableData>) {
  const columns = useMemo(() => data.columns ?? [], [data.columns]);
  const rows = useMemo(() => data.rows ?? [], [data.rows]);
  const striped = data.striped ?? true;
  const firstColHeader = data.first_column_header ?? false;
  const compact = data.density === 'compact';

  const accent = (data.accent_color || '').trim() || '#1E3A5F';
  const headerText = readableText(accent);
  const textStyle: CSSProperties = (data.text_color || '').trim()
    ? { color: (data.text_color as string).trim() }
    : { color: 'var(--surface-text)' };

  const cellPad = compact ? 'px-2.5 py-1.5' : 'px-3.5 py-2.5';
  const fontSize = compact ? 'text-xs sm:text-sm' : 'text-sm sm:text-[15px]';

  if (columns.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-400">
        Add columns to build your table in the editor.
      </div>
    );
  }

  return (
    <div className={cn(BLOCK_CONTENT_SHELL, 'gap-2.5')}>
      {data.title && <p className={SURFACE_HEADING}>{data.title}</p>}
      {data.description && <p className={surfaceMutedClass()}>{data.description}</p>}

      <div className="overflow-x-auto rounded-xl border border-[color:var(--surface-inset-border)] shadow-sm">
        <table className={cn('min-w-full border-collapse', fontSize)} style={textStyle}>
          <thead>
            <tr style={{ backgroundColor: accent, color: headerText }}>
              {columns.map((col) => (
                <th
                  key={col.id}
                  scope="col"
                  className={cn('font-semibold whitespace-nowrap', cellPad, ALIGN_CLASS[col.align] ?? 'text-left')}
                >
                  {col.label || ' '}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className={cn('text-center italic text-[color:var(--surface-text-muted)]', cellPad)}>
                  No rows yet.
                </td>
              </tr>
            ) : (
              rows.map((row, r) => (
                <tr
                  key={row.id}
                  className={cn(
                    'border-t border-[color:var(--surface-inset-border)] transition-colors',
                    striped && r % 2 === 1 && 'bg-[color:var(--surface-chip-bg)]',
                    'hover:bg-[color:var(--surface-chip-hover)]',
                  )}
                >
                  {columns.map((col, c) => {
                    const value = row.cells?.[col.id] ?? '';
                    const isRowHeader = firstColHeader && c === 0;
                    const Cell = isRowHeader ? 'th' : 'td';
                    return (
                      <Cell
                        key={col.id}
                        {...(isRowHeader ? { scope: 'row' as const } : {})}
                        className={cn(
                          'align-top leading-snug',
                          cellPad,
                          ALIGN_CLASS[col.align] ?? 'text-left',
                          isRowHeader && 'font-semibold',
                        )}
                      >
                        {value || (isRowHeader ? ' ' : '')}
                      </Cell>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {data.footnote && (
        <p className="text-xs text-[color:var(--surface-text-subtle)] italic">{data.footnote}</p>
      )}
    </div>
  );
}
