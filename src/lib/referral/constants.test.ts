import { describe, it, expect, afterEach } from 'vitest';
import {
  REFERRAL_COOKIE,
  REFERRAL_CODE_PATTERN,
  isValidReferralCode,
  normalizeReferralCode,
  suggestReferralCode,
  isSafeLandingPath,
  sanitizeLandingPath,
  getReferralCodeFromCookie,
  FUNNEL_STEPS,
  SERIES_COLORS,
  FUNNEL_RAMP,
  hasMeaningfulConversion,
} from './constants';

describe('normalizeReferralCode', () => {
  it('lowercases and trims', () => {
    expect(normalizeReferralCode('  NWO-Region  ')).toBe('nwo-region');
  });

  it('treats null/undefined as empty', () => {
    expect(normalizeReferralCode(null)).toBe('');
    expect(normalizeReferralCode(undefined)).toBe('');
  });
});

describe('isValidReferralCode', () => {
  it.each(['nwo', 'northwestern-ontario', 'a1b', 'region-2026', 'x'.repeat(40)])(
    'accepts %s',
    (code) => {
      expect(isValidReferralCode(code)).toBe(true);
    },
  );

  it.each([
    ['', 'empty'],
    ['ab', 'shorter than 3'],
    ['-nwo', 'leading hyphen'],
    ['nwo-', 'trailing hyphen'],
    ['nwo region', 'contains a space'],
    ['nwo_region', 'contains an underscore'],
    ['nwo.region', 'contains a dot'],
    ['nwo/region', 'contains a slash — would break the /r/<code> route'],
    ['x'.repeat(41), 'longer than 40'],
  ])('rejects %s (%s)', (code) => {
    expect(isValidReferralCode(code)).toBe(false);
  });

  it('accepts uppercase input because it normalises first', () => {
    expect(isValidReferralCode('NWO')).toBe(true);
  });

  it('uses the same pattern the database CHECK constraint enforces', () => {
    // If these drift, the UI accepts codes the INSERT then rejects.
    expect(REFERRAL_CODE_PATTERN.source).toBe('^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$');
  });
});

describe('suggestReferralCode', () => {
  it('slugifies a region name', () => {
    expect(suggestReferralCode('Northwestern Ontario')).toBe('northwestern-ontario');
  });

  it('strips accents and punctuation', () => {
    expect(suggestReferralCode('Montréal — Nord!')).toBe('montreal-nord');
  });

  it('collapses repeated separators', () => {
    expect(suggestReferralCode('North   //  West')).toBe('north-west');
  });

  it('never returns a value with a trailing hyphen', () => {
    expect(suggestReferralCode('Ontario ---')).toBe('ontario');
  });

  it('returns empty rather than an invalid stub for very short labels', () => {
    expect(suggestReferralCode('AB')).toBe('');
  });

  it('always produces something the validator accepts', () => {
    for (const label of [
      'Northwestern Ontario',
      'Sickle Cell Awareness — GTA',
      'Région du Nord-Ouest',
      'Partner: St. Michael’s Hospital',
    ]) {
      const code = suggestReferralCode(label);
      expect(code, `label ${label} produced ${code}`).not.toBe('');
      expect(isValidReferralCode(code), `label ${label} produced ${code}`).toBe(true);
    }
  });
});

describe('isSafeLandingPath', () => {
  it('accepts ordinary in-app paths', () => {
    expect(isSafeLandingPath('/scago')).toBe(true);
    expect(isSafeLandingPath('/scago/clinicians?x=1')).toBe(true);
  });

  it.each([
    ['//evil.com', 'protocol-relative URL'],
    ['https://evil.com', 'absolute URL'],
    ['http://evil.com', 'absolute URL'],
    ['/\\evil.com', 'backslash trick'],
    ['scago', 'no leading slash'],
    ['', 'empty'],
  ])('rejects %s (%s) — open redirect', (path) => {
    expect(isSafeLandingPath(path)).toBe(false);
  });

  it('rejects null and undefined', () => {
    expect(isSafeLandingPath(null)).toBe(false);
    expect(isSafeLandingPath(undefined)).toBe(false);
  });
});

describe('sanitizeLandingPath', () => {
  it('passes safe paths through', () => {
    expect(sanitizeLandingPath('/scago/clinicians', '/scago')).toBe('/scago/clinicians');
  });

  it('falls back for unsafe paths', () => {
    expect(sanitizeLandingPath('https://evil.com', '/scago')).toBe('/scago');
    expect(sanitizeLandingPath(null, '/scago')).toBe('/scago');
  });
});

