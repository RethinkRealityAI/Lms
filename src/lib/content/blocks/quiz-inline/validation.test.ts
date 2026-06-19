import { describe, it, expect } from 'vitest';
import { getQuizConfigError, isQuizSatisfiable, isGatedQuizType } from './validation';

describe('isGatedQuizType', () => {
  it('gates the interactive types', () => {
    for (const t of ['multiple_choice', 'true_false', 'categorize', 'select_all']) {
      expect(isGatedQuizType(t)).toBe(true);
    }
  });
  it('does not gate swipe / unknown / nullish', () => {
    expect(isGatedQuizType('swipe')).toBe(false);
    expect(isGatedQuizType('mystery')).toBe(false);
    expect(isGatedQuizType(undefined)).toBe(false);
  });
});

describe('getQuizConfigError — multiple_choice / true_false', () => {
  it('passes when correct_answer is one of the options', () => {
    expect(
      getQuizConfigError({ question_type: 'multiple_choice', options: ['A', 'B'], correct_answer: 'B' }),
    ).toBeNull();
  });
  it('flags a correct_answer that matches no option (the GANSID Module 1 bug)', () => {
    expect(
      getQuizConfigError({ question_type: 'multiple_choice', options: ['A', 'B'], correct_answer: 'C' }),
    ).toMatch(/does not match/i);
  });
  it('flags an empty / missing correct_answer', () => {
    expect(getQuizConfigError({ question_type: 'multiple_choice', options: ['A'], correct_answer: '' }))
      .toMatch(/no correct answer/i);
    expect(getQuizConfigError({ question_type: 'true_false', options: ['True', 'False'] }))
      .toMatch(/no correct answer/i);
  });
});

describe('getQuizConfigError — select_all', () => {
  it('accepts the semicolon-separated string form', () => {
    expect(
      getQuizConfigError({ question_type: 'select_all', options: ['A', 'B', 'C'], correct_answer: 'A; C' }),
    ).toBeNull();
  });
  it('flags an empty correct_answer (the SCAGO Module 4 bug)', () => {
    expect(getQuizConfigError({ question_type: 'select_all', options: [''], correct_answer: '' }))
      .toMatch(/no correct options/i);
  });
  it('flags a correct token that is not an option', () => {
    expect(
      getQuizConfigError({ question_type: 'select_all', options: ['A', 'B'], correct_answer: 'A; Z' }),
    ).toMatch(/do not match/i);
  });
});

describe('getQuizConfigError — categorize', () => {
  it('passes when at least one category has items', () => {
    expect(
      getQuizConfigError({ question_type: 'categorize', categories: [{ name: 'X', items: ['a'] }] }),
    ).toBeNull();
  });
  it('flags empty categories', () => {
    expect(getQuizConfigError({ question_type: 'categorize', categories: [] })).toMatch(/no categories/i);
  });
});

describe('isQuizSatisfiable', () => {
  it('mirrors getQuizConfigError', () => {
    expect(isQuizSatisfiable({ question_type: 'multiple_choice', options: ['A'], correct_answer: 'A' })).toBe(true);
    expect(isQuizSatisfiable({ question_type: 'multiple_choice', options: ['A'], correct_answer: 'B' })).toBe(false);
  });
  it('treats swipe as satisfiable (never gates)', () => {
    expect(isQuizSatisfiable({ question_type: 'swipe' })).toBe(true);
  });
});

describe('getQuizConfigError — missing/unknown question type', () => {
  it('flags a quiz_inline with no question type (broken placeholder)', () => {
    expect(getQuizConfigError({})).toMatch(/no question type/i);
    expect(getQuizConfigError({ question_type: 'bogus' as never })).toMatch(/no question type/i);
  });
  it('does not gate an unknown type', () => {
    expect(isGatedQuizType(undefined)).toBe(false);
    expect(isGatedQuizType('bogus')).toBe(false);
  });
});
