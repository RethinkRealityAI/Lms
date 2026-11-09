import { describe, it, expect } from 'vitest';
import {
  SOURCE_CATEGORIES,
  SOURCE_CATEGORY_KEYS,
  classifyReferrer,
  referrerHost,
  normalizeCampaign,
  sourceCategoryLabel,
  MAX_CAMPAIGN_LENGTH,
  CAMPAIGN_SUGGESTIONS,
} from './sources';

describe('referrerHost', () => {
  it('takes the host and nothing else', () => {
    expect(referrerHost('https://intranet.hospital.ca/staff/news?user=12345')).toBe(
      'intranet.hospital.ca',
    );
  });

  it('never returns the path or query — that is where identifying detail lives', () => {
    const host = referrerHost('https://example.org/u/dr-jane-smith?token=abc123');
    expect(host).toBe('example.org');
    expect(host).not.toContain('/');
    expect(host).not.toContain('?');
    expect(host).not.toContain('dr-jane-smith');
    expect(host).not.toContain('abc123');
  });

  it('lowercases and strips www and a trailing dot', () => {
    expect(referrerHost('https://WWW.Example.COM./page')).toBe('example.com');
  });

  it('returns null for nothing reported', () => {
    for (const v of [null, undefined, '', '   ']) expect(referrerHost(v)).toBeNull();
  });

  it('returns null for a malformed header instead of throwing', () => {
    // A broken referrer must never fail somebody's click.
    for (const v of ['not a url', 'http://', '://///', '%%%']) {
      expect(() => referrerHost(v)).not.toThrow();
      expect(referrerHost(v)).toBeNull();
    }
  });

  it('handles the android-app scheme used by the Gmail app', () => {
    expect(referrerHost('android-app://com.google.android.gm')).toBe('com.google.android.gm');
  });
});

describe('classifyReferrer', () => {
  it('reports no referrer as direct, with no host stored', () => {
    const out = classifyReferrer(null);
    expect(out.category).toBe('direct');
    expect(out.host).toBeNull();
  });

  it.each([
    ['https://mail.google.com/mail/u/0/#inbox', 'email', 'Gmail'],
    ['android-app://com.google.android.gm', 'email', 'Gmail'],
    ['https://outlook.office.com/mail/inbox', 'email', 'Outlook'],
    ['https://us17.list-manage.com/track/click', 'email', 'Mailchimp'],
    ['https://www.linkedin.com/feed/', 'social', 'LinkedIn'],
    ['https://lnkd.in/abc', 'social', 'LinkedIn'],
    ['https://l.facebook.com/l.php', 'social', 'Facebook'],
    ['https://m.facebook.com/story', 'social', 'Facebook'],
    ['https://t.co/xyz', 'social', 'X (Twitter)'],
    ['https://x.com/someone/status/1', 'social', 'X (Twitter)'],
    ['https://teams.microsoft.com/l/chat', 'messaging', 'Microsoft Teams'],
    ['https://web.whatsapp.com/', 'messaging', 'WhatsApp'],
    ['https://t.me/somechannel', 'messaging', 'Telegram'],
    ['https://www.google.com/search?q=sickle+cell', 'search', 'Google'],
    ['https://duckduckgo.com/?q=x', 'search', 'DuckDuckGo'],
  ])('classifies %s as %s (%s)', (referer, category, label) => {
    const out = classifyReferrer(referer);
    expect(out.category).toBe(category);
    expect(out.label).toBe(label);
  });

  it('resolves subdomains through their parent domain', () => {
    // No explicit entry for these; they must still land on the platform.
    expect(classifyReferrer('https://ca.linkedin.com/in/someone').label).toBe('LinkedIn');
    expect(classifyReferrer('https://business.facebook.com/x').label).toBe('Facebook');
  });

  it('treats an unknown host as another website, keeping the bare host as its label', () => {
    const out = classifyReferrer('https://intranet.tbrhsc.net/news/sickle-cell');
    expect(out.category).toBe('website');
    expect(out.host).toBe('intranet.tbrhsc.net');
    expect(out.label).toBe('intranet.tbrhsc.net');
  });

  it('guesses corporate mail gateways as email', () => {
    for (const url of [
      'https://click.mailer.example.org/x',
      'https://links.newsletter.example.ca/y',
      'https://email.trust.example.uk/z',
    ]) {
      expect(classifyReferrer(url).category, url).toBe('email');
    }
  });

  it('never lets a hint re-classify a host that is known by name', () => {
    // mail.google.com starts with "mail." but must stay Gmail, not a bare guess.
    expect(classifyReferrer('https://mail.google.com/x').label).toBe('Gmail');
  });

  it('treats our own site as direct, not as a traffic source', () => {
    // Otherwise our own domain would be the largest bar on the chart and would
    // tell the reader nothing about outreach.
    const out = classifyReferrer('https://learn.example.ca/scago', 'learn.example.ca');
    expect(out.category).toBe('direct');
    expect(out.host).toBeNull();
  });

  it('treats a subdomain of our own site as direct too', () => {
    expect(classifyReferrer('https://app.example.ca/x', 'example.ca').category).toBe('direct');
  });

  it('ignores the port when comparing against our own host', () => {
    expect(classifyReferrer('https://example.ca/x', 'example.ca:3001').category).toBe('direct');
  });

  it('does not mistake a lookalike domain for our own site', () => {
    // `notexample.ca` must not match `example.ca` — endsWith needs the dot.
    const out = classifyReferrer('https://notexample.ca/x', 'example.ca');
    expect(out.category).toBe('website');
    expect(out.host).toBe('notexample.ca');
  });

  it('never returns a category outside the declared set', () => {
    const samples = [
      null,
      '',
      'garbage',
      'https://mail.google.com',
      'https://linkedin.com',
      'https://unknown.example',
      'android-app://com.example.app',
    ];
    for (const s of samples) {
      expect(SOURCE_CATEGORY_KEYS).toContain(classifyReferrer(s).category);
    }
  });
});

