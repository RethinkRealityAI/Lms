/**
 * Merge runs of consecutive quiz slides in a plan JSON into a single slide.
 *
 * A "quiz slide" = slideType === 'quiz' OR every block on it is quiz_inline (≥1 block).
 * Maximal runs of length ≥2 are merged into the run's FIRST slide: all blocks are
 * concatenated (block orderIndex renumbered 0..n) and the trailing slides dropped.
 * The first slide keeps its title/settings. Slide orderIndex is then renumbered 0..n.
 * Non-consecutive quiz slides (separated by content) are left untouched.
 *
 * Usage: npx tsx scripts/import-scago-modules/consolidate-quiz-slides.ts <plan.json> [--dry]
 */
import fs from 'fs';

interface Block { orderIndex: number; blockType: string; [k: string]: unknown }
interface Slide { orderIndex: number; slideType: string; title?: string | null; blocks: Block[]; [k: string]: unknown }
interface Plan { slides: Slide[]; [k: string]: unknown }

function isQuizSlide(s: Slide): boolean {
  const blocks = s.blocks ?? [];
  if (blocks.length === 0) return false;
  if (s.slideType === 'quiz' && blocks.every((b) => b.blockType === 'quiz_inline')) return true;
  return blocks.every((b) => b.blockType === 'quiz_inline');
}

export function consolidate(plan: Plan): { merged: number; runs: number } {
  const slides = [...(plan.slides ?? [])].sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));
  const out: Slide[] = [];
  let merged = 0;
  let runs = 0;
  let i = 0;
  while (i < slides.length) {
    const cur = slides[i];
    if (isQuizSlide(cur)) {
      // gather the maximal consecutive run of quiz slides
      let j = i + 1;
      while (j < slides.length && isQuizSlide(slides[j])) j++;
      const run = slides.slice(i, j);
      if (run.length >= 2) {
        runs++;
        merged += run.length - 1;
        const allBlocks: Block[] = [];
        for (const s of run) for (const b of s.blocks ?? []) allBlocks.push(b);
        allBlocks.forEach((b, k) => (b.orderIndex = k));
        out.push({ ...run[0], slideType: 'quiz', blocks: allBlocks });
      } else {
        out.push(cur);
      }
      i = j;
    } else {
      out.push(cur);
      i++;
    }
  }
  out.forEach((s, k) => (s.orderIndex = k));
  plan.slides = out;
  return { merged, runs };
}

function main() {
  const planPath = process.argv[2];
  const dry = process.argv.includes('--dry');
  if (!planPath) throw new Error('Usage: consolidate-quiz-slides.ts <plan.json> [--dry]');
  const plan: Plan = JSON.parse(fs.readFileSync(planPath, 'utf8'));
  const before = plan.slides.length;
  const { merged, runs } = consolidate(plan);
  if (merged === 0) {
    console.log(`${planPath}: no consecutive quiz slides — unchanged (${before} slides)`);
    return;
  }
  console.log(`${planPath}: merged ${merged} slide(s) across ${runs} run(s) → ${plan.slides.length} slides (was ${before})`);
  if (!dry) fs.writeFileSync(planPath, JSON.stringify(plan, null, 2) + '\n');
}

main();
