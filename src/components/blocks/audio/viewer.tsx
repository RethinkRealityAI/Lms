'use client';

import { Volume2 } from 'lucide-react';
import type { BlockViewerProps } from '@/lib/content/block-registry';
import type { AudioData } from '@/lib/content/blocks/audio/schema';

export default function AudioViewer({ data }: BlockViewerProps<AudioData>) {
  if (!data.url) {
    return (
      <div className="w-full py-6 text-center text-sm opacity-50 [color:inherit]">No audio yet.</div>
    );
  }
  return (
    <div className="w-full flex flex-col gap-2">
      {data.title && (
        <div className="flex items-center gap-2 text-sm @md:text-base font-semibold [color:inherit]">
          <Volume2 className="w-4 h-4 shrink-0 opacity-70" />
          <span>{data.title}</span>
        </div>
      )}
      <audio
        controls
        preload="metadata"
        autoPlay={data.autoplay ?? false}
        className="w-full"
        src={data.url}
      >
        Your browser does not support the audio element.
      </audio>
      {data.caption && (
        <p className="text-sm leading-relaxed [color:inherit] opacity-90">{data.caption}</p>
      )}
      {data.credit && (
        <p className="text-xs italic [color:inherit] opacity-70">{data.credit}</p>
      )}
    </div>
  );
}
