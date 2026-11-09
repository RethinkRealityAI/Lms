import { describe, it, expect } from 'vitest';
import {
  PROFESSIONS,
  PROFESSION_OTHER_VALUE,
  PROFESSION_SELECT_OPTIONS,
  MAX_PROFESSION_LENGTH,
  isPresetProfession,
  resolveProfession,
  splitStoredProfession,
} from './professions';

describe('PROFESSION_SELECT_OPTIONS', () => {
  it('offers the three presets plus Other, with Other last', () => {
    expect(PROFESSION_SELECT_OPTIONS.map((o) => o.label)).toEqual([
      'Physician',
      'Nurse',
      'Allied health professional',
      'Other',
    ]);
    expect(PROFESSION_SELECT_OPTIONS[PROFESSION_SELECT_OPTIONS.length - 1].value).toBe(
      PROFESSION_OTHER_VALUE,
    );
  });

  it('never uses an empty option value', () => {
    // Radix Select throws on an empty string value.
    for (const o of PROFESSION_SELECT_OPTIONS) expect(o.value).not.toBe('');
  });

  it('keeps the Other sentinel distinct from every real profession', () => {
    expect(PROFESSIONS).not.toContain(PROFESSION_OTHER_VALUE as never);
  });
});

describe('resolveProfession', () => {
  it.each(PROFESSIONS)('stores the preset %s as-is', (preset) => {
    expect(resolveProfession(preset, '')).toBe(preset);
  });

  it('stores the free text when Other is chosen', () => {
    expect(resolveProfession(PROFESSION_OTHER_VALUE, 'Community health worker')).toBe(
      'Community health worker',
    );
  });

  it('trims and collapses whitespace in the free text', () => {
    expect(resolveProfession(PROFESSION_OTHER_VALUE, '  Social   worker  ')).toBe('Social worker');
  });

  it('caps the free text so a public report can never render an essay', () => {
    const long = 'x'.repeat(500);
    const out = resolveProfession(PROFESSION_OTHER_VALUE, long);
    expect(out).toHaveLength(MAX_PROFESSION_LENGTH);
  });

  it('rejects an empty selection', () => {
    expect(resolveProfession('', '')).toBeNull();
    expect(resolveProfession(null, null)).toBeNull();
    expect(resolveProfession(undefined, undefined)).toBeNull();
  });

  it('rejects Other with nothing typed — the field is mandatory', () => {
    expect(resolveProfession(PROFESSION_OTHER_VALUE, '')).toBeNull();
    expect(resolveProfession(PROFESSION_OTHER_VALUE, '   ')).toBeNull();
    expect(resolveProfession(PROFESSION_OTHER_VALUE, 'x')).toBeNull();
  });

  it('rejects an unknown selection rather than writing it through', () => {
    // A tampered or stale select value must not reach the database.
    expect(resolveProfession('Chief Executive', '')).toBeNull();
    expect(resolveProfession('physician', '')).toBeNull(); // case matters
    expect(resolveProfession('<script>alert(1)</script>', '')).toBeNull();
  });
});

describe('splitStoredProfession', () => {
  it.each(PROFESSIONS)('round-trips the preset %s', (preset) => {
    const split = splitStoredProfession(preset);
    expect(split).toEqual({ selection: preset, otherText: '' });
    expect(resolveProfession(split.selection, split.otherText)).toBe(preset);
  });

  it('round-trips a free-text profession back into Other', () => {
    const split = splitStoredProfession('Community health worker');
    expect(split).toEqual({
      selection: PROFESSION_OTHER_VALUE,
      otherText: 'Community health worker',
    });
    expect(resolveProfession(split.selection, split.otherText)).toBe('Community health worker');
  });

  it('round-trips legacy EdApp free-text values without losing them', () => {
    // Imported occupations are arbitrary strings; editing a profile must not
    // silently drop one just because it is not a preset.
    for (const legacy of ['RN', 'Paediatric Haematologist', 'Nurse Practitioner']) {
      const split = splitStoredProfession(legacy);
      expect(resolveProfession(split.selection, split.otherText)).toBe(legacy);
    }
  });

  it('treats empty/null as nothing selected', () => {
    expect(splitStoredProfession(null)).toEqual({ selection: '', otherText: '' });
    expect(splitStoredProfession('')).toEqual({ selection: '', otherText: '' });
    expect(splitStoredProfession('   ')).toEqual({ selection: '', otherText: '' });
  });
});

describe('isPresetProfession', () => {
  it('recognises the presets and nothing else', () => {
    for (const p of PROFESSIONS) expect(isPresetProfession(p)).toBe(true);
    expect(isPresetProfession('Other')).toBe(false);
    expect(isPresetProfession(PROFESSION_OTHER_VALUE)).toBe(false);
    expect(isPresetProfession(null)).toBe(false);
    expect(isPresetProfession('')).toBe(false);
  });
});
