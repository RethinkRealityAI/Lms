import type { SupabaseClient } from '@supabase/supabase-js';

export type ActivityEntityType = 'course' | 'module' | 'lesson' | 'slide' | 'block';
export type ActivityAction = 'create' | 'update' | 'delete' | 'publish' | 'reorder';

export interface LogActivityInput {
  institutionId: string;
  userId?: string;
  entityType: ActivityEntityType;
  entityId: string;
  action: ActivityAction;
  changes?: Record<string, unknown>;
}

export async function logActivity(
  supabase: SupabaseClient,
  input: LogActivityInput,
): Promise<void> {
  try {
    const { error } = await supabase.from('content_activity_log').insert({
      institution_id: input.institutionId,
      user_id: input.userId ?? null,
      entity_type: input.entityType,
      entity_id: input.entityId,
      action: input.action,
      changes: input.changes ?? {},
    });

    if (error) {
      console.warn('[logActivity] Failed to insert activity log entry:', error);
    }
  } catch (err) {
    console.warn('[logActivity] Unexpected error inserting activity log:', err);
  }
}
