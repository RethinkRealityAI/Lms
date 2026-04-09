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

/** Preserve grid layout fields across type switches */
function preserveGridLayout(oldData: Record<string, unknown>, newData: Record<string, unknown>): Record<string, unknown> {
  const gridFields = ['gridX', 'gridY', 'gridW', 'gridH'] as const;
  for (const field of gridFields) {
    if (typeof oldData[field] === 'number') {
      newData[field] = oldData[field];
    }
  }
  return newData;
}

/** Transform block data when switching types. Preserves grid layout. */
export function transformBlockData(
  fromType: string,
  toType: string,
  data: Record<string, unknown>,
): Record<string, unknown> {
  let result: Record<string, unknown>;

  if (fromType === 'rich_text' && toType === 'callout') {
    result = { html: data.html ?? '', variant: 'info', title: 'Note' };
  } else if (fromType === 'callout' && toType === 'rich_text') {
    result = { html: data.html ?? '' };
  } else if (fromType === 'image_gallery' && toType === 'video') {
    const images = (data.images as Array<{ url?: string }>) ?? [];
    result = { url: images[0]?.url ?? '', caption: '' };
  } else if (fromType === 'video' && toType === 'image_gallery') {
    const url = (data.url as string) ?? '';
    result = { images: url ? [{ url, alt: '', caption: '' }] : [], mode: 'gallery' };
  } else {
    return data;
  }

  return preserveGridLayout(data, result);
}
