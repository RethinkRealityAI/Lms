'use client';

import type { BlockViewerProps } from '@/lib/content/block-registry';
import type { RichTextData } from '@/lib/content/blocks/rich-text/schema';

function sanitizeHtml(html: string): string {
  // Content originates from admin-imported SCORM packages.
  // Strip script tags as defense-in-depth against malformed imports.
  return html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
}

export default function RichTextViewer({ data }: BlockViewerProps<RichTextData>) {
  if (data.mode === 'sequence' && data.segments) {
    const sorted = [...(data.segments ?? [])].sort((a, b) => a.reveal_order - b.reveal_order);
    return (
      <div className="space-y-4">
        {sorted.map((seg, i) => (
          <div key={i} className="prose max-w-none" dangerouslySetInnerHTML={{ __html: sanitizeHtml(seg.text) }} />
        ))}
      </div>
    );
  }

  return (
    <div
      className="prose prose-sm max-w-none dark:prose-invert"
      dangerouslySetInnerHTML={{ __html: sanitizeHtml(data.html) }}
    />
  );
}
