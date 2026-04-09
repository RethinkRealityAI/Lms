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

    it('resize handles include edges and bottom corners', () => {
      expect(RESIZE_HANDLES).toContain('e');
      expect(RESIZE_HANDLES).toContain('w');
      expect(RESIZE_HANDLES).toContain('se');
      expect(RESIZE_HANDLES).toContain('sw');
      // No top handles
      expect(RESIZE_HANDLES).not.toContain('n');
      expect(RESIZE_HANDLES).not.toContain('ne');
      expect(RESIZE_HANDLES).not.toContain('nw');
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
});
