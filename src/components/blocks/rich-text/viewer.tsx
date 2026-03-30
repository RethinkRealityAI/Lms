'use client';

import type { BlockViewerProps } from '@/lib/content/block-registry';
import type { RichTextData } from '@/lib/content/blocks/rich-text/schema';

export default function RichTextViewer({ data }: BlockViewerProps<RichTextData>) {
  if (data.mode === 'sequence' && data.segments) {
    return (
      <div className="space-y-4">
        {data.segments.map((seg, i) => (
          <div key={i} className="prose max-w-none" dangerouslySetInnerHTML={{ __html: seg.text }} />
        ))}
      </div>
    );
  }

  return (
    <div
      className="prose prose-sm max-w-none dark:prose-invert"
      dangerouslySetInnerHTML={{ __html: data.html }}
    />
  );
}
