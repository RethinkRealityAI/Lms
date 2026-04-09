import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import QuizInlineViewer from './viewer';

const QUIZ_DATA = {
  question_type: 'multiple_choice' as const,
  question: 'What is 2 + 2?',
  options: ['3', '4', '5'],
  correct_answer: '4',
  show_feedback: true,
};

const DEFAULT_BLOCK = { id: 'block-1', title: 'Quiz', is_visible: true };

describe('QuizInlineViewer', () => {
  it('renders the question text', () => {
    render(<QuizInlineViewer data={QUIZ_DATA} block={DEFAULT_BLOCK} />);
    expect(screen.getByText('What is 2 + 2?')).toBeInTheDocument();
  });

  it('renders all answer options', () => {
    render(<QuizInlineViewer data={QUIZ_DATA} block={DEFAULT_BLOCK} />);
    expect(screen.getByText(/A\. 3/)).toBeInTheDocument();
    expect(screen.getByText(/B\. 4/)).toBeInTheDocument();
    expect(screen.getByText(/C\. 5/)).toBeInTheDocument();
  });

  it('shows Check Answer button initially', () => {
    render(<QuizInlineViewer data={QUIZ_DATA} block={DEFAULT_BLOCK} />);
    expect(screen.getByRole('button', { name: /check answer/i })).toBeInTheDocument();
  });

  it('Check Answer is disabled until an option is selected', () => {
    render(<QuizInlineViewer data={QUIZ_DATA} block={DEFAULT_BLOCK} />);
    expect(screen.getByRole('button', { name: /check answer/i })).toBeDisabled();
  });

  it('enables Check Answer after selecting an option', () => {
    render(<QuizInlineViewer data={QUIZ_DATA} block={DEFAULT_BLOCK} />);
    fireEvent.click(screen.getByText(/B\. 4/));
    expect(screen.getByRole('button', { name: /check answer/i })).not.toBeDisabled();
  });

  it('shows Correct! feedback when the right answer is submitted', () => {
    render(<QuizInlineViewer data={QUIZ_DATA} block={DEFAULT_BLOCK} />);
    fireEvent.click(screen.getByText(/B\. 4/));
    fireEvent.click(screen.getByRole('button', { name: /check answer/i }));
    expect(screen.getByText("That's correct!")).toBeInTheDocument();
  });

  it('does not show Try Again when the answer is correct', () => {
    render(<QuizInlineViewer data={QUIZ_DATA} block={DEFAULT_BLOCK} />);
    fireEvent.click(screen.getByText(/B\. 4/));
    fireEvent.click(screen.getByRole('button', { name: /check answer/i }));
    expect(screen.queryByRole('button', { name: /try again/i })).not.toBeInTheDocument();
  });

  it('shows Try Again when the answer is wrong', () => {
    render(<QuizInlineViewer data={QUIZ_DATA} block={DEFAULT_BLOCK} />);
    fireEvent.click(screen.getByText(/A\. 3/));
    fireEvent.click(screen.getByRole('button', { name: /check answer/i }));
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });

  it('shows Incorrect feedback without revealing the correct answer', () => {
    render(<QuizInlineViewer data={QUIZ_DATA} block={DEFAULT_BLOCK} />);
    fireEvent.click(screen.getByText(/C\. 5/));
    fireEvent.click(screen.getByRole('button', { name: /check answer/i }));
    expect(screen.getByText(/not quite/i)).toBeInTheDocument();
    // Should NOT reveal the correct answer
    expect(screen.queryByText(/correct answer is/i)).not.toBeInTheDocument();
  });

  it('calls onComplete when the correct answer is submitted', () => {
    const onComplete = vi.fn();
    render(<QuizInlineViewer data={QUIZ_DATA} block={DEFAULT_BLOCK} onComplete={onComplete} />);
    fireEvent.click(screen.getByText(/B\. 4/));
    fireEvent.click(screen.getByRole('button', { name: /check answer/i }));
    expect(onComplete).toHaveBeenCalledOnce();
  });

  it('does not call onComplete when the wrong answer is submitted', () => {
    const onComplete = vi.fn();
    render(<QuizInlineViewer data={QUIZ_DATA} block={DEFAULT_BLOCK} onComplete={onComplete} />);
    fireEvent.click(screen.getByText(/A\. 3/));
    fireEvent.click(screen.getByRole('button', { name: /check answer/i }));
    expect(onComplete).not.toHaveBeenCalled();
  });

  it('resets selection on Try Again', () => {
    render(<QuizInlineViewer data={QUIZ_DATA} block={DEFAULT_BLOCK} />);
    fireEvent.click(screen.getByText(/A\. 3/));
    fireEvent.click(screen.getByRole('button', { name: /check answer/i }));
    fireEvent.click(screen.getByRole('button', { name: /try again/i }));
    // Check Answer button should reappear and be disabled (no selection)
    expect(screen.getByRole('button', { name: /check answer/i })).toBeDisabled();
  });
});

