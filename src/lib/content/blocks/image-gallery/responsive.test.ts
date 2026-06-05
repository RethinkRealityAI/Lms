import { describe, expect, it } from 'vitest';
import { resolveImageLayout, buildImageResponsiveCss } from './responsive';
import type { ImageGalleryData } from './schema';

const base = (over: Partial<ImageGalleryData> = {}): ImageGalleryData =>
  ({ images: [], mode: 'gallery', objectFit: 'contain', displaySize: 'lg', columns: 3, widthPreset: 'md', align: 'center', ...over } as ImageGalleryData);

describe('resolveImageLayout', () => {
  it('desktop uses base fields', () => {
    const r = resolveImageLayout(base(), 'desktop');
    expect(r).toMatchObject({ objectFit: 'contain', displaySize: 'lg', columns: 3, widthPreset: 'md', align: 'center' });
  });

  it('stacked arrangement forces one column at every breakpoint', () => {
    const data = base({ gridLayout: 'stacked', columns: 3 });
    expect(resolveImageLayout(data, 'desktop').columns).toBe(1);
    expect(resolveImageLayout(data, 'tablet').columns).toBe(1);
    expect(resolveImageLayout(data, 'mobile').columns).toBe(1);
  });

  it('mobile smart defaults: full width + 1 column when not overridden', () => {
    const r = resolveImageLayout(base(), 'mobile');
    expect(r.widthPreset).toBe('full');
    expect(r.columns).toBe(1);
  });

  it('tablet smart default: columns clamp to min(base,2)', () => {
    expect(resolveImageLayout(base({ columns: 4 }), 'tablet').columns).toBe(2);
    expect(resolveImageLayout(base({ columns: 2 }), 'tablet').columns).toBe(2);
  });

  it('explicit override beats smart default and cascades into mobile', () => {
    const data = base({ responsive: { tablet: { objectFit: 'cover', columns: 3 }, mobile: { widthPreset: 'md' } } });
    const tablet = resolveImageLayout(data, 'tablet');
    expect(tablet.objectFit).toBe('cover');
    expect(tablet.columns).toBe(3);
    const mobile = resolveImageLayout(data, 'mobile');
    expect(mobile.objectFit).toBe('cover'); // inherited from tablet
    expect(mobile.widthPreset).toBe('md');  // explicit mobile override beats the full default
  });

  it('handles legacy data with missing base fields', () => {
    const r = resolveImageLayout({ images: [] } as unknown as ImageGalleryData, 'desktop');
    expect(r).toMatchObject({ objectFit: 'contain', displaySize: 'md', columns: 2, widthPreset: 'full', align: 'center' });
  });
});

describe('buildImageResponsiveCss', () => {
  it('emits a class name and scoped style with all three container-query tiers', () => {
    const { className, css } = buildImageResponsiveCss('blk-123', base());
    expect(className).toBe('lms-img-blk-123');
    expect(css).toContain('.lms-img-blk-123');
    expect(css).toContain('@container slide (max-width: 29.99rem)');
    expect(css).toContain('@container slide (min-width: 30rem) and (max-width: 47.99rem)');
    expect(css).toContain('--lms-img-cols');
  });

  it('sanitizes ids that arent valid class tokens', () => {
    const { className } = buildImageResponsiveCss('a/b 1', base());
    expect(className).toMatch(/^lms-img-[a-zA-Z0-9_-]+$/);
  });
});
