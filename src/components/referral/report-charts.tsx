'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  SERIES_COLORS,
  FUNNEL_RAMP,
  CHART_INK,
  hasMeaningfulConversion,
  type FunnelStep,
} from '@/lib/referral/constants';

/**
 * Hand-rolled SVG charts for the referral report.
 *
 * No charting dependency on purpose: this page is public, is opened on hospital
 * wifi, and has to print cleanly to PDF. Inline SVG gives full control over the
 * print stylesheet and adds nothing to the bundle.
 *
 * Colours come from the validated palette in referral/constants — categorical
 * slots 1 & 2 for the two-series chart, the ordinal blue ramp for the funnel.
 * Do not substitute hexes by eye.
 */

/* ------------------------------------------------------------------ */
/* Sizing                                                              */
/* ------------------------------------------------------------------ */

/**
 * Render at real pixel width so stroke widths and type never scale-distort.
 *
 * Starts at 0 and the caller renders no SVG until it has a real measurement.
 * A non-zero initial guess would paint an over-wide SVG that widens the very
 * element being measured, and the observer would then latch onto that inflated
 * width — the page ends up permanently wider than the viewport.
 */
function useContainerWidth<T extends HTMLElement>(): [React.RefObject<T | null>, number] {
  const ref = useRef<T | null>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setWidth(el.clientWidth);
    update();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return [ref, width];
}

/**
 * Round y-axis ticks, with the top tick guaranteed to be >= max.
 *
 * The obvious `for (v = 0; v <= max; v += step)` loop stops BELOW max whenever
 * max is not a multiple of step (max 7, step 2 → top tick 6), and the series
 * then draws outside the plot and gets clipped — the chart silently shows less
 * than the data. The axis top is computed by rounding up instead.
 */
export function niceTicks(max: number, count = 4): number[] {
  if (max <= 0) return [0, 1];
  const rawStep = max / count;
  const mag = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const norm = rawStep / mag;
  const step = (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10) * mag;
  const top = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let v = 0; v <= top + step * 0.001; v += step) {
    ticks.push(Math.round(v * 1e6) / 1e6);
  }
  return ticks;
}

const fmt = new Intl.NumberFormat('en-CA');

function formatDay(iso: string, withYear = false): string {
  const d = new Date(`${iso}T00:00:00Z`);
  return d.toLocaleDateString('en-CA', {
    month: 'short',
    day: 'numeric',
    ...(withYear ? { year: 'numeric' } : {}),
    timeZone: 'UTC',
  });
}

/* ------------------------------------------------------------------ */
/* Time series                                                         */
/* ------------------------------------------------------------------ */

export interface SeriesPoint {
  day: string;
  visits: number;
  signups: number;
}

/**
 * Long ranges are bucketed to weeks/months before plotting. A 365-point daily
 * line on a 700px canvas is 2px per point — unreadable, and it hides the
 * pattern the reader came for.
 */
export function bucketSeries(points: SeriesPoint[]): {
  points: SeriesPoint[];
  granularity: 'day' | 'week' | 'month';
} {
  if (points.length <= 92) return { points, granularity: 'day' };

  const granularity: 'week' | 'month' = points.length <= 400 ? 'week' : 'month';
  const buckets = new Map<string, SeriesPoint>();

  for (const p of points) {
    const d = new Date(`${p.day}T00:00:00Z`);
    let key: string;
    if (granularity === 'week') {
      // Monday-anchored week.
      const dow = (d.getUTCDay() + 6) % 7;
      d.setUTCDate(d.getUTCDate() - dow);
      key = d.toISOString().slice(0, 10);
    } else {
      key = `${d.toISOString().slice(0, 7)}-01`;
    }
    const existing = buckets.get(key);
    if (existing) {
      existing.visits += p.visits;
      existing.signups += p.signups;
    } else {
      buckets.set(key, { day: key, visits: p.visits, signups: p.signups });
    }
  }

  return {
    points: [...buckets.values()].sort((a, b) => a.day.localeCompare(b.day)),
    granularity,
  };
}

interface TimeSeriesProps {
  data: SeriesPoint[];
  /** Rendered above the plot; also the accessible name. */
  title: string;
}

