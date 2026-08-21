/**
 * Traffic-source classification for tracked referral links.
 *
 * WHY THIS EXISTS: an ambassador can tell you they posted the link in a
 * newsletter, on LinkedIn and in a hospital intranet page — but not which of
 * those actually produced the people who signed up. The browser tells us, via
 * the `Referer` header on the first request to `/r/<code>`.
 *
 * WHAT WE KEEP, AND WHAT WE THROW AWAY: only the HOST is ever stored, never the
 * path or the query string. `https://intranet.hospital.ca/staff/news/2026-06-sickle-cell?user=12345`
 * becomes `intranet.hospital.ca` and nothing else. The path is where the
 * identifying detail lives (a profile page, a message id, a session token in a
 * query param), and we have no use for it: the question is which CHANNEL
 * worked, not which page or which person.
 *
 * WHAT THE HEADER CANNOT TELL US: desktop email clients (Outlook, Apple Mail),
 * most messaging apps, PDF readers and QR-code scanners send no referrer at
 * all. Those land in `direct`, which is therefore a mixed bag rather than a
 * finding — hence `?s=` campaign tags (see `normalizeCampaign`), which an
 * ambassador can put on a link themselves and which survive everywhere.
 *
 * Pure functions, no imports — safe on client and server.
 */

export type SourceCategory =
  | 'email'
  | 'social'
  | 'messaging'
  | 'search'
  | 'website'
  | 'direct';

export interface SourceCategoryMeta {
  key: SourceCategory;
  label: string;
  /** Plain-language definition shown on the public report. */
  help: string;
}

/**
 * Ordered most- to least-attributable. `direct` is last because it is the
 * "we could not tell" bucket, and a reader should see the known channels first.
 */
export const SOURCE_CATEGORIES: readonly SourceCategoryMeta[] = [
  {
    key: 'email',
    label: 'Email',
    help: 'Opened from a webmail page or an email-newsletter link. Desktop email apps do not identify themselves, so real email traffic is higher than this.',
  },
  {
    key: 'social',
    label: 'Social media',
    help: 'Opened from LinkedIn, Facebook, X, Instagram, YouTube or a similar platform.',
  },
  {
    key: 'messaging',
    label: 'Messaging & chat',
    help: 'Opened from WhatsApp, Teams, Slack, Telegram or a similar app that identifies itself.',
  },
  {
    key: 'search',
    label: 'Search engine',
    help: 'Opened from a search results page.',
  },
  {
    key: 'website',
    label: 'Another website',
    help: 'Opened from a page on another site — for example a partner organisation or a hospital intranet.',
  },
  {
    key: 'direct',
    label: 'Direct, QR or app',
    help: 'No source was reported by the browser. This covers QR codes, printed links, desktop email apps and most messaging apps — it is not one channel.',
  },
] as const;

export const SOURCE_CATEGORY_KEYS: readonly SourceCategory[] = SOURCE_CATEGORIES.map(
  (c) => c.key,
);

export function sourceCategoryLabel(key: string | null | undefined): string {
  return SOURCE_CATEGORIES.find((c) => c.key === key)?.label ?? 'Direct, QR or app';
}

/* ------------------------------------------------------------------ */
/* Host tables                                                         */
/* ------------------------------------------------------------------ */

/**
 * Exact host (or parent domain) → category + display name.
 *
 * Matching is done on the host and on each of its parent domains, so
 * `l.facebook.com` and `m.facebook.com` both resolve through `facebook.com`
 * without needing their own entries.
 */
