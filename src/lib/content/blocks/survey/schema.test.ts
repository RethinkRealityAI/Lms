import { describe, it, expect } from 'vitest';
import { surveyDataSchema, surveyQuestionSchema, LIKERT_SCALES } from './schema';

describe('surveyDataSchema', () => {
  it('parses minimal data with empty questions', () => {
    const result = surveyDataSchema.parse({ questions: [] });
    expect(result.questions).toEqual([]);
  });

  it('defaults questions to empty array when omitted', () => {
    const result = surveyDataSchema.parse({});
    expect(result.questions).toEqual([]);
  });

  it('parses full survey data', () => {
    const result = surveyDataSchema.parse({
      title: 'Course Feedback',
      intro: 'Please rate your experience.',
      questions: [
        { id: 'q1', type: 'likert', question: 'How likely?', scale: 'likelihood', required: true },
        { id: 'q2', type: 'free_text', question: 'Comments?', required: false },
      ],
      submit_label: 'Submit',
      thank_you_message: 'Thanks!',
    });

    expect(result.title).toBe('Course Feedback');
    expect(result.questions).toHaveLength(2);
    expect(result.questions[0].type).toBe('likert');
    expect(result.questions[1].type).toBe('free_text');
  });

  it('allows optional fields to be absent', () => {
    const result = surveyDataSchema.parse({ questions: [] });
    expect(result.title).toBeUndefined();
    expect(result.intro).toBeUndefined();
    expect(result.submit_label).toBeUndefined();
    expect(result.thank_you_message).toBeUndefined();
  });
});

describe('surveyQuestionSchema', () => {
  it('parses a valid likert question', () => {
    const q = surveyQuestionSchema.parse({
      id: 'q1',
      type: 'likert',
      question: 'How satisfied were you?',
      scale: 'satisfaction',
      required: true,
    });
    expect(q.type).toBe('likert');
    expect(q.scale).toBe('satisfaction');
  });

  it('parses a valid free_text question', () => {
    const q = surveyQuestionSchema.parse({
      id: 'q2',
      type: 'free_text',
      question: 'Any comments?',
      placeholder: 'Share your thoughts…',
      required: false,
    });
    expect(q.type).toBe('free_text');
    expect(q.placeholder).toBe('Share your thoughts…');
  });

  it('rejects invalid question type', () => {
    expect(() =>
      surveyQuestionSchema.parse({ id: 'x', type: 'slider', question: 'Q?' })
    ).toThrow();
  });

  it('rejects invalid scale', () => {
    expect(() =>
      surveyQuestionSchema.parse({ id: 'x', type: 'likert', question: 'Q?', scale: 'emotion' })
    ).toThrow();
  });
});

describe('LIKERT_SCALES', () => {
  it('likelihood scale has 5 options', () => {
    expect(LIKERT_SCALES.likelihood).toHaveLength(5);
    expect(LIKERT_SCALES.likelihood[0]).toBe('Very Likely');
    expect(LIKERT_SCALES.likelihood[4]).toBe('Very Unlikely');
  });

  it('agreement scale has 5 options', () => {
    expect(LIKERT_SCALES.agreement).toHaveLength(5);
    expect(LIKERT_SCALES.agreement[0]).toBe('Strongly Agree');
  });

  it('satisfaction scale has 5 options', () => {
    expect(LIKERT_SCALES.satisfaction).toHaveLength(5);
    expect(LIKERT_SCALES.satisfaction[0]).toBe('Very Satisfied');
  });
});
