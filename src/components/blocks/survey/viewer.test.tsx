import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SurveyViewer, { formatAnswer } from './viewer';

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }),
    },
  })),
}));

vi.mock('@/lib/db/surveys', () => ({
  getSurveyResponse: vi.fn().mockResolvedValue(null),
  submitSurveyResponse: vi.fn().mockResolvedValue({ error: null }),
}));

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

vi.mock('next/navigation', () => ({
  usePathname: () => '/scago/student',
}));

const DEFAULT_BLOCK = { id: 'block-1', title: 'Feedback Survey', is_visible: true };

const SURVEY_DATA = {
  title: 'Course Feedback',
  description: 'Help us improve',
  submit_label: 'Submit Feedback',
  questions: [
    {
      id: 'q-mc',
      type: 'multiple_choice' as const,
      question: 'Would you recommend this course?',
      required: true,
      options: ['Yes', 'No', 'Maybe'],
    },
    {
      id: 'q-text',
      type: 'textarea' as const,
      question: 'Any additional comments?',
      required: false,
    },
  ],
};

describe('formatAnswer', () => {
  it('formats arrays as comma-separated strings', () => {
    expect(formatAnswer(['A', 'B'])).toBe('A, B');
  });

  it('formats booleans as True/False', () => {
    expect(formatAnswer(true)).toBe('True');
    expect(formatAnswer(false)).toBe('False');
  });

  it('returns em dash for empty values', () => {
    expect(formatAnswer(undefined)).toBe('—');
  });
});

describe('SurveyViewer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders survey title and description', () => {
    render(
      <SurveyViewer
        data={SURVEY_DATA}
        block={DEFAULT_BLOCK}
        context={{ previewMode: true }}
      />,
    );
    expect(screen.getByText('Course Feedback')).toBeInTheDocument();
    expect(screen.getByText('Help us improve')).toBeInTheDocument();
  });

  it('renders all questions', () => {
    render(
      <SurveyViewer
        data={SURVEY_DATA}
        block={DEFAULT_BLOCK}
        context={{ previewMode: true }}
      />,
    );
    expect(screen.getByText('Would you recommend this course?')).toBeInTheDocument();
    expect(screen.getByText('Any additional comments?')).toBeInTheDocument();
  });

  it('shows empty state when there are no questions', () => {
    render(
      <SurveyViewer
        data={{ title: 'Empty', submit_label: 'Submit Survey', questions: [] }}
        block={DEFAULT_BLOCK}
        context={{ previewMode: true }}
      />,
    );
    expect(screen.getByText(/no questions yet/i)).toBeInTheDocument();
  });

  it('shows required indicator on required questions', () => {
    render(
      <SurveyViewer
        data={SURVEY_DATA}
        block={DEFAULT_BLOCK}
        context={{ previewMode: true }}
      />,
    );
    expect(screen.getAllByText('*').length).toBeGreaterThan(0);
  });

  it('submits in preview mode without calling submitSurveyResponse', async () => {
    const { submitSurveyResponse } = await import('@/lib/db/surveys');
    const { toast } = await import('sonner');

    render(
      <SurveyViewer
        data={SURVEY_DATA}
        block={DEFAULT_BLOCK}
        context={{ previewMode: true }}
        onComplete={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByText('Yes'));
    fireEvent.click(screen.getByRole('button', { name: /submit feedback/i }));

    await waitFor(() => {
      expect(submitSurveyResponse).not.toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledWith('Survey preview submitted (not saved)');
    });
  });

  it('shows error toast when required question is missing on submit', async () => {
    const { toast } = await import('sonner');

    render(
      <SurveyViewer
        data={SURVEY_DATA}
        block={DEFAULT_BLOCK}
        context={{ previewMode: true }}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /submit feedback/i }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Please answer all required questions');
    });
  });

  it('allows selecting multiple choice option', () => {
    render(
      <SurveyViewer
        data={SURVEY_DATA}
        block={DEFAULT_BLOCK}
        context={{ previewMode: true }}
      />,
    );

    fireEvent.click(screen.getByText('Yes'));
    // Selected state is indicated by the font-semibold class + an inline accent
    // border/background (institution-branded), not a hardcoded color class.
    const selectedBtn = screen.getByText('Yes').closest('button')!;
    expect(selectedBtn).toHaveClass('font-semibold');
    expect(selectedBtn.style.borderColor).not.toBe('');
  });
});
