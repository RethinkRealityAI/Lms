import { describe, it, expect } from 'vitest';

// Test the reorder logic in isolation (pure function)
function reorderArray<T extends { id: string }>(
  items: T[],
  activeId: string,
  overId: string
): T[] {
  const oldIndex = items.findIndex((i) => i.id === activeId);
  const newIndex = items.findIndex((i) => i.id === overId);
  if (oldIndex === -1 || newIndex === -1) return items;
  const result = [...items];
  const [moved] = result.splice(oldIndex, 1);
  result.splice(newIndex, 0, moved);
  return result;
}

describe('slide reorder logic', () => {
  const slides = [
    { id: 's1', title: 'First' },
    { id: 's2', title: 'Second' },
    { id: 's3', title: 'Third' },
  ];

  it('moves first to second position', () => {
    const result = reorderArray(slides, 's1', 's2');
    expect(result.map((s) => s.id)).toEqual(['s2', 's1', 's3']);
  });

  it('moves last to first position', () => {
    const result = reorderArray(slides, 's3', 's1');
    expect(result.map((s) => s.id)).toEqual(['s3', 's1', 's2']);
  });

  it('no change when same ids', () => {
    const result = reorderArray(slides, 's2', 's2');
    expect(result.map((s) => s.id)).toEqual(['s1', 's2', 's3']);
  });

  it('returns original when id not found', () => {
    const result = reorderArray(slides, 'unknown', 's1');
    expect(result).toEqual(slides);
  });
});
