import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  surveyDataSchema,
  surveyQuestionSchema,
  createDefaultQuestion,
  questionTypeLabel,
} from './schema';

describe('surveyQuestionSchema', () => {
  it('accepts a valid multiple choice question', () => {
    const result = surveyQuestionSchema.safeParse({
      id: 'q-1',
      type: 'multiple_choice',
      question: 'How satisfied are you?',
      required: true,
      options: ['Very', 'Somewhat', 'Not at all'],
    });
    expect(result.success).toBe(true);
  });

  it('defaults question to empty string and required to false', () => {
    const result = surveyQuestionSchema.safeParse({
      id: 'q-2',
      type: 'text',
    });
    expect(result.success).toBe(true);
    expect(result.data?.question).toBe('');
    expect(result.data?.required).toBe(false);
  });

  it('rejects invalid question types', () => {
    const result = surveyQuestionSchema.safeParse({
      id: 'q-3',
      type: 'essay',
    });
    expect(result.success).toBe(false);
  });
});

describe('surveyDataSchema', () => {
  it('accepts a full survey definition', () => {
    const result = surveyDataSchema.safeParse({
      title: 'Course Feedback',
      description: 'Tell us what you think',
      submit_label: 'Send Feedback',
      questions: [
        { id: 'q-1', type: 'rating', question: 'Overall rating' },
        { id: 'q-2', type: 'textarea', question: 'Comments' },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('defaults title, submit_label, and questions', () => {
    const result = surveyDataSchema.safeParse({});
    expect(result.success).toBe(true);
    expect(result.data?.title).toBe('Survey');
    expect(result.data?.submit_label).toBe('Submit Survey');
    expect(result.data?.questions).toEqual([]);
  });
});

describe('createDefaultQuestion', () => {
  beforeEach(() => {
    vi.stubGlobal('crypto', {
      randomUUID: vi.fn(() => 'test-uuid-1234'),
    });
  });

  it('creates true/false with True and False options', () => {
    const q = createDefaultQuestion('true_false');
    expect(q.type).toBe('true_false');
    expect(q.options).toEqual(['True', 'False']);
    expect(q.id).toBe('test-uuid-1234');
  });

  it('creates multiple choice with two default options', () => {
    const q = createDefaultQuestion('multiple_choice');
    expect(q.options).toEqual(['Option 1', 'Option 2']);
  });

  it('creates scale with min/max defaults', () => {
    const q = createDefaultQuestion('scale');
    expect(q.min_value).toBe(1);
    expect(q.max_value).toBe(10);
    expect(q.increment).toBe(1);
  });

  it('creates text question without options', () => {
    const q = createDefaultQuestion('text');
    expect(q.type).toBe('text');
    expect(q.options).toBeUndefined();
  });
});

describe('questionTypeLabel', () => {
  it('returns human-readable labels for all types', () => {
    expect(questionTypeLabel('true_false')).toBe('True / False');
    expect(questionTypeLabel('multiple_choice')).toBe('Multiple Choice');
    expect(questionTypeLabel('multi_select')).toBe('Multi-Select');
    expect(questionTypeLabel('textarea')).toBe('Long Text');
    expect(questionTypeLabel('rating')).toBe('Star Rating');
    expect(questionTypeLabel('scale')).toBe('Numeric Scale');
  });
});

describe('cloneSurveyDataFromTemplate', () => {
  beforeEach(() => {
    let n = 0;
    vi.stubGlobal('crypto', {
      randomUUID: vi.fn(() => `new-id-${++n}`),
    });
  });

  it('copies survey fields and regenerates question ids', async () => {
    const { cloneSurveyDataFromTemplate } = await import('./schema');
    const result = cloneSurveyDataFromTemplate({
      title: 'Feedback',
      description: 'Post-module',
      submit_label: 'Send',
      questions: [
        { id: 'old-1', type: 'rating', question: 'Rate the module', required: true },
        { id: 'old-2', type: 'textarea', question: 'Comments', required: false },
      ],
    });
    expect(result.title).toBe('Feedback');
    expect(result.questions).toHaveLength(2);
    expect(result.questions[0].id).toBe('new-id-1');
    expect(result.questions[1].id).toBe('new-id-2');
    expect(result.questions[0].question).toBe('Rate the module');
  });
});
