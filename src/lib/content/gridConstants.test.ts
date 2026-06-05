import { describe, it, expect } from 'vitest';
import {
  GRID_COLS,
  GRID_MARGIN,
  GRID_CONTAINER_PADDING,
  DEFAULT_ROW_HEIGHT,
  DEFAULT_BLOCK_LAYOUT,
  RESIZE_HANDLES,
  getBlockGridLayout,
  computeRowHeight,
  getBlockContainerBase,
  DEFAULT_BLOCK_STYLE,
  pixelsToGridRows,
  AUTO_HEIGHT_BLOCK_TYPES,
  blockSurfaceFillCell,
  blockSurfaceFlush,
  getBlockRglLayout,
  resolvePersistedGridH,
  blockUsesAutoHeight,
} from './gridConstants';

describe('gridConstants', () => {
  describe('constants', () => {
    it('uses 12-column grid', () => {
      expect(GRID_COLS).toBe(12);
    });

    it('has symmetric margins', () => {
      expect(GRID_MARGIN[0]).toBe(GRID_MARGIN[1]);
    });

    it('default block layout is full-width', () => {
      expect(DEFAULT_BLOCK_LAYOUT.gridW).toBe(12);
      expect(DEFAULT_BLOCK_LAYOUT.gridX).toBe(0);
    });

    it('resize handles include all edges and corners', () => {
      expect(RESIZE_HANDLES).toContain('e');
      expect(RESIZE_HANDLES).toContain('w');
      expect(RESIZE_HANDLES).toContain('s');
      expect(RESIZE_HANDLES).toContain('n');
      expect(RESIZE_HANDLES).toContain('se');
      expect(RESIZE_HANDLES).toContain('sw');
      expect(RESIZE_HANDLES).toContain('ne');
      expect(RESIZE_HANDLES).toContain('nw');
      expect(RESIZE_HANDLES).toHaveLength(8);
    });
  });

  describe('getBlockGridLayout', () => {
    it('returns defaults for empty data', () => {
      const layout = getBlockGridLayout({});
      expect(layout).toEqual(DEFAULT_BLOCK_LAYOUT);
    });

    it('extracts grid values from data', () => {
      const layout = getBlockGridLayout({ gridX: 3, gridY: 1, gridW: 6, gridH: 4 });
      expect(layout).toEqual({ gridX: 3, gridY: 1, gridW: 6, gridH: 4 });
    });

    it('falls back to defaults for missing fields', () => {
      const layout = getBlockGridLayout({ gridX: 2, gridW: 8 });
      expect(layout.gridX).toBe(2);
      expect(layout.gridW).toBe(8);
      expect(layout.gridY).toBe(DEFAULT_BLOCK_LAYOUT.gridY);
      expect(layout.gridH).toBe(DEFAULT_BLOCK_LAYOUT.gridH);
    });

    it('falls back for non-number values', () => {
      const layout = getBlockGridLayout({ gridX: 'invalid', gridW: null });
      expect(layout.gridX).toBe(DEFAULT_BLOCK_LAYOUT.gridX);
      expect(layout.gridW).toBe(DEFAULT_BLOCK_LAYOUT.gridW);
    });
  });

  describe('computeRowHeight', () => {
    it('returns DEFAULT_ROW_HEIGHT for undefined canvas height', () => {
      expect(computeRowHeight(undefined)).toBe(DEFAULT_ROW_HEIGHT);
    });

    it('returns DEFAULT_ROW_HEIGHT for zero height', () => {
      expect(computeRowHeight(0)).toBe(DEFAULT_ROW_HEIGHT);
    });

    it('returns DEFAULT_ROW_HEIGHT for negative height', () => {
      expect(computeRowHeight(-100)).toBe(DEFAULT_ROW_HEIGHT);
    });

    it('computes a positive row height for valid canvas', () => {
      const height = computeRowHeight(600);
      expect(height).toBeGreaterThan(0);
    });

    it('row height decreases as row count increases', () => {
      const h10 = computeRowHeight(600, 10);
      const h20 = computeRowHeight(600, 20);
      expect(h10).toBeGreaterThan(h20);
    });

    it('accounts for padding and margins', () => {
      const canvasHeight = 600;
      const rows = 10;
      const height = computeRowHeight(canvasHeight, rows);
      const totalHeight = height * rows + (rows - 1) * GRID_MARGIN[1] + GRID_CONTAINER_PADDING[1] * 2;
      // Total should not exceed canvas height
      expect(totalHeight).toBeLessThanOrEqual(canvasHeight);
    });
  });

  describe('getBlockContainerBase', () => {
    it('defaults to light frosted glass', () => {
      expect(DEFAULT_BLOCK_STYLE).toBe('glass');
      expect(getBlockContainerBase()).toContain('block-glass');
      expect(getBlockContainerBase()).toContain('block-surface--glass');
    });

    it('returns dark glass classes for glass-dark', () => {
      expect(getBlockContainerBase('glass-dark')).toContain('block-glass-dark');
      expect(getBlockContainerBase('glass-dark')).toContain('block-surface--glass-dark');
    });

    it('returns classic card classes', () => {
      expect(getBlockContainerBase('classic')).toContain('block-surface--classic');
    });

    it('returns none surface class', () => {
      expect(getBlockContainerBase('none')).toContain('block-surface--none');
    });
  });

  describe('block surface helpers', () => {
    it('fillCell is true only for interactive / full-bleed blocks', () => {
      expect(blockSurfaceFillCell('quiz_inline')).toBe(true);
      // Video is full-bleed (flush) but content-sized via aspect-video — it hugs its
      // 16:9 height rather than stretching to fill the cell.
      expect(blockSurfaceFillCell('video')).toBe(false);
      expect(blockSurfaceFillCell('image_gallery')).toBe(false);
      expect(blockSurfaceFillCell('rich_text')).toBe(false);
      expect(blockSurfaceFillCell('image_compare')).toBe(false);
      expect(blockSurfaceFlush('video')).toBe(true);
      expect(blockSurfaceFlush('image_gallery')).toBe(false);
    });

    it('media blocks with intrinsic aspect ratio use auto-height in the editor', () => {
      expect(AUTO_HEIGHT_BLOCK_TYPES.has('image_gallery')).toBe(true);
      expect(AUTO_HEIGHT_BLOCK_TYPES.has('image_compare')).toBe(true);
      expect(AUTO_HEIGHT_BLOCK_TYPES.has('scratch_reveal')).toBe(true);
      expect(AUTO_HEIGHT_BLOCK_TYPES.has('rich_text')).toBe(true);
    });

    it('getBlockRglLayout ignores stale gridH once measured for auto-height blocks', () => {
      const layout = getBlockRglLayout('b1', 'rich_text', { gridH: 40, gridW: 12 }, 5);
      expect(layout.h).toBe(5);
      expect(layout.minH).toBe(5);
      expect(layout.maxH).toBe(5);
    });

    it('getBlockRglLayout falls back to persisted gridH before first measure', () => {
      const layout = getBlockRglLayout('b1', 'rich_text', { gridH: 8, gridW: 12 }, undefined);
      expect(layout.h).toBe(8);
    });

    it('resolvePersistedGridH keeps measured height for auto-height blocks', () => {
      expect(resolvePersistedGridH('rich_text', 30, 6)).toBe(6);
      expect(resolvePersistedGridH('video', 30, 6)).toBe(6);
      // Non-auto-height block keeps the larger stored height (page_break is not
      // measured/auto-height, unlike survey/quiz/etc.).
      expect(resolvePersistedGridH('page_break', 30, 6)).toBe(30);
    });
  });

  describe('pixelsToGridRows', () => {
    it('returns at least 1 row', () => {
      expect(pixelsToGridRows(0, 14)).toBe(1);
    });

    it('converts pixel height to row units with margin', () => {
      // 14*3 + 4*2 = 50px for h=3 with rowHeight=14, margin=4
      expect(pixelsToGridRows(50, 14, 4)).toBe(3);
      expect(pixelsToGridRows(51, 14, 4)).toBe(4);
    });
  });
});
