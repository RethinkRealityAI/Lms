'use client';

import { Sparkles } from 'lucide-react';
import type { BlockViewerProps } from '@/lib/content/block-registry';
import type { IconListData, IconListColumns } from '@/lib/content/blocks/icon-list/schema';

const DEFAULT_ACCENT = '#1A3C6E';

function sanitizeHtml(html: string): string {
  let result = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  result = result.replace(/<img\s+[^>]*src=["'](?!https?:\/\/|data:)[^"']*["'][^>]*\/?>/gi, '');
  result = result.replace(
    /(<a\b[^>]*\bhref=)(["'])\s*(?:javascript|vbscript|data):[^"']*\2/gi,
    '$1$2#$2'
  );
  result = result.replace(
    /<a\b(?![^>]*\btarget=)/gi,
    '<a target="_blank" rel="noopener noreferrer nofollow"'
  );
  return result;
}

const COLUMNS_CLASS: Record<IconListColumns, string> = {
  auto: 'grid-cols-1 @md:grid-cols-2 @3xl:grid-cols-3',
  '1': 'grid-cols-1',
  '2': 'grid-cols-1 @md:grid-cols-2',
  '3': 'grid-cols-1 @md:grid-cols-2 @3xl:grid-cols-3',
  '4': 'grid-cols-2 @md:grid-cols-4',
};

export default function IconListViewer({ data }: BlockViewerProps<IconListData>) {
  const items = data.items ?? [];
  if (items.length === 0) {
    return (
      <div className="w-full py-6 text-center text-sm opacity-50 [color:inherit]">No items yet.</div>
    );
  }

  const accent = data.accent_color || DEFAULT_ACCENT;
  const iconSize = data.icon_size ?? 64;
  const inline = data.layout === 'inline';
  const card = data.card !== false;
  const columns = COLUMNS_CLASS[data.columns ?? 'auto'];

  return (
    <div className={`grid ${columns} gap-3 @md:gap-4 w-full`}>
      {items.map((item, i) => (
        <div
          key={i}
          className={`flex ${inline ? 'flex-row items-start gap-3 @md:gap-4' : 'flex-col items-center text-center gap-3'} ${
            card ? 'rounded-2xl p-4 @md:p-5 bg-white/70 ring-1 ring-black/5 shadow-sm backdrop-blur-sm' : ''
          }`}
        >
          <div
            className="shrink-0 flex items-center justify-center rounded-2xl overflow-hidden"
            style={{
              width: iconSize,
              height: iconSize,
              backgroundColor: card ? `${accent}14` : 'transparent',
            }}
          >
            {item.icon_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.icon_url}
                alt={item.title || ''}
                className="w-full h-full object-contain p-1.5"
                loading="lazy"
                draggable={false}
              />
            ) : (
              <Sparkles style={{ color: accent }} className="w-1/2 h-1/2" />
            )}
          </div>
          <div className={`min-w-0 ${inline ? 'flex-1' : ''}`}>
            {item.title && (
              <h4
                className="text-base @md:text-lg font-bold leading-snug mb-1"
                style={{ color: data.title_color || accent }}
              >
                {item.title}
              </h4>
            )}
            {item.html && (
              <div
                className="rich-text-viewer text-sm @md:text-base leading-relaxed [color:inherit] opacity-90 [&_a]:underline"
                style={data.text_color ? { color: data.text_color } : undefined}
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(item.html) }}
              />
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
