import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ImageGalleryViewer from './viewer';
import { imageGalleryDataSchema } from '@/lib/content/blocks/image-gallery/schema';

const BLOCK = { id: 'block-1', title: 'Gallery', is_visible: true };
const TWO = [
  { url: 'https://example.com/a.png' },
  { url: 'https://example.com/b.png' },
];

/** Parse through the schema so defaults (mode, objectFit, …) fill in. */
const data = (overrides: Record<string, unknown>) =>
  imageGalleryDataSchema.parse(overrides);

describe('ImageGalleryViewer — default prompt fallback', () => {
  it('shows the default tap instruction when a position is set but the text is blank', () => {
    render(
      <ImageGalleryViewer
        data={data({ images: TWO, promptPosition: 'top' })}
        block={BLOCK}
      />,
    );
    expect(screen.getByText('Tap each image for more')).toBeInTheDocument();
  });

  it('uses the singular default for a single image', () => {
    render(
      <ImageGalleryViewer
        data={data({ images: [TWO[0]], promptPosition: 'bottom' })}
        block={BLOCK}
      />,
    );
    expect(screen.getByText('Tap the image for more')).toBeInTheDocument();
  });

  it('an authored prompt overrides the default', () => {
    render(
      <ImageGalleryViewer
        data={data({ images: TWO, promptPosition: 'top', prompt: 'Compare the two scans' })}
        block={BLOCK}
      />,
    );
    expect(screen.getByText('Compare the two scans')).toBeInTheDocument();
    expect(screen.queryByText('Tap each image for more')).not.toBeInTheDocument();
  });

  it('shows no prompt when the position is hidden', () => {
    render(
      <ImageGalleryViewer
        data={data({ images: TWO, promptPosition: 'none' })}
        block={BLOCK}
      />,
    );
    expect(screen.queryByText('Tap each image for more')).not.toBeInTheDocument();
  });

  it('does not invent a tap instruction for a non-interactive gallery', () => {
    render(
      <ImageGalleryViewer
        data={data({ images: TWO, promptPosition: 'top', enableLightbox: false })}
        block={BLOCK}
      />,
    );
    expect(screen.queryByText('Tap each image for more')).not.toBeInTheDocument();
  });
});
