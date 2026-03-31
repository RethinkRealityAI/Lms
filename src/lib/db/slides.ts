import type { SupabaseClient } from '@supabase/supabase-js';
import type { Slide, SlideType, SlideStatus } from '@/types';
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
  changes: Partial<Pick<Slide, 'title' | 'slide_type' | 'status' | 'settings' | 'order_index'>>,
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

  await Promise.all(updates);

  await logActivity(supabase, {
    institutionId,
    userId,
    entityType: 'slide',
    entityId: lessonId,
    action: 'reorder',
    changes: { slideIds },
  });
}

export async function getSlideTemplates(
  supabase: SupabaseClient,
  institutionId?: string
) {
  let query = supabase
    .from('slide_templates')
    .select('*');

  if (institutionId) {
    query = (query as any).or(`institution_id.is.null,institution_id.eq.${institutionId}`);
  } else {
    query = (query as any).is('institution_id', null);
  }

  const { data, error } = await (query as any).order('name');
  if (error) throw error;
  return data ?? [];
}
