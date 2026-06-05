'use client';

import { useState, useRef } from 'react';
import { Play, AlertCircle } from 'lucide-react';
import type { BlockViewerProps } from '@/lib/content/block-registry';
import type { VideoData } from '@/lib/content/blocks/video/schema';
import { YouTubePlayer } from './youtube-player';

function youtubeId(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : null;
}
function vimeoId(url: string): string | null {
  const m = url.match(/vimeo\.com\/(?:[^/]+\/)*(\d+)/);
  return m ? m[1] : null;
}

export default function VideoViewer({ data, context, onComplete }: BlockViewerProps<VideoData>) {
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const endedRef = useRef(false);

  const editing = context?.editing === true;
  const advance = () => {
    if (editing) return;
    onComplete?.();
    context?.onAutoAdvance?.();
  };

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

  const ytId = youtubeId(data.url);
  const vId = vimeoId(data.url);

  // ── YouTube: content-sized card (title + 16:9 video + controls) ──
  if (ytId) {
    return (
      <div className="w-full flex flex-col">
        <YouTubePlayer
          videoId={ytId}
          title={data.title}
          start={data.start}
          end={data.end}
          autoplay={data.autoplay}
          showSkip={data.show_skip}
          inert={editing}
          onEnded={() => { if (data.auto_progress) advance(); else onComplete?.(); }}
          onSkip={advance}
        />
        {data.caption && (
          <p className="text-sm opacity-70 italic px-3.5 py-2 border-t border-current/10 shrink-0">{data.caption}</p>
        )}
      </div>
    );
  }

  // ── Vimeo: plain responsive iframe ──
  if (vId) {
    const params = new URLSearchParams();
    if (data.autoplay) params.set('autoplay', '1');
    if (data.start) params.set('#t', `${Math.floor(data.start)}s`);
    const src = `https://player.vimeo.com/video/${vId}${params.toString() ? `?${params.toString()}` : ''}`;
    return (
      <div className="space-y-2.5">
        <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-gray-900">
          {!iframeLoaded && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-900 z-10">
              <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            </div>
          )}
          <iframe
            src={src}
            className="absolute inset-0 w-full h-full"
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
            title="Video"
            onLoad={() => setIframeLoaded(true)}
            onError={() => setVideoError(true)}
          />
        </div>
        {data.caption && <p className="text-sm text-gray-500 italic">{data.caption}</p>}
      </div>
    );
  }

  // ── Direct file (mp4/webm/…): native element with start/end + auto-progress ──
  return (
    <div className="space-y-2.5">
      <video
        ref={videoRef}
        src={data.start ? `${data.url}#t=${Math.floor(data.start)}` : data.url}
        poster={data.poster || undefined}
        controls
        autoPlay={data.autoplay}
        onError={() => setVideoError(true)}
        onLoadedMetadata={() => {
          if (videoRef.current && data.start) videoRef.current.currentTime = data.start;
        }}
        onTimeUpdate={() => {
          const v = videoRef.current;
          if (!v || endedRef.current) return;
          if (data.end && v.currentTime >= data.end) {
            endedRef.current = true;
            v.pause();
            if (data.auto_progress) advance(); else onComplete?.();
          }
        }}
        onEnded={() => {
          if (endedRef.current) return;
          endedRef.current = true;
          if (data.auto_progress) advance(); else onComplete?.();
        }}
        className="w-full aspect-video rounded-xl object-contain bg-black"
      >
        Your browser does not support the video tag.
      </video>
      {data.caption && <p className="text-sm text-gray-500 italic">{data.caption}</p>}
    </div>
  );
}
