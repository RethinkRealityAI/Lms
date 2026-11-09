'use client';

import { useId, useState } from 'react';
import { ChevronDown, FileText, Volume2 } from 'lucide-react';
import type { BlockViewerProps } from '@/lib/content/block-registry';
import type { AudioData } from '@/lib/content/blocks/audio/schema';

export default function AudioViewer({ data }: BlockViewerProps<AudioData>) {
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const transcriptId = useId();
  const transcript = data.transcript?.trim();

  if (!data.url) {
    return (
      <div className="w-full py-6 text-center text-sm opacity-50 [color:inherit]">No audio yet.</div>
    );
  }
  const titleNode = (
    <div className="flex items-center gap-2 text-sm @md:text-base font-semibold [color:inherit] min-w-0">
      <Volume2 className="w-4 h-4 shrink-0 opacity-70" />
      <span className="truncate">{data.title}</span>
    </div>
  );
  return (
    <div className="w-full flex flex-col gap-2">
      {data.title && !transcript && titleNode}
      <audio
        controls
        preload="metadata"
        autoPlay={data.autoplay ?? false}
        className="w-full"
        src={data.url}
      >
        Your browser does not support the audio element.
      </audio>
      {transcript && (
        <div className="flex flex-col">
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              aria-expanded={transcriptOpen}
              aria-controls={transcriptId}
              onClick={() => setTranscriptOpen((open) => !open)}
              className="inline-flex items-center gap-1.5 rounded-md px-1.5 py-1 -ml-1.5 text-sm font-medium [color:inherit] opacity-80 hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current transition-opacity"
            >
              <FileText className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>{transcriptOpen ? 'Hide transcript' : 'Transcript'}</span>
              <ChevronDown
                className={`w-4 h-4 shrink-0 transition-transform duration-200 ${transcriptOpen ? 'rotate-180' : ''}`}
                aria-hidden="true"
              />
            </button>
            {data.title && titleNode}
          </div>
          {transcriptOpen && (
            <div
              id={transcriptId}
              tabIndex={0}
              className="mt-1 max-h-56 overflow-y-auto rounded-lg bg-black/5 px-3 py-2 text-sm leading-relaxed whitespace-pre-line [color:inherit] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current"
            >
              {transcript}
            </div>
          )}
        </div>
      )}
      {data.caption && (
        <p className="text-sm leading-relaxed [color:inherit] opacity-90">{data.caption}</p>
      )}
      {data.credit && (
        <p className="text-xs italic [color:inherit] opacity-70">{data.credit}</p>
      )}
    </div>
  );
}
