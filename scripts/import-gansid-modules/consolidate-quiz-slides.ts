/**
 * Merge consecutive quiz slides (one question each) into single slides with multiple quiz_inline blocks.
 * Usage: npx tsx consolidate-quiz-slides.ts <plan.json> [--write]
 */
import fs from 'fs';

type Block = Record<string, unknown> & {
  orderIndex?: number;
  order_index?: number;
  blockType?: string;
  block_type?: string;
  data?: Record<string, unknown>;
};

type Slide = Record<string, unknown> & {
  orderIndex?: number;
  slideOrderIndex?: number;
  slideIndex?: number;
  slideType?: string;
  title?: string | null;
  slideTitle?: string | null;
  blocks?: Block[];
};

function slideOrder(s: Slide): number {
  return s.orderIndex ?? s.slideOrderIndex ?? s.slideIndex ?? 0;
}

function setSlideOrder(s: Slide, i: number) {
  if ('orderIndex' in s || s.orderIndex !== undefined) s.orderIndex = i;
  else if ('slideOrderIndex' in s) s.slideOrderIndex = i;
  else if ('slideIndex' in s) s.slideIndex = i;
  else s.orderIndex = i;
}

function normalizeBlock(b: Block, orderIndex: number): Block {
  const out = { ...b };
  if (!out.blockType && out.block_type) out.blockType = out.block_type as string;
  out.orderIndex = orderIndex;
  if (out.data && typeof out.data === 'object') {
    out.data = { ...out.data, gridY: orderIndex * 3, gridX: 0, gridW: 12, gridH: 3 };
  }
  delete out.block_type;
  delete out.order_index;
  return out;
}

function isQuizSlide(s: Slide): boolean {
  return s.slideType === 'quiz';
}

function consolidate(slides: Slide[]): { slides: Slide[]; merged: number } {
  const out: Slide[] = [];
  let merged = 0;
  let i = 0;
  while (i < slides.length) {
    const s = slides[i];
    if (!isQuizSlide(s)) {
      out.push(s);
      i++;
      continue;
    }
    const group: Slide[] = [s];
    let j = i + 1;
    while (j < slides.length && isQuizSlide(slides[j])) {
      group.push(slides[j]);
      j++;
    }
    if (group.length === 1) {
      out.push(s);
    } else {
      merged += group.length - 1;
      const blocks: Block[] = [];
      let bi = 0;
      for (const g of group) {
        for (const b of g.blocks ?? []) {
          blocks.push(normalizeBlock(b, bi++));
        }
      }
      const first = group[0];
      out.push({
        ...first,
        slideTitle: first.slideTitle ?? first.title ?? 'Knowledge Check',
        title: first.title ?? first.slideTitle ?? 'Knowledge Check',
        blocks,
      });
    }
    i = j;
  }
  out.forEach((s, idx) => setSlideOrder(s, idx));
  return { slides: out, merged };
}

const planPath = process.argv[2];
const write = process.argv.includes('--write');
if (!planPath) throw new Error('Usage: consolidate-quiz-slides.ts <plan.json> [--write]');

const plan = JSON.parse(fs.readFileSync(planPath, 'utf8')) as { slides: Slide[] };
const before = plan.slides.length;
const { slides, merged } = consolidate(plan.slides);
plan.slides = slides;
console.log(`${planPath}: ${before} → ${slides.length} slides (${merged} quiz slides merged)`);
if (write) fs.writeFileSync(planPath, JSON.stringify(plan, null, 2) + '\n');
