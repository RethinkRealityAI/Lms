import type { SupabaseClient } from '@supabase/supabase-js';

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
