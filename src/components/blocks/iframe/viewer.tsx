'use client';
import { useState } from 'react';
import type { BlockViewerProps } from '@/lib/content/block-registry';

export default function IframeViewer({ data, block }: BlockViewerProps<{ url: string; height?: number }>) {
  const [loadError, setLoadError] = useState(false);
  const heightPx = data.height ?? 600;

  if (!data.url) {
    return (
      <div
        className="w-full rounded-lg bg-gray-100 flex items-center justify-center text-sm text-muted-foreground"
        style={{ height: heightPx }}
      >
        No URL provided
      </div>
    );
  }

  if (loadError) {
    return (
      <div
        className="w-full rounded-lg bg-gray-50 border border-gray-200 flex flex-col items-center justify-center gap-3"
        style={{ height: heightPx }}
      >
        <p className="text-sm font-medium text-gray-600">Unable to display embedded content</p>
        <a
          href={data.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-blue-600 underline hover:text-blue-800"
        >
          Open in new tab ↗
        </a>
      </div>
    );
  }

  return (
    <iframe
      src={data.url}
      className="w-full rounded-lg border-0"
      style={{ height: heightPx }}
      title={block.title || 'Embedded content'}
      sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-presentation allow-top-navigation-by-user-activation"
      allow="accelerometer; camera; encrypted-media; fullscreen; geolocation; gyroscope; microphone; midi"
      onError={() => setLoadError(true)}
    />
  );
}
