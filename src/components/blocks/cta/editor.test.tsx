import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CTAEditor } from './editor';
import type { CtaData } from '@/lib/content/blocks/cta/schema';

function makeData(overrides: Partial<CtaData> = {}): CtaData {
  return {
    text: '',
    button_label: 'Click Here',
    button_style: 'solid',
    font_size: 'md',
    align: 'center',
    radius: 'lg',
    full_width: false,
    show_icon: true,
    ...overrides,
  };
}

describe('CTAEditor', () => {
  it('renders button label field', () => {
    render(
      <CTAEditor data={makeData({ button_label: 'Continue' })} block={{ id: 'test-id' }} onChange={vi.fn()} />
    );
    expect(screen.getByDisplayValue('Continue')).toBeInTheDocument();
  });

  it('renders URL field', () => {
    render(
      <CTAEditor
        data={makeData({ button_label: 'Visit', url: 'https://example.com' })}
        block={{ id: 'test-id' }}
        onChange={vi.fn()}
      />
    );
    expect(screen.getByDisplayValue('https://example.com')).toBeInTheDocument();
  });

  it('renders description text field', () => {
    render(
      <CTAEditor
        data={makeData({ button_label: 'Go', text: 'Learn more about this topic' })}
        block={{ id: 'test-id' }}
        onChange={vi.fn()}
      />
    );
    expect(screen.getByDisplayValue('Learn more about this topic')).toBeInTheDocument();
  });

  it('renders URL placeholder when no URL set', () => {
    render(<CTAEditor data={makeData({ button_label: 'Click' })} block={{ id: 'test-id' }} onChange={vi.fn()} />);
    expect(screen.getByPlaceholderText('https://example.com')).toBeInTheDocument();
  });

  it('renders the appearance controls (style, size, colors)', () => {
    render(<CTAEditor data={makeData()} block={{ id: 'test-id' }} onChange={vi.fn()} />);
    expect(screen.getByText('Appearance')).toBeInTheDocument();
    expect(screen.getByText('Solid')).toBeInTheDocument();
    expect(screen.getByText('Outline')).toBeInTheDocument();
    expect(screen.getByText('Button color')).toBeInTheDocument();
    expect(screen.getByText('Label color')).toBeInTheDocument();
  });

  it('switches the button-color label to "Accent color" for non-solid styles', () => {
    render(<CTAEditor data={makeData({ button_style: 'outline' })} block={{ id: 'test-id' }} onChange={vi.fn()} />);
    expect(screen.getByText('Accent color')).toBeInTheDocument();
  });
});
