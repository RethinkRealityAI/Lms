import { describe, it, expect } from 'vitest';
import { createEditorStore } from './editor-store';
import type { BlockData } from './editor-store';

const SLIDE = 'slide-1';

function block(
  id: string,
  gridX: number,
  gridY: number,
  gridW: number,
  gridH: number,
): BlockData {
  return {
    id,
    block_type: 'rich_text',
    slide_id: SLIDE,
    data: { gridX, gridY, gridW, gridH },
    order_index: gridY,
    is_visible: true,
  } as unknown as BlockData;
}

function seed(blocks: BlockData[]) {
  const store = createEditorStore();
  store.getState().loadCourse({
    courseId: 'c1',
    modules: [],
    lessons: new Map(),
    slides: new Map(),
    blocks: new Map([[SLIDE, blocks]]),
  });
  return store;
}

/** Current blocks sorted by visual order with their grid coords. */
function layout(store: ReturnType<typeof createEditorStore>) {
  return (store.getState().blocks.get(SLIDE) ?? [])
    .map((b) => {
      const d = b.data as Record<string, number>;
      return { id: b.id, x: d.gridX, y: d.gridY, w: d.gridW, h: d.gridH };
    })
    .sort((a, z) => a.y - z.y || a.x - z.x);
}

/** Assert single-column blocks stack contiguously from y=0 with no gaps/overlaps. */
function expectContiguousColumn(store: ReturnType<typeof createEditorStore>) {
  const items = layout(store);
  let expectedY = 0;
  for (const it of items) {
    expect(it.y).toBe(expectedY);
    expectedY = it.y + it.h;
  }
}

