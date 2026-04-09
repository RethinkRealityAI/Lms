import type { LessonBlock } from '@/types';

/** Split blocks into pages at page_break boundaries */
export function splitBlocksIntoPages(blocks: LessonBlock[]): LessonBlock[][] {
  const pages: LessonBlock[][] = [];
  let current: LessonBlock[] = [];
  for (const block of blocks) {
    if (block.block_type === 'page_break') {
      pages.push(current);
      current = [];
    } else {
      current.push(block);
    }
  }
  if (current.length > 0) pages.push(current);
  // Filter out empty pages
  return pages.filter(p => p.length > 0);
}
