'use client';

import { ExternalLink } from 'lucide-react';
import type { BlockViewerProps } from '@/lib/content/block-registry';
import type { CtaData } from '@/lib/content/blocks/cta/schema';

export default function CtaViewer({ data }: BlockViewerProps<CtaData>) {
  // Handle legacy navigation CTAs — render nothing (footer handles navigation now)
  const legacyAction = (data as Record<string, unknown>).action as string | undefined;
  if (legacyAction === 'complete_lesson' || legacyAction === 'next_lesson') {
    return null;
  }

  return (
    <div className="flex flex-col items-center gap-3 py-4">
      {data.text && <p className="text-base text-gray-700">{data.text}</p>}
      {data.url ? (
        <a
          href={data.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-6 py-3 bg-[#1E3A5F] text-white font-semibold rounded-xl hover:bg-[#162d4a] transition-colors"
        >
          {data.button_label || 'Click Here'}
          <ExternalLink className="h-4 w-4" />
        </a>
      ) : (
        <div className="inline-flex items-center gap-2 px-6 py-3 bg-gray-100 text-gray-400 rounded-xl text-sm">
          {data.button_label || 'Click Here'} (no URL set)
        </div>
      )}
    </div>
  );
}
