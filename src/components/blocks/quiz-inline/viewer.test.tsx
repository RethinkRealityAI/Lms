import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import QuizInlineViewer from './viewer';

// The persistence tests need a mocked Supabase client (the render-only tests above
// pass no `context`, so persistAnswer short-circuits and never touches it).
vi.mock('@/lib/supabase/client', () => ({ createClient: vi.fn() }));
import { createClient } from '@/lib/supabase/client';

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

// ─── SelectAll quiz type ───────────────────────────────────────────────────────

const SELECT_ALL_DATA = {
  question_type: 'select_all' as const,
  question: 'Which are primary colours?',
  options: ['Red', 'Green', 'Blue', 'Purple'],
  correct_answer: 'Red; Blue',
  show_feedback: true,
};

describe('QuizInlineViewer — select_all', () => {
  it('renders the question', () => {
    render(<QuizInlineViewer data={SELECT_ALL_DATA} block={DEFAULT_BLOCK} />);
    expect(screen.getByText('Which are primary colours?')).toBeInTheDocument();
  });

  it('renders all options as buttons', () => {
    render(<QuizInlineViewer data={SELECT_ALL_DATA} block={DEFAULT_BLOCK} />);
    expect(screen.getByText('Red')).toBeInTheDocument();
    expect(screen.getByText('Green')).toBeInTheDocument();
    expect(screen.getByText('Blue')).toBeInTheDocument();
    expect(screen.getByText('Purple')).toBeInTheDocument();
  });

  it('shows "Select all that apply" instruction by default', () => {
    render(<QuizInlineViewer data={SELECT_ALL_DATA} block={DEFAULT_BLOCK} />);
    expect(screen.getByText('Select all that apply')).toBeInTheDocument();
  });

  it('Check Answer is disabled until at least one option is selected', () => {
    render(<QuizInlineViewer data={SELECT_ALL_DATA} block={DEFAULT_BLOCK} />);
    expect(screen.getByRole('button', { name: /check answer/i })).toBeDisabled();
  });

  it('enables Check Answer after selecting an option', () => {
    render(<QuizInlineViewer data={SELECT_ALL_DATA} block={DEFAULT_BLOCK} />);
    fireEvent.click(screen.getByText('Red'));
    expect(screen.getByRole('button', { name: /check answer/i })).not.toBeDisabled();
  });

  it('shows correct feedback when all correct options are selected', () => {
    render(<QuizInlineViewer data={SELECT_ALL_DATA} block={DEFAULT_BLOCK} />);
    fireEvent.click(screen.getByText('Red'));
    fireEvent.click(screen.getByText('Blue'));
    fireEvent.click(screen.getByRole('button', { name: /check answer/i }));
    expect(screen.getByText("That's correct!")).toBeInTheDocument();
  });

  it('shows incorrect feedback when wrong options are chosen', () => {
    render(<QuizInlineViewer data={SELECT_ALL_DATA} block={DEFAULT_BLOCK} />);
    fireEvent.click(screen.getByText('Green'));
    fireEvent.click(screen.getByRole('button', { name: /check answer/i }));
    expect(screen.getByText(/not quite/i)).toBeInTheDocument();
  });

  it('shows incorrect feedback when only a subset of correct options are chosen', () => {
    render(<QuizInlineViewer data={SELECT_ALL_DATA} block={DEFAULT_BLOCK} />);
    fireEvent.click(screen.getByText('Red')); // only one of two correct
    fireEvent.click(screen.getByRole('button', { name: /check answer/i }));
    expect(screen.getByText(/not quite/i)).toBeInTheDocument();
  });

  it('calls onComplete when fully correct answer is submitted', () => {
    const onComplete = vi.fn();
    render(<QuizInlineViewer data={SELECT_ALL_DATA} block={DEFAULT_BLOCK} onComplete={onComplete} />);
    fireEvent.click(screen.getByText('Red'));
    fireEvent.click(screen.getByText('Blue'));
    fireEvent.click(screen.getByRole('button', { name: /check answer/i }));
    expect(onComplete).toHaveBeenCalledOnce();
  });

  it('does not call onComplete when answer is incomplete', () => {
    const onComplete = vi.fn();
    render(<QuizInlineViewer data={SELECT_ALL_DATA} block={DEFAULT_BLOCK} onComplete={onComplete} />);
    fireEvent.click(screen.getByText('Red'));
    fireEvent.click(screen.getByRole('button', { name: /check answer/i }));
    expect(onComplete).not.toHaveBeenCalled();
  });

  it('does not call onComplete multiple times on re-render', () => {
    const onComplete = vi.fn();
    const { rerender } = render(<QuizInlineViewer data={SELECT_ALL_DATA} block={DEFAULT_BLOCK} onComplete={onComplete} />);
    fireEvent.click(screen.getByText('Red'));
    fireEvent.click(screen.getByText('Blue'));
    fireEvent.click(screen.getByRole('button', { name: /check answer/i }));
    rerender(<QuizInlineViewer data={SELECT_ALL_DATA} block={DEFAULT_BLOCK} onComplete={onComplete} />);
    expect(onComplete).toHaveBeenCalledOnce();
  });

  it('shows Try Again after incorrect submission', () => {
    render(<QuizInlineViewer data={SELECT_ALL_DATA} block={DEFAULT_BLOCK} />);
    fireEvent.click(screen.getByText('Purple'));
    fireEvent.click(screen.getByRole('button', { name: /check answer/i }));
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });

  it('resets to initial state after Try Again', () => {
    render(<QuizInlineViewer data={SELECT_ALL_DATA} block={DEFAULT_BLOCK} />);
    fireEvent.click(screen.getByText('Purple'));
    fireEvent.click(screen.getByRole('button', { name: /check answer/i }));
    fireEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect(screen.getByRole('button', { name: /check answer/i })).toBeDisabled();
  });

  it('does not show Try Again after correct submission', () => {
    render(<QuizInlineViewer data={SELECT_ALL_DATA} block={DEFAULT_BLOCK} />);
    fireEvent.click(screen.getByText('Red'));
    fireEvent.click(screen.getByText('Blue'));
    fireEvent.click(screen.getByRole('button', { name: /check answer/i }));
    expect(screen.queryByRole('button', { name: /try again/i })).not.toBeInTheDocument();
  });
});