describe('QuizInlineViewer — custom feedback', () => {
  it('shows custom correct reinforcement', () => {
    const data = { ...QUIZ_DATA, feedback_correct: 'Well done, champion!' };
    render(<QuizInlineViewer data={data} block={DEFAULT_BLOCK} />);
    fireEvent.click(screen.getByText(/B\. 4/));
    fireEvent.click(screen.getByRole('button', { name: /check answer/i }));
    expect(screen.getByText('Well done, champion!')).toBeInTheDocument();
  });

  it('shows custom incorrect reinforcement', () => {
    const data = { ...QUIZ_DATA, feedback_incorrect: 'Try reviewing section 3.' };
    render(<QuizInlineViewer data={data} block={DEFAULT_BLOCK} />);
    fireEvent.click(screen.getByText(/A\. 3/));
    fireEvent.click(screen.getByRole('button', { name: /check answer/i }));
    expect(screen.getByText('Try reviewing section 3.')).toBeInTheDocument();
  });

  it('shows explanation after answering correctly', () => {
    const data = { ...QUIZ_DATA, explanation: 'Because 2+2=4 by basic addition.' };
    render(<QuizInlineViewer data={data} block={DEFAULT_BLOCK} />);
    fireEvent.click(screen.getByText(/B\. 4/));
    fireEvent.click(screen.getByRole('button', { name: /check answer/i }));
    expect(screen.getByText('Because 2+2=4 by basic addition.')).toBeInTheDocument();
  });

  it('shows explanation after answering incorrectly', () => {
    const data = { ...QUIZ_DATA, explanation: 'The answer is 4.' };
    render(<QuizInlineViewer data={data} block={DEFAULT_BLOCK} />);
    fireEvent.click(screen.getByText(/A\. 3/));
    fireEvent.click(screen.getByRole('button', { name: /check answer/i }));
    expect(screen.getByText('The answer is 4.')).toBeInTheDocument();
  });

  it('does not show explanation before answering', () => {
    const data = { ...QUIZ_DATA, explanation: 'Secret explanation' };
    render(<QuizInlineViewer data={data} block={DEFAULT_BLOCK} />);
    expect(screen.queryByText('Secret explanation')).not.toBeInTheDocument();
  });

  it('shows hint before answering', () => {
    const data = { ...QUIZ_DATA, hint: 'Think about basic addition.' };
    render(<QuizInlineViewer data={data} block={DEFAULT_BLOCK} />);
    expect(screen.getByText('Think about basic addition.')).toBeInTheDocument();
  });

  it('hides hint after answering', () => {
    const data = { ...QUIZ_DATA, hint: 'Think about basic addition.' };
    render(<QuizInlineViewer data={data} block={DEFAULT_BLOCK} />);
    fireEvent.click(screen.getByText(/B\. 4/));
    fireEvent.click(screen.getByRole('button', { name: /check answer/i }));
    expect(screen.queryByText('Think about basic addition.')).not.toBeInTheDocument();
  });

  it('does not show feedback when show_feedback is false', () => {
    const data = { ...QUIZ_DATA, show_feedback: false };
    render(<QuizInlineViewer data={data} block={DEFAULT_BLOCK} />);
    fireEvent.click(screen.getByText(/B\. 4/));
    fireEvent.click(screen.getByRole('button', { name: /check answer/i }));
    expect(screen.queryByText(/correct/i)).not.toBeInTheDocument();
  });
});
