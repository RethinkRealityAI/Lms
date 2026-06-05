'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, ImageOff, X, Expand, Check, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { BlockViewerProps } from '@/lib/content/block-registry';
import type { ImageGalleryData } from '@/lib/content/blocks/image-gallery/schema';
import { DISPLAY_SIZE_IMG_CLASS, loadViewedImageIndices, resolveCaptionColor, saveViewedImageIndices } from '@/lib/content/blocks/image-gallery/display-utils';

type ImageItem = ImageGalleryData['images'][number];

function isLoadableUrl(url: string): boolean {
  if (!url) return false;
  return url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:');
}

function ImageWithFallback({
  src, alt, className, fitClass, style, imgClassName,
}: {
  src: string; alt: string; className?: string; fitClass?: string; style?: React.CSSProperties; imgClassName?: string;
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
        className={`${imgClassName ?? 'w-full h-full'} ${fitClass ?? 'object-contain'} transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
      />
    </div>
  );
}

function Caption({ text, className, style }: { text: string; className?: string; style?: React.CSSProperties }) {
  if (text.includes('<')) {
    return <div className={className} style={style} dangerouslySetInnerHTML={{ __html: text }} />;
  }
  return <p className={className} style={style}>{text}</p>;
}

function getAspectStyle(aspectRatio: string | undefined): React.CSSProperties {
  if (!aspectRatio || aspectRatio === 'original') return {};
  return { aspectRatio: aspectRatio.replace('/', ' / ') };
}

function hasFixedAspect(aspectRatio: string | undefined): boolean {
  return !!aspectRatio && aspectRatio !== 'original';
}

// ─── Shared interaction props ─────────────────────────────────────────────────

type InteractionConfig = {
  imgSizeClass: string;
  hideCaptionInGrid: boolean;
  clickForMore: boolean;
  clickHint: string;
  markClicked: boolean;
  clicked: Set<number>;
  captionColor: string;
};

function BlockImage({
  image,
  aspectRatio,
  fitClass,
  imgSizeClass,
  rounded = true,
}: {
  image: ImageItem;
  aspectRatio: string | undefined;
  fitClass: string;
  imgSizeClass: string;
  rounded?: boolean;
}) {
  const roundClass = rounded ? 'rounded-xl overflow-hidden' : '';
  if (hasFixedAspect(aspectRatio)) {
    return (
      <div className={cn('w-full', roundClass)} style={getAspectStyle(aspectRatio)}>
        <ImageWithFallback
          src={image.url}
          alt={image.alt ?? ''}
          className="w-full h-full"
          imgClassName={cn('w-full h-full', imgSizeClass)}
          fitClass={fitClass}
        />
      </div>
    );
  }
  return (
    <ImageWithFallback
      src={image.url}
      alt={image.alt ?? ''}
      className={cn('w-full', roundClass)}
      imgClassName={cn('w-full h-auto max-w-full mx-auto block', imgSizeClass)}
      fitClass={fitClass}
    />
  );
}

function ZoomOverlay() {
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/0 group-hover/zoom:bg-black/20 opacity-0 group-hover/zoom:opacity-100 transition-all pointer-events-none">
      <span className="flex items-center justify-center w-9 h-9 rounded-full bg-black/55 text-white">
        <Expand className="w-4 h-4" />
      </span>
    </div>
  );
}

function ClickHintOverlay({ hint }: { hint: string }) {
  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-end pb-3 bg-gradient-to-t from-black/45 via-black/5 to-transparent pointer-events-none">
      <span className="flex items-center gap-1.5 text-xs font-medium text-white bg-black/55 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-sm">
        <Info className="w-3.5 h-3.5 shrink-0" />
        {hint}
      </span>
    </div>
  );
}

function ClickedBadge() {
  return (
    <span
      className="absolute top-2 right-2 z-20 flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500 text-white shadow-md ring-2 ring-white/80"
      aria-label="Viewed"
    >
      <Check className="w-3.5 h-3.5" strokeWidth={3} />
    </span>
  );
}

function ImageClickShell({
  index,
  onOpen,
  interaction,
  children,
  className,
}: {
  index: number;
  onOpen?: () => void;
  interaction: InteractionConfig;
  children: React.ReactNode;
  className?: string;
}) {
  const clickable = !!onOpen;
  const viewed = interaction.clicked.has(index);
  return (
    <div
      className={cn(
        'relative group/zoom',
        clickable && 'cursor-pointer',
        interaction.markClicked && viewed && 'brightness-[0.82] saturate-[0.7]',
        className,
      )}
      onClick={onOpen}
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      onKeyDown={clickable ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen?.(); } } : undefined}
    >
      {children}
      {clickable && (interaction.clickForMore ? <ClickHintOverlay hint={interaction.clickHint} /> : <ZoomOverlay />)}
      {interaction.markClicked && viewed && <ClickedBadge />}
    </div>
  );
}

function GridCaption({ text, hidden, color }: { text: string | null | undefined; hidden: boolean; color: string }) {
  if (!text || hidden) return null;
  return (
    <Caption
      text={text}
      style={{ color }}
      className="mt-1.5 text-xs italic px-0.5 [&_a]:underline [&_a]:opacity-90 [&_p]:my-0.5"
    />
  );
}

// ─── Lightbox variants ────────────────────────────────────────────────────────

function useLightboxKeys(onClose: () => void, prev: () => void, next: () => void) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft') prev();
      else if (e.key === 'ArrowRight') next();
    };
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prevOverflow; };
  }, [onClose, prev, next]);
}

function Lightbox({ images, index, onClose, onNavigate }: {
  images: ImageItem[]; index: number; onClose: () => void; onNavigate: (i: number) => void;
}) {
  const prev = useCallback(() => onNavigate((index - 1 + images.length) % images.length), [index, images.length, onNavigate]);
  const next = useCallback(() => onNavigate((index + 1) % images.length), [index, images.length, onNavigate]);
  useLightboxKeys(onClose, prev, next);

  if (typeof document === 'undefined') return null;
  const img = images[index];
  const many = images.length > 1;

  return createPortal(
    <div className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-sm flex flex-col" onClick={onClose}>
      <div className="flex items-center justify-between px-4 py-3 text-white/80 shrink-0" onClick={(e) => e.stopPropagation()}>
        <span className="text-sm font-medium tabular-nums">{many ? `${index + 1} / ${images.length}` : ''}</span>
        <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 transition-colors" aria-label="Close">
          <X className="w-5 h-5" />
        </button>
      </div>
      <div className="relative flex-1 min-h-0 flex items-center justify-center px-4 sm:px-16" onClick={(e) => e.stopPropagation()}>
        {many && (
          <button onClick={prev} aria-label="Previous"
            className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors z-10">
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}
        <img src={img.url} alt={img.alt ?? ''} className="max-h-[78vh] max-w-full object-contain rounded-lg shadow-2xl select-none" />
        {many && (
          <button onClick={next} aria-label="Next"
            className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors z-10">
            <ChevronRight className="w-6 h-6" />
          </button>
        )}
      </div>
      <div className="shrink-0 px-4 py-3 space-y-3" onClick={(e) => e.stopPropagation()}>
        {img.caption && (
          <Caption text={img.caption} className="text-center text-sm text-white/80 max-w-2xl mx-auto [&_a]:text-white [&_a]:underline [&_p]:my-0.5" />
        )}
        {many && (
          <div className="flex items-center justify-center gap-1.5 overflow-x-auto pb-1">
            {images.map((t, i) => (
              <button key={i} onClick={() => onNavigate(i)}
                className={`h-12 w-16 shrink-0 rounded-md overflow-hidden border-2 transition-all ${i === index ? 'border-white' : 'border-transparent opacity-60 hover:opacity-100'}`}>
                {isLoadableUrl(t.url)
                  ? <img src={t.url} alt="" className="w-full h-full object-cover" />
                  : <div className="w-full h-full bg-white/10" />}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}

/** Refined card popup for "click for more" mode */
function CardLightbox({ images, index, onClose, onNavigate }: {
  images: ImageItem[]; index: number; onClose: () => void; onNavigate: (i: number) => void;
}) {
  const prev = useCallback(() => onNavigate((index - 1 + images.length) % images.length), [index, images.length, onNavigate]);
  const next = useCallback(() => onNavigate((index + 1) % images.length), [index, images.length, onNavigate]);
  useLightboxKeys(onClose, prev, next);

  if (typeof document === 'undefined') return null;
  const img = images[index];
  const many = images.length > 1;

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-3 sm:p-6 bg-black/55 backdrop-blur-md"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={img.alt || 'Image details'}
    >
      <div
        className="relative w-full max-w-md sm:max-w-lg max-h-[92vh] flex flex-col bg-white rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 shrink-0">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            {many ? `${index + 1} of ${images.length}` : 'Details'}
          </span>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="relative bg-slate-50 shrink-0">
          {many && (
            <>
              <button onClick={prev} aria-label="Previous image"
                className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-white/90 shadow text-slate-700 flex items-center justify-center hover:bg-white transition-colors">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button onClick={next} aria-label="Next image"
                className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-white/90 shadow text-slate-700 flex items-center justify-center hover:bg-white transition-colors">
                <ChevronRight className="w-4 h-4" />
              </button>
            </>
          )}
          <div className="flex items-center justify-center p-4 min-h-[12rem] max-h-[50vh]">
            <img
              src={img.url}
              alt={img.alt ?? ''}
              className="max-w-full max-h-[46vh] object-contain rounded-lg select-none"
            />
          </div>
        </div>

        {(img.alt || img.caption) && (
          <div className="px-5 py-4 border-t border-slate-100 overflow-y-auto shrink-0">
            {img.alt && (
              <p className="text-base font-semibold text-slate-900 leading-snug mb-1">{img.alt}</p>
            )}
            {img.caption && (
              <Caption
                text={img.caption}
                className="text-sm leading-relaxed text-slate-600 [&_a]:text-[#1E3A5F] [&_a]:underline [&_p]:my-1.5 [&_strong]:font-semibold [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4"
              />
            )}
          </div>
        )}

        {many && (
          <div className="flex items-center justify-center gap-1.5 px-4 py-3 border-t border-slate-100 bg-slate-50/80 shrink-0">
            {images.map((t, i) => (
              <button
                key={i}
                onClick={() => onNavigate(i)}
                aria-label={`View image ${i + 1}`}
                className={cn(
                  'h-10 w-12 shrink-0 rounded-md overflow-hidden border-2 transition-all',
                  i === index ? 'border-[#1E3A5F] ring-1 ring-[#1E3A5F]/30' : 'border-transparent opacity-50 hover:opacity-100',
                )}
              >
                {isLoadableUrl(t.url)
                  ? <img src={t.url} alt="" className="w-full h-full object-cover" />
                  : <div className="w-full h-full bg-slate-200" />}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}

// ─── Layout views ─────────────────────────────────────────────────────────────

function SingleImageView({ image, aspectRatio, fitClass, onOpen, interaction }: {
  image: ImageItem; aspectRatio: string | undefined; fitClass: string;
  onOpen?: () => void; interaction: InteractionConfig;
}) {
  return (
    <figure className="w-full">
      <ImageClickShell index={0} onOpen={onOpen} interaction={interaction}>
        <BlockImage
          image={image}
          aspectRatio={aspectRatio}
          fitClass={fitClass}
          imgSizeClass={interaction.imgSizeClass}
        />
      </ImageClickShell>
      <GridCaption text={image.caption} hidden={interaction.hideCaptionInGrid} color={interaction.captionColor} />
    </figure>
  );
}

function GalleryView({ images, aspectRatio, fitClass, columns, stacked, onOpen, interaction }: {
  images: ImageItem[]; aspectRatio: string | undefined; fitClass: string;
  columns: number; stacked: boolean; onOpen?: (i: number) => void; interaction: InteractionConfig;
}) {
  const cols = stacked ? 1 : columns;

  return (
    <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
      {images.map((img, i) => (
        <figure key={i} className="min-w-0">
          <ImageClickShell
            index={i}
            onOpen={onOpen ? () => onOpen(i) : undefined}
            interaction={interaction}
            className="rounded-xl"
          >
            <BlockImage
              image={img}
              aspectRatio={aspectRatio}
              fitClass={fitClass}
              imgSizeClass={interaction.imgSizeClass}
            />
          </ImageClickShell>
          <GridCaption text={img.caption} hidden={interaction.hideCaptionInGrid} color={interaction.captionColor} />
        </figure>
      ))}
    </div>
  );
}

function SliderView({ images, aspectRatio, fitClass, onOpen, interaction }: {
  images: ImageItem[]; aspectRatio: string | undefined; fitClass: string;
  onOpen?: (i: number) => void; interaction: InteractionConfig;
}) {
  const [current, setCurrent] = useState(0);

  return (
    <div className="relative overflow-hidden rounded-xl">
      <ImageClickShell
        index={current}
        onOpen={onOpen ? () => onOpen(current) : undefined}
        interaction={interaction}
      >
        <BlockImage
          image={images[current]}
          aspectRatio={aspectRatio}
          fitClass={fitClass}
          imgSizeClass={interaction.imgSizeClass}
        />
      </ImageClickShell>
      <GridCaption text={images[current].caption} hidden={interaction.hideCaptionInGrid} color={interaction.captionColor} />
      {images.length > 1 && (
        <div className="mt-3 flex items-center justify-center gap-3">
          <Button variant="outline" size="icon" onClick={() => setCurrent((c) => Math.max(0, c - 1))} disabled={current === 0} className="h-8 w-8 rounded-full">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-1.5">
            {images.map((_, i) => (
              <button key={i} onClick={() => setCurrent(i)}
                className={`w-2 h-2 rounded-full transition-all duration-200 ${i === current ? 'bg-gray-800 scale-125' : 'bg-gray-300 hover:bg-gray-400'}`} />
            ))}
          </div>
          <Button variant="outline" size="icon" onClick={() => setCurrent((c) => Math.min(images.length - 1, c + 1))} disabled={current === images.length - 1} className="h-8 w-8 rounded-full">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

function CarouselView({ images, aspectRatio, fitClass, onOpen, interaction }: {
  images: ImageItem[]; aspectRatio: string | undefined; fitClass: string;
  onOpen?: (i: number) => void; interaction: InteractionConfig;
}) {
  const [offset, setOffset] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const totalSlides = images.length;
  const VISIBLE = Math.min(totalSlides, 3);
  const itemWidthPct = 100 / VISIBLE;

  const advance = useCallback((dir: 1 | -1) => {
    if (isAnimating) return;
    setIsAnimating(true);
    setOffset((prev) => (prev + dir + totalSlides) % totalSlides);
    setTimeout(() => setIsAnimating(false), 400);
  }, [isAnimating, totalSlides]);

  useEffect(() => {
    if (isPaused || totalSlides <= 1) return;
    timerRef.current = setTimeout(() => advance(1), 3000);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [offset, isPaused, advance, totalSlides]);

  const visibleItems = Array.from({ length: VISIBLE }, (_, i) => {
    const idx = (offset + i) % totalSlides;
    return { img: images[idx], idx };
  });
  const centreImg = visibleItems[Math.floor(VISIBLE / 2)]?.img;

  return (
    <div className="relative overflow-hidden rounded-xl" onMouseEnter={() => setIsPaused(true)} onMouseLeave={() => setIsPaused(false)}>
      <div className="flex gap-2 transition-all duration-400">
        {visibleItems.map(({ img, idx }, pos) => (
          <div
            key={`${idx}-${pos}`}
            className={cn(
              'shrink-0 transition-all duration-300',
              pos === Math.floor(VISIBLE / 2) ? 'scale-100' : 'scale-[0.94] opacity-80',
            )}
            style={{ width: `calc(${itemWidthPct}% - 0.5rem)` }}
          >
            <ImageClickShell
              index={idx}
              onOpen={onOpen ? () => onOpen(idx) : undefined}
              interaction={interaction}
            >
              <BlockImage
                image={img}
                aspectRatio={aspectRatio}
                fitClass={fitClass}
                imgSizeClass={interaction.imgSizeClass}
              />
            </ImageClickShell>
          </div>
        ))}
      </div>
      <GridCaption text={centreImg?.caption} hidden={interaction.hideCaptionInGrid} color={interaction.captionColor} />
      {totalSlides > 1 && (
        <>
          <button onClick={() => advance(-1)} className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition-colors z-10" aria-label="Previous">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button onClick={() => advance(1)} className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition-colors z-10" aria-label="Next">
            <ChevronRight className="h-4 w-4" />
          </button>
          <div className="flex items-center justify-center gap-1.5 mt-3">
            {images.map((_, i) => (
              <button key={i} onClick={() => setOffset(i)} className={`rounded-full transition-all duration-200 ${i === offset ? 'w-5 h-2 bg-gray-800' : 'w-2 h-2 bg-gray-300 hover:bg-gray-400'}`} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

const CONTAINER_CLASS: Record<string, string> = {
  inherit: '',
  white: '',
  glass: '',
};

export default function ImageGalleryViewer({ data, block, context, onComplete }: BlockViewerProps<ImageGalleryData>) {
  const images = (data.images ?? []).filter((i) => i?.url);
  const aspectRatio = data.aspectRatio;
  const fitClass = data.objectFit === 'cover' ? 'object-cover' : 'object-contain';
  const clickForMore = data.clickForMore === true;
  const hideCaptionInGrid = clickForMore || data.captionInGrid === false;
  const lightboxEnabled = (data.enableLightbox !== false || clickForMore) && context?.editing !== true;
  const containerClass = CONTAINER_CLASS[data.containerStyle ?? 'inherit'] ?? '';
  const sizeClass = DISPLAY_SIZE_IMG_CLASS[data.displaySize ?? 'md'];
  const markClicked = data.markClicked !== false;
  const clickHint = data.clickHint?.trim() || 'Tap for more';
  const captionColor = resolveCaptionColor(data.captionColor, context?.blockStyle);
  const lessonId = context?.lessonId;
  const blockId = block.id;
  const canPersist = !!lessonId && !context?.editing && !context?.previewMode;

  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [clickedIndices, setClickedIndices] = useState<Set<number>>(() =>
    canPersist ? loadViewedImageIndices(lessonId, blockId) : new Set(),
  );
  const completedRef = useRef(false);

  const markViewed = useCallback((i: number) => {
    setClickedIndices((prev) => {
      if (prev.has(i)) return prev;
      const next = new Set(prev);
      next.add(i);
      if (canPersist && lessonId) {
        saveViewedImageIndices(lessonId, blockId, next);
      }
      return next;
    });
  }, [canPersist, lessonId, blockId]);

  const handleOpen = useCallback((i: number) => {
    setLightboxIndex(i);
    markViewed(i);
  }, [markViewed]);

  const handleLightboxNavigate = useCallback((i: number) => {
    setLightboxIndex(i);
    markViewed(i);
  }, [markViewed]);

  const open = lightboxEnabled ? handleOpen : undefined;

  useEffect(() => {
    if (!data.requireAllClicked || completedRef.current || context?.editing) return;
    if (images.length > 0 && clickedIndices.size >= images.length) {
      completedRef.current = true;
      onComplete?.();
    }
  }, [clickedIndices, images.length, data.requireAllClicked, onComplete, context?.editing]);

  const interaction: InteractionConfig = {
    imgSizeClass: sizeClass,
    hideCaptionInGrid,
    clickForMore,
    clickHint,
    markClicked,
    clicked: clickedIndices,
    captionColor,
  };

  const mode = data.mode ?? (images.length > 1 ? 'gallery' : 'single');

  if (images.length === 0) {
    return (
      <div className="w-full min-h-[8rem] bg-gray-50 rounded-xl flex items-center justify-center border border-dashed border-gray-200">
        <div className="text-center">
          <ImageOff className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-400">No image added</p>
        </div>
      </div>
    );
  }

  let body: React.ReactNode;
  if (mode === 'single') {
    body = <SingleImageView image={images[0]} aspectRatio={aspectRatio} fitClass={fitClass} onOpen={open ? () => open(0) : undefined} interaction={interaction} />;
  } else if (mode === 'slider') {
    body = <SliderView images={images} aspectRatio={aspectRatio} fitClass={fitClass} onOpen={open} interaction={interaction} />;
  } else if (mode === 'carousel') {
    body = <CarouselView images={images} aspectRatio={aspectRatio} fitClass={fitClass} onOpen={open} interaction={interaction} />;
  } else if (images.length === 1) {
    body = <SingleImageView image={images[0]} aspectRatio={aspectRatio} fitClass={fitClass} onOpen={open ? () => open(0) : undefined} interaction={interaction} />;
  } else {
    body = (
      <GalleryView
        images={images}
        aspectRatio={aspectRatio}
        fitClass={fitClass}
        columns={data.columns ?? 2}
        stacked={data.gridLayout === 'stacked'}
        onOpen={open}
        interaction={interaction}
      />
    );
  }

  const showProgress = data.requireAllClicked && !context?.editing && images.length > 1;
  const promptText = data.prompt?.trim();
  const promptPosition = data.promptPosition ?? 'none';
  const showPrompt = !!promptText && promptPosition !== 'none';

  const promptEl = showPrompt ? (
    <p className="text-sm text-[color:var(--surface-text,#0f172a)] opacity-80 leading-relaxed whitespace-pre-line">
      {promptText}
    </p>
  ) : null;

  const imageBody = containerClass ? <div className={containerClass}>{body}</div> : body;

  return (
    <>
      {showPrompt && promptPosition === 'top' && <div className="mb-3">{promptEl}</div>}
      {imageBody}
      {showPrompt && promptPosition === 'bottom' && <div className="mt-3">{promptEl}</div>}
      {showProgress && (
        <p
          className={cn(
            'mt-3 text-center text-xs font-medium',
            clickedIndices.size >= images.length ? 'text-emerald-600' : 'text-[color:var(--surface-text-muted,#64748b)]',
          )}
          role="status"
        >
          {clickedIndices.size >= images.length
            ? 'All images viewed — you can continue'
            : `${clickedIndices.size} of ${images.length} viewed — open each image to continue`}
        </p>
      )}
      {lightboxIndex !== null && (
        clickForMore ? (
          <CardLightbox
            images={images}
            index={lightboxIndex}
            onClose={() => setLightboxIndex(null)}
            onNavigate={handleLightboxNavigate}
          />
        ) : (
          <Lightbox
            images={images}
            index={lightboxIndex}
            onClose={() => setLightboxIndex(null)}
            onNavigate={handleLightboxNavigate}
          />
        )
      )}
    </>
  );
}
