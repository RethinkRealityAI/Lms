'use client';
import type { BlockViewerProps } from '@/lib/content/block-registry';

type EmbedResult =
  | { type: 'youtube' | 'vimeo'; embedUrl: string }
  | { type: 'video'; embedUrl: string };

function resolveEmbedUrl(url: string): EmbedResult {
  // YouTube: watch?v=, youtu.be/, /embed/, /shorts/
  const ytMatch = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/,
  );
  if (ytMatch) {
    return { type: 'youtube', embedUrl: `https://www.youtube.com/embed/${ytMatch[1]}` };
  }
  // Vimeo: vimeo.com/[optional channel/]<id>
  const vimeoMatch = url.match(/vimeo\.com\/(?:[^/]+\/)*(\d+)/);
  if (vimeoMatch) {
    return { type: 'vimeo', embedUrl: `https://player.vimeo.com/video/${vimeoMatch[1]}` };
  }
  return { type: 'video', embedUrl: url };
}

export default function VideoViewer({
  data,
}: BlockViewerProps<{ url: string; poster?: string; caption?: string; autoplay?: boolean }>) {
  if (!data.url) {
    return (
      <div className="w-full aspect-video bg-gray-100 rounded-lg flex items-center justify-center">
        <p className="text-sm text-muted-foreground">No video URL provided</p>
      </div>
    );
  }

  const { type, embedUrl } = resolveEmbedUrl(data.url);

  return (
    <div className="space-y-2">
      {type === 'video' ? (
        <video
          src={embedUrl}
          poster={data.poster || undefined}
          controls
          autoPlay={data.autoplay}
          className="w-full rounded-lg"
          style={{ maxHeight: 500 }}
        >
          Your browser does not support the video tag.
        </video>
      ) : (
        <div className="relative w-full rounded-lg overflow-hidden" style={{ paddingBottom: '56.25%' }}>
          <iframe
            src={`${embedUrl}${data.autoplay ? '?autoplay=1' : ''}`}
            className="absolute inset-0 w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            title="Video"
          />
        </div>
      )}
      {data.caption && <p className="text-sm text-muted-foreground">{data.caption}</p>}
    </div>
  );
}