describe('getReferralCodeFromCookie', () => {
  // Stubbing document.cookie replaces the accessor, so restore the original
  // descriptor rather than assigning through the now getter-only property.
  const originalCookie = Object.getOwnPropertyDescriptor(Document.prototype, 'cookie');

  afterEach(() => {
    if (originalCookie) {
      Object.defineProperty(document, 'cookie', {
        ...originalCookie,
        configurable: true,
      });
    }
  });

  function stubCookie(raw: string) {
    Object.defineProperty(document, 'cookie', {
      configurable: true,
      get: () => raw,
    });
  }

  function setCookie(value: string) {
    stubCookie(`other=1; ${REFERRAL_COOKIE}=${value}; another=2`);
  }

  it('reads a valid code', () => {
    setCookie('northwestern-ontario');
    expect(getReferralCodeFromCookie()).toBe('northwestern-ontario');
  });

  it('url-decodes the value', () => {
    setCookie(encodeURIComponent('nwo'));
    expect(getReferralCodeFromCookie()).toBe('nwo');
  });

  it('returns null for a value that is not a legal code', () => {
    // A tampered cookie must never reach the signup metadata.
    setCookie('not a code!');
    expect(getReferralCodeFromCookie()).toBeNull();
  });

  it('returns null when the cookie is absent', () => {
    stubCookie('other=1');
    expect(getReferralCodeFromCookie()).toBeNull();
  });

  it('does not match a cookie whose name merely ends with ours', () => {
    // `not_lms_ref=abc` must not be read as `lms_ref`.
    stubCookie(`not_${REFERRAL_COOKIE}=hijacked`);
    expect(getReferralCodeFromCookie()).toBeNull();
  });

  it('does not throw on a malformed percent-encoding', () => {
    setCookie('%E0%A4%A');
    expect(() => getReferralCodeFromCookie()).not.toThrow();
    expect(getReferralCodeFromCookie()).toBeNull();
  });
});

describe('funnel definition', () => {
  it('has unique, ordered steps', () => {
    const keys = FUNNEL_STEPS.map((s) => s.key);
    expect(new Set(keys).size).toBe(keys.length);
    expect(keys[0]).toBe('visits');
    expect(keys[keys.length - 1]).toBe('certificates');
  });

  it('gives every step a plain-language definition for the public report', () => {
    for (const step of FUNNEL_STEPS) {
      expect(step.label.length).toBeGreaterThan(0);
      expect(step.help.length).toBeGreaterThan(10);
    }
  });

  it('excludes courses_completed, which counts completions not people', () => {
    // Including it would break the funnel's "each stage is a subset of the one
    // above" contract, since one learner can complete several modules.
    expect(FUNNEL_STEPS.map((s) => s.key)).not.toContain('courses_completed');
  });
});

describe('chart palette', () => {
  const HEX = /^#[0-9a-f]{6}$/;

  it('uses validated categorical slots', () => {
    expect(SERIES_COLORS.signups).toBe('#2a78d6');
    expect(SERIES_COLORS.visits).toBe('#eb6834');
  });

  it('keeps the two series distinct', () => {
    expect(SERIES_COLORS.signups).not.toBe(SERIES_COLORS.visits);
  });

  it('has a 5-step single-hue funnel ramp matching the funnel length', () => {
    expect(FUNNEL_RAMP).toHaveLength(FUNNEL_STEPS.length);
    for (const c of FUNNEL_RAMP) expect(c).toMatch(HEX);
    expect(new Set(FUNNEL_RAMP).size).toBe(FUNNEL_RAMP.length);
  });
});

describe('hasMeaningfulConversion', () => {
  it('never shows a conversion for the first stage', () => {
    expect(hasMeaningfulConversion(0, 226, 0)).toBe(false);
  });

  it('suppresses the opens→accounts conversion when signups exceed opens', () => {
    // Windowing artefact: a signup inside the period can trace back to a link
    // open before it. Printing "150% of previous" would read as a bug.
    expect(hasMeaningfulConversion(1, 9, 6)).toBe(false);
  });

  it('shows the opens→accounts conversion when it is coherent', () => {
    expect(hasMeaningfulConversion(1, 3, 226)).toBe(true);
  });

  it('still shows later stages even at 100%, since they share one cohort', () => {
    expect(hasMeaningfulConversion(2, 3, 3)).toBe(true);
    expect(hasMeaningfulConversion(3, 2, 3)).toBe(true);
    expect(hasMeaningfulConversion(4, 1, 2)).toBe(true);
  });

  it('suppresses division by zero', () => {
    expect(hasMeaningfulConversion(2, 0, 0)).toBe(false);
    expect(hasMeaningfulConversion(3, 5, 0)).toBe(false);
  });
});
