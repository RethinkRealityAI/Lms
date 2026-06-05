import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CalloutEditor } from './editor';

const baseData = {
  mode: 'callout' as const,
  variant: 'info' as const,
  html: '',
  bubble_text: '',
  direction: 'right' as const,
  bubble_style: 'light' as const,
  avatar_style: 'circle' as const,
};

describe('CalloutEditor', () => {
  it('renders the Callout and Speech Bubble tabs', () => {
    render(
      <CalloutEditor
        data={baseData}
        block={{ id: 'test-id' }}
        onChange={vi.fn()}
      />
    );
    expect(screen.getByText('Callout')).toBeInTheDocument();
    expect(screen.getByText('Speech Bubble')).toBeInTheDocument();
  });

  it('renders title field with initial value', () => {
    render(
      <CalloutEditor
        data={{ ...baseData, title: 'My Callout' }}
        block={{ id: 'test-id' }}
        onChange={vi.fn()}
      />
    );
    expect(screen.getByDisplayValue('My Callout')).toBeInTheDocument();
  });

  it('renders all four variant buttons', () => {
    render(
      <CalloutEditor
        data={baseData}
        block={{ id: 'test-id' }}
        onChange={vi.fn()}
      />
    );
    expect(screen.getByText('Info')).toBeInTheDocument();
    expect(screen.getByText('Warning')).toBeInTheDocument();
    expect(screen.getByText('Tip')).toBeInTheDocument();
    expect(screen.getByText('Success')).toBeInTheDocument();
  });

  it('highlights the active variant', () => {
    render(
      <CalloutEditor
        data={{ ...baseData, variant: 'warning' }}
        block={{ id: 'test-id' }}
        onChange={vi.fn()}
      />
    );
    expect(screen.getByText('Warning')).toBeInTheDocument();
  });
});
