'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronLeft, ChevronRight, ImageOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { BlockViewerProps } from '@/lib/content/block-registry';
import type { ImageGalleryData } from '@/lib/content/blocks/image-gallery/schema';

function isLoadableUrl(url: string): boolean {
  if (!url) return false;
  return url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:');
}

function ImageWithFallback({
  src, alt, className, fitClass, style,
}: {
  src: string; alt: string; className?: string; fitClass?: string; style?: React.CSSProperties;
}) {
  const [error, setError] = useState(false);
  const [loaded, setLoaded] = useState(false);

  if (!isLoadableUrl(src) || error) {
    return (
      <div className={`bg-gray-100 flex items-center justify-center ${className}`} style={style}>
        <div className="text-center p-4">
          <ImageOff className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-xs text-gray-400">
            {!src ? 'No image URL' : !isLoadableUrl(src) ? 'Image needs re-upload' : 'Image unavailable'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`} style={style}>
      {!loaded && <div className="absolute inset-0 bg-gray-100 animate-pulse rounded-lg" />}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        onLoad={() => setLoaded(true)}
        onError={() => setError(true)}
        className={`w-full h-full ${fitClass ?? 'object-cover'} transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
      />
    </div>
  );
}

function Caption({ text, className }: { text: string; className?: string }) {
  if (text.includes('<')) {
    return <div className={className} dangerouslySetInnerHTML={{ __html: text }} />;
  }
  return <p className={className}>{text}</p>;
}

function getAspectStyle(aspectRatio: string | undefined): React.CSSProperties {
  if (!aspectRatio || aspectRatio === 'original') return {};
  return { aspectRatio: aspectRatio.replace('/', ' / ') };
}

function getAspectClass(aspectRatio: string | undefined, fallback: string): string {
  return (!aspectRatio || aspectRatio === 'original') ? fallback : '';
}

// ─── Gallery Grid ─────────────────────────────────────────────────────────────

function GalleryView({ images, aspectRatio, fitClass }: {
  images: ImageGalleryData['images'];
  aspectRatio: string | undefined;
  fitClass: string;
}) {
  const aspectStyle = getAspectStyle(aspectRatio);
  const aspectClass = getAspectClass(aspectRatio, 'aspect-[4/3]');

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {images.map((img, i) => (
        <div key={i} className="overflow-hidden rounded-xl">
          <ImageWithFallback
            src={img.url}
            alt={img.alt ?? ''}
            className={`${aspectClass} rounded-xl overflow-hidden`}
            fitClass={fitClass}
            style={aspectStyle}
          />
          {img.caption && (
            <Caption text={img.caption} className="mt-1.5 text-xs text-gray-500 px-0.5 [&_p]:my-0.5" />
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Slider (one image at a time, manual nav) ─────────────────────────────────

function SliderView({ images, aspectRatio, fitClass }: {
  images: ImageGalleryData['images'];
  aspectRatio: string | undefined;
  fitClass: string;
}) {
  const [current, setCurrent] = useState(0);
  const aspectStyle = getAspectStyle(aspectRatio);
  const aspectClass = getAspectClass(aspectRatio, 'aspect-video');

  return (
    <div className="relative overflow-hidden rounded-xl">
      <ImageWithFallback
        src={images[current].url}
        alt={images[current].alt ?? ''}
        className={`w-full ${aspectClass} rounded-xl overflow-hidden`}
        fitClass={fitClass}
        style={aspectStyle}
      />
      {images[current].caption && (
        <Caption
          text={images[current].caption!}
          className="mt-2.5 text-sm text-gray-500 italic [&_p]:my-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5"
        />
      )}
      {images.length > 1 && (
        <div className="mt-3 flex items-center justify-center gap-3">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrent((c) => Math.max(0, c - 1))}
            disabled={current === 0}
            className="h-8 w-8 rounded-full"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-1.5">
            {images.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={`w-2 h-2 rounded-full transition-all duration-200 ${
                  i === current ? 'bg-gray-800 scale-125' : 'bg-gray-300 hover:bg-gray-400'
                }`}
              />
            ))}
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrent((c) => Math.min(images.length - 1, c + 1))}
            disabled={current === images.length - 1}
            className="h-8 w-8 rounded-full"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── Carousel (multi-image, auto-advancing, infinite loop) ────────────────────

function CarouselView({ images, aspectRatio, fitClass }: {
  images: ImageGalleryData['images'];
  aspectRatio: string | undefined;
  fitClass: string;
}) {
  const [offset, setOffset] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const totalSlides = images.length;

  const VISIBLE = Math.min(totalSlides, 3); // show up to 3 images at once
  const itemWidthPct = 100 / VISIBLE;

  const advance = useCallback((dir: 1 | -1) => {
    if (isAnimating) return;
    setIsAnimating(true);
    setOffset((prev) => (prev + dir + totalSlides) % totalSlides);
    setTimeout(() => setIsAnimating(false), 400);
  }, [isAnimating, totalSlides]);

  // Auto-advance every 3 seconds
  useEffect(() => {
    if (isPaused || totalSlides <= 1) return;
    timerRef.current = setTimeout(() => advance(1), 3000);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [offset, isPaused, advance, totalSlides]);

  const aspectStyle = getAspectStyle(aspectRatio);
  const aspectClass = getAspectClass(aspectRatio, 'aspect-[4/3]');

  // Build the visible items: wrap around infinitely
  const visibleItems = Array.from({ length: VISIBLE }, (_, i) => {
    const idx = (offset + i) % totalSlides;
    return { img: images[idx], idx };
  });

  return (
    <div
      className="relative overflow-hidden rounded-xl"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Image strip */}
      <div
        ref={trackRef}
        className="flex gap-2 transition-all duration-400"
      >
        {visibleItems.map(({ img, idx }, pos) => (
          <div
            key={`${idx}-${pos}`}
            className={`shrink-0 overflow-hidden rounded-xl transition-all duration-300 ${
              pos === Math.floor(VISIBLE / 2) ? 'scale-100' : 'scale-[0.94] opacity-80'
            }`}
            style={{ width: `calc(${itemWidthPct}% - 0.5rem)` }}
          >
            <ImageWithFallback
              src={img.url}
              alt={img.alt ?? ''}
              className={`w-full ${aspectClass} overflow-hidden rounded-xl`}
              fitClass={fitClass}
              style={aspectStyle}
            />
          </div>
        ))}
      </div>

      {/* Caption for centre image */}
      {(() => {
        const centreImg = visibleItems[Math.floor(VISIBLE / 2)]?.img;
        return centreImg?.caption ? (
          <Caption
            text={centreImg.caption}
            className="mt-2.5 text-sm text-gray-500 italic text-center"
          />
        ) : null;
      })()}

      {/* Navigation */}
      {totalSlides > 1 && (
        <>
          <button
            onClick={() => advance(-1)}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition-colors z-10"
            aria-label="Previous"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => advance(1)}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition-colors z-10"
            aria-label="Next"
          >
            <ChevronRight className="h-4 w-4" />
          </button>

          {/* Dot indicators */}
          <div className="flex items-center justify-center gap-1.5 mt-3">
            {images.map((_, i) => (
              <button
                key={i}
                onClick={() => { setOffset(i); }}
                className={`rounded-full transition-all duration-200 ${
                  i === offset ? 'w-5 h-2 bg-gray-800' : 'w-2 h-2 bg-gray-300 hover:bg-gray-400'
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export default function ImageGalleryViewer({ data }: BlockViewerProps<ImageGalleryData>) {
  const images = data.images ?? [];
  const aspectRatio = data.aspectRatio;
  const fitClass = data.objectFit === 'contain' ? 'object-contain' : 'object-cover';

  if (images.length === 0) {
    return (
      <div className="w-full aspect-video bg-gray-50 rounded-xl flex items-center justify-center border border-dashed border-gray-200">
        <div className="text-center">
          <ImageOff className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-400">No images added</p>
        </div>
      </div>
    );
  }

  if (data.mode === 'slider') {
    return <SliderView images={images} aspectRatio={aspectRatio} fitClass={fitClass} />;
  }

  if (data.mode === 'carousel') {
    return <CarouselView images={images} aspectRatio={aspectRatio} fitClass={fitClass} />;
  }

  return <GalleryView images={images} aspectRatio={aspectRatio} fitClass={fitClass} />;
}
