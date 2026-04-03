'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight, ImageOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { BlockViewerProps } from '@/lib/content/block-registry';
import type { ImageGalleryData } from '@/lib/content/blocks/image-gallery/schema';

/** Check if a URL is loadable (absolute http/https or data URI) */
function isLoadableUrl(url: string): boolean {
  if (!url) return false;
  return url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:');
}

function ImageWithFallback({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const [error, setError] = useState(false);
  const [loaded, setLoaded] = useState(false);

  if (!isLoadableUrl(src) || error) {
    return (
      <div className={`bg-gray-100 flex items-center justify-center ${className}`}>
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
    <div className={`relative ${className}`}>
      {!loaded && (
        <div className="absolute inset-0 bg-gray-100 animate-pulse rounded-lg" />
      )}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        onLoad={() => setLoaded(true)}
        onError={() => setError(true)}
        className={`w-full h-full object-cover transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
      />
    </div>
  );
}

/** Render caption — supports HTML from SCORM imports and plain text */
function Caption({ text, className }: { text: string; className?: string }) {
  if (text.includes('<')) {
    return <div className={className} dangerouslySetInnerHTML={{ __html: text }} />;
  }
  return <p className={className}>{text}</p>;
}

export default function ImageGalleryViewer({ data }: BlockViewerProps<ImageGalleryData>) {
  const [current, setCurrent] = useState(0);
  const images = data.images ?? [];

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
    return (
      <div className="relative overflow-hidden rounded-xl">
        <ImageWithFallback
          src={images[current].url}
          alt={images[current].alt ?? ''}
          className="w-full aspect-video rounded-xl overflow-hidden"
        />
        {images[current].caption && (
          <Caption text={images[current].caption!} className="mt-2.5 text-sm text-gray-500 italic [&_p]:my-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5" />
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

  // Gallery grid mode
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {images.map((img, i) => (
        <div key={i} className="overflow-hidden rounded-xl">
          <ImageWithFallback
            src={img.url}
            alt={img.alt ?? ''}
            className="aspect-[4/3] rounded-xl overflow-hidden"
          />
          {img.caption && (
            <Caption text={img.caption} className="mt-1.5 text-xs text-gray-500 px-0.5 [&_p]:my-0.5" />
          )}
        </div>
      ))}
    </div>
  );
}
