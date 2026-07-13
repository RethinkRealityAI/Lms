import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import ContentListViewer from './viewer';

const block = { id: 'b1', title: '', is_visible: true };

function renderList(data: Record<string, unknown>) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { container } = render(<ContentListViewer data={data as any} block={block as any} />);
  return container;
}

const ITEMS = [
  { html: '<p>One</p>' },
  { html: '<p>Two</p>' },
];

describe('ContentListViewer animation', () => {
  it('animates items by default (enable_animations unset) with the 500ms duration', () => {
    const container = renderList({ items: ITEMS });
    const lis = container.querySelectorAll('li.content-list-item-animate');
    expect(lis.length).toBe(2);
    expect((lis[0] as HTMLElement).style.animationDuration).toBe('500ms');
  });

  it('honors a custom duration', () => {
    const container = renderList({ items: ITEMS, animation_duration_ms: 250 });
    const li = container.querySelector('li.content-list-item-animate') as HTMLElement;
    expect(li.style.animationDuration).toBe('250ms');
  });

  it('does not animate when explicitly disabled', () => {
    const container = renderList({ items: ITEMS, enable_animations: false });
    expect(container.querySelectorAll('li.content-list-item-animate').length).toBe(0);
  });

  it('applies one shared direction to every item when uniform is on', () => {
    const container = renderList({
      items: [{ html: '<p>One</p>', animation: 'left' }, { html: '<p>Two</p>', animation: 'down' }],
      animation_uniform: true,
      animation_direction: 'right',
    });
    const lis = container.querySelectorAll('li.content-list-item-animate');
    // Both items use the shared "right" keyframe regardless of their per-item value.
    expect((lis[0] as HTMLElement).style.animationName).toBe('slideFromRight');
    expect((lis[1] as HTMLElement).style.animationName).toBe('slideFromRight');
  });

  it('uses per-item direction when uniform is off', () => {
    const container = renderList({
      items: [{ html: '<p>One</p>', animation: 'left' }, { html: '<p>Two</p>', animation: 'down' }],
    });
    const lis = container.querySelectorAll('li.content-list-item-animate');
    expect((lis[0] as HTMLElement).style.animationName).toBe('slideFromLeft');
    expect((lis[1] as HTMLElement).style.animationName).toBe('slideFromDown');
  });
});
