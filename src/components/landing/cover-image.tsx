'use client';

import { useState } from 'react';
import Image from 'next/image';

interface CoverImageProps {
  src: string;
  alt: string;
  /** Classes for the wrapper that owns the box (sizing, radius, aspect ratio). */
  className?: string;
  /** Classes for the image itself (object-fit, hover transforms). */
  imgClassName?: string;
  /** Tailwind classes for the branded gradient revealed if the image fails. */
  fallbackClassName?: string;
  /** Optional decorative node centred in the fallback. */
  fallback?: React.ReactNode;
  /**
   * Rendered width hint for the optimiser, e.g. "(max-width: 640px) 100vw, 33vw".
   * Getting this right is the difference between shipping a ~30 KB thumbnail and
   * the multi-megabyte original.
   */
  sizes?: string;
  /** Set on the LCP image only (the hero); everything else stays lazy. */
  priority?: boolean;
}

/**
 * A cover image that is optimised on the way out and degrades to a branded
 * gradient instead of a broken-image icon.
 *
 * Uses next/image rather than a bare <img> because the source art is
 * 2752x1536 PNG — several megabytes each, and there are thirteen of them on the
 * curriculum grid. Served raw that is tens of megabytes for images that render
 * ~390px wide on a phone. next/image resizes to the requested `sizes` and
 * negotiates AVIF/WebP, which is the single biggest win available on this page.
 *
 * The element STRUCTURE stays identical whether or not the image loads: the
 * gradient lives on the wrapper and a failed image is merely hidden. Swapping
 * element types on error would change the tree between server and client and
 * risk a hydration mismatch.
 */
export function CoverImage({
  src,
  alt,
  className = '',
  imgClassName = '',
  fallbackClassName = 'bg-gradient-to-br from-[#C8262A] via-[#9B1E21] to-[#1A1A1A]',
  fallback,
  sizes = '100vw',
  priority = false,
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
      {src ? (
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes}
          priority={priority}
          onError={() => setFailed(true)}
          aria-hidden={missing ? true : undefined}
          className={`${imgClassName} ${missing ? 'opacity-0' : ''}`}
        />
      ) : null}
    </span>
  );
}