describe('editor-store vertical compaction', () => {
  describe('removeBlock — fills the gap left by the deleted block', () => {
    it('pulls blocks below up to close the gap', () => {
      const store = seed([
        block('a', 0, 0, 12, 3),
        block('b', 0, 3, 12, 2),
        block('c', 0, 5, 12, 4),
      ]);
      store.getState().removeBlock(SLIDE, 'b');

      const items = layout(store);
      expect(items.map((i) => i.id)).toEqual(['a', 'c']);
      // a stays at 0 (h3); c pulls up to y=3 (right below a) — no gap
      expect(items).toEqual([
        { id: 'a', x: 0, y: 0, w: 12, h: 3 },
        { id: 'c', x: 0, y: 3, w: 12, h: 4 },
      ]);
      expectContiguousColumn(store);
    });

    it('removing the top block pulls everything to y=0', () => {
      const store = seed([
        block('a', 0, 0, 12, 3),
        block('b', 0, 3, 12, 2),
      ]);
      store.getState().removeBlock(SLIDE, 'a');
      expect(layout(store)).toEqual([{ id: 'b', x: 0, y: 0, w: 12, h: 2 }]);
    });
  });

  describe('moveBlockVertical — reorders cleanly, no gaps, reaches the bottom', () => {
    it('moves a block down past its neighbour', () => {
      const store = seed([
        block('a', 0, 0, 12, 3),
        block('b', 0, 3, 12, 2),
        block('c', 0, 5, 12, 4),
      ]);
      store.getState().moveBlockVertical(SLIDE, 'a', 1); // a down

      const items = layout(store);
      expect(items.map((i) => i.id)).toEqual(['b', 'a', 'c']);
      expectContiguousColumn(store);
    });

    it('moves a block up past its neighbour', () => {
      const store = seed([
        block('a', 0, 0, 12, 3),
        block('b', 0, 3, 12, 2),
        block('c', 0, 5, 12, 4),
      ]);
      store.getState().moveBlockVertical(SLIDE, 'c', -1); // c up

      const items = layout(store);
      expect(items.map((i) => i.id)).toEqual(['a', 'c', 'b']);
      expectContiguousColumn(store);
    });

    it('can move a block all the way to the bottom (the old bug)', () => {
      const store = seed([
        block('a', 0, 0, 12, 3),
        block('b', 0, 3, 12, 2),
        block('c', 0, 5, 12, 4),
      ]);
      const s = store.getState();
      s.moveBlockVertical(SLIDE, 'a', 1); // a -> middle
      store.getState().moveBlockVertical(SLIDE, 'a', 1); // a -> bottom

      const items = layout(store);
      expect(items.map((i) => i.id)).toEqual(['b', 'c', 'a']);
      // a is genuinely last
      expect(items[items.length - 1].id).toBe('a');
      expectContiguousColumn(store);
    });

    it('is a no-op at the boundaries', () => {
      const store = seed([block('a', 0, 0, 12, 3), block('b', 0, 3, 12, 2)]);
      store.getState().moveBlockVertical(SLIDE, 'a', -1); // already top
      expect(layout(store).map((i) => i.id)).toEqual(['a', 'b']);
      store.getState().moveBlockVertical(SLIDE, 'b', 1); // already bottom
      expect(layout(store).map((i) => i.id)).toEqual(['a', 'b']);
    });

    it('keeps order_index aligned with the new visual order', () => {
      const store = seed([
        block('a', 0, 0, 12, 3),
        block('b', 0, 3, 12, 2),
        block('c', 0, 5, 12, 4),
      ]);
      store.getState().moveBlockVertical(SLIDE, 'a', 1);
      const byVisual = layout(store).map((i) => i.id);
      const byOrderIndex = [...(store.getState().blocks.get(SLIDE) ?? [])]
        .sort((x, z) => x.order_index - z.order_index)
        .map((b) => b.id);
      expect(byOrderIndex).toEqual(byVisual);
    });
  });

  describe('fitBlockHeight — resizing reflows the column', () => {
    it('growing a block pushes the ones below it down', () => {
      const store = seed([block('a', 0, 0, 12, 3), block('b', 0, 3, 12, 2)]);
      store.getState().fitBlockHeight(SLIDE, 'a', 6); // a grows 3 -> 6
      expect(layout(store)).toEqual([
        { id: 'a', x: 0, y: 0, w: 12, h: 6 },
        { id: 'b', x: 0, y: 6, w: 12, h: 2 },
      ]);
    });

    it('shrinking a block pulls the ones below it up (no gap)', () => {
      const store = seed([block('a', 0, 0, 12, 6), block('b', 0, 6, 12, 2)]);
      store.getState().fitBlockHeight(SLIDE, 'a', 2); // a shrinks 6 -> 2
      expect(layout(store)).toEqual([
        { id: 'a', x: 0, y: 0, w: 12, h: 2 },
        { id: 'b', x: 0, y: 2, w: 12, h: 2 },
      ]);
    });
  });

  describe('overlap & multi-column handling', () => {
    it('resolves overlapping blocks by pushing the lower one down', () => {
      const store = seed([
        block('a', 0, 0, 12, 3),
        block('b', 0, 2, 12, 3), // overlaps a (rows 2-3)
      ]);
      // A delete-then-readd isn't needed; trigger compaction via a no-op move guard:
      store.getState().moveBlockVertical(SLIDE, 'b', -1); // forces a compaction pass
      const items = layout(store);
      // no two blocks overlap vertically within the same column
      for (let i = 1; i < items.length; i++) {
        expect(items[i].y).toBeGreaterThanOrEqual(items[i - 1].y + items[i - 1].h);
      }
    });

    it('keeps side-by-side blocks (different columns) both at the top', () => {
      const store = seed([
        block('left', 0, 0, 6, 3),
        block('right', 6, 0, 6, 2),
      ]);
      store.getState().removeBlock(SLIDE, 'nonexistent'); // triggers compaction, no removal
      const items = layout(store);
      const left = items.find((i) => i.id === 'left')!;
      const right = items.find((i) => i.id === 'right')!;
      // different columns don't collide → both compact to y=0
      expect(left.y).toBe(0);
      expect(right.y).toBe(0);
    });
  });

  describe('setBlockWidth — resize width, clamp x, keep layout valid', () => {
    it('sets the width and keeps x in bounds', () => {
      const store = seed([block('a', 0, 0, 12, 3)]);
      store.getState().setBlockWidth(SLIDE, 'a', 6);
      const a = layout(store)[0];
      expect(a.w).toBe(6);
      expect(a.x).toBe(0);
    });

    it('clamps width to the grid (1..12)', () => {
      const store = seed([block('a', 0, 0, 6, 3)]);
      store.getState().setBlockWidth(SLIDE, 'a', 99);
      expect(layout(store)[0].w).toBe(12);
      store.getState().setBlockWidth(SLIDE, 'a', 0);
      expect(layout(store)[0].w).toBe(1);
    });

    it('clamps x so a widened block never overflows the grid', () => {
      const store = seed([block('a', 8, 0, 4, 3)]); // x8 + w4 = 12 (right edge)
      store.getState().setBlockWidth(SLIDE, 'a', 8); // widening to 8 would overflow at x8
      const a = layout(store)[0];
      expect(a.w).toBe(8);
      expect(a.x).toBe(4); // clamped to 12 - 8
    });

    it('aligns left / center / right', () => {
      const store = seed([block('a', 0, 0, 6, 3)]);
      store.getState().setBlockWidth(SLIDE, 'a', 6, 'right');
      expect(layout(store)[0].x).toBe(6); // 12 - 6
      store.getState().setBlockWidth(SLIDE, 'a', 6, 'center');
      expect(layout(store)[0].x).toBe(3); // floor((12-6)/2)
      store.getState().setBlockWidth(SLIDE, 'a', 6, 'left');
      expect(layout(store)[0].x).toBe(0);
    });

    it('compacts a side-by-side neighbour below when a block is widened to overlap it', () => {
      const store = seed([
        block('a', 0, 0, 6, 3), // left half
        block('b', 6, 0, 6, 2), // right half (same row)
      ]);
      store.getState().setBlockWidth(SLIDE, 'a', 12); // a now spans full width → overlaps b
      const items = layout(store);
      const a = items.find((i) => i.id === 'a')!;
      const b = items.find((i) => i.id === 'b')!;
      expect(a.w).toBe(12);
      // b is pushed below a — no overlap
      expect(b.y).toBeGreaterThanOrEqual(a.y + a.h);
    });
  });
});
