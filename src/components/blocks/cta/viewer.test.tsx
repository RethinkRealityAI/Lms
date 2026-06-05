import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import CtaViewer from './viewer';
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

describe('CtaViewer styling', () => {
  it('applies custom button color and label color on a solid button', () => {
    render(
      <CtaViewer
        data={makeData({ url: 'https://example.com', button_label: 'Go', button_color: '#DC2626', text_color: '#ffffff' })}
        block={{ id: 'b1', title: '', is_visible: true }}
      />
    );
    const link = screen.getByRole('link', { name: /Go/ });
    expect(link).toHaveStyle({ backgroundColor: '#DC2626', color: '#ffffff' });
  });

  it('renders an outline button with a transparent fill and accent border', () => {
    render(
      <CtaViewer
        data={makeData({ url: 'https://example.com', button_label: 'Learn', button_style: 'outline', button_color: '#0099CA' })}
        block={{ id: 'b1', title: '', is_visible: true }}
      />
    );
    const link = screen.getByRole('link', { name: /Learn/ }) as HTMLElement;
    // Read the inline style directly (jsdom computes `transparent` as rgba(0,0,0,0),
    // which trips up toHaveStyle for the background).
    expect(link.style.backgroundColor).toBe('transparent');
    expect(link.style.borderStyle).toBe('solid');
    expect(link.style.borderColor).toMatch(/#0099ca|rgb\(0, 153, 202\)/i);
    expect(link.style.color).toMatch(/#0099ca|rgb\(0, 153, 202\)/i);
  });

  it('applies a soft (tinted) background derived from the accent color', () => {
    render(
      <CtaViewer
        data={makeData({ url: 'https://example.com', button_label: 'Soft', button_style: 'soft', button_color: '#1E3A5F' })}
        block={{ id: 'b1', title: '', is_visible: true }}
      />
    );
    const link = screen.getByRole('link', { name: /Soft/ });
    // #1E3A5F at 14% → rgba(30, 58, 95, 0.14)
    expect(link).toHaveStyle({ backgroundColor: 'rgba(30, 58, 95, 0.14)' });
  });

  it('maps font size to the right padding/text classes', () => {
    render(
      <CtaViewer data={makeData({ url: 'https://x.com', button_label: 'Big', font_size: 'xl' })} block={{ id: 'b1', title: '', is_visible: true }} />
    );
    const link = screen.getByRole('link', { name: /Big/ });
    expect(link.className).toContain('text-xl');
  });

  it('applies a pill radius and full-width when requested', () => {
    render(
      <CtaViewer
        data={makeData({ url: 'https://x.com', button_label: 'Wide', radius: 'full', full_width: true })}
        block={{ id: 'b1', title: '', is_visible: true }}
      />
    );
    const link = screen.getByRole('link', { name: /Wide/ });
    expect(link.className).toContain('rounded-full');
    expect(link.className).toContain('w-full');
  });

  it('hides the link icon when show_icon is false', () => {
    const { container } = render(
      <CtaViewer
        data={makeData({ url: 'https://x.com', button_label: 'NoIcon', show_icon: false })}
        block={{ id: 'b1', title: '', is_visible: true }}
      />
    );
    expect(container.querySelector('svg')).toBeNull();
  });

  it('applies a custom description color to the text above the button', () => {
    render(
      <CtaViewer
        data={makeData({ url: 'https://x.com', text: 'Read this', description_color: '#E87722' })}
        block={{ id: 'b1', title: '', is_visible: true }}
      />
    );
    expect(screen.getByText('Read this')).toHaveStyle({ color: '#E87722' });
  });

  it('still renders nothing for legacy navigation CTAs', () => {
    const { container } = render(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      <CtaViewer data={{ action: 'complete_lesson', button_label: 'Exit' } as any} block={{ id: 'b1', title: '', is_visible: true }} />
    );
    expect(container.firstChild).toBeNull();
  });
});
