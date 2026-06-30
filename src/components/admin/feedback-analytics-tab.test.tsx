import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FeedbackAnalyticsTab, buildFeedbackSummaries, type FeedbackCourseSummary } from './feedback-analytics-tab';
import type { CompletionSurveyBundle } from '@/lib/db/course-feedback';

vi.mock('next/navigation', () => ({
  usePathname: () => '/gansid/admin/analytics',
}));

function makeBundle(over: Partial<CompletionSurveyBundle> = {}): CompletionSurveyBundle {
  return {
    totalResponses: 1,
    totalRespondents: 1,
    courses: [
      {
        courseId: 'c1',
        courseTitle: 'Advocacy 101',
        templateName: 'Course Feedback',
        questions: [{ id: 'q1', question: 'Would you recommend this course?', type: 'scale' }],
        responseCount: 1,
        uniqueRespondents: 1,
        responses: [
          {
            id: 'r1',
            userName: 'Jordan Rivers',
            userEmail: 'jordan@example.com',
            submittedAt: '2026-06-27T12:00:00Z',
            answers: { q1: 'Very Likely' },
          },
        ],
      },
    ],
    ...over,
  };
}

const summaries: FeedbackCourseSummary[] = [
  { courseId: 'c1', courseTitle: 'Advocacy 101', reviewCount: 2, avgRating: 4.5, feedbackResponseCount: 1 },
];

describe('FeedbackAnalyticsTab', () => {
  it('shows the empty state when there are no surveys or reviews', () => {
    render(
      <FeedbackAnalyticsTab
        summaries={[{ courseId: 'c1', courseTitle: 'Advocacy 101', reviewCount: 0, avgRating: 0, feedbackResponseCount: 0 }]}
        bundle={makeBundle({ courses: [], totalResponses: 0, totalRespondents: 0 })}
      />,
    );
    expect(screen.getByText('No completion surveys yet')).toBeInTheDocument();
  });

  it('renders the completion-survey stat cards', () => {
    render(<FeedbackAnalyticsTab summaries={summaries} bundle={makeBundle()} />);
    expect(screen.getByText('Completion surveys')).toBeInTheDocument(); // subtitle of "Survey responses"
    expect(screen.getByText('Unique students')).toBeInTheDocument();
    expect(screen.getByText('Courses with responses')).toBeInTheDocument();
    expect(screen.getByText(/4\.5 avg rating/)).toBeInTheDocument();
  });

  it('renders the per-respondent answer table for the selected course', () => {
    render(<FeedbackAnalyticsTab summaries={summaries} bundle={makeBundle()} />);
    // The question label appears as a column header and in the response summary
    expect(screen.getAllByText('Would you recommend this course?').length).toBeGreaterThan(0);
    // The responder and their answer render
    expect(screen.getByText('Jordan Rivers')).toBeInTheDocument();
    expect(screen.getByText('jordan@example.com')).toBeInTheDocument();
    expect(screen.getAllByText('Very Likely').length).toBeGreaterThan(0);
  });

  it('aggregates answers in the response summary', () => {
    render(<FeedbackAnalyticsTab summaries={summaries} bundle={makeBundle()} />);
    // "Very Likely: 1" badge in the Response summary
    expect(screen.getByText('Very Likely: 1')).toBeInTheDocument();
  });

  it('lists courses in the all-courses index', () => {
    render(<FeedbackAnalyticsTab summaries={summaries} bundle={makeBundle()} />);
    // Course title appears (selector + index); at least one instance
    expect(screen.getAllByText('Advocacy 101').length).toBeGreaterThan(0);
    expect(screen.getByText(/1 survey response/)).toBeInTheDocument();
  });
});

describe('buildFeedbackSummaries', () => {
  it('maps course stats + feedback counts into summaries', () => {
    const result = buildFeedbackSummaries(
      // minimal CourseStats-shaped objects
      [{ id: 'c1', title: 'Advocacy 101', review_count: 3, avg_rating: 4.2 } as never],
      { c1: 5 },
    );
    expect(result).toEqual([
      { courseId: 'c1', courseTitle: 'Advocacy 101', reviewCount: 3, avgRating: 4.2, feedbackResponseCount: 5 },
    ]);
  });

  it('defaults missing counts to zero', () => {
    const result = buildFeedbackSummaries([{ id: 'c2', title: 'No Data' } as never], {});
    expect(result[0]).toMatchObject({ reviewCount: 0, avgRating: 0, feedbackResponseCount: 0 });
  });
});
