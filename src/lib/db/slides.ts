import type { SupabaseClient } from '@supabase/supabase-js';
import type { Slide, SlideType, SlideStatus, SlideTemplate } from '@/types';
import { logActivity } from './activity-log';

export async function getSlidesByLesson(
  supabase: SupabaseClient,
  lessonId: string
): Promise<Slide[]> {
  const { data, error } = await supabase
    .from('slides')
    .select('*')
    .eq('lesson_id', lessonId)
    .is('deleted_at', null)
    .order('order_index', { ascending: true });

  if (error) throw error;
  return (data ?? []) as Slide[];
}

interface CreateSlideInput {
  lesson_id: string;
  slide_type: SlideType;
  title?: string;
  order_index: number;
  status?: SlideStatus;
  settings?: Record<string, unknown>;
  canvas_data?: Record<string, unknown> | null;
}

export async function createSlide(
  supabase: SupabaseClient,
  input: CreateSlideInput,
  institutionId: string,
  userId?: string,
): Promise<Slide> {
  const { data, error } = await supabase
    .from('slides')
    .insert({
      lesson_id: input.lesson_id,
      slide_type: input.slide_type,
      title: input.title ?? null,
      order_index: input.order_index,
      status: input.status ?? 'draft',
      settings: input.settings ?? {},
      canvas_data: input.canvas_data ?? null,
    })
    .select()
    .single();

  if (error) throw error;
  const slide = data as Slide;

  await logActivity(supabase, {
    institutionId,
    userId,
    entityType: 'slide',
    entityId: slide.id,
    action: 'create',
    changes: { lesson_id: input.lesson_id, slide_type: input.slide_type },
  });

  return slide;
}

export async function updateSlide(
  supabase: SupabaseClient,
  slideId: string,
  changes: Partial<Pick<Slide, 'title' | 'slide_type' | 'status' | 'settings' | 'order_index' | 'canvas_data'>>,
  institutionId: string,
  userId?: string,
): Promise<Slide> {
  const { data, error } = await supabase
    .from('slides')
    .update({ ...changes, updated_at: new Date().toISOString() })
    .eq('id', slideId)
    .select()
    .single();

  if (error) throw error;
  const slide = data as Slide;

  await logActivity(supabase, {
    institutionId,
    userId,
    entityType: 'slide',
    entityId: slideId,
    action: 'update',
    changes: changes as Record<string, unknown>,
  });

  return slide;
}

export async function deleteSlide(
  supabase: SupabaseClient,
  slideId: string,
  institutionId: string,
  userId?: string,
): Promise<void> {
  // Hard-delete the slide's blocks first. `lesson_blocks` has no deleted_at
  // column (hard delete only), so soft-deleting only the slide used to leave its
  // blocks behind as orphans — surfaced as "quizzes on deleted slides" in the
  // content-health panel. They can never render once the slide is gone, and a
  // deleted slide's content is not meant to survive it, so remove them together.
  const { error: blocksErr } = await supabase
    .from('lesson_blocks')
    .delete()
    .eq('slide_id', slideId);
  if (blocksErr) throw blocksErr;

  const { error } = await supabase
    .from('slides')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', slideId);

  if (error) throw error;

  await logActivity(supabase, {
    institutionId,
    userId,
    entityType: 'slide',
    entityId: slideId,
    action: 'delete',
  });
}

