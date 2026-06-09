/**
 * Load a SCAGO lesson slide-plan JSON into the database (idempotent per lesson).
 *
 * Usage:
 *   npx tsx scripts/import-scago-modules/load-plan.ts <plan.json> [--dry]
 *
 * Behaviour (identical contract to the GANSID loader, SCAGO institution):
 *   - Updates the existing lesson row's description + title_slide_settings (lesson row is KEPT).
 *   - HARD-deletes all lesson_blocks then all slides for that lesson (clean rebuild).
 *   - Inserts the plan's slides, then its blocks (blocks reference the new slide ids).
 *
 * Uses SUPABASE_SERVICE_ROLE_KEY from .env.local (bypasses RLS).
 *
 * SCAGO source = ONE Markdown file per module (no index.html). Quiz feedback lives in the MD
 * as `**Explanation:**` and must be carried verbatim into `feedback_correct` — never `explanation`.
 *
 * Plan JSON shape — see scripts/import-gansid-modules/load-plan.ts header (the contract is shared).
 */
import fs from 'fs';
import path from 'path';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { normalizeTableData } from '../../src/lib/content/blocks/table/normalize';
import type { TableData } from '../../src/lib/content/blocks/table/schema';

const SCAGO_INSTITUTION_ID = 'ba52611f-9ad5-44b7-824e-97725a177336';
const REPO_ROOT = path.resolve(__dirname, '..', '..');

interface PlanBlock { orderIndex: number; blockType: string; title?: string | null; data: Record<string, unknown>; }
interface PlanSlide { orderIndex: number; slideType: string; title?: string | null; status?: string; settings?: Record<string, unknown>; blocks: PlanBlock[]; }
interface Plan {
  lessonId: string; lessonOrderIndex?: number; lessonTitle?: string;
  lessonDescription?: string | null; titleSlideSettings?: Record<string, unknown> | null;
  slides: PlanSlide[]; candidates?: unknown[];
}

function loadEnv(): { url: string; serviceKey: string } {
  const raw = fs.readFileSync(path.join(REPO_ROOT, '.env.local'), 'utf8');
  const get = (k: string) => {
    const m = raw.match(new RegExp(`^${k}=(.*)$`, 'm'));
    if (!m) throw new Error(`Missing ${k} in .env.local`);
    return m[1].trim();
  };
  return { url: get('NEXT_PUBLIC_SUPABASE_URL'), serviceKey: get('SUPABASE_SERVICE_ROLE_KEY') };
}