const KNOWN_HOSTS: Record<string, { category: SourceCategory; label: string }> = {
  // --- Webmail ---
  'mail.google.com': { category: 'email', label: 'Gmail' },
  'com.google.android.gm': { category: 'email', label: 'Gmail' },
  'outlook.live.com': { category: 'email', label: 'Outlook' },
  'outlook.office.com': { category: 'email', label: 'Outlook' },
  'outlook.office365.com': { category: 'email', label: 'Outlook' },
  'outlook.com': { category: 'email', label: 'Outlook' },
  'mail.yahoo.com': { category: 'email', label: 'Yahoo Mail' },
  'mail.proton.me': { category: 'email', label: 'Proton Mail' },
  'mail.aol.com': { category: 'email', label: 'AOL Mail' },
  'roundcube.net': { category: 'email', label: 'Roundcube' },
  'zimbra.com': { category: 'email', label: 'Zimbra' },
  // Newsletter / campaign senders, which redirect through their own domains.
  'list-manage.com': { category: 'email', label: 'Mailchimp' },
  'mailchi.mp': { category: 'email', label: 'Mailchimp' },
  'sendgrid.net': { category: 'email', label: 'SendGrid' },
  'mailgun.org': { category: 'email', label: 'Mailgun' },
  'constantcontact.com': { category: 'email', label: 'Constant Contact' },
  'campaign-archive.com': { category: 'email', label: 'Mailchimp' },
  'hs-sites.com': { category: 'email', label: 'HubSpot' },

  // --- Social ---
  'linkedin.com': { category: 'social', label: 'LinkedIn' },
  'lnkd.in': { category: 'social', label: 'LinkedIn' },
  'facebook.com': { category: 'social', label: 'Facebook' },
  'fb.com': { category: 'social', label: 'Facebook' },
  'fb.me': { category: 'social', label: 'Facebook' },
  'instagram.com': { category: 'social', label: 'Instagram' },
  'twitter.com': { category: 'social', label: 'X (Twitter)' },
  'x.com': { category: 'social', label: 'X (Twitter)' },
  't.co': { category: 'social', label: 'X (Twitter)' },
  'youtube.com': { category: 'social', label: 'YouTube' },
  'youtu.be': { category: 'social', label: 'YouTube' },
  'reddit.com': { category: 'social', label: 'Reddit' },
  'threads.net': { category: 'social', label: 'Threads' },
  'threads.com': { category: 'social', label: 'Threads' },
  'bsky.app': { category: 'social', label: 'Bluesky' },
  'tiktok.com': { category: 'social', label: 'TikTok' },
  'pinterest.com': { category: 'social', label: 'Pinterest' },

  // --- Messaging & chat ---
  'web.whatsapp.com': { category: 'messaging', label: 'WhatsApp' },
  'whatsapp.com': { category: 'messaging', label: 'WhatsApp' },
  'teams.microsoft.com': { category: 'messaging', label: 'Microsoft Teams' },
  'teams.live.com': { category: 'messaging', label: 'Microsoft Teams' },
  'slack.com': { category: 'messaging', label: 'Slack' },
  't.me': { category: 'messaging', label: 'Telegram' },
  'telegram.org': { category: 'messaging', label: 'Telegram' },
  'discord.com': { category: 'messaging', label: 'Discord' },
  'messenger.com': { category: 'messaging', label: 'Messenger' },
  'signal.org': { category: 'messaging', label: 'Signal' },

  // --- Search ---
  'google.com': { category: 'search', label: 'Google' },
  'google.ca': { category: 'search', label: 'Google' },
  'bing.com': { category: 'search', label: 'Bing' },
  'duckduckgo.com': { category: 'search', label: 'DuckDuckGo' },
  'search.yahoo.com': { category: 'search', label: 'Yahoo Search' },
  'ecosia.org': { category: 'search', label: 'Ecosia' },
  'baidu.com': { category: 'search', label: 'Baidu' },
  'yandex.com': { category: 'search', label: 'Yandex' },
};

/**
 * Secondary pass for hosts we do not know by name. Campaign senders and
 * corporate mail gateways are endlessly varied (`click.mail.ca`,
 * `links.newsletter.example.org`, `email.trust.nhs.uk`), so a small set of
 * conservative shapes catches the common ones. Deliberately checked AFTER the
 * exact table so a known host is never re-classified by a substring.
 */
const EMAIL_HOST_HINTS = [/^click\./, /^clicks\./, /^links?\./, /^email\./, /^mail\./, /^e\./];

/** Any Google property whose host starts with this is still Search to a reader. */
const GOOGLE_SEARCH_PREFIX = /^(www\.)?google\.[a-z.]{2,6}$/;

