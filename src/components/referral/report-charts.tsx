'use client';

import React, { useMemo } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  SERIES_COLORS,
  FUNNEL_RAMP,
  CHART_INK,
  hasMeaningfulConversion,
  type FunnelStep,
} from '@/lib/referral/constants';

/**
 * Charts for the public outreach report, built on recharts (already a
 * dependency — nothing new is pulled in for this page).
 *
 * Two rules survive from the hand-rolled version and must not be lost:
 *
 * 1. The y-axis top tick is computed by `niceTicks` and passed to recharts
 *    explicitly. recharts' own axis is fine, but this keeps the ONE property
 *    that matters under test: the top tick is always >= the largest value, so
 *    the series can never be drawn outside the plot and silently clipped.
 * 2. Colours come from the validated palette in referral/constants —
 *    categorical slots 1 & 2 for the two-series chart, the ordinal blue ramp
 *    for the funnel. Do not substitute hexes by eye.
 */

const fmt = new Intl.NumberFormat('en-CA');

/**
 * Measure the chart's own box so the horizontal charts can shrink their
 * category gutter and label space on a phone.
 *
 * Without this the funnel's 170px label gutter plus its 148px label margin eat
 * a 390px screen entirely and every bar renders as a sliver — the chart looks
 * broken exactly where most people open a link someone texted them.
 *
 * Starts at 0 and the caller renders nothing until measured: a non-zero guess
 * would paint an over-wide chart that widens the very box being measured.
 */
