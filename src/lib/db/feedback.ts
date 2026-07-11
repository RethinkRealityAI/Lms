import type { SupabaseClient } from '@supabase/supabase-js';
import type { FeedbackType, FeedbackStatus, FeedbackContext } from '@/lib/content/feedback-taxonomy';

export interface FeedbackSubmission {
  id: string;
  type: FeedbackType;
  category: string | null;
  name: string | null;
  email: string | null;
  subject: string | null;
  message: string;
  user_id: string | null;
  institution_id: string | null;
  context: FeedbackContext;
  status: FeedbackStatus;
  created_at: string;
}

export interface FeedbackFilter {
  /** Restrict to these types (omit for all). */
  types?: FeedbackType[];
  /** Restrict to a single status (omit for all). */
  status?: FeedbackStatus;
}

/** Institution-scoped feedback list for the admin hub, newest first. */
export async function listFeedback(
  supabase: SupabaseClient,
  institutionId: string,
  filter: FeedbackFilter = {},
): Promise<FeedbackSubmission[]> {
  let query = supabase
    .from('feedback_submissions')
    .select('*')
    .eq('institution_id', institutionId)
    .order('created_at', { ascending: false });

  if (filter.types && filter.types.length > 0) query = query.in('type', filter.types);
  if (filter.status) query = query.eq('status', filter.status);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as FeedbackSubmission[];
}

export async function updateFeedbackStatus(
  supabase: SupabaseClient,
  id: string,
  status: FeedbackStatus,
): Promise<void> {
  // .select('id') so an RLS-filtered 0-row update surfaces as an error instead of a
  // silent no-op the optimistic UI would report as success (Engineering Rule 25).
  const { data, error } = await supabase
    .from('feedback_submissions')
    .update({ status })
    .eq('id', id)
    .select('id');
  if (error) throw error;
  if (!data || data.length === 0) throw new Error('Status update affected 0 rows (permission denied or not found)');
}

export async function deleteFeedback(supabase: SupabaseClient, id: string): Promise<void> {
  const { error } = await supabase.from('feedback_submissions').delete().eq('id', id);
  if (error) throw error;
}
