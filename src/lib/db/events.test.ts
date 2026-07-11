import { describe, it, expect, vi } from 'vitest';
import { getEventCounts } from './events';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Regression tests for the legacy-import analytics exclusion (migration 047):
 * a legacy-profile claim replays years of EdApp history in one transaction,
 * tagging every generated event payload.source = 'legacy_import'. getEventCounts
 * must EXCLUDE those rows or the dashboard shows phantom completion/enrollment
 * spikes (and inflated active-user counts) on the day a heavy user claims.
 */

interface EventRow {
  event_type: string;
  user_id: string | null;
  created_at: string;
  source: string | null;
}

function mockEventCountsClient(rows: EventRow[], error: Error | null = null) {
  const limit = vi.fn().mockResolvedValue({ data: rows, error });
  const gte = vi.fn().mockReturnValue({ limit });
  const eq = vi.fn().mockReturnValue({ gte });
  const select = vi.fn().mockReturnValue({ eq });
  const from = vi.fn((table: string) => {
    if (table !== 'analytics_events') throw new Error(`unexpected table ${table}`);
    return { select };
  });
  return { sb: { from } as unknown as SupabaseClient, from, select, eq, gte, limit };
}

describe('getEventCounts', () => {
  const rows: EventRow[] = [
    // Organic activity by user-a
    { event_type: 'sign_in', user_id: 'user-a', created_at: '2026-07-01T10:00:00Z', source: null },
    { event_type: 'lesson_completed', user_id: 'user-a', created_at: '2026-07-01T11:00:00Z', source: null },
    // user-b signs in organically the same day...
    { event_type: 'sign_in', user_id: 'user-b', created_at: '2026-07-01T12:00:00Z', source: null },
    // ...but user-b's legacy claim also replays a tagged sign_in + completions
    { event_type: 'sign_in', user_id: 'user-b', created_at: '2026-07-02T09:00:00Z', source: 'legacy_import' },
    { event_type: 'lesson_completed', user_id: 'user-b', created_at: '2026-07-02T09:00:01Z', source: 'legacy_import' },
    { event_type: 'certificate_issued', user_id: 'user-b', created_at: '2026-07-02T09:00:02Z', source: 'legacy_import' },
    // user-c's ONLY events are the legacy-claim burst
    { event_type: 'lesson_completed', user_id: 'user-c', created_at: '2026-07-02T09:05:00Z', source: 'legacy_import' },
    { event_type: 'enrolled', user_id: 'user-c', created_at: '2026-07-02T09:05:01Z', source: 'legacy_import' },
  ];

  it('excludes legacy_import rows from byType counts', async () => {
    const { sb } = mockEventCountsClient(rows);
    const counts = await getEventCounts(sb, 'inst-1');

    expect(counts.byType).toEqual({
      sign_in: 2, // user-a + user-b organic only — tagged sign_in not counted
      lesson_completed: 1, // user-a only
    });
    // The legacy burst's event types never appear at all
    expect(counts.byType.certificate_issued).toBeUndefined();
    expect(counts.byType.enrolled).toBeUndefined();
  });

  it('excludes users whose only events are legacy-tagged from activeUsers', async () => {
    const { sb } = mockEventCountsClient(rows);
    const counts = await getEventCounts(sb, 'inst-1');

    // user-a and user-b have organic events; user-c only has legacy_import rows
    expect(counts.activeUsers).toBe(2);
  });

  it('excludes tagged sign_ins from the per-day sign-in counts', async () => {
    const { sb } = mockEventCountsClient(rows);
    const counts = await getEventCounts(sb, 'inst-1');

    expect(counts.signInsByDay).toEqual({
      '2026-07-01': 2, // user-a + user-b organic sign-ins
      // 2026-07-02 absent entirely: its only sign_in was legacy-tagged
    });
    expect(counts.signInsByDay['2026-07-02']).toBeUndefined();
  });

  it('selects the payload source alias so the exclusion can actually work', async () => {
    const { sb, from, select, eq, gte, limit } = mockEventCountsClient(rows);
    await getEventCounts(sb, 'inst-1', 30);

    expect(from).toHaveBeenCalledWith('analytics_events');
    expect(select).toHaveBeenCalledWith(expect.stringContaining('source:payload->>source'));
    expect(eq).toHaveBeenCalledWith('institution_id', 'inst-1');
    expect(gte).toHaveBeenCalledWith('created_at', expect.any(String));
    expect(limit).toHaveBeenCalledWith(10000);
  });

  it('counts distinct users (not events) per sign-in day', async () => {
    const { sb } = mockEventCountsClient([
      { event_type: 'sign_in', user_id: 'user-a', created_at: '2026-07-03T08:00:00Z', source: null },
      { event_type: 'sign_in', user_id: 'user-a', created_at: '2026-07-03T18:00:00Z', source: null },
    ]);
    const counts = await getEventCounts(sb, 'inst-1');
    expect(counts.signInsByDay).toEqual({ '2026-07-03': 1 });
  });

  it('throws when the query errors', async () => {
    const { sb } = mockEventCountsClient([], new Error('RLS denied'));
    await expect(getEventCounts(sb, 'inst-1')).rejects.toThrow('RLS denied');
  });
});
