import { describe, it, expect } from 'vitest';
import { computeAlignmentGuides } from './alignment-guides';

describe('computeAlignmentGuides', () => {
  it('returns empty for nonexistent dragging block', () => {
    const layout = [
      { i: 'a', x: 0, y: 0, w: 6, h: 2 },
    ];
    expect(computeAlignmentGuides('nonexistent', layout)).toEqual([]);
  });

  it('returns empty when only one block exists', () => {
    const layout = [
      { i: 'a', x: 0, y: 0, w: 6, h: 2 },
    ];
    expect(computeAlignmentGuides('a', layout)).toEqual([]);
  });

  it('detects left edge alignment', () => {
    const layout = [
      { i: 'a', x: 3, y: 0, w: 4, h: 2 },
      { i: 'b', x: 3, y: 4, w: 6, h: 2 },
    ];
    const guides = computeAlignmentGuides('a', layout);
    expect(guides).toContainEqual({ type: 'vertical', position: 3 });
  });

  it('detects right edge alignment', () => {
    const layout = [
      { i: 'a', x: 0, y: 0, w: 6, h: 2 },
      { i: 'b', x: 2, y: 4, w: 4, h: 2 },
    ];
    const guides = computeAlignmentGuides('a', layout);
    // a: right = 6, b: right = 6
    expect(guides).toContainEqual({ type: 'vertical', position: 6 });
  });

  it('detects edge-to-edge alignment (left meets right)', () => {
    const layout = [
      { i: 'a', x: 6, y: 0, w: 3, h: 2 },
      { i: 'b', x: 0, y: 0, w: 6, h: 2 },
    ];
    const guides = computeAlignmentGuides('a', layout);
    // a.x (6) === b.x + b.w (6)
    expect(guides).toContainEqual({ type: 'vertical', position: 6 });
  });

  it('deduplicates identical guides', () => {
    const layout = [
      { i: 'a', x: 0, y: 0, w: 6, h: 2 },
      { i: 'b', x: 0, y: 2, w: 6, h: 2 },
      { i: 'c', x: 0, y: 4, w: 6, h: 2 },
    ];
    const guides = computeAlignmentGuides('a', layout);
    // Both b and c have x=0 — should only get one guide for position 0
    const leftGuides = guides.filter(g => g.type === 'vertical' && g.position === 0);
    expect(leftGuides).toHaveLength(1);
  });

  it('returns no guides when no edges align', () => {
    const layout = [
      { i: 'a', x: 0, y: 0, w: 3, h: 2 },
      { i: 'b', x: 5, y: 5, w: 4, h: 3 },
    ];
    const guides = computeAlignmentGuides('a', layout);
    expect(guides).toEqual([]);
  });
});