function validate(plan: Plan): string[] {
  const errs: string[] = [];
  if (!plan.lessonId) errs.push('missing lessonId');
  if (!Array.isArray(plan.slides) || plan.slides.length === 0) errs.push('no slides');
  const slideOrders = new Set<number>();
  for (const s of plan.slides ?? []) {
    if (slideOrders.has(s.orderIndex)) errs.push(`duplicate slide orderIndex ${s.orderIndex}`);
    slideOrders.add(s.orderIndex);
    if (!s.slideType) errs.push(`slide ${s.orderIndex}: missing slideType`);
    for (const b of s.blocks ?? []) {
      if (!b.blockType) errs.push(`slide ${s.orderIndex} block ${b.orderIndex}: missing blockType`);
      if (!b.data || typeof b.data !== 'object') errs.push(`slide ${s.orderIndex} block ${b.orderIndex}: missing data`);
      // Image URLs must be absolute (and, for SCAGO, served from the scago-assets bucket)
      const json = JSON.stringify(b.data);
      const relImg = json.match(/"(url|image_url|background_image)":\s*"(?!https?:\/\/|data:)[^"]+"/);
      if (relImg) errs.push(`slide ${s.orderIndex} block ${b.orderIndex}: non-absolute media url -> ${relImg[0]}`);
      // quiz multiple_choice/true_false answer must be in options
      if (b.blockType === 'quiz_inline') {
        const d = b.data as Record<string, unknown>;
        if ((d.question_type === 'multiple_choice' || d.question_type === 'true_false')) {
          const opts = (d.options as string[]) ?? [];
          if (typeof d.correct_answer === 'string' && !opts.includes(d.correct_answer))
            errs.push(`slide ${s.orderIndex} block ${b.orderIndex}: correct_answer not in options`);
        }
        // select_all: every correct item must be an option (loader joins arrays to a "; " string).
        if (d.question_type === 'select_all') {
          const opts = (d.options as string[]) ?? [];
          const correct = Array.isArray(d.correct_answer)
            ? (d.correct_answer as unknown[]).map(String)
            : typeof d.correct_answer === 'string'
              ? d.correct_answer.split(';').map((x) => x.trim()).filter(Boolean)
              : [];
          for (const c of correct)
            if (!opts.includes(c)) errs.push(`slide ${s.orderIndex} block ${b.orderIndex}: select_all correct item not in options -> "${c}"`);
        }
        // Single-feedback rule: the redundant `explanation` field is forbidden (renders a 2nd box).
        // SCAGO MD `**Explanation:**` text belongs in feedback_correct.
        if ('explanation' in d && d.explanation)
          errs.push(`slide ${s.orderIndex} block ${b.orderIndex}: quiz has forbidden 'explanation' field (put MD Explanation text into feedback_correct)`);
      }
      // Table cells are PLAIN TEXT; columns use `label` (not `header`)
      if (b.blockType === 'table') {
        const d = b.data as { columns?: Array<Record<string, unknown>>; rows?: Array<{ cells?: Record<string, string> }> };
        for (const c of d.columns ?? []) {
          if (!('label' in c)) errs.push(`slide ${s.orderIndex} block ${b.orderIndex}: table column missing 'label' (use label, not header)`);
          if ('key' in c && !('id' in c)) errs.push(`slide ${s.orderIndex} block ${b.orderIndex}: table column uses 'key' — use 'id' (loader auto-fixes on insert)`);
        }
        for (const r of d.rows ?? []) {
          for (const [k, v] of Object.entries(r.cells ?? {})) {
            if (typeof v === 'string' && /<[^>]+>/.test(v))
              errs.push(`slide ${s.orderIndex} block ${b.orderIndex}: table cell '${k}' contains HTML (cells are plain text)`);
          }
        }
      }
    }
  }
  return errs;
}

/** Single-image galleries: full width (mode single), original aspect, contain fit, large height. */
function normalizeImageGalleryData(data: Record<string, unknown>): Record<string, unknown> {
  const d = { ...data };
  const images = Array.isArray(d.images) ? d.images : [];
  const mode = (d.mode as string | undefined) ?? (images.length === 1 ? 'single' : 'gallery');
  const isSingle =
    mode === 'single' ||
    (images.length === 1 && mode !== 'gallery' && mode !== 'slider' && mode !== 'carousel');
  if (!isSingle) return d;
  d.mode = 'single';
  d.objectFit = 'contain';
  d.displaySize = 'lg';
  delete d.aspectRatio;
  return d;
}

/**
 * content_list robustness: the schema needs `items[].html` (NOT `text`) and `bullet_style`
 * (NOT `style`/`listStyle`), with values disc|circle|square|dash|decimal|none. Planner agents
 * routinely emit the wrong field names — normalize them here so bullets never render empty.
 */
const BULLET_STYLE_MAP: Record<string, string> = {
  bullet: 'disc', bullets: 'disc', disc: 'disc', ul: 'disc',
  circle: 'circle', square: 'square', dash: 'dash', none: 'none',
  number: 'decimal', numbered: 'decimal', ordered: 'decimal', decimal: 'decimal', ol: 'decimal',
};
function normalizeContentListData(data: Record<string, unknown>): Record<string, unknown> {
  const d = { ...data };
  if (Array.isArray(d.items)) {
    d.items = (d.items as Array<Record<string, unknown>>).map((raw) => {
      const it = { ...raw };
      if (it.html === undefined && typeof it.text === 'string') it.html = it.text;
      delete it.text;
      return it;
    });
  }
  const alias = d.bullet_style ?? (d as Record<string, unknown>).listStyle ?? (d as Record<string, unknown>).style
    ?? (d as Record<string, unknown>).list_style ?? (d as Record<string, unknown>).bulletStyle;
  if (alias !== undefined) d.bullet_style = BULLET_STYLE_MAP[String(alias).toLowerCase()] ?? 'disc';
  delete (d as Record<string, unknown>).listStyle;
  delete (d as Record<string, unknown>).style;
  delete (d as Record<string, unknown>).list_style;
  delete (d as Record<string, unknown>).bulletStyle;
  return d;
}

