import type { SupabaseClient } from '@supabase/supabase-js';

export type ActivityEntityType = 'course' | 'module' | 'lesson' | 'slide' | 'block';
export type ActivityAction = 'create' | 'update' | 'delete' | 'publish' | 'reorder';

/**
 * The `content_activity_log.action` CHECK constraint stores PAST-TENSE values
 * ('created', 'updated', …). Callers use the present-tense imperative API
 * ('create', 'update', …); this map bridges the two. Sending the present-tense
 * value directly violates `content_activity_log_action_check` (error 23514) and
 * floods the console — every editor save would fail to log.
 */
const ACTION_DB_VALUE: Record<ActivityAction, string> = {
  create: 'created',
  update: 'updated',
  delete: 'deleted',
  publish: 'published',
  reorder: 'reordered',
};

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
      action: ACTION_DB_VALUE[input.action] ?? input.action,
      changes: input.changes ?? {},
    });

    if (error) {
      console.warn('[logActivity] Failed to insert activity log entry:', error);
    }
  } catch (err) {
    console.warn('[logActivity] Unexpected error inserting activity log:', err);
  }
}
