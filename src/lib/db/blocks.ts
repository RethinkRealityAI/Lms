import type { SupabaseClient } from '@supabase/supabase-js';

export interface CreateBlockInput {
  lesson_id: string;
  slide_id: string;
  block_type: string;
  data: Record<string, unknown>;
  order_index: number;
  institution_id: string;
  is_visible?: boolean;
}

export async function createBlock(
  supabase: SupabaseClient,
  input: CreateBlockInput,
): Promise<{
  id: string;
  slide_id: string;
  block_type: string;
  data: Record<string, unknown>;
  order_index: number;
  is_visible: boolean;
}> {
  const { data, error } = await supabase
    .from('lesson_blocks')
    .insert({
      lesson_id: input.lesson_id,
      slide_id: input.slide_id,
      block_type: input.block_type,
      data: input.data,
      order_index: input.order_index,
      institution_id: input.institution_id,
      is_visible: input.is_visible ?? true,
    })
    .select('id, slide_id, block_type, data, order_index, is_visible')
    .single();

  if (error) throw error;
  return data;
}

export interface UpdateBlockInput {
  data?: Record<string, unknown>;
  title?: string;
  order_index?: number;
  slide_id?: string;
}

export async function updateBlock(
  supabase: SupabaseClient,
  blockId: string,
  input: UpdateBlockInput,
  // institutionId is acknowledged; RLS enforces institution isolation at the DB layer
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _institutionId: string,
): Promise<void> {
  const payload: Record<string, unknown> = {};
  if (input.data !== undefined) payload.data = input.data;
  if (input.title !== undefined) payload.title = input.title;
  if (input.order_index !== undefined) payload.order_index = input.order_index;
  if (input.slide_id !== undefined) payload.slide_id = input.slide_id;

  const { error } = await supabase
    .from('lesson_blocks')
    .update(payload)
    .eq('id', blockId);

  if (error) throw error;
}

export async function deleteBlock(
  supabase: SupabaseClient,
  blockId: string,
): Promise<void> {
  // lesson_blocks has no deleted_at column — hard delete
  // RLS enforces institution isolation
  const { error } = await supabase
    .from('lesson_blocks')
    .delete()
    .eq('id', blockId);

  if (error) throw error;
}

export async function duplicateBlock(
  supabase: SupabaseClient,
  sourceBlock: { id: string; slide_id: string; block_type: string; data: Record<string, unknown>; order_index: number },
  lessonId: string,
  institutionId: string,
  targetSlideId?: string,
  targetLessonId?: string,
): Promise<{
  id: string;
  slide_id: string;
  block_type: string;
  data: Record<string, unknown>;
  order_index: number;
  is_visible: boolean;
}> {
  const newData = JSON.parse(JSON.stringify(sourceBlock.data));

  const isSameSlide = !targetSlideId || targetSlideId === sourceBlock.slide_id;
  if (isSameSlide && typeof newData.gridY === 'number' && typeof newData.gridH === 'number') {
    newData.gridY = newData.gridY + newData.gridH;
  } else if (!isSameSlide) {
    newData.gridX = 0;
    newData.gridY = 0;
    newData.gridW = 12;
    newData.gridH = 6;
  }

  return createBlock(supabase, {
    lesson_id: targetLessonId || lessonId,
    slide_id: targetSlideId || sourceBlock.slide_id,
    block_type: sourceBlock.block_type,
    data: newData,
    order_index: isSameSlide ? sourceBlock.order_index + 1 : 999,
    institution_id: institutionId,
  });
}
