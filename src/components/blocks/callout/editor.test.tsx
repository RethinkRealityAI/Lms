import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CalloutEditor } from './editor';

describe('CalloutEditor', () => {
  it('renders title field with initial value', () => {
    render(
      <CalloutEditor
        data={{ variant: 'info', title: 'My Callout', html: '<p>Content</p>' }}
        block={{ id: 'test-id' }}
        onChange={vi.fn()}
      />
    );
    expect(screen.getByDisplayValue('My Callout')).toBeInTheDocument();
  });

  it('renders variant buttons', () => {
    render(
      <CalloutEditor
        data={{ variant: 'warning', title: '', html: '' }}
        block={{ id: 'test-id' }}
        onChange={vi.fn()}
      />
    );
    expect(screen.getByText('Warning')).toBeInTheDocument();
    expect(screen.getByText('Info')).toBeInTheDocument();
  });

  it('renders all four variant buttons', () => {
    render(
      <CalloutEditor
        data={{ variant: 'info', title: '', html: '' }}
        block={{ id: 'test-id' }}
        onChange={vi.fn()}
      />
    );
    expect(screen.getByText('Info')).toBeInTheDocument();
    expect(screen.getByText('Warning')).toBeInTheDocument();
    expect(screen.getByText('Tip')).toBeInTheDocument();
    expect(screen.getByText('Success')).toBeInTheDocument();
  });

  it('renders html content in the textarea', () => {
    render(
      <CalloutEditor
        data={{ variant: 'tip', title: '', html: '<p>Test content</p>' }}
        block={{ id: 'test-id' }}
        onChange={vi.fn()}
      />
    );
    expect(screen.getByDisplayValue('<p>Test content</p>')).toBeInTheDocument();
  });
});