describe('QuizInlineViewer — answer persistence to quiz_block_responses', () => {
  const CTX = { courseId: 'c1', lessonId: 'l1', institutionId: 'i1' };

  function mockClient(existing: { attempt_count?: number; is_correct?: boolean } | null, upsert = vi.fn().mockResolvedValue({ error: null })) {
    (createClient as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } } }) },
      from: vi.fn(() => ({
        select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: async () => ({ data: existing }) }) }) }),
        upsert,
      })),
    });
    return upsert;
  }

  function answerMC(correct: boolean) {
    fireEvent.click(screen.getByText(correct ? /B\. 4/ : /A\. 3/));
    fireEvent.click(screen.getByRole('button', { name: /check answer/i }));
  }

  it('persists is_correct=true for a correct answer', async () => {
    const upsert = mockClient(null);
    render(<QuizInlineViewer data={QUIZ_DATA} block={DEFAULT_BLOCK} context={CTX} />);
    answerMC(true);
    await waitFor(() => expect(upsert).toHaveBeenCalled());
    expect(upsert.mock.calls[0][0]).toMatchObject({ is_correct: true, block_id: 'block-1', user_id: 'u1' });
  });

  it('records is_correct=false for a wrong answer when there is no prior correct response', async () => {
    const upsert = mockClient(null);
    render(<QuizInlineViewer data={QUIZ_DATA} block={DEFAULT_BLOCK} context={CTX} />);
    answerMC(false);
    await waitFor(() => expect(upsert).toHaveBeenCalled());
    expect(upsert.mock.calls[0][0].is_correct).toBe(false);
  });

  it('STICKY-CORRECT: a later wrong answer does NOT downgrade a prior is_correct=true', async () => {
    // The dapo bug: a wrong re-attempt overwrote a passing answer -> cert RPC refused.
    const upsert = mockClient({ attempt_count: 1, is_correct: true });
    render(<QuizInlineViewer data={QUIZ_DATA} block={DEFAULT_BLOCK} context={CTX} />);
    answerMC(false);
    await waitFor(() => expect(upsert).toHaveBeenCalled());
    expect(upsert.mock.calls[0][0].is_correct).toBe(true);
  });

  it('retries a dropped write (so the gate/DB cannot diverge)', async () => {
    const upsert = vi.fn()
      .mockResolvedValueOnce({ error: { message: 'network' } })
      .mockResolvedValueOnce({ error: null });
    mockClient(null, upsert);
    render(<QuizInlineViewer data={QUIZ_DATA} block={DEFAULT_BLOCK} context={CTX} />);
    answerMC(true);
    await waitFor(() => expect(upsert).toHaveBeenCalledTimes(2), { timeout: 2000 });
  });

  it('never persists in preview mode', async () => {
    const upsert = mockClient(null);
    render(<QuizInlineViewer data={QUIZ_DATA} block={DEFAULT_BLOCK} context={{ ...CTX, previewMode: true }} />);
    answerMC(true);
    await new Promise((r) => setTimeout(r, 50));
    expect(upsert).not.toHaveBeenCalled();
  });
});
