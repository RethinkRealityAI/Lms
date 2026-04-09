/** Groups of block types that can switch between each other */
export const COMPATIBLE_GROUPS: string[][] = [
  ['rich_text', 'callout'],
  ['image_gallery', 'video'],
];

/** Get compatible types for a given block type (excludes self) */
export function getCompatibleTypes(blockType: string): string[] {
  for (const group of COMPATIBLE_GROUPS) {
    if (group.includes(blockType)) {
      return group.filter(t => t !== blockType);
    }
  }
  return [];
}

/** Transform block data when switching types */
export function transformBlockData(
  fromType: string,
  toType: string,
  data: Record<string, unknown>,
): Record<string, unknown> {
  if (fromType === 'rich_text' && toType === 'callout') {
    return { html: data.html ?? '', variant: 'info', title: 'Note' };
  }
  if (fromType === 'callout' && toType === 'rich_text') {
    return { html: data.html ?? '' };
  }
  if (fromType === 'image_gallery' && toType === 'video') {
    const images = (data.images as Array<{ url?: string }>) ?? [];
    return { url: images[0]?.url ?? '', caption: '' };
  }
  if (fromType === 'video' && toType === 'image_gallery') {
    const url = (data.url as string) ?? '';
    return { images: url ? [{ url, alt: '', caption: '' }] : [], mode: 'gallery' };
  }
  return data;
}
