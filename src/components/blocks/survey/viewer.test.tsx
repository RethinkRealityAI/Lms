import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import type { SurveyData } from '@/lib/content/blocks/survey/schema';

// Must be hoisted — vi.mock factories cannot reference module-level variables
vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/db/surveys', () => ({
  getSurveyResponse: vi.fn(),
  upsertSurveyResponse: vi.fn(),
}));

import SurveyViewer from './viewer';
import { createClient } from '@/lib/supabase/client';
import { getSurveyResponse, upsertSurveyResponse } from '@/lib/db/surveys';

const mockCreateClient = vi.mocked(createClient);
const mockGetSurveyResponse = vi.mocked(getSurveyResponse);
const mockUpsertSurveyResponse = vi.mocked(upsertSurveyResponse);

const AUTHED_USER = { id: 'user-abc' };

function makeSupabaseMock(user = AUTHED_USER) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user }, error: null }),
    },
  };
}

const stubBlock = { id: 'survey-block-1', title: 'Survey', is_visible: true };

const SURVEY_DATA: SurveyData = {
  title: 'Course Feedback',
  intro: 'Please rate your experience.',
  questions: [
    {
      id: 'q1',
      type: 'likert',
      question: 'How likely are you to recommend this course?',
      scale: 'likelihood',
      required: true,
    },
    {
      id: 'q2',
      type: 'free_text',
      question: 'Any other comments?',
      placeholder: 'Share your thoughts…',
      required: false,
    },
  ],
  submit_label: 'Submit',
  thank_you_message: 'Thanks for your feedback!',
};

beforeEach(() => {
  vi.clearAllMocks();
  mockCreateClient.mockReturnValue(makeSupabaseMock() as never);
  mockGetSurveyResponse.mockResolvedValue(null); // no prior response by default
  mockUpsertSurveyResponse.mockResolvedValue(undefined);
});

async function renderAndWait(jsx: React.ReactElement) {
  let result!: ReturnType<typeof render>;
  await act(async () => {
    result = render(jsx);
  });
  return result;
}

describe('SurveyViewer — initial load', () => {
  it('renders the title and intro after loading', async () => {
    await renderAndWait(<SurveyViewer data={SURVEY_DATA} block={stubBlock} />);
    expect(screen.getByText('Course Feedback')).toBeTruthy();
    expect(screen.getByText('Please rate your experience.')).toBeTruthy();
  });

  it('renders all questions after loading', async () => {
    await renderAndWait(<SurveyViewer data={SURVEY_DATA} block={stubBlock} />);
    expect(screen.getByText('How likely are you to recommend this course?')).toBeTruthy();
    expect(screen.getByText('Any other comments?')).toBeTruthy();
  });

  it('renders likert scale buttons', async () => {
    await renderAndWait(<SurveyViewer data={SURVEY_DATA} block={stubBlock} />);
    expect(screen.getByText('Very Likely')).toBeTruthy();
    expect(screen.getByText('Very Unlikely')).toBeTruthy();
  });

  it('fetches existing response on mount', async () => {
    await renderAndWait(<SurveyViewer data={SURVEY_DATA} block={stubBlock} />);
    expect(mockGetSurveyResponse).toHaveBeenCalledWith(
      expect.anything(),
      stubBlock.id,
      AUTHED_USER.id,
    );
  });
});

describe('SurveyViewer — previously submitted', () => {
  it('shows thank-you state when prior response exists', async () => {
    mockGetSurveyResponse.mockResolvedValue({
      id: 'resp-1',
      block_id: stubBlock.id,
      user_id: AUTHED_USER.id,
      responses: { q1: 'Very Likely', q2: 'Great course!' },
      submitted_at: '2026-01-01T00:00:00Z',
    });

    await renderAndWait(<SurveyViewer data={SURVEY_DATA} block={stubBlock} />);
    expect(screen.getByText('Thanks for your feedback!')).toBeTruthy();
  });

  it('calls onComplete when prior response exists', async () => {
    mockGetSurveyResponse.mockResolvedValue({
      id: 'resp-1',
      block_id: stubBlock.id,
      user_id: AUTHED_USER.id,
      responses: { q1: 'Likely' },
      submitted_at: '2026-01-01T00:00:00Z',
    });

    const onComplete = vi.fn();
    await renderAndWait(<SurveyViewer data={SURVEY_DATA} block={stubBlock} onComplete={onComplete} />);
    expect(onComplete).toHaveBeenCalledOnce();
  });
});

