import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FeedbackCard } from './feedback-card';
import type { FeedbackSubmission } from '@/lib/db/feedback';

vi.mock('next/navigation', () => ({
  usePathname: () => '/gansid/admin/support',
}));

function makeItem(overrides: Partial<FeedbackSubmission> = {}): FeedbackSubmission {
  return {
    id: 'f1',
    type: 'issue',
    category: 'media_broken',
    name: 'Dapo',
    email: 'dapo@example.com',
    subject: 'Issue report — Test Course',
    message: 'Video will not play',
    user_id: 'u1',
    institution_id: 'inst-1',
    context: {
      page_url: 'https://org-lms.netlify.app/gansid/student/courses/c1',
      course_id: 'c1',
      course_title: 'Test Course',
      lesson_id: 'l1',
      lesson_title: 'Lesson 1',
      slide_id: 's1',
      slide_index: 3,
    },
    status: 'new',
    created_at: new Date('2026-07-11T12:00:00Z').toISOString(),
    ...overrides,
  };
}

function expand() {
  // The collapsed card's header is the first button; clicking it reveals the body.
  fireEvent.click(screen.getAllByRole('button')[0]);
}

describe('FeedbackCard', () => {
  it('renders type/category/status pills from the taxonomy', () => {
    render(<FeedbackCard item={makeItem()} onStatusChange={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByText('Issue')).toBeInTheDocument();
    expect(screen.getByText("Video / image won't load")).toBeInTheDocument();
    expect(screen.getByText('New')).toBeInTheDocument();
  });

  it('editor deep-link uses the real slide_id (not slide_index)', () => {
    render(<FeedbackCard item={makeItem()} onStatusChange={vi.fn()} onDelete={vi.fn()} />);
    expand();
    const link = screen.getByRole('link', { name: /open editor/i });
    const href = link.getAttribute('href')!;
    expect(href).toContain('/admin/courses/c1/editor');
    expect(href).toContain('lesson=l1');
    expect(href).toContain('slide=s1'); // the slide id — NOT slide=3 (the index)
    expect(href).not.toContain('slide=3');
  });

  it('links to the lesson only (no slide param) when slide_id is absent', () => {
    render(
      <FeedbackCard
        item={makeItem({ context: { course_id: 'c1', lesson_id: 'l1', lesson_title: 'L', slide_index: 3 } })}
        onStatusChange={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    expand();
    const href = screen.getByRole('link', { name: /open editor/i }).getAttribute('href')!;
    expect(href).toContain('lesson=l1');
    expect(href).not.toContain('slide=');
  });

  it('renders a Page link only for http(s) URLs (no javascript: injection)', () => {
    render(
      <FeedbackCard
        item={makeItem({ context: { page_url: 'javascript:alert(1)' } })}
        onStatusChange={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    expand();
    expect(screen.queryByRole('link', { name: /^Page$/i })).not.toBeInTheDocument();
  });

  it('calls onStatusChange when a status is picked', () => {
    const onStatusChange = vi.fn();
    render(<FeedbackCard item={makeItem()} onStatusChange={onStatusChange} onDelete={vi.fn()} />);
    expand();
    fireEvent.click(screen.getByRole('button', { name: 'Resolved' }));
    expect(onStatusChange).toHaveBeenCalledWith('f1', 'resolved');
  });
});
