import { describe, it, expect } from 'vitest';
import {
  assignItemToCategory,
  getCategorizeOptionPool,
  getCategorizePlayItems,
  syncCategorizeOptions,
} from './categorize-utils';

describe('categorize-utils', () => {
  it('getCategorizePlayItems returns unique assigned items', () => {
    const items = getCategorizePlayItems([
      { name: 'A', items: ['one', 'two'] },
      { name: 'B', items: ['two', 'three'] },
    ]);
    expect(items.sort()).toEqual(['one', 'three', 'two']);
  });

  it('assignItemToCategory moves item between categories exclusively', () => {
    const cats = [
      { name: 'A', items: ['x'] },
      { name: 'B', items: [] },
    ];
    const next = assignItemToCategory(cats, 1, 'x', true);
    expect(next[0].items).toEqual([]);
    expect(next[1].items).toEqual(['x']);
  });

  it('getCategorizeOptionPool prefers persisted options when set', () => {
    const pool = getCategorizeOptionPool(
      { options: ['a', 'b', 'c'] },
      [{ name: 'Cat', items: ['a'] }],
    );
    expect(pool).toEqual(['a', 'b', 'c']);
  });

  it('getCategorizeOptionPool derives from categories when options empty', () => {
    const pool = getCategorizeOptionPool(
      { options: [] },
      [{ name: 'Cat', items: ['a', 'b'] }],
    );
    expect(pool).toEqual(['a', 'b']);
  });

  it('syncCategorizeOptions matches play items', () => {
    expect(
      syncCategorizeOptions([
        { name: 'X', items: ['1'] },
        { name: 'Y', items: ['2'] },
      ]),
    ).toEqual(['1', '2']);
  });
});