function useChartWidth<T extends HTMLElement>(): [React.RefObject<T | null>, number] {
  const ref = React.useRef<T | null>(null);
  const [width, setWidth] = React.useState(0);

  React.useEffect(() => {
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

/** Below this the label gutter is squeezed and secondary text is dropped. */
const NARROW_CHART = 420;

function formatDay(iso: string, withYear = false): string {
  const d = new Date(`${iso}T00:00:00Z`);
  return d.toLocaleDateString('en-CA', {
    month: 'short',
    day: 'numeric',
    ...(withYear ? { year: 'numeric' } : {}),
    timeZone: 'UTC',
  });
}

/** Long labels have to fit a fixed axis gutter; the tooltip carries the full text. */
function truncate(label: string, max: number): string {
  return label.length <= max ? label : `${label.slice(0, max - 1).trimEnd()}…`;
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

/* ------------------------------------------------------------------ */
/* Shared chrome                                                       */
/* ------------------------------------------------------------------ */

function TooltipShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="min-w-[10rem] rounded-xl border border-slate-200 bg-white p-3 shadow-[0_8px_30px_rgb(0,0,0,0.10)]">
      <p className="mb-1.5 text-xs font-bold uppercase tracking-widest text-slate-400">{title}</p>
      {children}
    </div>
  );
}

function TooltipRow({ color, label, value }: { color: string; label: string; value: number }) {
  return (
    <p className="flex items-center justify-between gap-5 text-sm text-slate-600">
      <span className="flex items-center gap-1.5">
        <span
          aria-hidden
          className="inline-block h-2 w-2 rounded-full"
          style={{ backgroundColor: color }}
        />
        {label}
      </span>
      <span className="font-bold tabular-nums text-slate-900">{fmt.format(value)}</span>
    </p>
  );
}

function LegendKey({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
      <span
        aria-hidden
        className="inline-block h-2.5 w-2.5 rounded-full"
        style={{ backgroundColor: color }}
      />
      {label}
    </span>
  );
}

function EmptyPlot({ message, height = 220 }: { message: string; height?: number }) {
  return (
    <div
      className="flex items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/60"
      style={{ height }}
    >
      <p className="px-6 text-center text-sm text-slate-500">{message}</p>
    </div>
  );
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

interface SeriesTooltipProps {
  active?: boolean;
  payload?: { payload: SeriesPoint }[];
}

function SeriesTooltip({ active, payload }: SeriesTooltipProps) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <TooltipShell title={formatDay(p.day, true)}>
      <TooltipRow color={SERIES_COLORS.signups} label="Accounts" value={p.signups} />
      <TooltipRow color={SERIES_COLORS.visits} label="Opens" value={p.visits} />
    </TooltipShell>
  );
}

export function TimeSeriesChart({ data, title }: { data: SeriesPoint[]; title: string }) {
  const { points, granularity } = useMemo(() => bucketSeries(data), [data]);

  const ticks = useMemo(
    () => niceTicks(Math.max(1, ...points.map((p) => Math.max(p.visits, p.signups)))),
    [points],
  );
  const yMax = ticks[ticks.length - 1];

  const granularityNote =
    granularity === 'day' ? 'per day' : granularity === 'week' ? 'per week' : 'per month';

  return (
    <figure className="m-0">
      <figcaption className="mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h3 className="text-sm font-bold text-slate-900">{title}</h3>
        <span className="text-xs font-medium text-slate-400">Totals {granularityNote}</span>
      </figcaption>

      {points.length === 0 ? (
        <EmptyPlot message="No activity in this period yet." />
      ) : (
        <>
          {/* Identity is never colour-alone: the legend is always present. */}
          <div className="mb-3 flex items-center gap-4">
            <LegendKey color={SERIES_COLORS.signups} label="Accounts created" />
            <LegendKey color={SERIES_COLORS.visits} label="Link opens" />
          </div>

          {/* min-w-0 + w-full: ResponsiveContainer measures this box, so the
              layout must drive its width and never the chart inside it. */}
          <div className="w-full min-w-0">
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={points} margin={{ top: 8, right: 8, left: -14, bottom: 0 }}>
                <defs>
                  <linearGradient id="referralSignups" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={SERIES_COLORS.signups} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={SERIES_COLORS.signups} stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="referralVisits" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={SERIES_COLORS.visits} stopOpacity={0.28} />
                    <stop offset="100%" stopColor={SERIES_COLORS.visits} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke={CHART_INK.gridline} />
                <XAxis
                  dataKey="day"
                  tickFormatter={(v: string) => formatDay(v)}
                  tick={{ fontSize: 11, fill: CHART_INK.muted }}
                  tickLine={false}
                  axisLine={{ stroke: CHART_INK.axis }}
                  minTickGap={44}
                  tickMargin={10}
                />
                <YAxis
                  ticks={ticks}
                  domain={[0, yMax]}
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: CHART_INK.muted }}
                  tickLine={false}
                  axisLine={false}
                  width={52}
                  tickFormatter={(v: number) => fmt.format(v)}
                />
                <Tooltip
                  content={<SeriesTooltip />}
                  cursor={{ stroke: CHART_INK.axis, strokeWidth: 1 }}
                />
                <Area
                  type="monotone"
                  dataKey="visits"
                  name="Link opens"
                  stroke={SERIES_COLORS.visits}
                  strokeWidth={2}
                  fill="url(#referralVisits)"
                  activeDot={{ r: 4, strokeWidth: 2, stroke: CHART_INK.surface }}
                />
                <Area
                  type="monotone"
                  dataKey="signups"
                  name="Accounts created"
                  stroke={SERIES_COLORS.signups}
                  strokeWidth={2}
                  fill="url(#referralSignups)"
                  activeDot={{ r: 4, strokeWidth: 2, stroke: CHART_INK.surface }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
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

interface FunnelRow {
  key: string;
  label: string;
  help: string;
  value: number;
  /** null when the two populations are not comparable — see hasMeaningfulConversion. */
  conversion: number | null;
  fill: string;
}

function FunnelTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: FunnelRow }[];
}) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  return (
    <TooltipShell title={row.label}>
      <p className="text-2xl font-black leading-none text-slate-900">{fmt.format(row.value)}</p>
      <p className="mt-1.5 max-w-[16rem] text-xs leading-snug text-slate-500">{row.help}</p>
    </TooltipShell>
  );
}

/**
 * Ordered stages get the ordinal ramp, not five identities. Each bar carries its
 * own value plus the conversion from the step above — the number an evaluation
 * report is actually built on.
 */
