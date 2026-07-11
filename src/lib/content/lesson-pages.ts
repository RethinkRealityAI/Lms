import type { LessonBlock } from '@/types';
import { sortBlocksByGrid } from './lesson-blocks';

/** Slide render settings (background, per-slide overrides). Mirrors the viewer's local shape. */
export interface SlideSettings {
  background?: string;
  background_image?: string;
  [key: string]: unknown;
}

/**
 * Slide metadata as the student viewer holds it — ALREADY filtered to what the
 * student may see (published + non-deleted), because it is sourced from the
 * RLS-restricted `slides` SELECT. A hidden (draft/soft-deleted) slide is simply
 * absent from this list.
 */
export interface VisibleSlideMeta {
  id: string;
  order_index: number;
  title?: string | null;
  settings?: SlideSettings;
  slide_type?: string;
  canvas_data?: Record<string, unknown> | null;
}

export interface LessonPage {
  kind: 'page';
  slideId: string;
  slideTitle?: string | null;
  blocks: LessonBlock[];
  settings?: SlideSettings;
  slideType?: string;
  canvasData?: Record<string, unknown> | null;
}

const NO_SLIDE = '__no_slide__';

/**
 * Build the ordered, student-VISIBLE content pages for a lesson.
 *
 * `visibleSlides` is the RLS-filtered slide set (drafts/soft-deletes already
 * excluded). `allBlocks` is the FULL block list for the lesson — `lesson_blocks`
 * is world-readable ("Anyone can read"), so it still contains blocks that belong
 * to hidden slides; those must NOT render.
 *
 * Rules:
 *  - **Slide-model lesson** (any block carries a `slide_id`): render ONLY blocks
 *    whose `slide_id` is in `visibleSlides`. Blocks on hidden slides are dropped
 *    — even when EVERY slide is hidden, in which case this returns NO pages
 *    (the caller shows title + completion only). This is the fix for the leak
 *    where an all-draft/all-deleted lesson used to dump its entire block list.
 *    Truly slide-less blocks (legacy `slide_id === null`) still render as a
 *    trailing page, since there is no slide to hide them behind.
 *  - **Pure legacy lesson** (no block carries a `slide_id`): there is no slide
 *    visibility model to honour, so render all blocks as a single page.
 *  - **No blocks at all**: returns `[]` (caller decides on a synthesized page).
 *
 * The set of quiz blocks that end up here is EXACTLY the set the completion gate
 * (getGatingQuizBlockIds) and the `issue_course_certificate` RPC treat as gating
 * — a quiz gates iff it is on a visible slide, or is a slide-less legacy block.
 * Keep this in lockstep with that RPC's `gating_blocks` visibility clause.
 */
export function buildLessonPages(
  visibleSlides: VisibleSlideMeta[],
  allBlocks: LessonBlock[],
): LessonPage[] {
  const usesSlideModel = allBlocks.some((b) => b.slide_id);

  if (usesSlideModel) {
    const blocksBySlide: Record<string, LessonBlock[]> = {};
    for (const block of allBlocks) {
      const sid = block.slide_id ?? NO_SLIDE;
      (blocksBySlide[sid] ??= []).push(block);
    }

    const sorted = [...visibleSlides].sort((a, b) => a.order_index - b.order_index);
    const pages: LessonPage[] = sorted
      .filter((s) => s.slide_type === 'canvas' || (blocksBySlide[s.id]?.length ?? 0) > 0)
      .map((s) => ({
        kind: 'page' as const,
        slideId: s.id,
        slideTitle: s.title,
        blocks: sortBlocksByGrid(blocksBySlide[s.id] ?? []),
        settings: s.settings,
        slideType: s.slide_type,
        canvasData: s.canvas_data,
      }));

    // Legacy slide-less blocks mixed into a slide-model lesson still render.
    if (blocksBySlide[NO_SLIDE]?.length) {
      pages.push({ kind: 'page' as const, slideId: '', blocks: sortBlocksByGrid(blocksBySlide[NO_SLIDE]) });
    }
    return pages;
  }

  if (allBlocks.length > 0) {
    // No block references a slide — pure legacy lesson; nothing to hide.
    return [{ kind: 'page' as const, slideId: '', blocks: sortBlocksByGrid(allBlocks) }];
  }

  return [];
}
