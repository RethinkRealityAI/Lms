/**
 * Shared grid constants used by both the editor canvas (react-grid-layout)
 * and the student viewer (CSS Grid) so the two always stay in sync.
 */

export const GRID_COLS = 12;
export const GRID_MARGIN: [number, number] = [4, 4];
export const GRID_CONTAINER_PADDING: [number, number] = [6, 6];
export const DEFAULT_ROW_HEIGHT = 16;

/** Resize handles for editor canvas — south edges and corners for height,
 *  east/west edges for width. */
export const RESIZE_HANDLES: ('se' | 'sw' | 's' | 'e' | 'w')[] = ['se', 'sw', 's', 'e', 'w'];

/** Default grid position for new or legacy blocks (full-width row) */
export const DEFAULT_BLOCK_LAYOUT = {
  gridX: 0,
  gridY: 0,
  gridW: 12,
  gridH: 3,
} as const;

/** Extract grid layout from block data, falling back to defaults */
export function getBlockGridLayout(data: Record<string, unknown>): {
  gridX: number;
  gridY: number;
  gridW: number;
  gridH: number;
} {
  return {
    gridX: typeof data.gridX === 'number' ? data.gridX : DEFAULT_BLOCK_LAYOUT.gridX,
    gridY: typeof data.gridY === 'number' ? data.gridY : DEFAULT_BLOCK_LAYOUT.gridY,
    gridW: typeof data.gridW === 'number' ? data.gridW : DEFAULT_BLOCK_LAYOUT.gridW,
    gridH: typeof data.gridH === 'number' ? data.gridH : DEFAULT_BLOCK_LAYOUT.gridH,
  };
}

/**
 * Compute a row-height so rows fit inside the given canvas pixel-height.
 * Uses a target of 30 visible rows for smooth, fine-grained resizing.
 * With 30 rows the snap increment is ~15-18 px instead of ~48 px.
 */
export function computeRowHeight(canvasHeight: number | undefined, rows = 30): number {
  if (!canvasHeight || canvasHeight <= 0) return DEFAULT_ROW_HEIGHT;

  const verticalPadding = GRID_CONTAINER_PADDING[1] * 2;
  const interRowGaps = (rows - 1) * GRID_MARGIN[1];
  const available = canvasHeight - verticalPadding - interRowGaps;

  return Math.max(1, Math.floor(available / rows));
}
