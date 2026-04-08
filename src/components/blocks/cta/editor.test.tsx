import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CTAEditor } from './editor';

describe('CTAEditor', () => {
  it('renders button label field', () => {
    render(
      <CTAEditor
        data={{ button_label: 'Continue', text: '' }}
        block={{ id: 'test-id' }}
        onChange={vi.fn()}
      />
    );
    expect(screen.getByDisplayValue('Continue')).toBeInTheDocument();
  });

  it('renders URL field', () => {
    render(
      <CTAEditor
        data={{ button_label: 'Visit', text: '', url: 'https://example.com' }}
        block={{ id: 'test-id' }}
        onChange={vi.fn()}
      />
    );
    expect(screen.getByDisplayValue('https://example.com')).toBeInTheDocument();
  });

  it('renders description text field', () => {
    render(
      <CTAEditor
        data={{ button_label: 'Go', text: 'Learn more about this topic' }}
        block={{ id: 'test-id' }}
        onChange={vi.fn()}
      />
    );
    expect(screen.getByDisplayValue('Learn more about this topic')).toBeInTheDocument();
  });

  it('renders URL placeholder when no URL set', () => {
    render(
      <CTAEditor
        data={{ button_label: 'Click', text: '' }}
        block={{ id: 'test-id' }}
        onChange={vi.fn()}
      />
    );
    expect(screen.getByPlaceholderText('https://example.com')).toBeInTheDocument();
  });
});
