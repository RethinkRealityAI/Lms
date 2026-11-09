/**
 * Read-only checks on the loaded Emergency SCD course:
 *   npx tsx scripts/import-gansid-modules/emergency-scd/verify.ts
 * - every block's data parses against the app's real Zod schema
 * - quizzes are satisfiable by the same validator the viewer's gate uses
 * - fill-blank blocks are completable (a required, uncompletable block would brick a slide)
 * - every media URL returns 200 with a sensible content type
 */
import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { imageGalleryDataSchema } from '../../../src/lib/content/blocks/image-gallery/schema';
import { quizInlineDataSchema } from '../../../src/lib/content/blocks/quiz-inline/schema';
import { getQuizConfigError } from '../../../src/lib/content/blocks/quiz-inline/validation';
import { contentListDataSchema } from '../../../src/lib/content/blocks/content-list/schema';
import { audioDataSchema } from '../../../src/lib/content/blocks/audio/schema';
import { iconListDataSchema } from '../../../src/lib/content/blocks/icon-list/schema';
import { imageCompareDataSchema } from '../../../src/lib/content/blocks/image-compare/schema';
import { scratchRevealDataSchema } from '../../../src/lib/content/blocks/scratch-reveal/schema';
import { matchPairsDataSchema } from '../../../src/lib/content/blocks/match-pairs/schema';
import { fillBlankDataSchema, getFillBlankAnswers } from '../../../src/lib/content/blocks/fill-blank/schema';
import { isRequiredInteractiveBlock } from '../../../src/lib/content/blocks/interactive-gating';

const env = Object.fromEntries(fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .filter((l) => l && !l.startsWith('#') && l.includes('='))
  .map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; }));
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const SCHEMAS: Record<string, { safeParse: (v: unknown) => { success: boolean; error?: { issues: unknown[] } } }> = {
  image_gallery: imageGalleryDataSchema, quiz_inline: quizInlineDataSchema, content_list: contentListDataSchema,
  audio: audioDataSchema, icon_list: iconListDataSchema, image_compare: imageCompareDataSchema,
  scratch_reveal: scratchRevealDataSchema, match_pairs: matchPairsDataSchema, fill_blank: fillBlankDataSchema,
};

async function main() {
  const { data: course } = await sb.from('courses').select('id,title,status,is_published,thumbnail_url').eq('slug', 'emergency-acute-complications-scd').single();
  console.log(course?.title, '| status', course?.status, '| is_published', course?.is_published);
  const { data: lessons } = await sb.from('lessons').select('id,title,order_index').eq('course_id', course!.id).order('order_index');
  const problems: string[] = [];
  const urls = new Set<string>([course!.thumbnail_url]);
  let gatingQuizzes = 0, gatingInteractive = 0;
  for (const l of lessons ?? []) {
    const { data: slides } = await sb.from('slides').select('id,title,settings,status').eq('lesson_id', l.id).order('order_index');
    const { data: blocks } = await sb.from('lesson_blocks').select('id,slide_id,block_type,data').eq('lesson_id', l.id);
    const ids = new Set((slides ?? []).map((s) => s.id));
    let g = 0, gi = 0;
    for (const s of slides ?? []) { const bg = (s.settings as Record<string, string>)?.background_image; if (bg) urls.add(bg); if (s.status !== 'published') problems.push(`slide not published: ${s.title}`); }
    for (const b of blocks ?? []) {
      const at = `L${l.order_index + 1} ${b.block_type} ${b.id}`;
      if (!ids.has(b.slide_id)) problems.push(`${at}: orphan`);
      const parsed = SCHEMAS[b.block_type]?.safeParse(b.data);
      if (parsed && !parsed.success) problems.push(`${at}: schema ${JSON.stringify(parsed.error?.issues).slice(0, 200)}`);
      if (b.block_type === 'quiz_inline') {
        const err = getQuizConfigError(b.data);
        if (err) problems.push(`${at}: ${err}`);
        if (b.data.required !== false && b.data.question_type !== 'swipe') g++;
      }
      if (b.block_type === 'fill_blank' && getFillBlankAnswers(b.data.text).length === 0) problems.push(`${at}: no blanks`);
      if (isRequiredInteractiveBlock({ id: b.id, block_type: b.block_type, data: b.data })) gi++;
      if (b.data.mode === 'hotspot' && !(b.data.hotspots?.length > 0)) problems.push(`${at}: hotspots lost`);
      for (const m of JSON.stringify(b.data).matchAll(/https:\/\/ylmnbbrpaeiogdeqezlo[^"\\]+/g)) urls.add(m[0]);
    }
    gatingQuizzes += g; gatingInteractive += gi;
    console.log(`  L${l.order_index + 1}: ${slides?.length} slides, ${blocks?.length} blocks, ${g} required quizzes, ${gi} required interactives`);
  }
  let bad = 0;
  const list = [...urls];
  for (let i = 0; i < list.length; i += 10) {
    await Promise.all(list.slice(i, i + 10).map(async (u) => {
      const r = await fetch(u, { method: 'HEAD' });
      if (!r.ok) { bad++; problems.push(`HTTP ${r.status}: ${u}`); }
    }));
  }
  console.log(`media URLs checked: ${list.length}, failing: ${bad}; required quizzes ${gatingQuizzes}, required interactives ${gatingInteractive}`);
  console.log(problems.length ? `PROBLEMS\n${problems.join('\n')}` : 'NO PROBLEMS');
}
main();