/**
 * quiz_inline: the viewer stores `correct_answer` as a SEMICOLON+SPACE separated STRING
 * ("A; B; C") even for select_all (it does `correct_answer.split('; ')`). Planner agents often
 * emit an array for select_all — join it so the viewer doesn't crash on `.split`.
 */
function normalizeQuizData(data: Record<string, unknown>): Record<string, unknown> {
  const d = { ...data };
  if (Array.isArray(d.correct_answer)) d.correct_answer = (d.correct_answer as unknown[]).map(String).join('; ');
  return d;
}

function normalizeBlockData(blockType: string, data: Record<string, unknown>): Record<string, unknown> {
  if (blockType === 'image_gallery') return normalizeImageGalleryData(data);
  if (blockType === 'table') return normalizeTableData(data as TableData) as Record<string, unknown>;
  if (blockType === 'content_list') return normalizeContentListData(data);
  if (blockType === 'quiz_inline') return normalizeQuizData(data);
  return data;
}

/**
 * Slide titles: the viewer renders the slide `title` as the prominent headline and the lesson title
 * as a small eyebrow above it. A leading `<h2>/<h3>` inside the slide's first rich_text block that
 * repeats the slide title is therefore redundant. For each slide:
 *   - if the first rich_text block starts with a heading and the slide has NO title → promote the
 *     heading text to slide.title and strip it from the block;
 *   - if the slide title already equals that heading (case/space-insensitive) → strip the inline copy;
 *   - otherwise (heading differs from the title) → leave it (it's a genuine sub-heading).
 * If stripping empties the block, drop the block.
 */
function stripTags(s: string): string {
  return s.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').trim();
}
function normTitle(s: string): string {
  return stripTags(s).toLowerCase().replace(/\s+/g, ' ').replace(/[\s:.—-]+$/g, '').trim();
}
function promoteSlideTitles(plan: Plan): void {
  for (const s of plan.slides ?? []) {
    const blocks = s.blocks ?? [];
    if (!blocks.length) continue;
    const first = [...blocks].sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0))[0];
    if (first.blockType !== 'rich_text') continue;
    const html = (first.data?.html as string) ?? '';
    const m = html.match(/^\s*<h([1-4])>([\s\S]*?)<\/h\1>\s*/i);
    if (!m) continue;
    const headingText = stripTags(m[2]);
    if (!headingText) continue;
    const title = (s.title ?? '').trim();
    if (!title) {
      s.title = headingText;
    } else if (normTitle(title) !== normTitle(headingText)) {
      continue; // genuine sub-heading, keep it
    }
    const rest = html.slice(m[0].length);
    if (/\S/.test(rest)) {
      first.data.html = rest;
    } else {
      // heading was the entire block — remove the now-empty block
      s.blocks = blocks.filter((b) => b !== first);
    }
  }
}

