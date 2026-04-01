'use client';

import type React from 'react';
import { H5PPlayerUI } from '@lumieducation/h5p-react';

interface H5PPlayerProps {
  title?: string;
  contentKey?: string;
  metadata?: Record<string, any>;
}

export function H5PPlayer({ title, contentKey, metadata }: H5PPlayerProps) {
  const embedUrl = typeof metadata?.embedUrl === 'string' ? metadata.embedUrl : '';
  const useReactH5PPlayer = metadata?.playerMode === 'react' && Boolean(contentKey);

  if (useReactH5PPlayer && contentKey) {
    return (
      <H5PPlayerUI
        contentId={contentKey}
        loadContentCallback={async (id) => {
          const response = await fetch(`/api/h5p/player/${id}`);
          if (!response.ok) {
            throw new Error('Failed to load H5P player model.');
          }
          return response.json();
        }}
      />
    );
  }

  if (embedUrl) {
    return (
      <iframe
        src={embedUrl}
        title={title || contentKey || 'H5P content'}
        className="w-full rounded-lg border"
        style={{ height: '650px' }}
      />
    );
  }

  return (
    <div className="rounded-lg border bg-muted/20 p-6">
      <h3 className="text-lg font-semibold">{title || 'H5P Activity'}</h3>
      <p className="mt-2 text-sm text-muted-foreground">
        H5P content is registered with key <code>{contentKey || 'unknown'}</code>. Configure
        an <code>embedUrl</code> in metadata to render external hosted H5P content, or connect
        the full H5P Node server endpoints.
      </p>
    </div>
  );
}