describe('SOURCE_CATEGORIES', () => {
  it('has unique keys and ends with direct — the "we could not tell" bucket', () => {
    const keys = SOURCE_CATEGORIES.map((c) => c.key);
    expect(new Set(keys).size).toBe(keys.length);
    expect(keys[keys.length - 1]).toBe('direct');
  });

  it('gives every category a plain-language definition for the public report', () => {
    for (const c of SOURCE_CATEGORIES) {
      expect(c.label.length).toBeGreaterThan(0);
      expect(c.help.length).toBeGreaterThan(20);
    }
  });

  it('labels a known key and falls back for an unknown one', () => {
    expect(sourceCategoryLabel('social')).toBe('Social media');
    expect(sourceCategoryLabel('nonsense')).toBe('Direct, QR or app');
    expect(sourceCategoryLabel(null)).toBe('Direct, QR or app');
  });
});

describe('normalizeCampaign', () => {
  it('keeps a clean tag as-is', () => {
    expect(normalizeCampaign('newsletter')).toBe('newsletter');
    expect(normalizeCampaign('qr-poster')).toBe('qr-poster');
  });

  it('lowercases and collapses separators', () => {
    expect(normalizeCampaign('QR Poster')).toBe('qr-poster');
    expect(normalizeCampaign('spring   2026__campaign')).toBe('spring-2026-campaign');
  });

  it('trims stray separators from both ends', () => {
    expect(normalizeCampaign('  --newsletter--  ')).toBe('newsletter');
  });

  it('caps the length — this value is rendered on a public page', () => {
    const out = normalizeCampaign('a'.repeat(200));
    expect(out).toHaveLength(MAX_CAMPAIGN_LENGTH);
  });

  it('never leaves a trailing hyphen after truncation', () => {
    const out = normalizeCampaign(`${'a'.repeat(MAX_CAMPAIGN_LENGTH - 1)}-tail`);
    expect(out?.endsWith('-')).toBe(false);
  });

  it('drops anything that cannot survive normalisation', () => {
    for (const v of [null, undefined, '', '   ', '!!!', '-', '--', 'a']) {
      expect(normalizeCampaign(v), String(v)).toBeNull();
    }
  });

  it('strips markup rather than storing it mangled', () => {
    const out = normalizeCampaign('<script>alert(1)</script>');
    expect(out).not.toContain('<');
    expect(out).not.toContain('>');
    expect(out).toMatch(/^[a-z0-9-]+$/);
  });

  it('is idempotent — normalising twice changes nothing', () => {
    for (const v of ['QR Poster', 'spring 2026', '--x--y--', 'newsletter']) {
      const once = normalizeCampaign(v);
      expect(normalizeCampaign(once)).toBe(once);
    }
  });

  it('offers only suggestions that survive its own normalisation', () => {
    for (const s of CAMPAIGN_SUGGESTIONS) expect(normalizeCampaign(s)).toBe(s);
  });
});
