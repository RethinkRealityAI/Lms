import { describe, it, expect } from 'vitest';
import {
  FEEDBACK_TYPES,
  FEEDBACK_STATUSES,
  isFeedbackType,
  isFeedbackStatus,
  categoryLabel,
  isValidCategory,
} from './feedback-taxonomy';

describe('feedback taxonomy', () => {
  it('isFeedbackType accepts the four types and rejects others', () => {
    for (const t of ['contact', 'issue', 'suggestion', 'bug']) expect(isFeedbackType(t)).toBe(true);
    expect(isFeedbackType('nonsense')).toBe(false);
    expect(isFeedbackType(undefined)).toBe(false);
    expect(isFeedbackType(42)).toBe(false);
  });

  it('isFeedbackStatus accepts the three statuses and rejects others', () => {
    for (const s of ['new', 'in_progress', 'resolved']) expect(isFeedbackStatus(s)).toBe(true);
    expect(isFeedbackStatus('done')).toBe(false);
    expect(isFeedbackStatus(null)).toBe(false);
  });

  it('categoryLabel resolves a valid slug and returns null for unknown/empty', () => {
    expect(categoryLabel('issue', 'media_broken')).toBe("Video / image won't load");
    expect(categoryLabel('suggestion', 'accessibility')).toBe('Accessibility');
    expect(categoryLabel('issue', 'not_a_slug')).toBeNull();
    expect(categoryLabel('issue', null)).toBeNull();
    expect(categoryLabel('issue', undefined)).toBeNull();
    // A slug valid for one type is not valid for another.
    expect(categoryLabel('issue', 'accessibility')).toBeNull();
  });

  it('isValidCategory: null is always allowed (optional); wrong-type slugs rejected', () => {
    expect(isValidCategory('issue', null)).toBe(true);
    expect(isValidCategory('issue', undefined)).toBe(true);
    expect(isValidCategory('issue', 'cant_progress')).toBe(true);
    expect(isValidCategory('issue', 'accessibility')).toBe(false); // suggestion-only slug
    expect(isValidCategory('bug', 'certificate')).toBe(true);
    expect(isValidCategory('contact', 'anything')).toBe(false); // contact has no categories
    expect(isValidCategory('contact', null)).toBe(true);
  });

  it('every category slug is unique within its type and every type/status has styling', () => {
    for (const cfg of Object.values(FEEDBACK_TYPES)) {
      const slugs = cfg.categories.map((c) => c.slug);
      expect(new Set(slugs).size).toBe(slugs.length);
      expect(cfg.pillClass).toBeTruthy();
    }
    for (const s of Object.values(FEEDBACK_STATUSES)) {
      expect(s.label).toBeTruthy();
      expect(s.pillClass).toBeTruthy();
    }
  });
});
