'use client';

import { useState } from 'react';
import { Play, AlertCircle } from 'lucide-react';
import type { BlockViewerProps } from '@/lib/content/block-registry';

type EmbedResult =
  | { type: 'youtube' | 'vimeo'; embedUrl: string }
  | { type: 'video'; embedUrl: string };

function resolveEmbedUrl(url: string): EmbedResult {
  const ytMatch = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/,
  );
  if (ytMatch) {
    return { type: 'youtube', embedUrl: `https://www.youtube.com/embed/${ytMatch[1]}` };
  }
  const vimeoMatch = url.match(/vimeo\.com\/(?:[^/]+\/)*(\d+)/);
  if (vimeoMatch) {
    return { type: 'vimeo', embedUrl: `https://player.vimeo.com/video/${vimeoMatch[1]}` };
  }
  return { type: 'video', embedUrl: url };
}

export default function VideoViewer({
  data,
}: BlockViewerProps<{ url: string; poster?: string; caption?: string; autoplay?: boolean }>) {
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [videoError, setVideoError] = useState(false);

  if (!data.url) {
    return (
      <div className="w-full aspect-video bg-gray-50 rounded-xl flex items-center justify-center border border-dashed border-gray-200">
        <div className="text-center">
          <Play className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-400">No video URL provided</p>
        </div>
      </div>
    );
  }

  if (videoError) {
    return (
      <div className="w-full aspect-video bg-gray-50 rounded-xl flex items-center justify-center border border-gray-200">
        <div className="text-center">
          <AlertCircle className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-500">Failed to load video</p>
          <p className="text-xs text-gray-400 mt-1 max-w-xs truncate">{data.url}</p>
        </div>
      </div>
    );
  }

  const { type, embedUrl } = resolveEmbedUrl(data.url);

  return (
    <div className="space-y-2.5">
      {type === 'video' ? (
        <video
          src={embedUrl}
          poster={data.poster || undefined}
          controls
          autoPlay={data.autoplay}
          onError={() => setVideoError(true)}
          className="w-full aspect-video rounded-xl object-contain bg-black"
        >
          Your browser does not support the video tag.
        </video>
      ) : (
        <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-gray-900">
          {!iframeLoaded && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-900 z-10">
              <div className="text-center">
                <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-3" />
                <p className="text-xs text-white/50">Loading video...</p>
              </div>
            </div>
          )}
          <iframe
            src={`${embedUrl}${data.autoplay ? '?autoplay=1' : ''}`}
            className="absolute inset-0 w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            title="Video"
            onLoad={() => setIframeLoaded(true)}
            onError={() => setVideoError(true)}
          />
        </div>
      )}
      {data.caption && <p className="text-sm text-gray-500 italic">{data.caption}</p>}
    </div>
  );
}
