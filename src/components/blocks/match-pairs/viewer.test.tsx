import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import MatchPairsViewer from './viewer';

// Two text pairs, shuffle off so the layout is deterministic.
function makeData(overrides: Record<string, unknown> = {}) {
  return {
    pairs: [
      { id: 'p1', prompt: { type: 'text', text: 'Cat' }, match: { type: 'text', text: 'Meow' } },
      { id: 'p2', prompt: { type: 'text', text: 'Dog' }, match: { type: 'text', text: 'Woof' } },
    ],
    prompt_side: 'left',
    shuffle: false,
    show_feedback: true,
    required: true,
    ...overrides,
  };
}

const block = { id: 'b1', title: '', is_visible: true };

describe('MatchPairsViewer tap-to-match (no-drag fallback)', () => {
  it('completes by tapping item then match, and fires onComplete when all correct', () => {
    const onComplete = vi.fn();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    render(<MatchPairsViewer data={makeData() as any} block={block} onComplete={onComplete} />);

    // Tap an item, then tap its correct match — twice.
    fireEvent.click(screen.getByText('Cat'));
    fireEvent.click(screen.getByText('Meow'));
    fireEvent.click(screen.getByText('Dog'));
    fireEvent.click(screen.getByText('Woof'));

    fireEvent.click(screen.getByRole('button', { name: /Check Answer/i }));
    expect(onComplete).toHaveBeenCalled();
  });

  it('does NOT fire onComplete when tapped matches are wrong', () => {
    const onComplete = vi.fn();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    render(<MatchPairsViewer data={makeData() as any} block={block} onComplete={onComplete} />);

    fireEvent.click(screen.getByText('Cat'));
    fireEvent.click(screen.getByText('Woof')); // wrong
    fireEvent.click(screen.getByText('Dog'));
    fireEvent.click(screen.getByText('Meow')); // wrong

    fireEvent.click(screen.getByRole('button', { name: /Check Answer/i }));
    expect(onComplete).not.toHaveBeenCalled();
  });

  it('exposes items and match cards as buttons for keyboard/tap use', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    render(<MatchPairsViewer data={makeData() as any} block={block} />);
    // Match cards are role=button (tappable) — the two answers plus the two draggable
    // items (dnd-kit assigns them role=button) are all reachable without a drag.
    expect(screen.getByText('Meow').closest('[role="button"]')).not.toBeNull();
    expect(screen.getByText('Cat').closest('[role="button"]')).not.toBeNull();
  });
});

describe('MatchPairsViewer feedback', () => {
  function matchAll() {
    fireEvent.click(screen.getByText('Cat'));
    fireEvent.click(screen.getByText('Meow'));
    fireEvent.click(screen.getByText('Dog'));
    fireEvent.click(screen.getByText('Woof'));
    fireEvent.click(screen.getByRole('button', { name: /Check Answer/i }));
  }

  it('shows per-pair feedback under each match only after checking', () => {
    const data = makeData({
      pairs: [
        { id: 'p1', prompt: { type: 'text', text: 'Cat' }, match: { type: 'text', text: 'Meow' }, feedback: 'Cats meow.' },
        { id: 'p2', prompt: { type: 'text', text: 'Dog' }, match: { type: 'text', text: 'Woof' }, feedback: 'Dogs woof.' },
      ],
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    render(<MatchPairsViewer data={data as any} block={block} />);

    // Not shown before submitting.
    expect(screen.queryByText('Cats meow.')).toBeNull();

    matchAll();

    expect(screen.getByText('Cats meow.')).toBeInTheDocument();
    expect(screen.getByText('Dogs woof.')).toBeInTheDocument();
  });

  it('uses the custom "all correct" message when provided', () => {
    const data = makeData({ feedback_correct: 'Perfect pairing!' });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    render(<MatchPairsViewer data={data as any} block={block} />);
    matchAll();
    expect(screen.getByText('Perfect pairing!')).toBeInTheDocument();
    expect(screen.queryByText(/All matched correctly/i)).toBeNull();
  });

  it('hides all feedback when show_feedback is off', () => {
    const data = makeData({
      show_feedback: false,
      feedback_correct: 'Perfect pairing!',
      pairs: [
        { id: 'p1', prompt: { type: 'text', text: 'Cat' }, match: { type: 'text', text: 'Meow' }, feedback: 'Cats meow.' },
        { id: 'p2', prompt: { type: 'text', text: 'Dog' }, match: { type: 'text', text: 'Woof' }, feedback: 'Dogs woof.' },
      ],
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    render(<MatchPairsViewer data={data as any} block={block} />);
    matchAll();
    expect(screen.queryByText('Cats meow.')).toBeNull();
    expect(screen.queryByText('Perfect pairing!')).toBeNull();
  });
});
