/**
 * Shared grid constants used by both the editor canvas (react-grid-layout)
 * and the student viewer (CSS Grid) so the two always stay in sync.
 */

/** Pointer-drop position relative to the canvas — passed from the DnD context to handleAddBlock */
export interface DropPos {
  relX: number;
  relY: number;
  canvasWidth: number;
  canvasHeight: number;
}

export const GRID_COLS = 12;
export const GRID_MARGIN: [number, number] = [4, 4];
export const GRID_CONTAINER_PADDING: [number, number] = [6, 6];
export const DEFAULT_ROW_HEIGHT = 16;

/** All edge + corner resize handles for intuitive block sizing in the editor. */
export const RESIZE_HANDLES: ('n' | 'ne' | 'nw' | 'e' | 'w' | 's' | 'se' | 'sw')[] = [
  'n', 'ne', 'nw', 'e', 'w', 's', 'se', 'sw',
];

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
 * Tailwind + globals.css class string for a block's container "skin".
 * Shared by the editor canvas (slide-preview.tsx) and the student viewer
 * (course-viewer.tsx) so blocks look identical in both. The `block-glass` /
 * `block-glass-dark` classes (defined in globals.css) supply the
 * backdrop-filter + -webkit- prefix that Tailwind can't emit inline.
 *
 * Stored per-slide in `slide.settings.block_style`; defaults to LIGHT frosted glass
 * (`glass`) so blocks read as transparent on white slides. Use `glass-dark` for
 * smoked glass on dark or photo backgrounds (`text-slate-100` for inherited text).
 *
 * Padding is intentionally NOT included here — it is applied at each call site
 * (inside the content wrapper) so it doesn't push react-grid-layout's resize
 * handles inward in the editor.
 */
export const DEFAULT_BLOCK_STYLE = 'glass';

export function getBlockContainerBase(style?: string): string {
  const FROST = 'backdrop-blur-xl backdrop-saturate-[180%] backdrop-brightness-105';
  switch (style) {
    case 'glass-dark':
      return `block-glass-dark block-surface block-surface--glass-dark ${FROST}`;
    case 'classic':
      return 'block-surface block-surface--classic bg-white/95 border border-gray-100 shadow-sm';
    case 'none':
      return 'block-surface block-surface--none';
    case 'glass':
    default:
      return `block-glass block-surface block-surface--glass ${FROST}`;
  }
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

/**
 * Convert a pixel height to the minimum number of RGL row units needed.
 * RGL item height (px) = rowHeight * h + marginY * (h - 1).
 */
export function pixelsToGridRows(
  px: number,
  rowHeight: number,
  marginY: number = GRID_MARGIN[1],
): number {
  if (px <= 0) return 1;
  return Math.max(1, Math.ceil((px + marginY) / (rowHeight + marginY)));
}

/** Block types whose grid height should hug measured content in the editor. */
export const AUTO_HEIGHT_BLOCK_TYPES = new Set([
  'rich_text',
  'content_list',
  'table',
  'callout',
  'quiz_inline',
  'slider',
  'match_pairs',
  'fill_blank',
  'cta',
  'video',
  'image_gallery',
  'image_compare',
  'scratch_reveal',
  'iframe',
  'pdf',
  'h5p',
  'survey',
]);

/** Auto-height blocks: height is content-driven — disable north/south resize handles. */
export const AUTO_HEIGHT_RESIZE_HANDLES = ['e', 'w', 'ne', 'nw', 'se', 'sw'] as const;

export function blockUsesAutoHeight(blockType: string): boolean {
  return AUTO_HEIGHT_BLOCK_TYPES.has(blockType);
}

/**
 * RGL layout item for a block. Once an auto-height block is measured, its cell
 * height equals content — stale persisted gridH is ignored so gaps cannot persist.
 */
export function getBlockRglLayout(
  blockId: string,
  blockType: string,
  data: Record<string, unknown>,
  measuredGridH: number | undefined,
): {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
  minH: number;
  maxH?: number;
  resizeHandles: readonly string[];
} {
  const grid = getBlockGridLayout(data);
  const autoHeight = blockUsesAutoHeight(blockType);
  const minH = measuredGridH ?? 1;

  const h = autoHeight && measuredGridH != null
    ? measuredGridH
    : Math.max(grid.gridH, minH);

  return {
    i: blockId,
    x: grid.gridX,
    y: grid.gridY,
    w: grid.gridW,
    h,
    minH: autoHeight && measuredGridH != null ? measuredGridH : minH,
    maxH: autoHeight && measuredGridH != null ? measuredGridH : undefined,
    resizeHandles: autoHeight ? AUTO_HEIGHT_RESIZE_HANDLES : RESIZE_HANDLES,
  };
}

/** Persisted gridH after drag/resize — auto-height blocks keep measured height. */
export function resolvePersistedGridH(
  blockType: string,
  itemH: number,
  measuredGridH: number | undefined,
): number {
  const minH = measuredGridH ?? 1;
  if (blockUsesAutoHeight(blockType) && measuredGridH != null) {
    return measuredGridH;
  }
  return Math.max(itemH, minH);
}

/**
 * Blocks whose surface should stretch to fill the grid cell (interactive layouts).
 * All other blocks shrink-wrap so glass/card chrome hugs intrinsic content height.
 */
export const BLOCK_SURFACE_FILL_CELL = new Set([
  'quiz_inline',
  'survey',
  'match_pairs',
  'fill_blank',
  'slider',
  'scratch_reveal',
]);

/** Edge-to-edge surface — no inner padding (full-bleed media). */
export const BLOCK_SURFACE_FLUSH = new Set(['video', 'survey', 'scratch_reveal']);

export function blockSurfaceFillCell(blockType: string): boolean {
  return BLOCK_SURFACE_FILL_CELL.has(blockType);
}

export function blockSurfaceFlush(blockType: string): boolean {
  return BLOCK_SURFACE_FLUSH.has(blockType);
}