export async function reorderSlides(
  supabase: SupabaseClient,
  lessonId: string,
  slideIds: string[],
  institutionId: string,
  userId?: string,
): Promise<void> {
  const updates = slideIds.map((id, index) =>
    supabase
      .from('slides')
      .update({ order_index: index, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('lesson_id', lessonId)
  );

  const results = await Promise.all(updates);
  const firstError = results.find((r) => r.error)?.error;
  if (firstError) throw firstError;

  await logActivity(supabase, {
    institutionId,
    userId,
    entityType: 'slide',
    entityId: lessonId,
    action: 'reorder',
    changes: { slideIds },
  });
}

export async function moveSlideToLesson(
  supabase: SupabaseClient,
  slideId: string,
  fromLessonId: string,
  toLessonId: string,
  institutionId: string,
): Promise<{ success: boolean; error?: string }> {
  // 1. Get the target lesson's current max order_index
  const { data: targetSlides } = await supabase
    .from('slides')
    .select('order_index')
    .eq('lesson_id', toLessonId)
    .is('deleted_at', null)
    .order('order_index', { ascending: false })
    .limit(1);

  const nextIndex = (targetSlides?.[0]?.order_index ?? -1) + 1;

  // 2. Update the slide's lesson_id and order_index
  const { error } = await supabase
    .from('slides')
    .update({ lesson_id: toLessonId, order_index: nextIndex, updated_at: new Date().toISOString() })
    .eq('id', slideId);

  if (error) return { success: false, error: error.message };

  // 3. Reindex source lesson slides
  const { data: sourceSlides } = await supabase
    .from('slides')
    .select('id')
    .eq('lesson_id', fromLessonId)
    .is('deleted_at', null)
    .order('order_index', { ascending: true });

  if (sourceSlides && sourceSlides.length > 0) {
    await reorderSlides(supabase, fromLessonId, sourceSlides.map(s => s.id), institutionId);
  }

  // 4. Log activity — a cross-lesson move is an update of the slide's lesson_id.
  // (Was a raw insert into a non-existent `activity_log` table with an invalid
  // 'move' action and a `details` column — it silently failed every time.)
  await logActivity(supabase, {
    institutionId,
    entityType: 'slide',
    entityId: slideId,
    action: 'update',
    changes: { from_lesson_id: fromLessonId, to_lesson_id: toLessonId },
  });

  return { success: true };
}

/**
 * Duplicate a slide and all its blocks within the same lesson.
 * Returns the new slide and its cloned blocks.
 */
export async function duplicateSlide(
  supabase: SupabaseClient,
  slideId: string,
  lessonId: string,
  institutionId: string,
): Promise<{ slide: Slide; blocks: Array<{ id: string; slide_id: string; block_type: string; data: Record<string, unknown>; order_index: number; is_visible: boolean }> }> {
  // 1. Get the source slide
  const { data: sourceSlide, error: slideErr } = await supabase
    .from('slides')
    .select('*')
    .eq('id', slideId)
    .single();
  if (slideErr || !sourceSlide) throw slideErr || new Error('Slide not found');

  // 2. Get current max order_index in the lesson
  const { data: existingSlides } = await supabase
    .from('slides')
    .select('order_index')
    .eq('lesson_id', lessonId)
    .is('deleted_at', null)
    .order('order_index', { ascending: false })
    .limit(1);
  const nextIndex = (existingSlides?.[0]?.order_index ?? -1) + 1;

  // 3. Create the duplicate as a DRAFT — a copy is new content, so it stays hidden
  // from students until the admin publishes (editor Draft badges make it visible).
  const newSlide = await createSlide(supabase, {
    lesson_id: lessonId,
    slide_type: sourceSlide.slide_type,
    title: sourceSlide.title ? `${sourceSlide.title} (copy)` : undefined,
    order_index: nextIndex,
    status: 'draft',
    settings: sourceSlide.settings,
    canvas_data: sourceSlide.canvas_data,
  }, institutionId);

  // 4. Clone all blocks from the source slide
  const { data: sourceBlocks } = await supabase
    .from('lesson_blocks')
    .select('block_type, data, order_index, is_visible')
    .eq('slide_id', slideId)
    .order('order_index', { ascending: true });

  const clonedBlocks: Array<{ id: string; slide_id: string; block_type: string; data: Record<string, unknown>; order_index: number; is_visible: boolean }> = [];

  if (sourceBlocks && sourceBlocks.length > 0) {
    for (const block of sourceBlocks) {
      const { data: newBlock, error: blockErr } = await supabase
        .from('lesson_blocks')
        .insert({
          lesson_id: lessonId,
          slide_id: newSlide.id,
          block_type: block.block_type,
          data: JSON.parse(JSON.stringify(block.data)),
          order_index: block.order_index,
          institution_id: institutionId,
          is_visible: block.is_visible ?? true,
        })
        .select('id, slide_id, block_type, data, order_index, is_visible')
        .single();
      if (!blockErr && newBlock) {
        clonedBlocks.push(newBlock);
      }
    }
  }

  // 5. Move the copy to sit directly after its source (it was created at the end).
  // Reindexing the whole lesson keeps order_index gap-free and persists the position
  // so the duplicate stays put after a refresh.
  const { data: lessonSlides } = await supabase
    .from('slides')
    .select('id')
    .eq('lesson_id', lessonId)
    .is('deleted_at', null)
    .order('order_index', { ascending: true });
  if (lessonSlides && lessonSlides.length > 0) {
    const ordered = lessonSlides.map((s) => s.id).filter((id) => id !== newSlide.id);
    const srcPos = ordered.indexOf(slideId);
    const insertAt = srcPos >= 0 ? srcPos + 1 : ordered.length;
    ordered.splice(insertAt, 0, newSlide.id);
    await reorderSlides(supabase, lessonId, ordered, institutionId);
    newSlide.order_index = insertAt;
  }

  return { slide: newSlide, blocks: clonedBlocks };
}

export async function getSlideTemplates(
  supabase: SupabaseClient,
  institutionId?: string
): Promise<SlideTemplate[]> {
  const { data, error } = await supabase
    .from('slide_templates')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) throw error;
  const rows = (data ?? []) as SlideTemplate[];
  if (institutionId) {
    return rows.filter(
      (t) => t.institution_id === null || t.institution_id === institutionId
    );
  }
  return rows.filter((t) => t.institution_id === null);
}