export function FunnelChart({ data }: { data: FunnelDatum[] }) {
  const rows: FunnelRow[] = useMemo(
    () =>
      data.map((d, i) => {
        const previous = i === 0 ? 0 : data[i - 1].value;
        return {
          key: d.step.key,
          label: d.step.label,
          help: d.step.help,
          value: d.value,
          conversion: hasMeaningfulConversion(i, d.value, previous)
            ? (d.value / previous) * 100
            : null,
          fill: FUNNEL_RAMP[Math.min(i, FUNNEL_RAMP.length - 1)],
        };
      }),
    [data],
  );

  const max = Math.max(1, ...rows.map((r) => r.value));
  const [ref, width] = useChartWidth<HTMLDivElement>();
  const narrow = width > 0 && width < NARROW_CHART;

  return (
    <div className="w-full min-w-0" ref={ref}>
      {width > 0 && (
        <ResponsiveContainer width="100%" height={rows.length * (narrow ? 48 : 56) + 8}>
          <BarChart
            data={rows}
            layout="vertical"
            // Room on the right for the value (+ conversion) label, which sits
            // outside the bar so a short bar never hides its own number. On a
            // phone the conversion is dropped and the gutter shrinks, or the
            // labels would leave no width at all for the bars themselves.
            margin={{ top: 4, right: narrow ? 56 : 148, left: 0, bottom: 4 }}
            barCategoryGap="28%"
          >
            <XAxis type="number" domain={[0, max]} hide />
            <YAxis
              type="category"
              dataKey="label"
              width={narrow ? 104 : 170}
              tick={{ fontSize: narrow ? 11 : 12, fill: CHART_INK.textSecondary, fontWeight: 500 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: string) => truncate(v, narrow ? 16 : 22)}
            />
            <Tooltip content={<FunnelTooltip />} cursor={{ fill: 'rgba(15,23,42,0.04)' }} />
            <Bar dataKey="value" radius={[4, 8, 8, 4]} isAnimationActive={false}>
              {rows.map((r) => (
                <Cell key={r.key} fill={r.fill} />
              ))}
              <LabelList
                dataKey="value"
                content={<FunnelValueLabel rows={rows} hideConversion={narrow} />}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
      {narrow && (
        <p className="mt-2 text-xs text-slate-500">
          {rows
            .filter((r) => r.conversion !== null)
            .map((r) => `${r.label}: ${r.conversion!.toFixed(0)}% of previous`)
            .join(' · ')}
        </p>
      )}
    </div>
  );
}

interface LabelProps {
  x?: number | string;
  y?: number | string;
  width?: number | string;
  height?: number | string;
  index?: number;
  rows?: FunnelRow[];
  /** Narrow layouts print the conversions under the chart instead. */
  hideConversion?: boolean;
}

/** Value in bold with the conversion beside it, drawn just past the bar end. */
function FunnelValueLabel({ x, y, width, height, index, rows, hideConversion }: LabelProps) {
  const row = rows?.[index ?? 0];
  if (!row) return null;
  const px = Number(x ?? 0) + Number(width ?? 0) + 10;
  const py = Number(y ?? 0) + Number(height ?? 0) / 2;
  const valueText = fmt.format(row.value);

  return (
    <g>
      <text
        x={px}
        y={py}
        dominantBaseline="central"
        fontSize={14}
        fontWeight={800}
        fill={CHART_INK.textPrimary}
        style={{ fontVariantNumeric: 'tabular-nums' }}
      >
        {valueText}
      </text>
      {row.conversion !== null && !hideConversion && (
        <text
          // Advance past the value text: ~9px per glyph at 14px/800 weight.
          x={px + 8 + valueText.length * 9}
          y={py}
          dominantBaseline="central"
          fontSize={11}
          fill={CHART_INK.muted}
          style={{ fontVariantNumeric: 'tabular-nums' }}
        >
          {row.conversion.toFixed(0)}% of previous
        </text>
      )}
    </g>
  );
}

/* ------------------------------------------------------------------ */
/* Bar list                                                            */
/* ------------------------------------------------------------------ */

export interface BarDatum {
  label: string;
  value: number;
  /** Optional second series drawn beside the first (e.g. how many finished). */
  secondary?: number;
}

interface BarListProps {
  data: BarDatum[];
  emptyMessage: string;
  /** Accessible/tooltip name for the primary series. */
  valueLabel: string;
  /** Name for the optional second series; required when any datum has one. */
  secondaryLabel?: string;
  /** Bar colour for the primary series. Defaults to the categorical slot 1. */
  color?: string;
}

function BarListTooltip({
  active,
  payload,
  valueLabel,
  secondaryLabel,
  color,
}: {
  active?: boolean;
  payload?: { payload: BarDatum }[];
  valueLabel: string;
  secondaryLabel?: string;
  color: string;
}) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <TooltipShell title={d.label}>
      <TooltipRow color={color} label={valueLabel} value={d.value} />
      {d.secondary !== undefined && secondaryLabel && (
        <TooltipRow color={FUNNEL_RAMP[4]} label={secondaryLabel} value={d.secondary} />
      )}
    </TooltipShell>
  );
}

