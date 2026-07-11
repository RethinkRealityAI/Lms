import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QuizInlineEditor } from './editor';
import type { QuizInlineData } from '@/lib/content/blocks/quiz-inline/schema';

function makeData(overrides: Partial<QuizInlineData> = {}): QuizInlineData {
  return {
    question_type: 'select_all',
    question: 'Which of the following apply?',
    options: ['Pneumonia', 'Fluid overload', 'Sepsis', 'Acute Chest Syndrome'],
    correct_answer: 'Pneumonia; Sepsis',
    show_feedback: true,
    ...overrides,
  } as QuizInlineData;
}

describe('QuizInlineEditor — select_all correct_answer shapes', () => {
  it('renders without crashing when correct_answer is an ARRAY (regression)', () => {
    // SCAGO-imported select_all quizzes store correct_answer as string[]. The Zod
    // schema types it as string, so the editor called .split on the array and threw
    // "(e ?? '').split is not a function", crashing the whole editor page.
    expect(() =>
      render(
        <QuizInlineEditor
          data={makeData({ correct_answer: ['Pneumonia', 'Sepsis'] as unknown as string })}
          block={{ id: 'test-id' }}
          onChange={vi.fn()}
        />,
      ),
    ).not.toThrow();
    expect(screen.getByDisplayValue('Which of the following apply?')).toBeInTheDocument();
  });

  it('renders without crashing when correct_answer is a "; "-joined string', () => {
    expect(() =>
      render(
        <QuizInlineEditor
          data={makeData({ correct_answer: 'Pneumonia; Sepsis' })}
          block={{ id: 'test-id' }}
          onChange={vi.fn()}
        />,
      ),
    ).not.toThrow();
  });
});
