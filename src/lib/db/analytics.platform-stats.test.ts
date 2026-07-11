import { describe, it, expect, vi } from 'vitest';
import { getPlatformStats } from './analytics';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Regression tests for the analytics "review rating shown as quiz score" bug:
 * getPlatformStats used to average course_reviews.rating as avg_quiz_score,
 * read quiz counts from the empty legacy quiz_attempts table, and count
 * users.updated_at (profile edits!) as monthly activity. The fix sources quiz
 * stats from quiz_block_responses (what course content actually writes) and
 * MAU from distinct analytics_events user_ids.
 */

interface StubResult {
  data?: unknown;
  error?: unknown;
  count?: number | null;
}

function mockPlatformStatsClient(resultsByTable: Record<string, StubResult[]>) {
  // Clone the queues so each test gets fresh state.
  const queues: Record<string, StubResult[]> = Object.fromEntries(
    Object.entries(resultsByTable).map(([t, arr]) => [t, [...arr]]),
  );
  const fromCalls: string[] = [];
  const selectCalls: Array<{ table: string; args: unknown[] }> = [];

  const from = vi.fn((table: string) => {
    fromCalls.push(table);
    const queue = queues[table];
    if (!queue || queue.length === 0) {
      throw new Error(`unexpected query against table "${table}"`);
    }
    const result = queue.shift() as StubResult;

    // Generic thenable builder chain: every filter/modifier returns the chain,
    // awaiting it resolves to the stubbed result.
    const chain: Record<string, unknown> = {};
    chain.select = vi.fn((...args: unknown[]) => {
      selectCalls.push({ table, args });
      return chain;
    });
    for (const m of ['eq', 'in', 'is', 'gte', 'not', 'limit', 'order']) {
      chain[m] = vi.fn(() => chain);
    }
    chain.then = (
      resolve: (v: StubResult) => unknown,
      reject?: (e: unknown) => unknown,
    ) => Promise.resolve(result).then(resolve, reject);
    return chain;
  });

  return { sb: { from } as unknown as SupabaseClient, from, fromCalls, selectCalls };
}

const headCount = (count: number): StubResult => ({ count, data: null, error: null });

function defaultResults(): Record<string, StubResult[]> {
  return {
    // getCourseStats is called once — stub the view to return no courses.
    v_course_stats: [{ data: [], error: null }],
    // users total, students, admins (in call order)
    users: [headCount(100), headCount(90), headCount(10)],
    certificates: [headCount(5)],
    course_enrollments: [headCount(50)],
    progress: [headCount(20)],
    // quiz_block_responses: total answers, then correct answers
    quiz_block_responses: [headCount(40), headCount(30)],
    analytics_events: [
      {
        data: [{ user_id: 'u1' }, { user_id: 'u2' }, { user_id: 'u1' }],
        error: null,
      },
    ],
  };
}

describe('getPlatformStats', () => {
  it('sources quiz stats from quiz_block_responses — never quiz_attempts or course_reviews', async () => {
    const { sb, fromCalls } = mockPlatformStatsClient(defaultResults());
    await getPlatformStats(sb, 'inst-1');

    expect(fromCalls.filter((t) => t === 'quiz_block_responses')).toHaveLength(2);
    // The two buggy sources must never be queried at all.
    expect(fromCalls).not.toContain('quiz_attempts');
    expect(fromCalls).not.toContain('course_reviews');
  });

  it('computes avg_quiz_score as correct/total*100 from the two head-counts', async () => {
    const { sb } = mockPlatformStatsClient(defaultResults());
    const stats = await getPlatformStats(sb, 'inst-1');

    expect(stats?.total_quiz_attempts).toBe(40);
    expect(stats?.avg_quiz_score).toBe((30 / 40) * 100); // 75 — an answer rate, not a review rating
  });

  it('returns 0 avg_quiz_score when there are no quiz responses (no divide-by-zero)', async () => {
    const results = defaultResults();
    results.quiz_block_responses = [headCount(0), headCount(0)];
    const { sb } = mockPlatformStatsClient(results);
    const stats = await getPlatformStats(sb, 'inst-1');

    expect(stats?.total_quiz_attempts).toBe(0);
    expect(stats?.avg_quiz_score).toBe(0);
  });

  it('derives monthly_active_users from DISTINCT analytics_events user ids', async () => {
    const { sb, fromCalls } = mockPlatformStatsClient(defaultResults());
    const stats = await getPlatformStats(sb, 'inst-1');

    // 3 event rows but only 2 distinct users; users.updated_at plays no part.
    expect(stats?.monthly_active_users).toBe(2);
    expect(fromCalls).toContain('analytics_events');
  });

  it('uses exact head-counts for course_enrollments and progress totals', async () => {
    const { sb, selectCalls } = mockPlatformStatsClient(defaultResults());
    const stats = await getPlatformStats(sb, 'inst-1');

    const enrollSelect = selectCalls.find((c) => c.table === 'course_enrollments');
    expect(enrollSelect?.args[1]).toEqual({ count: 'exact', head: true });

    const progressSelect = selectCalls.find((c) => c.table === 'progress');
    expect(progressSelect?.args[1]).toEqual({ count: 'exact', head: true });

    // The counts flow straight into the reported totals.
    expect(stats?.total_enrollments).toBe(50);
    expect(stats?.total_completions).toBe(20);
  });

  it('reports the remaining head-count totals and course-view aggregates', async () => {
    const { sb, selectCalls } = mockPlatformStatsClient(defaultResults());
    const stats = await getPlatformStats(sb, 'inst-1');

    expect(stats?.total_users).toBe(100);
    expect(stats?.total_students).toBe(90);
    expect(stats?.total_admins).toBe(10);
    expect(stats?.total_certificates).toBe(5);
    expect(stats?.total_courses).toBe(0); // empty v_course_stats stub
    expect(stats?.published_courses).toBe(0);

    // The quiz counts are also exact head-counts (not fetched rows).
    const quizSelects = selectCalls.filter((c) => c.table === 'quiz_block_responses');
    expect(quizSelects).toHaveLength(2);
    for (const c of quizSelects) {
      expect(c.args[1]).toEqual({ count: 'exact', head: true });
    }
  });
});
