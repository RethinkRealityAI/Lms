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
} from 'lucide-react';
import { FUNNEL_STEPS, RANGE_PRESETS, type RangeKey } from '@/lib/referral/constants';
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
    lines.push('');

    lines.push([esc('Date'), esc('Link opens'), esc('Accounts created')].join(','));
    for (const d of daily) lines.push([esc(d.day), d.visits, d.signups].join(','));
    lines.push('');

    lines.push([esc('Module'), esc('Learners enrolled'), esc('Learners completed')].join(','));
    for (const c of courses) lines.push([esc(c.title), c.enrolled, c.completed].join(','));
    lines.push('');

    lines.push([esc('Role / occupation'), esc('Accounts')].join(','));
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
  }, [report, funnelData, daily, courses, occupations]);

  return (
    <div className="referral-report min-h-screen bg-slate-50 pb-16">
      {/* ---------------- Header ---------------- */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-5xl px-5 py-7 sm:px-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                {report.institution.name} · Outreach report
              </p>
              <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
                {report.code.label}
              </h1>
              {report.code.description && (
                <p className="mt-1.5 max-w-2xl text-sm text-slate-600">
                  {report.code.description}
                </p>
              )}
              {!report.code.is_active && (
                <p className="mt-2 inline-block rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800">
                  This link is paused — it still works, but new opens are not counted.
                </p>
              )}
            </div>

            {/* No shrink-0 here: on a narrow screen this row must be allowed to
                shrink and wrap, otherwise the three buttons force the document
                wider than the viewport. */}
            <div className="no-print flex flex-wrap gap-2">
              <button
                type="button"
                onClick={copyLink}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                <Link2 className="h-4 w-4" /> Copy my link
              </button>
              <button
                type="button"
                onClick={downloadCsv}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                <Download className="h-4 w-4" /> CSV
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                <Printer className="h-4 w-4" /> Download PDF
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-6 px-5 py-6 sm:px-8">
        {/* ---------------- Filter row (one row, scopes everything below) --- */}
        <section
          className="no-print flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-3"
          aria-label="Date range"
        >
          <span className="mr-1 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
            <CalendarRange className="h-3.5 w-3.5" /> Period
          </span>
          {RANGE_PRESETS.map((preset) => (
            <button
              key={preset.key}
              type="button"
              onClick={() => setRange(preset.key)}
              aria-pressed={activeRange === preset.key}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                activeRange === preset.key
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {preset.label}
            </button>
          ))}
          {pending && <Loader2 className="h-4 w-4 animate-spin text-slate-400" />}
        </section>

        <p className="text-sm text-slate-600">
          {report.range.is_all_time ? (
            <>
              Showing{' '}
              <strong className="font-semibold text-slate-900">every learner</strong> who has
              joined through this link, and everything they have done since.
            </>
          ) : (
            <>
              Showing learners who joined through this link between{' '}
              <strong className="font-semibold text-slate-900">
                {formatDate(report.range.from)}
              </strong>{' '}
              and{' '}
              <strong className="font-semibold text-slate-900">
                {formatDate(report.range.to)}
              </strong>
              , and everything they have done since.
            </>
          )}
        </p>

        {/* ---------------- Hero + KPI row ---------------- */}
        <section className="grid gap-4 sm:grid-cols-3">
          {/* Hero figure — exactly one per view. Centred so it does not leave a
              dead band beside the two-row tile grid it sits next to. */}
          <div className="flex flex-col justify-center rounded-xl border border-slate-200 bg-white p-5 sm:col-span-1">
            <p className="text-sm text-slate-600">Accounts created</p>
            <p className="mt-1 text-5xl font-semibold leading-none text-slate-900">
              {fmt.format(totals.signups)}
            </p>
            <p className="mt-2 text-xs text-slate-500">
              {fmt.format(lifetime.signups)} since this link was created
            </p>
          </div>

          <div className="grid gap-4 sm:col-span-2 sm:grid-cols-2">
            <StatTile
              label="Link opens"
              value={totals.visits}
              caption="Unique people, counted once per day"
            />
            <StatTile
              label="Started a module"
              value={totals.learners_started}
              caption={`${percent(totals.learners_started, totals.signups)} of new accounts`}
            />
            <StatTile
              label="Finished a module"
              value={totals.learners_completed}
              caption={`${percent(totals.learners_completed, totals.signups)} of new accounts`}
            />
            <StatTile
              label="Certificates earned"
              value={totals.certificates}
              caption={`${fmt.format(totals.lessons_completed)} lessons completed in total`}
            />
          </div>
        </section>

        {/* ---------------- Funnel ---------------- */}
        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="text-base font-bold text-slate-900">From link open to certificate</h2>
          <p className="mb-4 mt-0.5 text-sm text-slate-600">
            Every stage counts people. Link opens are those that happened in this period;
            the stages below follow the accounts created in this period, however far they
            have since got.
          </p>
          <FunnelChart data={funnelData} />
          {/* Windowing makes these two populations disagree: a signup inside the
              period can trace back to a link open before it. Say so rather than
              letting the reader think a number is broken. */}
          {totals.signups > totals.visits && (
            <p className="mt-4 rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
              More accounts than link opens in this period is expected on a short range —
              some of these people opened your link before the period started. Switch to
              <strong className="font-semibold"> All time</strong> to see both from the beginning.
            </p>
          )}
        </section>

        {/* ---------------- Time series ---------------- */}
        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <TimeSeriesChart data={daily} title="Activity over time" />
        </section>

        {/* ---------------- Breakdowns ---------------- */}
        <section className="grid gap-6 lg:grid-cols-2">
          {/* min-w-0: grid items default to min-width:auto and would otherwise be
              held open by the longest module title, scrolling the page sideways. */}
          <div className="min-w-0 rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="text-base font-bold text-slate-900">Modules taken up</h2>
            <p className="mb-4 mt-0.5 text-sm text-slate-600">
              Learners from this link who enrolled in each module.
            </p>
            <BarList
              valueLabel="learners enrolled"
              emptyMessage="No module enrolments from this link yet."
              data={courses.map((c) => ({
                label: c.title,
                value: c.enrolled,
                note: `${fmt.format(c.completed)} finished`,
              }))}
            />
          </div>

          <div className="min-w-0 rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="text-base font-bold text-slate-900">Who is signing up</h2>
            <p className="mb-4 mt-0.5 text-sm text-slate-600">
              {stated.occupation > 0
                ? `Role as entered on their profile — ${fmt.format(stated.occupation)} of ${fmt.format(stated.total)} have filled this in.`
                : 'Role as entered on their profile.'}
            </p>
            {occupations.length > 0 ? (
              <BarList
                valueLabel="accounts"
                emptyMessage="No accounts from this link yet."
                data={occupations.map((o) => ({ label: o.label, value: o.count }))}
              />
            ) : (
              // Charting a single "Not specified" bar would read as a finding
              // when it is really an absence of data — say so instead.
              <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50/60 p-6 text-center text-sm text-slate-500">
                {totals.signups === 0
                  ? 'No accounts from this link yet.'
                  : 'None of these learners have added their role yet. Role is an optional field on their profile, so this breakdown fills in over time.'}
              </p>
            )}
          </div>
        </section>

        {/* ---------------- Table view (the accessible twin) ---------------- */}
        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="mb-3 text-base font-bold text-slate-900">All figures</h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[30rem] border-collapse text-sm">
              <caption className="sr-only">
                Every figure in this report, as a table.
              </caption>
              <thead>
                <tr className="border-b border-slate-200 text-left">
                  <th scope="col" className="py-2 pr-4 font-semibold text-slate-700">
                    Measure
                  </th>
                  <th scope="col" className="py-2 pr-4 text-right font-semibold text-slate-700">
                    In period
                  </th>
                  <th scope="col" className="py-2 text-left font-semibold text-slate-700">
                    What it counts
                  </th>
                </tr>
              </thead>
              <tbody>
                {funnelData.map((d) => (
                  <tr key={d.step.key} className="border-b border-slate-100">
                    <th scope="row" className="py-2 pr-4 text-left font-medium text-slate-800">
                      {d.step.label}
                    </th>
                    <td className="py-2 pr-4 text-right tabular-nums text-slate-900">
                      {fmt.format(d.value)}
                    </td>
                    <td className="py-2 text-slate-600">{d.step.help}</td>
                  </tr>
                ))}
                <tr className="border-b border-slate-100">
                  <th scope="row" className="py-2 pr-4 text-left font-medium text-slate-800">
                    Module completions
                  </th>
                  <td className="py-2 pr-4 text-right tabular-nums text-slate-900">
                    {fmt.format(totals.courses_completed)}
                  </td>
                  <td className="py-2 text-slate-600">
                    Total modules finished. One learner can finish several.
                  </td>
                </tr>
                <tr>
                  <th scope="row" className="py-2 pr-4 text-left font-medium text-slate-800">
                    Lessons completed
                  </th>
                  <td className="py-2 pr-4 text-right tabular-nums text-slate-900">
                    {fmt.format(totals.lessons_completed)}
                  </td>
                  <td className="py-2 text-slate-600">
                    Individual lessons finished across all modules.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* ---------------- Footer ---------------- */}
        <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-600">
          <p className="flex gap-2">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
            <span>
              This page shows anonymised totals only. It never contains the names, email
              addresses or individual records of learners. Anyone with the link can view it, so
              treat it as internal to your team.
            </span>
          </p>
          <p className="flex gap-2">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
            <span>
              Only people who create a new account after opening your link are counted. Someone
              who already had an account before you reached them will not appear here, even if
              your outreach is why they came back.
            </span>
          </p>
          <p className="pt-1 text-xs text-slate-500">
            Your tracked link: <span className="font-mono">{shareUrl}</span> · Report generated{' '}
            {formatDate(report.generated_at)}
          </p>
        </section>
      </main>
    </div>
  );
}

function StatTile({
  label,
  value,
  caption,
}: {
  label: string;
  value: number;
  caption: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-sm text-slate-600">{label}</p>
      <p className="mt-0.5 text-3xl font-semibold leading-tight text-slate-900">
        {fmt.format(value)}
      </p>
      <p className="mt-1 text-xs text-slate-500">{caption}</p>
    </div>
  );
}