async function loadPlan(supabase: SupabaseClient, plan: Plan, dry: boolean) {
  promoteSlideTitles(plan);
  const errs = validate(plan);
  if (errs.length) { console.error('VALIDATION FAILED:\n - ' + errs.join('\n - ')); process.exit(2); }

  console.log(`Lesson ${plan.lessonOrderIndex} "${plan.lessonTitle}" (${plan.lessonId}): ${plan.slides.length} slides, ${plan.slides.reduce((n, s) => n + s.blocks.length, 0)} blocks`);
  if (dry) { console.log('[dry run] validation OK, no writes.'); return; }

  // 1. Update lesson row (kept — not deleted)
  const lessonUpdate: Record<string, unknown> = {};
  if (plan.lessonDescription !== undefined) lessonUpdate.description = plan.lessonDescription;
  if (plan.titleSlideSettings) lessonUpdate.title_slide_settings = plan.titleSlideSettings;
  if (Object.keys(lessonUpdate).length) {
    const { error } = await supabase.from('lessons').update(lessonUpdate).eq('id', plan.lessonId);
    if (error) throw new Error(`lesson update: ${error.message}`);
  }

  // 2. Hard-delete existing blocks then slides for a clean, idempotent rebuild
  {
    const { error } = await supabase.from('lesson_blocks').delete().eq('lesson_id', plan.lessonId);
    if (error) throw new Error(`delete blocks: ${error.message}`);
  }
  {
    const { error } = await supabase.from('slides').delete().eq('lesson_id', plan.lessonId);
    if (error) throw new Error(`delete slides: ${error.message}`);
  }

  // 3. Insert slides, capture new ids by orderIndex
  const slideRows = plan.slides.map((s) => ({
    lesson_id: plan.lessonId,
    slide_type: s.slideType,
    title: s.title ?? null,
    order_index: s.orderIndex,
    status: s.status ?? 'published',
    settings: s.settings ?? { background: '#FFFFFF', block_style: 'glass' },
  }));
  const { data: insertedSlides, error: slideErr } = await supabase.from('slides').insert(slideRows).select('id, order_index');
  if (slideErr) throw new Error(`insert slides: ${slideErr.message}`);
  const slideIdByOrder = new Map<number, string>();
  for (const row of insertedSlides ?? []) slideIdByOrder.set(row.order_index as number, row.id as string);

  // 4. Insert blocks
  const blockRows: Record<string, unknown>[] = [];
  for (const s of plan.slides) {
    const slideId = slideIdByOrder.get(s.orderIndex);
    for (const b of s.blocks) {
      const data = b.data ? normalizeBlockData(b.blockType, b.data as Record<string, unknown>) : b.data;
      blockRows.push({
        lesson_id: plan.lessonId,
        slide_id: slideId,
        institution_id: SCAGO_INSTITUTION_ID,
        block_type: b.blockType,
        title: b.title ?? null,
        order_index: b.orderIndex,
        is_visible: true,
        data,
      });
    }
  }
  if (blockRows.length) {
    const { error: blockErr } = await supabase.from('lesson_blocks').insert(blockRows);
    if (blockErr) throw new Error(`insert blocks: ${blockErr.message}`);
  }

  console.log(`  ✓ loaded ${slideRows.length} slides, ${blockRows.length} blocks`);
  if (plan.candidates?.length) console.log(`  ⚑ ${plan.candidates.length} interactive candidate(s) flagged`);
}

async function main() {
  const planPath = process.argv[2];
  const dry = process.argv.includes('--dry');
  if (!planPath) throw new Error('Usage: load-plan.ts <plan.json> [--dry]');
  const plan: Plan = JSON.parse(fs.readFileSync(planPath, 'utf8'));
  // Normalize planner key variants (agents emit mixed slide/block key names).
  for (const s of plan.slides ?? []) {
    const sx = s as PlanSlide & {
      slideOrderIndex?: number;
      slideIndex?: number;
      slideTitle?: string | null;
    };
    if (sx.orderIndex === undefined && sx.slideOrderIndex !== undefined) sx.orderIndex = sx.slideOrderIndex;
    if (sx.orderIndex === undefined && sx.slideIndex !== undefined) sx.orderIndex = sx.slideIndex;
    if (sx.title === undefined && sx.slideTitle !== undefined) sx.title = sx.slideTitle;
    for (const b of s.blocks ?? []) {
      const bx = b as PlanBlock & { blockType?: string; block_type?: string; order_index?: number };
      if (!bx.blockType && bx.block_type) bx.blockType = bx.block_type;
      if (bx.orderIndex === undefined && bx.order_index !== undefined) bx.orderIndex = bx.order_index;
    }
  }
  const { url, serviceKey } = loadEnv();
  const supabase = createClient(url, serviceKey);
  await loadPlan(supabase, plan, dry);
}

main().catch((e) => { console.error(e); process.exit(1); });
