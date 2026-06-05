import type { ImageGalleryDisplaySize } from './schema';

/** Max height classes for contained images in the grid (mobile → desktop). */
export const DISPLAY_SIZE_CLASS: Record<ImageGalleryDisplaySize, string> = {
  sm: 'max-h-28 sm:max-h-32',
  md: 'max-h-40 sm:max-h-48',
  lg: 'max-h-52 sm:max-h-64',
  xl: 'max-h-64 sm:max-h-80',
};

export const DISPLAY_SIZE_LABEL: Record<ImageGalleryDisplaySize, string> = {
  sm: 'Small',
  md: 'Medium',
  lg: 'Large',
  xl: 'Extra large',
};

/** Default caption colors when `captionColor` is inherit — mirrors globals.css surface tokens */
export const CAPTION_COLOR_BY_SURFACE: Record<string, string> = {
  'glass-dark': '#cbd5e1',
  glass: '#475569',
  classic: '#475569',
  none: '#64748b',
};

export function resolveCaptionColor(
  captionColor: string | undefined,
  blockStyle: string | undefined,
): string {
  if (captionColor && captionColor !== 'inherit') return captionColor;
  const style = blockStyle ?? 'glass-dark';
  return CAPTION_COLOR_BY_SURFACE[style] ?? CAPTION_COLOR_BY_SURFACE['glass-dark'];
}

export function captionColorUsesInherit(captionColor: string | undefined): boolean {
  return !captionColor || captionColor === 'inherit';
}

export function viewedImagesStorageKey(lessonId: string, blockId: string): string {
  return `lms-image-gallery-viewed:${lessonId}:${blockId}`;
}

export function loadViewedImageIndices(lessonId: string | undefined, blockId: string | undefined): Set<number> {
  if (!lessonId || !blockId || typeof sessionStorage === 'undefined') return new Set();
  try {
    const raw = sessionStorage.getItem(viewedImagesStorageKey(lessonId, blockId));
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((n): n is number => typeof n === 'number'));
  } catch {
    return new Set();
  }
}

export function saveViewedImageIndices(lessonId: string, blockId: string, indices: Set<number>): void {
  if (typeof sessionStorage === 'undefined') return;
  try {
    sessionStorage.setItem(
      viewedImagesStorageKey(lessonId, blockId),
      JSON.stringify([...indices]),
    );
  } catch {
    // quota / private mode — ignore
  }
}
