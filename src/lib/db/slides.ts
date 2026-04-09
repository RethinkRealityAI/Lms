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

  // 4. Log activity
  await supabase.from('activity_log').insert({
    institution_id: institutionId,
    entity_type: 'slide',
    entity_id: slideId,
    action: 'move',
    details: { from_lesson_id: fromLessonId, to_lesson_id: toLessonId },
  });

  return { success: true };
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
