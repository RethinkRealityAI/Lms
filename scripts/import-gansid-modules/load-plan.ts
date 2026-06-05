/**
 * Load a lesson slide-plan JSON into the database (idempotent per lesson).
 *
 * Usage:
 *   npx tsx scripts/import-gansid-modules/load-plan.ts <plan.json> [--dry]
 *
 * Behaviour:
 *   - Updates the existing lesson row's description + title_slide_settings (lesson row is KEPT).
 *   - HARD-deletes all lesson_blocks then all slides for that lesson (clean rebuild).
 *   - Inserts the plan's slides, then its blocks (blocks reference the new slide ids).
 *
 * Uses SUPABASE_SERVICE_ROLE_KEY from .env.local (bypasses RLS).
 *
 * Plan JSON shape (the PLAN/LOAD contract):
 * {
 *   "lessonId": "uuid",
 *   "lessonOrderIndex": 5,
 *   "lessonTitle": "Recruitment",
 *   "lessonDescription": "string | null",
 *   "titleSlideSettings": { ... } | null,          // optional, merged into lessons.title_slide_settings
 *   "slides": [
 *     {
 *       "orderIndex": 0,
 *       "slideType": "content|media|quiz|disclaimer|interactive|title",
 *       "title": "string | null",
 *       "status": "published",                       // optional, default 'published'
 *       "settings": { "background": "#FFFFFF", "block_style": "glass", ... },
 *       "blocks": [
 *         { "orderIndex": 0, "blockType": "rich_text", "title": null, "data": { ...schema..., gridX,gridY,gridW,gridH } }
 *       ]
 *     }
 *   ],
 *   "candidates": [ { "slideOrderIndex": 1, "suggestion": "...", "reason": "..." } ]
 * }
 */
import fs from 'fs';
import path from 'path';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { normalizeTableData } from '../../src/lib/content/blocks/table/normalize';
import type { TableData } from '../../src/lib/content/blocks/table/schema';

const GANSID_INSTITUTION_ID = '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a';
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
      // Image URLs must be absolute
      const json = JSON.stringify(b.data);
      const relImg = json.match(/"(url|image_url|background_image)":\s*"(?!https?:\/\/|data:)[^"]+"/);
      if (relImg) errs.push(`slide ${s.orderIndex} block ${b.orderIndex}: non-absolute media url -> ${relImg[0]}`);
      // quiz multiple_choice answer must be in options
      if (b.blockType === 'quiz_inline') {
        const d = b.data as Record<string, unknown>;
        if ((d.question_type === 'multiple_choice' || d.question_type === 'true_false')) {
          const opts = (d.options as string[]) ?? [];
          if (typeof d.correct_answer === 'string' && !opts.includes(d.correct_answer))
            errs.push(`slide ${s.orderIndex} block ${b.orderIndex}: correct_answer not in options`);
        }
        // Single-feedback rule: the redundant `explanation` field is forbidden (renders a 2nd box)
        if ('explanation' in d && d.explanation)
          errs.push(`slide ${s.orderIndex} block ${b.orderIndex}: quiz has forbidden 'explanation' field (use single feedback_correct only)`);
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

function normalizeBlockData(blockType: string, data: Record<string, unknown>): Record<string, unknown> {
  if (blockType === 'image_gallery') return normalizeImageGalleryData(data);
  if (blockType === 'table') return normalizeTableData(data as TableData) as Record<string, unknown>;
  return data;
}

async function loadPlan(supabase: SupabaseClient, plan: Plan, dry: boolean) {
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
        institution_id: GANSID_INSTITUTION_ID,
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
