'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { BlockViewerProps } from '@/lib/content/block-registry';
import type { ImageGalleryData } from '@/lib/content/blocks/image-gallery/schema';

export default function ImageGalleryViewer({ data }: BlockViewerProps<ImageGalleryData>) {
  const [current, setCurrent] = useState(0);
  const images = data.images ?? [];

  if (images.length === 0) return null;

  if (data.mode === 'slider') {
    return (
      <div className="relative overflow-hidden rounded-lg">
        <img
          src={images[current].url}
          alt={images[current].alt ?? ''}
          className="w-full object-cover"
        />
        {images[current].caption && (
          <p className="mt-2 text-sm text-muted-foreground">{images[current].caption}</p>
        )}
        {images.length > 1 && (
          <div className="mt-3 flex items-center justify-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrent((c) => Math.max(0, c - 1))}
              disabled={current === 0}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-muted-foreground">
              {current + 1} / {images.length}
            </span>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrent((c) => Math.min(images.length - 1, c + 1))}
              disabled={current === images.length - 1}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {images.map((img, i) => (
        <div key={i} className="overflow-hidden rounded-lg">
          <img src={img.url} alt={img.alt ?? ''} className="w-full object-cover" />
          {img.caption && (
            <p className="mt-1 text-xs text-muted-foreground">{img.caption}</p>
          )}
        </div>
      ))}
    </div>
  );
}