/**
 * One series → one colour for every bar. Never a value-ramp across nominal
 * categories: that would double-encode length as hue.
 */
export function BarList({
  data,
  emptyMessage,
  valueLabel,
  secondaryLabel,
  color = SERIES_COLORS.signups,
}: BarListProps) {
  const hasSecondary = data.some((d) => d.secondary !== undefined);

  if (data.length === 0) return <EmptyPlot message={emptyMessage} />;

  const rowHeight = hasSecondary ? 54 : 42;
  const [ref, width] = useChartWidth<HTMLDivElement>();
  const narrow = width > 0 && width < NARROW_CHART;

  return (
    <div className="w-full min-w-0" ref={ref}>
      {hasSecondary && secondaryLabel && (
        <div className="mb-3 flex items-center gap-4">
          <LegendKey color={color} label={valueLabel} />
          <LegendKey color={FUNNEL_RAMP[4]} label={secondaryLabel} />
        </div>
      )}
      {width === 0 ? (
        <div style={{ height: data.length * rowHeight + 12 }} />
      ) : (
      <ResponsiveContainer width="100%" height={data.length * rowHeight + 12}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 4, right: narrow ? 40 : 48, left: 0, bottom: 4 }}
          barCategoryGap={hasSecondary ? '24%' : '30%'}
        >
          <XAxis type="number" hide />
          <YAxis
            type="category"
            dataKey="label"
            // A long module title cannot be allowed to eat the whole width on
            // a phone — it truncates harder there, and the tooltip carries the
            // full text either way.
            width={narrow ? 116 : 190}
            tick={{ fontSize: narrow ? 11 : 12, fill: CHART_INK.textSecondary }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: string) => truncate(v, narrow ? 18 : 26)}
          />
          <Tooltip
            cursor={{ fill: 'rgba(15,23,42,0.04)' }}
            content={
              <BarListTooltip
                valueLabel={valueLabel}
                secondaryLabel={secondaryLabel}
                color={color}
              />
            }
          />
          <Bar
            dataKey="value"
            name={valueLabel}
            fill={color}
            radius={[4, 6, 6, 4]}
            isAnimationActive={false}
          >
            <LabelList
              dataKey="value"
              position="right"
              offset={8}
              style={{
                fontSize: 12,
                fontWeight: 700,
                fill: CHART_INK.textPrimary,
                fontVariantNumeric: 'tabular-nums',
              }}
              formatter={(v: number) => fmt.format(v)}
            />
          </Bar>
          {hasSecondary && (
            <Bar
              dataKey="secondary"
              name={secondaryLabel}
              fill={FUNNEL_RAMP[4]}
              radius={[4, 6, 6, 4]}
              isAnimationActive={false}
            >
              <LabelList
                dataKey="secondary"
                position="right"
                offset={8}
                style={{
                  fontSize: 11,
                  fill: CHART_INK.muted,
                  fontVariantNumeric: 'tabular-nums',
                }}
                formatter={(v: number) => fmt.format(v)}
              />
            </Bar>
          )}
        </BarChart>
      </ResponsiveContainer>
      )}
    </div>
  );
}
