import { describe, it, expect } from 'vitest';
import { bucketSeries, type SeriesPoint } from './report-charts';

function series(days: number, from = '2026-01-01'): SeriesPoint[] {
  const start = new Date(`${from}T00:00:00Z`);
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(start.getTime() + i * 86400000);
    return { day: d.toISOString().slice(0, 10), visits: 1, signups: 2 };
  });
}

function total(points: SeriesPoint[], key: 'visits' | 'signups'): number {
  return points.reduce((sum, p) => sum + p[key], 0);
}

describe('bucketSeries', () => {
  it('leaves short ranges at daily granularity', () => {
    const input = series(90);
    const out = bucketSeries(input);
    expect(out.granularity).toBe('day');
    expect(out.points).toHaveLength(90);
  });

  it('switches to weekly past the daily threshold', () => {
    const out = bucketSeries(series(120));
    expect(out.granularity).toBe('week');
    // 120 days spans 18 Monday-anchored weeks (partial weeks at each end).
    expect(out.points.length).toBeLessThan(25);
    expect(out.points.length).toBeGreaterThan(15);
  });

  it('switches to monthly for very long ranges', () => {
    const out = bucketSeries(series(500));
    expect(out.granularity).toBe('month');
    expect(out.points.length).toBeLessThanOrEqual(18);
  });

  it('conserves totals when bucketing — the chart must not invent or lose data', () => {
    for (const days of [120, 400, 500, 731]) {
      const input = series(days);
      const out = bucketSeries(input);
      expect(total(out.points, 'visits'), `${days}d visits`).toBe(total(input, 'visits'));
      expect(total(out.points, 'signups'), `${days}d signups`).toBe(total(input, 'signups'));
    }
  });

  it('returns buckets in ascending date order', () => {
    const out = bucketSeries(series(400));
    const days = out.points.map((p) => p.day);
    expect([...days].sort()).toEqual(days);
  });

  it('does not mutate the caller’s array', () => {
    const input = series(120);
    const snapshot = JSON.parse(JSON.stringify(input));
    bucketSeries(input);
    expect(input).toEqual(snapshot);
  });

  it('handles an empty series', () => {
    const out = bucketSeries([]);
    expect(out.points).toEqual([]);
    expect(out.granularity).toBe('day');
  });

  it('anchors weekly buckets to Monday', () => {
    // 2026-01-01 is a Thursday; its bucket must be Monday 2025-12-29.
    const out = bucketSeries(series(120, '2026-01-01'));
    expect(out.points[0].day).toBe('2025-12-29');
  });

  it('anchors monthly buckets to the first of the month', () => {
    const out = bucketSeries(series(500, '2026-01-15'));
    expect(out.points[0].day).toBe('2026-01-01');
    for (const p of out.points) expect(p.day.endsWith('-01')).toBe(true);
  });
});
