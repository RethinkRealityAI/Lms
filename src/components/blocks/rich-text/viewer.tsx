'use client';

import type { BlockViewerProps } from '@/lib/content/block-registry';
import type { RichTextData } from '@/lib/content/blocks/rich-text/schema';

function sanitizeHtml(html: string): string {
  // Content originates from admin-imported SCORM packages.
  // Strip script tags as defense-in-depth against malformed imports.
  let result = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  // Remove inline images with relative SCORM paths (fit_content_assets/...) that
  // can't load in the browser. The actual images live in separate image_gallery blocks
  // with absolute CDN URLs.
  result = result.replace(/<img\s+[^>]*src=["'](?!https?:\/\/|data:)[^"']*["'][^>]*\/?>/gi, '');
  // Neutralise dangerous link protocols (javascript:, vbscript:, data:text/html).
  result = result.replace(/(<a\b[^>]*\bhref=)(["'])\s*(?:javascript|vbscript|data):[^"']*\2/gi, '$1$2#$2');
  // Ensure every link opens safely in a new tab.
  result = result.replace(/<a\b(?![^>]*\btarget=)/gi, '<a target="_blank" rel="noopener noreferrer nofollow"');
  return result;
}

export default function RichTextViewer({ data }: BlockViewerProps<RichTextData>) {
  if (data.mode === 'sequence' && data.segments) {
    const sorted = [...(data.segments ?? [])].sort((a, b) => a.reveal_order - b.reveal_order);
    return (
      <div className="space-y-6">
        {sorted.map((seg, i) => (
          <div key={i} className="rich-text-viewer prose max-w-none" dangerouslySetInnerHTML={{ __html: sanitizeHtml(seg.text) }} />
        ))}
      </div>
    );
  }

  return (
    <div
      className="rich-text-viewer prose max-w-none"
      dangerouslySetInnerHTML={{ __html: sanitizeHtml(data.html) }}
    />
  );
}
