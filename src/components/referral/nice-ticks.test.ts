import { describe, it, expect } from 'vitest';
import { niceTicks } from './report-charts';

/**
 * The single most important property of the y-axis: its top tick must be at or
 * above the largest value plotted. When it is not, the series is drawn outside
 * the plot area and clipped, so the chart shows LESS than the data — a silent
 * wrong answer, which is worse than an ugly axis. (Regression: max 7 produced
 * a top tick of 6 and clipped the line.)
 */
describe('niceTicks', () => {
  it('always produces a top tick >= max', () => {
    for (let max = 1; max <= 500; max++) {
      const ticks = niceTicks(max);
      const top = ticks[ticks.length - 1];
      expect(top, `max ${max} produced top tick ${top}`).toBeGreaterThanOrEqual(max);
    }
  });

  it('covers the specific case that was clipping the chart', () => {
    const ticks = niceTicks(7);
    expect(ticks[ticks.length - 1]).toBeGreaterThanOrEqual(7);
    expect(ticks).toEqual([0, 2, 4, 6, 8]);
  });

  it('starts at zero so bar and line baselines are honest', () => {
    for (const max of [1, 3, 7, 12, 99, 226, 1234]) {
      expect(niceTicks(max)[0]).toBe(0);
    }
  });

  it('produces ascending, evenly spaced, unique ticks', () => {
    for (const max of [1, 5, 7, 26, 99, 226, 5000]) {
      const ticks = niceTicks(max);
      expect(new Set(ticks).size).toBe(ticks.length);
      const step = ticks[1] - ticks[0];
      for (let i = 1; i < ticks.length; i++) {
        expect(ticks[i]).toBeGreaterThan(ticks[i - 1]);
        expect(ticks[i] - ticks[i - 1]).toBeCloseTo(step, 6);
      }
    }
  });

  it('keeps the tick count reasonable — never a wall of gridlines', () => {
    for (let max = 1; max <= 2000; max++) {
      const n = niceTicks(max).length;
      expect(n, `max ${max} produced ${n} ticks`).toBeGreaterThanOrEqual(2);
      expect(n, `max ${max} produced ${n} ticks`).toBeLessThanOrEqual(9);
    }
  });

  it('uses round numbers a reader can read off the axis', () => {
    // Every tick should be an integer for integer-scale data.
    for (const max of [3, 7, 26, 226, 1234]) {
      for (const t of niceTicks(max)) expect(Number.isInteger(t)).toBe(true);
    }
  });

  it('handles a flat all-zero series without collapsing the axis', () => {
    expect(niceTicks(0)).toEqual([0, 1]);
    expect(niceTicks(-5)).toEqual([0, 1]);
  });
});
