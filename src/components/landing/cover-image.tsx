'use client';

import { useState } from 'react';

interface CoverImageProps {
  src: string;
  alt: string;
  /** Classes for the wrapper that owns the box (sizing, radius, aspect ratio). */
  className?: string;
  /** Classes for the <img> itself (object-fit, hover transforms). */
  imgClassName?: string;
  /** Tailwind classes for the branded gradient revealed if the image fails. */
  fallbackClassName?: string;
  /** Optional decorative node centred in the fallback. */
  fallback?: React.ReactNode;
  loading?: 'lazy' | 'eager';
}

/**
 * A cover image that reveals a branded gradient instead of a broken-image icon.
 *
 * The element STRUCTURE is deliberately identical whether or not the image
 * loads: the gradient lives on the wrapper and a failed image is merely hidden.
 * An earlier version swapped the <img> for a <div> on error, which changed the
 * element type — if the error fired while React was hydrating, the client tree
 * no longer matched the server HTML and React threw a hydration error (#418)
 * and re-rendered the whole tree. Keeping the structure stable means a dead
 * image URL degrades quietly to the gradient with no hydration risk.
 *
 * The landing-page and course cover art is re-hosted by a migration script
 * (see lib/content/scago-curriculum.ts), so a stale source URL is a realistic
 * state this has to survive.
 */
export function CoverImage({
  src,
  alt,
  className = '',
  imgClassName = '',
  fallbackClassName = 'bg-gradient-to-br from-[#C8262A] via-[#9B1E21] to-[#1A1A1A]',
  fallback,
  loading = 'lazy',
}: CoverImageProps) {
  const [failed, setFailed] = useState(false);
  const missing = failed || !src;

  return (
    <span className={`relative block overflow-hidden ${fallbackClassName} ${className}`}>
      {missing && fallback ? (
        <span className="absolute inset-0 flex items-center justify-center">
          {fallback}
        </span>
      ) : null}
      <img
        src={src}
        alt={alt}
        loading={loading}
        onError={() => setFailed(true)}
        aria-hidden={missing ? true : undefined}
        className={`absolute inset-0 h-full w-full ${imgClassName} ${
          missing ? 'opacity-0' : ''
        }`}
      />
    </span>
  );
}
