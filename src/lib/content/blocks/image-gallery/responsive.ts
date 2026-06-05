import type {
  ImageAlign, ImageGalleryData, ImageGalleryDisplaySize, ImageWidthPreset,
} from './schema';

export type ImageBreakpoint = 'mobile' | 'tablet' | 'desktop';

export interface ResolvedImageLayout {
  objectFit: 'cover' | 'contain';
  displaySize: ImageGalleryDisplaySize;
  columns: number;
  widthPreset: ImageWidthPreset;
  align: ImageAlign;
}

export const DISPLAY_SIZE_REM: Record<ImageGalleryDisplaySize, string> = {
  sm: '8rem', md: '12rem', lg: '16rem', xl: '20rem',
};
export const WIDTH_PRESET_PCT: Record<ImageWidthPreset, string> = {
  full: '100%', lg: '80%', md: '60%', sm: '40%',
};
function alignMargins(align: ImageAlign): { ml: string; mr: string } {
  if (align === 'left') return { ml: '0', mr: 'auto' };
  if (align === 'right') return { ml: 'auto', mr: '0' };
  return { ml: 'auto', mr: 'auto' };
}

function baseLayout(data: ImageGalleryData): ResolvedImageLayout {
  return {
    objectFit: data.objectFit ?? 'contain',
    displaySize: data.displaySize ?? 'md',
    // 'stacked' arrangement = one column at every breakpoint (columns var drives the grid now).
    columns: data.gridLayout === 'stacked' ? 1 : (data.columns ?? 2),
    widthPreset: data.widthPreset ?? 'full',
    align: data.align ?? 'center',
  };
}

/**
 * Resolve the effective image layout for a breakpoint.
 * Cascade: desktop = base; tablet = base + tablet override; mobile = tablet + mobile override.
 * Smart defaults (when NOT explicitly overridden): mobile width=full & columns=1; tablet columns=min(base,2).
 */
export function resolveImageLayout(data: ImageGalleryData, bp: ImageBreakpoint): ResolvedImageLayout {
  const base = baseLayout(data);
  if (bp === 'desktop') return base;

  const tabletOv = data.responsive?.tablet ?? {};
  const tablet: ResolvedImageLayout = {
    objectFit: tabletOv.objectFit ?? base.objectFit,
    displaySize: tabletOv.displaySize ?? base.displaySize,
    columns: tabletOv.columns ?? Math.min(base.columns, 2),
    widthPreset: tabletOv.widthPreset ?? base.widthPreset,
    align: tabletOv.align ?? base.align,
  };
  if (bp === 'tablet') return tablet;

  const mobileOv = data.responsive?.mobile ?? {};
  return {
    objectFit: mobileOv.objectFit ?? tablet.objectFit,
    displaySize: mobileOv.displaySize ?? tablet.displaySize,
    columns: mobileOv.columns ?? 1,
    // Inherit an explicit tablet width; otherwise default mobile to full-width.
    widthPreset: mobileOv.widthPreset ?? (tabletOv.widthPreset !== undefined ? tablet.widthPreset : 'full'),
    align: mobileOv.align ?? tablet.align,
  };
}

function varsFor(layout: ResolvedImageLayout): string {
  const m = alignMargins(layout.align);
  return [
    `--lms-img-fit: ${layout.objectFit};`,
    `--lms-img-maxh: ${DISPLAY_SIZE_REM[layout.displaySize]};`,
    `--lms-img-cols: ${layout.columns};`,
    `--lms-img-maxw: ${WIDTH_PRESET_PCT[layout.widthPreset]};`,
    `--lms-img-ml: ${m.ml};`,
    `--lms-img-mr: ${m.mr};`,
  ].join(' ');
}

export function imageBlockClassName(blockId: string): string {
  return 'lms-img-' + blockId.replace(/[^a-zA-Z0-9_-]/g, '-');
}

/** Build the scoped <style> text that sets per-breakpoint CSS vars for one block. */
export function buildImageResponsiveCss(blockId: string, data: ImageGalleryData): { className: string; css: string } {
  const className = imageBlockClassName(blockId);
  const sel = '.' + className;
  const desktop = varsFor(resolveImageLayout(data, 'desktop'));
  const tablet = varsFor(resolveImageLayout(data, 'tablet'));
  const mobile = varsFor(resolveImageLayout(data, 'mobile'));
  const css = [
    `${sel} { ${desktop} }`,
    `@container slide (min-width: 30rem) and (max-width: 47.99rem) { ${sel} { ${tablet} } }`,
    `@container slide (max-width: 29.99rem) { ${sel} { ${mobile} } }`,
  ].join('\n');
  return { className, css };
}
