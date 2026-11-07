import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import AudioViewer from './viewer';
import type { BlockViewerProps } from '@/lib/content/block-registry';
import type { AudioData } from '@/lib/content/blocks/audio/schema';

const renderAudio = (data: Partial<AudioData>) => {
  const props = { data: { url: 'https://example.com/a.m4a', autoplay: false, ...data } } as unknown as BlockViewerProps<AudioData>;
  return render(<AudioViewer {...props} />);
};

describe('AudioViewer transcript', () => {
  it('shows no toggle when there is no transcript', () => {
    renderAudio({});
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('shows no toggle for a whitespace-only transcript', () => {
    renderAudio({ transcript: '   ' });
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('hides the transcript until the toggle is clicked, then hides it again', () => {
    renderAudio({ transcript: 'Hello learners' });
    const toggle = screen.getByRole('button', { name: /transcript/i });
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(screen.queryByText('Hello learners')).toBeNull();

    fireEvent.click(toggle);
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByText('Hello learners')).toBeTruthy();

    fireEvent.click(toggle);
    expect(screen.queryByText('Hello learners')).toBeNull();
  });
});