describe('SurveyViewer — submission flow', () => {
  it('submit button is disabled when required questions unanswered', async () => {
    await renderAndWait(<SurveyViewer data={SURVEY_DATA} block={stubBlock} />);
    const btn = screen.getByRole('button', { name: /submit/i });
    expect(btn).toBeDisabled();
  });

  it('enables submit after required likert question answered', async () => {
    await renderAndWait(<SurveyViewer data={SURVEY_DATA} block={stubBlock} />);
    fireEvent.click(screen.getByText('Very Likely'));
    const btn = screen.getByRole('button', { name: /submit/i });
    expect(btn).not.toBeDisabled();
  });

  it('calls upsertSurveyResponse with responses on submit', async () => {
    const onComplete = vi.fn();
    await renderAndWait(<SurveyViewer data={SURVEY_DATA} block={stubBlock} onComplete={onComplete} />);

    fireEvent.click(screen.getByText('Very Likely'));
    fireEvent.click(screen.getByRole('button', { name: /submit/i }));

    await waitFor(() => expect(mockUpsertSurveyResponse).toHaveBeenCalledOnce());
    expect(mockUpsertSurveyResponse).toHaveBeenCalledWith(
      expect.anything(),
      stubBlock.id,
      AUTHED_USER.id,
      { q1: 'Very Likely' },
    );
  });

  it('shows thank-you message after successful submission', async () => {
    await renderAndWait(<SurveyViewer data={SURVEY_DATA} block={stubBlock} />);
    fireEvent.click(screen.getByText('Very Likely'));
    fireEvent.click(screen.getByRole('button', { name: /submit/i }));

    await waitFor(() => screen.getByText('Thanks for your feedback!'));
    expect(screen.getByText('Thanks for your feedback!')).toBeTruthy();
  });

  it('calls onComplete after successful submission', async () => {
    const onComplete = vi.fn();
    await renderAndWait(<SurveyViewer data={SURVEY_DATA} block={stubBlock} onComplete={onComplete} />);

    fireEvent.click(screen.getByText('Very Likely'));
    fireEvent.click(screen.getByRole('button', { name: /submit/i }));

    await waitFor(() => expect(onComplete).toHaveBeenCalledOnce());
  });

  it('shows error message when upsert fails', async () => {
    mockUpsertSurveyResponse.mockRejectedValue(new Error('DB error'));

    await renderAndWait(<SurveyViewer data={SURVEY_DATA} block={stubBlock} />);
    fireEvent.click(screen.getByText('Very Likely'));
    fireEvent.click(screen.getByRole('button', { name: /submit/i }));

    await waitFor(() => screen.getByText(/failed to save/i));
    expect(screen.getByText(/failed to save/i)).toBeTruthy();
  });
});

describe('SurveyViewer — unauthenticated user', () => {
  it('renders survey without fetching when user is null', async () => {
    mockCreateClient.mockReturnValue(makeSupabaseMock(null as never) as never);

    await renderAndWait(<SurveyViewer data={SURVEY_DATA} block={stubBlock} />);
    // Should show the survey form (not blocked)
    expect(screen.getByText('How likely are you to recommend this course?')).toBeTruthy();
    expect(mockGetSurveyResponse).not.toHaveBeenCalled();
  });

  it('shows error message when submitting without auth', async () => {
    mockCreateClient.mockReturnValue(makeSupabaseMock(null as never) as never);

    await renderAndWait(<SurveyViewer data={SURVEY_DATA} block={stubBlock} />);
    fireEvent.click(screen.getByText('Very Likely'));
    fireEvent.click(screen.getByRole('button', { name: /submit/i }));

    await waitFor(() => screen.getByText(/must be logged in/i));
    expect(mockUpsertSurveyResponse).not.toHaveBeenCalled();
  });
});

describe('SurveyViewer — agreement and satisfaction scales', () => {
  it('renders agreement scale labels', async () => {
    const data: SurveyData = {
      questions: [
        { id: 'q1', type: 'likert', question: 'I learned something new.', scale: 'agreement', required: true },
      ],
    };
    await renderAndWait(<SurveyViewer data={data} block={stubBlock} />);
    expect(screen.getByText('Strongly Agree')).toBeTruthy();
    expect(screen.getByText('Strongly Disagree')).toBeTruthy();
  });

  it('renders satisfaction scale labels', async () => {
    const data: SurveyData = {
      questions: [
        { id: 'q1', type: 'likert', question: 'How satisfied were you?', scale: 'satisfaction', required: true },
      ],
    };
    await renderAndWait(<SurveyViewer data={data} block={stubBlock} />);
    expect(screen.getByText('Very Satisfied')).toBeTruthy();
    expect(screen.getByText('Very Dissatisfied')).toBeTruthy();
  });
});

describe('SurveyViewer — empty survey', () => {
  it('allows immediate submit when no questions', async () => {
    const data: SurveyData = { questions: [] };
    await renderAndWait(<SurveyViewer data={data} block={stubBlock} />);
    const btn = screen.getByRole('button', { name: /submit feedback/i });
    expect(btn).not.toBeDisabled();
  });

  it('shows default thank-you message when none specified', async () => {
    const data: SurveyData = { questions: [] };
    await renderAndWait(<SurveyViewer data={data} block={stubBlock} />);
    fireEvent.click(screen.getByRole('button', { name: /submit feedback/i }));
    await waitFor(() => screen.getByText('Thank you for your feedback!'));
  });
});