export function TimeSeriesChart({ data, title }: TimeSeriesProps) {
  const [ref, width] = useContainerWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);

  const { points, granularity } = useMemo(() => bucketSeries(data), [data]);

  const height = 260;
  const pad = { top: 16, right: 56, bottom: 34, left: 44 };
  const plotW = Math.max(40, width - pad.left - pad.right);
  const plotH = height - pad.top - pad.bottom;

  const maxValue = Math.max(1, ...points.map((p) => Math.max(p.visits, p.signups)));
  const ticks = niceTicks(maxValue);
  const yMax = ticks[ticks.length - 1];

  const x = useCallback(
    (i: number) => (points.length <= 1 ? plotW / 2 : (i / (points.length - 1)) * plotW),
    [points.length, plotW],
  );
  const y = useCallback((v: number) => plotH - (v / yMax) * plotH, [plotH, yMax]);

  const linePath = useCallback(
    (key: 'visits' | 'signups') =>
      points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i)},${y(p[key])}`).join(' '),
    [points, x, y],
  );

  const handleMove = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const px = e.clientX - rect.left - pad.left;
      if (points.length === 0) return;
      const idx = Math.round((px / plotW) * (points.length - 1));
      setHover(Math.min(points.length - 1, Math.max(0, idx)));
    },
    [plotW, points.length, pad.left],
  );

  if (points.length === 0) {
    return <EmptyPlot title={title} message="No activity in this period yet." />;
  }

  const active = hover === null ? null : points[hover];
  const last = points[points.length - 1];

  const granularityNote =
    granularity === 'day' ? 'per day' : granularity === 'week' ? 'per week' : 'per month';

  return (
    <figure className="m-0" ref={ref}>
      <figcaption className="mb-1 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        <span className="text-xs text-slate-500">Totals {granularityNote}</span>
      </figcaption>

      {/* Legend — always present for two series; identity is never colour-alone. */}
      <div className="mb-2 flex items-center gap-4">
        <LegendKey color={SERIES_COLORS.signups} label="Accounts created" />
        <LegendKey color={SERIES_COLORS.visits} label="Link opens" />
      </div>

      {/* w-full + overflow-hidden: the measured box is driven by the layout,
          never by the SVG it contains. Reserve the height so nothing jumps
          between first paint and the first measurement. */}
      <div className="relative w-full overflow-hidden" style={{ minHeight: height }}>
        {width > 0 && (
        <svg
          width={width}
          height={height}
          role="img"
          aria-label={`${title}. ${points.length} points ${granularityNote}.`}
          onPointerMove={handleMove}
          onPointerLeave={() => setHover(null)}
          style={{ touchAction: 'pan-y' }}
        >
          <g transform={`translate(${pad.left},${pad.top})`}>
            {/* Hairline gridlines — solid, one step off surface, recessive. */}
            {ticks.map((t) => (
              <g key={t}>
                <line
                  x1={0}
                  x2={plotW}
                  y1={y(t)}
                  y2={y(t)}
                  stroke={t === 0 ? CHART_INK.axis : CHART_INK.gridline}
                  strokeWidth={1}
                />
                <text
                  x={-10}
                  y={y(t)}
                  textAnchor="end"
                  dominantBaseline="middle"
                  fontSize={11}
                  fill={CHART_INK.muted}
                  style={{ fontVariantNumeric: 'tabular-nums' }}
                >
                  {fmt.format(t)}
                </text>
              </g>
            ))}

            {/* X labels: first, middle, last only — never one per point. */}
            {[0, Math.floor((points.length - 1) / 2), points.length - 1]
              .filter((v, i, a) => a.indexOf(v) === i && v >= 0)
              .map((i) => (
                <text
                  key={i}
                  x={x(i)}
                  y={plotH + 20}
                  textAnchor={i === 0 ? 'start' : i === points.length - 1 ? 'end' : 'middle'}
                  fontSize={11}
                  fill={CHART_INK.muted}
                >
                  {formatDay(points[i].day)}
                </text>
              ))}

            {active && (
              <line
                x1={x(hover as number)}
                x2={x(hover as number)}
                y1={0}
                y2={plotH}
                stroke={CHART_INK.axis}
                strokeWidth={1}
              />
            )}

            <path
              d={linePath('visits')}
              fill="none"
              stroke={SERIES_COLORS.visits}
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            <path
              d={linePath('signups')}
              fill="none"
              stroke={SERIES_COLORS.signups}
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
            />

            {/* End markers with a 2px surface ring so they stay legible where
                the two lines cross. */}
            <EndMarker cx={x(points.length - 1)} cy={y(last.visits)} color={SERIES_COLORS.visits} />
            <EndMarker cx={x(points.length - 1)} cy={y(last.signups)} color={SERIES_COLORS.signups} />

            {active && hover !== null && (
              <>
                <EndMarker cx={x(hover)} cy={y(active.visits)} color={SERIES_COLORS.visits} />
                <EndMarker cx={x(hover)} cy={y(active.signups)} color={SERIES_COLORS.signups} />
              </>
            )}
          </g>
        </svg>
        )}

        {active && hover !== null && (
          <div
            className="pointer-events-none absolute z-10 min-w-[9.5rem] rounded-lg border border-slate-200 bg-white p-2.5 text-xs shadow-lg"
            style={{
              left: Math.min(Math.max(pad.left + x(hover) - 76, 0), Math.max(0, width - 160)),
              top: 4,
            }}
          >
            <p className="mb-1.5 font-semibold text-slate-900">{formatDay(active.day, true)}</p>
            <TooltipRow color={SERIES_COLORS.signups} label="Accounts" value={active.signups} />
            <TooltipRow color={SERIES_COLORS.visits} label="Opens" value={active.visits} />
          </div>
        )}
      </div>
    </figure>
  );
}

function EndMarker({ cx, cy, color }: { cx: number; cy: number; color: string }) {
  return (
    <>
      <circle cx={cx} cy={cy} r={6} fill={CHART_INK.surface} />
      <circle cx={cx} cy={cy} r={4} fill={color} />
    </>
  );
}

function LegendKey({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5 text-xs text-slate-600">
      <span
        aria-hidden
        className="inline-block h-0.5 w-4 rounded-full"
        style={{ backgroundColor: color }}
      />
      {label}
    </span>
  );
}

function TooltipRow({ color, label, value }: { color: string; label: string; value: number }) {
  return (
    <p className="flex items-center justify-between gap-4 text-slate-600">
      <span className="flex items-center gap-1.5">
        <span
          aria-hidden
          className="inline-block h-2 w-2 rounded-full"
          style={{ backgroundColor: color }}
        />
        {label}
      </span>
      <span className="font-semibold tabular-nums text-slate-900">{fmt.format(value)}</span>
    </p>
  );
}

function EmptyPlot({ title, message }: { title: string; message: string }) {
  return (
    <figure className="m-0">
      <figcaption className="mb-1 text-sm font-semibold text-slate-900">{title}</figcaption>
      <div className="flex h-[220px] items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50/60">
        <p className="text-sm text-slate-500">{message}</p>
      </div>
    </figure>
  );
}

/* ------------------------------------------------------------------ */
/* Funnel                                                              */
/* ------------------------------------------------------------------ */

export interface FunnelDatum {
  step: FunnelStep;
  value: number;
}

/**
 * Ordered stages get the ordinal ramp, not eight identities. Each row shows its
 * own value plus the conversion from the step above — the number an evaluation
 * report is actually built on.
 */
export function FunnelChart({ data }: { data: FunnelDatum[] }) {
  const max = Math.max(1, ...data.map((d) => d.value));

  return (
    <div className="space-y-3">
      {data.map((d, i) => {
        const previous = i === 0 ? 0 : data[i - 1].value;
        const conversion = hasMeaningfulConversion(i, d.value, previous)
          ? (d.value / previous) * 100
          : null;
        const widthPct = (d.value / max) * 100;

        return (
          <div key={d.step.key}>
            <div className="mb-1 flex min-w-0 items-baseline justify-between gap-3">
              <span className="min-w-0 text-sm font-medium text-slate-700" title={d.step.help}>
                {d.step.label}
              </span>
              <span className="flex shrink-0 items-baseline gap-2">
                {conversion !== null && (
                  <span className="text-xs tabular-nums text-slate-500">
                    {conversion.toFixed(0)}% of previous
                  </span>
                )}
                <span className="text-sm font-bold tabular-nums text-slate-900">
                  {fmt.format(d.value)}
                </span>
              </span>
            </div>
            <div className="h-5 w-full overflow-hidden rounded-sm bg-slate-100">
              <div
                className="h-full rounded-sm"
                style={{
                  width: `${Math.max(widthPct, d.value > 0 ? 1.5 : 0)}%`,
                  backgroundColor: FUNNEL_RAMP[Math.min(i, FUNNEL_RAMP.length - 1)],
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Bar list                                                            */
/* ------------------------------------------------------------------ */

export interface BarDatum {
  label: string;
  value: number;
  /** Optional secondary value rendered as a caption (e.g. "4 completed"). */
  note?: string;
}

/**
 * One series → one colour for every bar. Never a value-ramp across nominal
 * categories: that would double-encode length as hue.
 */
export function BarList({
  data,
  emptyMessage,
  valueLabel,
}: {
  data: BarDatum[];
  emptyMessage: string;
  valueLabel: string;
}) {
  if (data.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50/60 p-6 text-center text-sm text-slate-500">
        {emptyMessage}
      </p>
    );
  }

  const max = Math.max(1, ...data.map((d) => d.value));

  return (
    <ul className="space-y-2.5">
      {data.map((d) => (
        <li key={d.label}>
          {/* min-w-0 on both the row and the truncating span: a flex item
              defaults to min-width:auto and refuses to shrink below its content,
              so without this a long module title pushes the whole page wide and
              the document scrolls sideways on a phone. */}
          <div className="mb-1 flex min-w-0 items-baseline justify-between gap-3">
            <span className="min-w-0 truncate text-sm text-slate-700" title={d.label}>
              {d.label}
            </span>
            <span className="shrink-0 text-sm font-semibold tabular-nums text-slate-900">
              {fmt.format(d.value)}
              <span className="sr-only"> {valueLabel}</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3.5 flex-1 overflow-hidden rounded-sm bg-slate-100">
              <div
                className="h-full rounded-sm"
                style={{
                  width: `${Math.max((d.value / max) * 100, d.value > 0 ? 1.5 : 0)}%`,
                  backgroundColor: SERIES_COLORS.signups,
                }}
              />
            </div>
            {d.note && (
              <span className="shrink-0 text-xs tabular-nums text-slate-500">{d.note}</span>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
