import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CTAEditor } from './editor';

describe('CTAEditor', () => {
  it('renders button label field', () => {
    render(
      <CTAEditor
        data={{ action: 'next_lesson', button_label: 'Continue', text: '' }}
        block={{ id: 'test-id' }}
        onChange={vi.fn()}
      />
    );
    expect(screen.getByDisplayValue('Continue')).toBeInTheDocument();
  });

  it('shows URL field when action is external_url', () => {
    render(
      <CTAEditor
        data={{ action: 'external_url', button_label: 'Visit', text: '', url: 'https://example.com' }}
        block={{ id: 'test-id' }}
        onChange={vi.fn()}
      />
    );
    expect(screen.getByDisplayValue('https://example.com')).toBeInTheDocument();
  });

  it('hides URL field when action is not external_url', () => {
    render(
      <CTAEditor
        data={{ action: 'complete_lesson', button_label: 'Done', text: '' }}
        block={{ id: 'test-id' }}
        onChange={vi.fn()}
      />
    );
    expect(screen.queryByPlaceholderText('https://example.com')).not.toBeInTheDocument();
  });

  it('renders all three action options', () => {
    render(
      <CTAEditor
        data={{ action: 'complete_lesson', button_label: 'Go', text: '' }}
        block={{ id: 'test-id' }}
        onChange={vi.fn()}
      />
    );
    expect(screen.getByText('Complete Lesson')).toBeInTheDocument();
    expect(screen.getByText('Next Lesson')).toBeInTheDocument();
    expect(screen.getByText('External URL')).toBeInTheDocument();
  });
});
