/**
 * Profession — the "I am a…" field collected at signup.
 *
 * WHY IT IS MANDATORY: outreach reporting has to be able to say *who* was
 * reached ("physicians, nurses and other members of the healthcare team"), not
 * just how many. When this was an optional profile field only ~3% of learners
 * ever filled it in, which made the breakdown on the ambassador report useless.
 *
 * STORAGE: persisted to `users.occupation`, the column that already exists and
 * that the profile page, admin user tools and the referral report all read.
 * The UI calls it "profession"; the column keeps its original name so no
 * existing data, export or query has to move.
 *
 * Client- and server-safe — no imports.
 */

/**
 * The preset options. Kept deliberately short: a long list fragments the
 * breakdown and slows signup. Anything outside these three goes through
 * "Other" as free text.
 */
export const PROFESSIONS = [
  'Physician',
  'Nurse',
  'Allied health professional',
] as const;

export type PresetProfession = (typeof PROFESSIONS)[number];

/** Sentinel for the select; never stored. */
export const PROFESSION_OTHER_VALUE = '__other__';

export const MAX_PROFESSION_LENGTH = 80;

export function isPresetProfession(value: string | null | undefined): value is PresetProfession {
  return PROFESSIONS.includes((value ?? '') as PresetProfession);
}

/**
 * Turn the form's two inputs into the single value to store.
 * Returns null when the answer is incomplete — the caller treats that as a
 * validation failure rather than silently saving a blank profession.
 */
export function resolveProfession(
  selection: string | null | undefined,
  otherText: string | null | undefined,
): string | null {
  const choice = (selection ?? '').trim();
  if (!choice) return null;

  if (choice === PROFESSION_OTHER_VALUE) {
    const free = (otherText ?? '').trim().replace(/\s+/g, ' ');
    if (free.length < 2) return null;
    return free.slice(0, MAX_PROFESSION_LENGTH);
  }

  // Only a known preset may be stored directly; anything else is a tampered
  // or stale select value and is rejected rather than written through.
  return isPresetProfession(choice) ? choice : null;
}

/**
 * Inverse of resolveProfession — splits a stored value back into the two form
 * inputs, so editing a profile pre-selects "Other" and keeps the typed text.
 */
export function splitStoredProfession(stored: string | null | undefined): {
  selection: string;
  otherText: string;
} {
  const value = (stored ?? '').trim();
  if (!value) return { selection: '', otherText: '' };
  if (isPresetProfession(value)) return { selection: value, otherText: '' };
  return { selection: PROFESSION_OTHER_VALUE, otherText: value };
}

/** Options for a <Select>, with the free-text escape hatch last. */
export const PROFESSION_SELECT_OPTIONS: ReadonlyArray<{ value: string; label: string }> = [
  ...PROFESSIONS.map((p) => ({ value: p, label: p })),
  { value: PROFESSION_OTHER_VALUE, label: 'Other' },
];
