'use client';

import React, { useCallback, useMemo, useTransition } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  Printer,
  Download,
  Link2,
  CalendarRange,
  ShieldCheck,
  Info,
  Loader2,
  MousePointerClick,
  UserPlus,
  BookOpen,
  CheckCircle2,
  Award,
  TrendingUp,
  Users,
  type LucideIcon,
} from 'lucide-react';
import {
  FUNNEL_STEPS,
  RANGE_PRESETS,
  SERIES_COLORS,
  type RangeKey,
} from '@/lib/referral/constants';
import { getInstitutionBranding } from '@/lib/tenant/branding';
import type { ReferralReport } from '@/lib/db/referrals';
import { TimeSeriesChart, FunnelChart, BarList } from './report-charts';

const fmt = new Intl.NumberFormat('en-CA');

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso.length <= 10 ? `${iso}T00:00:00Z` : iso);
  return d.toLocaleDateString('en-CA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

function percent(part: number, whole: number): string {
  if (!whole) return '—';
  return `${((part / whole) * 100).toFixed(0)}%`;
}

/** House card surface — the same one the admin dashboards use. */
const CARD = 'rounded-2xl border border-slate-100 bg-white shadow-[0_4px_20px_rgb(0,0,0,0.04)]';

interface Props {
  report: ReferralReport;
  activeRange: RangeKey;
  /** Public URL of the tracked link, so the ambassador can copy it from here. */
  shareUrl: string;
}

export function ReportDashboard({ report, activeRange, shareUrl }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const { totals, lifetime, daily, courses, occupations } = report;
  // Older cached payloads may predate profile_stated; treat it as absent.
  const stated = report.profile_stated ?? { occupation: 0, country: 0, total: totals.signups };

  // Branding is resolved from the report's own institution — this page sits
  // outside the /[tenant]/ tree, so there is no slug in the path or cookie to
  // read (rule 16: never hardcode an institution; resolve it from context).
  const branding = getInstitutionBranding(report.institution.slug);

  const setRange = useCallback(
    (key: RangeKey) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set('range', key);
      startTransition(() => router.replace(`${pathname}?${params.toString()}`));
    },
    [pathname, router, searchParams],
  );

  const funnelData = useMemo(
    () =>
      FUNNEL_STEPS.map((step) => ({
        step,
        value: (totals as unknown as Record<string, number>)[step.key] ?? 0,
      })),
    [totals],
  );

  const copyLink = useCallback(() => {
    navigator.clipboard?.writeText(shareUrl);
  }, [shareUrl]);

  const downloadCsv = useCallback(() => {
    const lines: string[] = [];
    const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;

    lines.push([esc('Field'), esc('Value')].join(','));
    lines.push([esc('Region / programme'), esc(report.code.label)].join(','));
    lines.push([esc('Tracked link code'), esc(report.code.code)].join(','));
    lines.push([esc('Institution'), esc(report.institution.name)].join(','));
    lines.push([esc('Period from'), esc(report.range.from)].join(','));
    lines.push([esc('Period to'), esc(report.range.to)].join(','));
    lines.push([esc('Generated'), esc(report.generated_at)].join(','));
    lines.push('');

    lines.push([esc('Funnel stage'), esc('Count')].join(','));
    for (const d of funnelData) lines.push([esc(d.step.label), d.value].join(','));
    // Totals that are NOT funnel stages because they count events, not people.
    lines.push([esc('Module completions (total)'), totals.courses_completed].join(','));
    lines.push([esc('Certificates issued (total)'), totals.certificates].join(','));
    lines.push([esc('Lessons completed (total)'), totals.lessons_completed].join(','));
    lines.push('');

    lines.push([esc('Date'), esc('Link opens'), esc('Accounts created')].join(','));
    for (const d of daily) lines.push([esc(d.day), d.visits, d.signups].join(','));
    lines.push('');

    lines.push([esc('Module'), esc('Learners enrolled'), esc('Learners completed')].join(','));
    for (const c of courses) lines.push([esc(c.title), c.enrolled, c.completed].join(','));
    lines.push('');

    lines.push([esc('Profession'), esc('Accounts')].join(','));
    for (const o of occupations) lines.push([esc(o.label), o.count].join(','));

    const blob = new Blob([`﻿${lines.join('\n')}`], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${report.code.code}-outreach-report-${report.range.to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [report, totals, funnelData, daily, courses, occupations]);

  return (
    <div className="referral-report min-h-screen bg-slate-50 pb-16">
      {/* ---------------- Branded header ---------------- */}
      <header
        className="relative overflow-hidden text-white"
        style={{
          backgroundImage: `linear-gradient(120deg, ${branding.primaryColor} 0%, ${branding.primaryColor} 42%, #0F172A 100%)`,
        }}
      >
        {/* Decorative accent bloom. */}
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full opacity-25 blur-3xl"
          style={{ backgroundColor: branding.accentColor }}
        />
        <div className="relative mx-auto max-w-5xl px-5 py-8 sm:px-8 sm:py-10">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/60">
                {report.institution.name} · Outreach report
              </p>
              <h1 className="mt-2 text-3xl font-black leading-tight tracking-tight sm:text-4xl">
                {report.code.label}
              </h1>
              {report.code.description && (
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/70">
                  {report.code.description}
                </p>
              )}
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white/85 ring-1 ring-inset ring-white/15">
                  <Users className="h-3.5 w-3.5" />
                  {fmt.format(lifetime.signups)} accounts since launch
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white/85 ring-1 ring-inset ring-white/15">
                  <Award className="h-3.5 w-3.5" />
                  {fmt.format(lifetime.certificates)} certificates
                </span>
                {!report.code.is_active && (
                  <span className="inline-flex items-center rounded-full bg-amber-400/20 px-3 py-1 text-xs font-semibold text-amber-100 ring-1 ring-inset ring-amber-300/40">
                    Link paused — new opens are not counted
                  </span>
                )}
              </div>
            </div>

            {/* No shrink-0 here: on a narrow screen this row must be allowed to
                shrink and wrap, otherwise the three buttons force the document
                wider than the viewport. */}
            <div className="no-print flex flex-wrap gap-2">
              <button
                type="button"
                onClick={copyLink}
                className="inline-flex items-center gap-1.5 rounded-xl bg-white/10 px-3.5 py-2 text-sm font-semibold text-white ring-1 ring-inset ring-white/20 backdrop-blur transition hover:bg-white/20"
              >
                <Link2 className="h-4 w-4" /> Copy my link
              </button>
              <button
                type="button"
                onClick={downloadCsv}
                className="inline-flex items-center gap-1.5 rounded-xl bg-white/10 px-3.5 py-2 text-sm font-semibold text-white ring-1 ring-inset ring-white/20 backdrop-blur transition hover:bg-white/20"
              >
                <Download className="h-4 w-4" /> CSV
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3.5 py-2 text-sm font-bold text-slate-900 transition hover:bg-white/90"
              >
                <Printer className="h-4 w-4" /> Download PDF
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-6 px-5 py-7 sm:px-8">
        {/* ---------------- Filter row (scopes everything below) ---------- */}
        <section
          className={`no-print flex flex-wrap items-center gap-2 p-3 ${CARD}`}
          aria-label="Date range"
        >
          <span className="mr-1 inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-slate-400">
            <CalendarRange className="h-3.5 w-3.5" /> Period
          </span>
          {RANGE_PRESETS.map((preset) => (
            <button
              key={preset.key}
              type="button"
              onClick={() => setRange(preset.key)}
              aria-pressed={activeRange === preset.key}
              className={`rounded-xl px-3.5 py-1.5 text-sm font-semibold transition ${
                activeRange === preset.key
                  ? 'text-white shadow-sm'
                  : 'text-slate-500 hover:bg-slate-100'
              }`}
              style={
                activeRange === preset.key ? { backgroundColor: branding.primaryColor } : undefined
              }
            >
              {preset.label}
            </button>
          ))}
          {pending && <Loader2 className="h-4 w-4 animate-spin text-slate-400" />}
        </section>

        <p className="text-sm text-slate-600">
          {report.range.is_all_time ? (
            <>
              Showing <strong className="font-bold text-slate-900">every learner</strong> who has
              joined through this link, and everything they have done since.
            </>
          ) : (
            <>
              Showing learners who joined through this link between{' '}
              <strong className="font-bold text-slate-900">{formatDate(report.range.from)}</strong>{' '}
              and <strong className="font-bold text-slate-900">{formatDate(report.range.to)}</strong>
              , and everything they have done since.
            </>
          )}
        </p>

        {/* ---------------- Hero + KPI row ---------------- */}
        <section className="grid gap-4 sm:grid-cols-3">
          {/* Hero figure — exactly one per view. */}
          <div
            className="relative flex flex-col justify-center overflow-hidden rounded-2xl p-6 text-white shadow-[0_10px_30px_rgb(0,0,0,0.10)]"
            style={{
              backgroundImage: `linear-gradient(140deg, ${branding.primaryColor} 0%, #0F172A 120%)`,
            }}
          >
            <div
              aria-hidden
              className="pointer-events-none absolute -bottom-16 -left-10 h-44 w-44 rounded-full opacity-25 blur-2xl"
              style={{ backgroundColor: branding.accentColor }}
            />
            <p className="relative text-[11px] font-bold uppercase tracking-widest text-white/60">
              Accounts created
            </p>
            <p className="relative mt-1.5 text-6xl font-black leading-none">
              {fmt.format(totals.signups)}
            </p>
            <p className="relative mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-white/70">
              <TrendingUp className="h-3.5 w-3.5" />
              {fmt.format(lifetime.signups)} since this link was created
            </p>
          </div>

          <div className="grid gap-4 sm:col-span-2 sm:grid-cols-2">
            <StatTile
              icon={MousePointerClick}
              tint={SERIES_COLORS.visits}
              label="Link opens"
              value={totals.visits}
              caption="Unique people, counted once per day"
            />
            <StatTile
              icon={BookOpen}
              tint={SERIES_COLORS.signups}
              label="Started a module"
              value={totals.learners_started}
              caption={`${percent(totals.learners_started, totals.signups)} of new accounts`}
            />
            <StatTile
              icon={CheckCircle2}
              tint="#0f766e"
              label="Finished a module"
              value={totals.learners_completed}
              caption={`${percent(totals.learners_completed, totals.signups)} of new accounts`}
            />
            {/* The raw certificate COUNT belongs here — "how many certificates
                has this outreach produced" is the question a tile answers. The
                funnel below counts people instead, so that it cannot widen. */}
            <StatTile
              icon={Award}
              tint="#b45309"
              label="Certificates earned"
              value={totals.certificates}
              caption={`held by ${fmt.format(totals.learners_certificated)} ${
                totals.learners_certificated === 1 ? 'learner' : 'learners'
              }`}
            />
          </div>
        </section>

        {/* ---------------- Funnel ---------------- */}
        <section className={`p-6 ${CARD}`}>
          <SectionHeading
            icon={UserPlus}
            title="From link open to certificate"
            subtitle="Every stage counts people. Link opens are those that happened in this period; the stages below follow the accounts created in this period, however far they have since got."
          />
          <FunnelChart data={funnelData} />
          {/* Windowing makes these two populations disagree: a signup inside the
              period can trace back to a link open before it. Say so rather than
              letting the reader think a number is broken. */}
          {totals.signups > totals.visits && (
            <p className="mt-4 rounded-xl bg-slate-50 p-3.5 text-xs leading-relaxed text-slate-600">
              More accounts than link opens in this period is expected on a short range — some of
              these people opened your link before the period started. Switch to
              <strong className="font-bold"> All time</strong> to see both from the beginning.
            </p>
          )}
        </section>

        {/* ---------------- Time series ---------------- */}
        <section className={`p-6 ${CARD}`}>
          <TimeSeriesChart data={daily} title="Activity over time" />
        </section>

        {/* ---------------- Breakdowns ---------------- */}
        <section className="grid gap-5 lg:grid-cols-2">
          {/* min-w-0: grid items default to min-width:auto and would otherwise be
              held open by the longest module title, scrolling the page sideways. */}
          <div className={`min-w-0 p-6 ${CARD}`}>
            <SectionHeading
              icon={BookOpen}
              title="Modules taken up"
              subtitle="Learners from this link who enrolled in each module, and how many finished."
            />
            <BarList
              valueLabel="Enrolled"
              secondaryLabel="Finished"
              emptyMessage="No module enrolments from this link yet."
              data={courses.map((c) => ({
                label: c.title,
                value: c.enrolled,
                secondary: c.completed,
              }))}
            />
          </div>

          <div className={`min-w-0 p-6 ${CARD}`}>
            <SectionHeading
              icon={Users}
              title="Who is signing up"
              subtitle={
                stated.occupation > 0
                  ? `Profession as given at signup — ${fmt.format(stated.occupation)} of ${fmt.format(stated.total)} have provided it.`
                  : 'Profession as given at signup.'
              }
            />
            {occupations.length > 0 ? (
              <BarList
                valueLabel="Accounts"
                color={branding.primaryColor}
                emptyMessage="No accounts from this link yet."
                data={occupations.map((o) => ({ label: o.label, value: o.count }))}
              />
            ) : (
              // Charting a single "Not specified" bar would read as a finding
              // when it is really an absence of data — say so instead.
              <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 p-6 text-center text-sm text-slate-500">
                {totals.signups === 0
                  ? 'No accounts from this link yet.'
                  : 'None of these learners stated a profession. Accounts created before this became a signup question can leave it blank.'}
              </p>
            )}
          </div>
        </section>

        {/* ---------------- Table view (the accessible twin) ---------------- */}
        <section className={`p-6 ${CARD}`}>
          <SectionHeading
            icon={Info}
            title="All figures"
            subtitle="Every number on this page, with what it counts."
          />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[32rem] border-collapse text-sm">
              <caption className="sr-only">Every figure in this report, as a table.</caption>
              <thead>
                <tr className="border-b border-slate-100 text-left">
                  <th
                    scope="col"
                    className="py-2.5 pr-4 text-[11px] font-bold uppercase tracking-widest text-slate-400"
                  >
                    Measure
                  </th>
                  <th
                    scope="col"
                    className="py-2.5 pr-4 text-right text-[11px] font-bold uppercase tracking-widest text-slate-400"
                  >
                    In period
                  </th>
                  <th
                    scope="col"
                    className="py-2.5 text-left text-[11px] font-bold uppercase tracking-widest text-slate-400"
                  >
                    What it counts
                  </th>
                </tr>
              </thead>
              <tbody>
                {funnelData.map((d) => (
                  <TableRow
                    key={d.step.key}
                    label={d.step.label}
                    value={d.value}
                    help={d.step.help}
                  />
                ))}
                <TableRow
                  label="Module completions"
                  value={totals.courses_completed}
                  help="Total modules finished. One learner can finish several."
                />
                <TableRow
                  label="Certificates issued"
                  value={totals.certificates}
                  help="Total certificates held. One learner can hold several — the funnel row above counts the learners."
                />
                <TableRow
                  label="Lessons completed"
                  value={totals.lessons_completed}
                  help="Individual lessons finished across all modules."
                  last
                />
              </tbody>
            </table>
          </div>
        </section>

        {/* ---------------- Footer ---------------- */}
        <section className={`space-y-3 p-6 text-sm text-slate-600 ${CARD}`}>
          <p className="flex gap-2.5">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
            <span>
              This page shows anonymised totals only. It never contains the names, email addresses
              or individual records of learners. Anyone with the link can view it, so treat it as
              internal to your team.
            </span>
          </p>
          <p className="flex gap-2.5">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
            <span>
              Only people who create a new account after opening your link are counted. Someone who
              already had an account before you reached them will not appear here, even if your
              outreach is why they came back.
            </span>
          </p>
          <p className="border-t border-slate-100 pt-3 text-xs text-slate-500">
            Your tracked link: <span className="font-mono text-slate-700">{shareUrl}</span> · Report
            generated {formatDate(report.generated_at)}
          </p>
        </section>
      </main>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Pieces                                                              */
/* ------------------------------------------------------------------ */

function SectionHeading({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: LucideIcon;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="mb-5 flex items-start gap-3">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <h2 className="text-base font-black tracking-tight text-slate-900">{title}</h2>
        <p className="mt-0.5 text-sm leading-relaxed text-slate-500">{subtitle}</p>
      </div>
    </div>
  );
}

function StatTile({
  icon: Icon,
  tint,
  label,
  value,
  caption,
}: {
  icon: LucideIcon;
  tint: string;
  label: string;
  value: number;
  caption: string;
}) {
  return (
    <div className={`p-5 ${CARD}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">{label}</p>
          <p className="mt-1 text-3xl font-black leading-none text-slate-900">{fmt.format(value)}</p>
        </div>
        <span
          aria-hidden
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
          style={{ backgroundColor: `${tint}14`, color: tint }}
        >
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className="mt-2 text-xs font-medium text-slate-500">{caption}</p>
    </div>
  );
}

function TableRow({
  label,
  value,
  help,
  last,
}: {
  label: string;
  value: number;
  help: string;
  last?: boolean;
}) {
  return (
    <tr
      className={`${last ? '' : 'border-b border-slate-50'} transition-colors hover:bg-slate-50/60`}
    >
      <th scope="row" className="py-2.5 pr-4 text-left font-bold text-slate-800">
        {label}
      </th>
      <td className="py-2.5 pr-4 text-right font-bold tabular-nums text-slate-900">
        {fmt.format(value)}
      </td>
      <td className="py-2.5 text-slate-500">{help}</td>
    </tr>
  );
}