/* ------------------------------------------------------------------ */
/* Parsing                                                             */
/* ------------------------------------------------------------------ */

export interface ParsedSource {
  category: SourceCategory;
  /**
   * Lowercased host with any leading `www.` removed, or null when nothing was
   * reported (or when the referrer was our own site).
   */
  host: string | null;
  /** Friendly name for a known platform; otherwise the bare host. */
  label: string;
}

const DIRECT: ParsedSource = { category: 'direct', host: null, label: 'Direct, QR or app' };

/** Hosts are compared against themselves and every parent domain. */
function hostCandidates(host: string): string[] {
  const parts = host.split('.');
  const out: string[] = [];
  for (let i = 0; i < parts.length - 1; i++) out.push(parts.slice(i).join('.'));
  // A single-label host (e.g. an intranet name like `portal`) has no parent.
  if (out.length === 0) out.push(host);
  return out;
}

/**
 * Extract the host from a Referer header value.
 *
 * Returns null for anything unparseable — a malformed header must never throw
 * inside the tracked-link route, because a broken referrer is not a reason to
 * fail somebody's click.
 */
export function referrerHost(referer: string | null | undefined): string | null {
  const raw = (referer ?? '').trim();
  if (!raw) return null;
  try {
    const url = new URL(raw);
    // `android-app://com.google.android.gm` parses with an empty hostname in
    // some runtimes; fall back to the pathname-ish remainder.
    const host = (url.hostname || url.href.replace(/^[a-z-]+:\/\//i, '').split('/')[0])
      .toLowerCase()
      .replace(/\.$/, '')
      .replace(/^www\./, '');
    return host || null;
  } catch {
    return null;
  }
}

/**
 * Classify a Referer header into a channel.
 *
 * `selfHost` is the host serving the request: a visitor already on our own site
 * who follows a tracked link is not an outreach channel, and recording our own
 * domain as a traffic source would be both meaningless and the single largest
 * bar on the chart.
 */
export function classifyReferrer(
  referer: string | null | undefined,
  selfHost?: string | null,
): ParsedSource {
  const host = referrerHost(referer);
  if (!host) return DIRECT;

  const self = (selfHost ?? '').toLowerCase().replace(/^www\./, '').split(':')[0];
  if (self && (host === self || host.endsWith(`.${self}`))) return DIRECT;

  for (const candidate of hostCandidates(host)) {
    const known = KNOWN_HOSTS[candidate];
    if (known) return { category: known.category, host, label: known.label };
  }

  if (GOOGLE_SEARCH_PREFIX.test(host)) {
    return { category: 'search', host, label: 'Google' };
  }

  if (EMAIL_HOST_HINTS.some((re) => re.test(host))) {
    return { category: 'email', host, label: host };
  }

  return { category: 'website', host, label: host };
}

/* ------------------------------------------------------------------ */
/* Campaign tags                                                       */
/* ------------------------------------------------------------------ */

export const MAX_CAMPAIGN_LENGTH = 32;

/** Query params accepted as a channel tag, in precedence order. */
export const CAMPAIGN_QUERY_PARAMS = ['s', 'utm_source'] as const;

/**
 * An ambassador's own label for where they put a link ("newsletter", "qr-poster").
 *
 * Strictly narrowed to lowercase, digits and hyphens: this value is written by
 * whoever holds the link, is stored, and is later rendered on a public page —
 * so it is normalised to a shape that cannot carry markup, whitespace tricks or
 * an essay. Anything that does not survive normalisation is dropped rather than
 * stored in a mangled form.
 */
export function normalizeCampaign(raw: string | null | undefined): string | null {
  const value = (raw ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, MAX_CAMPAIGN_LENGTH)
    .replace(/-+$/g, '');
  return value.length >= 2 ? value : null;
}

/** Suggested tags offered in the admin link builder. */
export const CAMPAIGN_SUGGESTIONS = [
  'newsletter',
  'email',
  'qr-poster',
  'conference',
  'linkedin',
  'partner-site',
  'presentation',
] as const;
