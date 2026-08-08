import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { getReferralReport, referralShareUrl } from '@/lib/db/referrals';
import { ReportDashboard } from '@/components/referral/report-dashboard';
// Range config comes from the shared (non-client) module: importing a value
// from a 'use client' module into a server component yields a client-reference
// proxy, not the value, which fails at build time.
import { RANGE_PRESETS, type RangeKey } from '@/lib/referral/constants';

/**
 * Public, token-gated outreach report: /report/<public_token>
 *
 * Reached WITHOUT logging in — the unguessable token is the credential — and
 * served entirely from `get_referral_report`, which returns aggregates only.
 * Deliberately outside the middleware matcher and outside the /[tenant]/ tree:
 * the report names its own institution, and an external partner should not need
 * to know a tenant slug to open it.
 */

// The report is live data; never let a CDN serve one ambassador's numbers to
// another's URL, and never cache a token→report mapping.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Outreach report',
  // Private-by-obscurity URLs must never end up in a search index.
  robots: { index: false, follow: false, nocache: true },
};

const VALID_RANGES = new Set<string>(RANGE_PRESETS.map((r) => r.key));

function resolveRange(raw: string | undefined): {
  key: RangeKey;
  from: string | null;
  to: string | null;
} {
  const key = (raw && VALID_RANGES.has(raw) ? raw : '90') as RangeKey;
  if (key === 'all') return { key, from: null, to: null };

  const days = Number(key);
  const today = new Date();
  const to = today.toISOString().slice(0, 10);
  const fromDate = new Date(today.getTime() - (days - 1) * 24 * 60 * 60 * 1000);
  return { key, from: fromDate.toISOString().slice(0, 10), to };
}

async function resolveOrigin(): Promise<string> {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '');
  }
  const h = await headers();
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:3001';
  const proto = h.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https');
  return `${proto}://${host}`;
}

export default async function ReferralReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ range?: string }>;
}) {
  const { token } = await params;
  const { range: rangeParam } = await searchParams;
  const range = resolveRange(rangeParam);

  const supabase = await createClient();

  let report = null;
  try {
    report = await getReferralReport(supabase, token, range.from, range.to);
  } catch {
    report = null;
  }

  if (!report) {
    // One neutral message for "never existed", "rotated" and "archived" alike —
    // distinguishing them would turn this page into a token oracle.
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center">
          <h1 className="text-lg font-bold text-slate-900">Report not available</h1>
          <p className="mt-2 text-sm text-slate-600">
            This dashboard link is not valid. It may have been replaced with a newer link, or
            the programme it belonged to may have been closed. Please ask your programme
            contact for an up-to-date link.
          </p>
        </div>
      </div>
    );
  }

  const origin = await resolveOrigin();

  return (
    <ReportDashboard
      report={report}
      activeRange={range.key}
      shareUrl={referralShareUrl(origin, report.code.code)}
    />
  );
}
