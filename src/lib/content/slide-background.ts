import type { CSSProperties } from 'react';

/**
 * How a slide's background image fills the slide:
 * - `cover`   — scaled to cover the whole area (may crop). Default.
 * - `repeat`  — tiled at its natural size, filling any height.
 * - `contain` — scaled to fit entirely without cropping.
 */
export type SlideBackgroundFit = 'cover' | 'repeat' | 'contain';

export const SLIDE_BACKGROUND_FITS: { value: SlideBackgroundFit; label: string; hint: string }[] = [
  { value: 'cover', label: 'Cover', hint: 'Scale to fill (may crop)' },
  { value: 'repeat', label: 'Repeat', hint: 'Tile the image' },
  { value: 'contain', label: 'Contain', hint: 'Fit without cropping' },
];

export function resolveSlideBackgroundFit(value: unknown): SlideBackgroundFit {
  return value === 'repeat' || value === 'contain' ? value : 'cover';
}

/**
 * Inline style for a slide background-image layer. Pair with an element that
 * stretches the FULL content height (e.g. `absolute inset-0` inside a
 * `relative min-h-full` wrapper) so the image extends past the viewport when
 * the slide scrolls, instead of revealing the base colour below the fold.
 */
export function slideBackgroundImageStyle(url: string, fit: SlideBackgroundFit): CSSProperties {
  const base: CSSProperties = {
    backgroundImage: `url(${url})`,
    backgroundPosition: 'center',
  };
  if (fit === 'repeat') {
    return { ...base, backgroundRepeat: 'repeat', backgroundSize: 'auto' };
  }
  if (fit === 'contain') {
    return { ...base, backgroundRepeat: 'no-repeat', backgroundSize: 'contain' };
  }
  return { ...base, backgroundRepeat: 'no-repeat', backgroundSize: 'cover' };
}
