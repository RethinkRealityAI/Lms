import { describe, it, expect } from 'vitest';
import { mapGansidQuestion } from './map-quizzes';

describe('mapGansidQuestion', () => {
  it('maps multiple_choice question', () => {
    const q = {
      slide: 1,
      question: 'Which skill is essential?',
      question_type: 'multiple_choice',
      options: ['A', 'B', 'C', 'D'],
    };
    const result = mapGansidQuestion(q, 0);
    expect(result.question_type).toBe('multiple_choice');
    expect(result.question_data).toEqual({ options: ['A', 'B', 'C', 'D'] });
    expect(result.order_index).toBe(0);
  });

  it('maps true_false question with statement', () => {
    const q = {
      slide: 2,
      question: 'Is this true or false?',
      statement: 'The sky is blue.',
      question_type: 'true_false',
      options: ['True', 'False'],
    };
    const result = mapGansidQuestion(q, 1);
    expect(result.question_type).toBe('true_false');
    expect(result.question_data).toMatchObject({ statement: 'The sky is blue.' });
  });

  it('maps likert_scale with 0 points (not graded)', () => {
    const q = {
      slide: 3,
      question: 'How likely?',
      question_type: 'likert_scale',
      options: ['Very Likely', 'Likely', 'Neutral', 'Unlikely', 'Very Unlikely'],
    };
    const result = mapGansidQuestion(q, 2);
    expect(result.question_type).toBe('likert_scale');
    expect(result.points).toBe(0);
    expect(result.question_data).toMatchObject({ scale_labels: q.options });
  });

  it('maps open_text with 0 points and empty correct_answer_data', () => {
    const q = {
      slide: 4,
      question: 'Any comments?',
      question_type: 'open_text',
      options: [],
    };
    const result = mapGansidQuestion(q, 3);
    expect(result.question_type).toBe('open_text');
    expect(result.correct_answer_data).toEqual({});
    expect(result.points).toBe(0);
  });
});
