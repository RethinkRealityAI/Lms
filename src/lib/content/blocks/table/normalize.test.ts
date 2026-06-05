import { describe, expect, it } from 'vitest';
import { normalizeTableData } from './normalize';

describe('normalizeTableData', () => {
  it('maps legacy column key to id and preserves cell values', () => {
    const result = normalizeTableData({
      columns: [
        { key: 'letter', label: 'Letter' },
        { key: 'meaning', label: 'Meaning' },
      ],
      rows: [
        { cells: { letter: 'S', meaning: 'Specific' } },
        { cells: { letter: 'M', meaning: 'Measurable' } },
      ],
    });

    expect(result.columns).toEqual([
      { id: 'letter', label: 'Letter', align: 'left' },
      { id: 'meaning', label: 'Meaning', align: 'left' },
    ]);
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0].cells).toEqual({ letter: 'S', meaning: 'Specific' });
    expect(result.rows[1].cells).toEqual({ letter: 'M', meaning: 'Measurable' });
    expect(result.rows[0].id).toBeTruthy();
    expect(result.rows[1].id).toBeTruthy();
  });

  it('leaves already-normalized tables unchanged in shape', () => {
    const input = {
      columns: [{ id: 'col-a', label: 'A', align: 'left' as const }],
      rows: [{ id: 'row-1', cells: { 'col-a': 'hello' } }],
    };
    const result = normalizeTableData(input);
    expect(result.columns).toEqual(input.columns);
    expect(result.rows[0].cells).toEqual({ 'col-a': 'hello' });
  });
});
