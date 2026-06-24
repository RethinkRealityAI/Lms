'use client';

import type { CSSProperties, ReactNode } from 'react';
import { ImageIcon } from 'lucide-react';
import {
  type MediaField, type MediaPosition, MEDIA_SIZE_PX, hasMedia, youtubeId, vimeoId,
} from '@/lib/content/blocks/shared/media';

/** Renders a media field (image or video) at its configured size + fit. */
export function MediaView({ media, className = '' }: { media: MediaField; className?: string }) {
  const rounded = media.rounded !== false ? 'rounded-xl' : '';
  const fitClass = media.fit === 'cover' ? 'object-cover' : 'object-contain';

  if (!hasMedia(media)) {
    return (
      <div className={`flex items-center justify-center bg-slate-100 text-slate-400 aspect-video ${rounded} ${className}`}>
        <ImageIcon className="w-6 h-6 opacity-40" />
      </div>
    );
  }

  let inner: ReactNode;
  if (media.kind === 'video') {
    const yt = youtubeId(media.url);
    const vm = vimeoId(media.url);
    if (yt) {
      inner = (
        <div className={`relative w-full aspect-video overflow-hidden bg-black ${rounded}`}>
          <iframe
            src={`https://www.youtube.com/embed/${yt}`}
            className="absolute inset-0 w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title={media.alt || 'Video'}
          />
        </div>
      );
    } else if (vm) {
      inner = (
        <div className={`relative w-full aspect-video overflow-hidden bg-black ${rounded}`}>
          <iframe
            src={`https://player.vimeo.com/video/${vm}`}
            className="absolute inset-0 w-full h-full"
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
            title={media.alt || 'Video'}
          />
        </div>
      );
    } else {
      // Direct file
      // eslint-disable-next-line jsx-a11y/media-has-caption
      inner = <video src={media.url} controls className={`w-full bg-black ${rounded}`} />;
    }
  } else {
    inner = (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={media.url}
        alt={media.alt || ''}
        loading="lazy"
        draggable={false}
        className={`w-full h-auto ${fitClass} ${rounded}`}
      />
    );
  }

  return (
    <figure className={className}>
      {inner}
      {media.caption && (
        <figcaption className="mt-1.5 text-sm text-center italic opacity-75 [color:inherit]">{media.caption}</figcaption>
      )}
    </figure>
  );
}

/**
 * Arranges a media field around companion `children` content with the chosen position.
 * `top`/`bottom` stack; `left`/`right` sit side-by-side on wide containers and stack on
 * narrow ones (container query). The media column is capped at the size's max width so
 * the content auto-resizes to fill the rest.
 */
export function MediaWithContent({
  media,
  position = 'top',
  align = 'start',
  children,
}: {
  media?: MediaField | null;
  position?: MediaPosition;
  /** Cross-axis alignment for side-by-side layouts. */
  align?: 'start' | 'center';
  children: ReactNode;
}) {
  if (!hasMedia(media)) return <>{children}</>;

  const maxPx = MEDIA_SIZE_PX[media.size ?? 'md'];
  const sideStyle: CSSProperties | undefined = maxPx ? { maxWidth: maxPx, width: '100%' } : undefined;

  // Stacked
  if (position === 'top' || position === 'bottom') {
    const mediaEl = (
      <div className="w-full flex justify-center">
        <div style={sideStyle} className={maxPx ? '' : 'w-full'}>
          <MediaView media={media} />
        </div>
      </div>
    );
    return (
      <div className="flex flex-col gap-3 w-full">
        {position === 'top' && mediaEl}
        <div className="min-w-0">{children}</div>
        {position === 'bottom' && mediaEl}
      </div>
    );
  }

  // Side by side (stack on narrow containers)
  const rowDir = position === 'right' ? '@md:flex-row-reverse' : '@md:flex-row';
  const alignClass = align === 'center' ? '@md:items-center' : '@md:items-start';
  return (
    <div className={`flex flex-col ${rowDir} gap-4 ${alignClass} w-full`}>
      <div className="shrink-0 w-full @md:w-auto flex justify-center @md:block" style={sideStyle}>
        <MediaView media={media} />
      </div>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}
