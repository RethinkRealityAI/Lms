'use client';

import type { CSSProperties } from 'react';
import { UserRound } from 'lucide-react';
import type { BlockViewerProps } from '@/lib/content/block-registry';
import type { CalloutData } from '@/lib/content/blocks/callout/schema';
import { resolveCalloutIcon } from './icons';
import { MediaWithContent } from '@/components/blocks/shared/media-view';

const VARIANT_CONFIG = {
  info:    { className: 'bg-blue-50 border-blue-200 text-blue-900' },
  warning: { className: 'bg-yellow-50 border-yellow-200 text-yellow-900' },
  tip:     { className: 'bg-green-50 border-green-200 text-green-900' },
  success: { className: 'bg-emerald-50 border-emerald-200 text-emerald-900' },
};

const BUBBLE_CONFIGS = {
  light:  { bg: '#ffffff', text: '#1e293b', shadow: '0 4px 24px rgba(0,0,0,0.10)' },
  dark:   { bg: '#0f172a', text: '#f1f5f9', shadow: '0 4px 24px rgba(0,0,0,0.40)' },
  accent: { bg: '#eef2ff', text: '#312e81', shadow: '0 4px 24px rgba(99,102,241,0.12)' },
};

const AVATAR_RADIUS = {
  circle:  'rounded-full',
  square:  'rounded-none',
  rounded: 'rounded-xl',
};

// Full sanitizer (mirrors rich-text/content-list): strips scripts, drops <img> with
// unresolvable relative src, neutralises javascript:/vbscript:/data: hrefs, and forces
// links to open safely in a new tab. Speech-bubble text is authored in the same Tiptap
// editor as rich-text, so it must be cleaned the same way.
function sanitizeHtml(html: string): string {
  let result = (html ?? '').replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  result = result.replace(/<img\s+[^>]*src=["'](?!https?:\/\/|data:)[^"']*["'][^>]*\/?>/gi, '');
  result = result.replace(
    /(<a\b[^>]*\bhref=)(["'])\s*(?:javascript|vbscript|data):[^"']*\2/gi,
    '$1$2#$2',
  );
  result = result.replace(
    /<a\b(?![^>]*\btarget=)/gi,
    '<a target="_blank" rel="noopener noreferrer nofollow"',
  );
  return result;
}

/** Perceived sRGB luminance (0–1) of a #rrggbb colour; 0.5 for anything unparseable. */
function luminance(hex: string): number {
  const m = /^#?([0-9a-f]{6})$/i.exec((hex ?? '').trim());
  if (!m) return 0.5;
  const n = parseInt(m[1], 16);
  return ((0.299 * ((n >> 16) & 255)) + (0.587 * ((n >> 8) & 255)) + (0.114 * (n & 255))) / 255;
}

/** Pick a readable text colour (near-white or near-black) for a solid background. */
function readableTextOn(hex: string): string {
  return luminance(hex) > 0.6 ? '#0f172a' : '#ffffff';
}

// ── Speech Bubble Viewer ─────────────────────────────────────────────────────

function SpeechBubbleViewer({ data, accent }: { data: CalloutData; accent: string }) {
  const {
    bubble_text = '',
    author_name,
    author_title,
    avatar_url,
    direction = 'right',
    bubble_style = 'light',
    avatar_style = 'circle',
  } = data;

  const isRight = direction === 'right'; // avatar sits on the right, below the bubble
  // The "accent" style follows the resolved theme accent (global → institution → course).
  const cfg = bubble_style === 'accent'
    ? { bg: accent, text: readableTextOn(accent), shadow: '0 4px 24px rgba(0,0,0,0.14)' }
    : (BUBBLE_CONFIGS[bubble_style] ?? BUBBLE_CONFIGS.light);
  const avatarClass = AVATAR_RADIUS[avatar_style] ?? AVATAR_RADIUS.circle;
  // Links must read against the bubble background: a light bubble text → dark-blue link,
  // a light-on-dark/accent bubble → light-blue link. Underline is applied in CSS.
  const linkColor = luminance(cfg.text) > 0.6 ? '#93c5fd' : '#2563eb';

  const avatar = (
    <div className={`w-14 h-14 overflow-hidden ${avatarClass} ring-2 ring-white/30 shadow-lg`}>
      {avatar_url ? (
        <img src={avatar_url} alt={author_name ?? 'Speaker'} className="w-full h-full object-cover" />
      ) : (
        <div
          className="w-full h-full flex items-center justify-center"
          style={{ backgroundColor: accent, color: readableTextOn(accent) }}
        >
          {author_name ? (
            <span className="text-xl font-black select-none">{author_name[0].toUpperCase()}</span>
          ) : (
            <UserRound className="w-7 h-7 opacity-80" />
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className="w-full">
      {/* ── Speech bubble (full width) ──────────────────────────────── */}
      <div className="relative">
        <div
          className="rounded-2xl px-5 py-4 leading-relaxed overflow-hidden"
          style={{ backgroundColor: cfg.bg, color: cfg.text, boxShadow: cfg.shadow }}
        >
          {/* Message — real rich-text styling (headings, bold, underline, links, lists).
              Colour inherits the bubble text; links use the contrast-aware --sb-link. */}
          <div
            className="rich-text-viewer sb-bubble-content max-w-none break-words [&>:first-child]:mt-0 [&>p:last-child]:mb-0"
            style={{ color: 'inherit', ['--sb-link' as string]: linkColor } as CSSProperties}
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(bubble_text) }}
          />

          {/* Attribution inside the bubble */}
          {(author_name || author_title) && (
            <div className="mt-3 pt-2.5 border-t" style={{ borderColor: `${cfg.text}20` }}>
              {author_name && (
                <p className="text-sm font-bold leading-snug" style={{ color: cfg.text }}>
                  — {author_name}
                </p>
              )}
              {author_title && (
                <p className="text-xs mt-0.5 leading-snug" style={{ color: `${cfg.text}99` }}>
                  {author_title}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Tail — CSS triangle pointing DOWN toward the avatar below, on the chosen side. */}
        <div
          className={`absolute -bottom-[11px] ${isRight ? 'right-8' : 'left-8'}`}
          style={{
            width: 0,
            height: 0,
            borderLeft: '10px solid transparent',
            borderRight: '10px solid transparent',
            borderTop: `12px solid ${cfg.bg}`,
          }}
        />
      </div>

      {/* ── Avatar (below the bubble, under the tail) ───────────────── */}
      <div className={`mt-3 flex ${isRight ? 'justify-end pr-4' : 'justify-start pl-4'}`}>
        <div className="shrink-0">{avatar}</div>
      </div>
    </div>
  );
}

// ── Main Viewer ──────────────────────────────────────────────────────────────

export default function CalloutViewer({ data, context }: BlockViewerProps<CalloutData>) {
  // Default accent cascades from global settings → institution → course theme.
  const accent = context?.theme?.accent || '#1A3C6E';
  if (data.mode === 'speech_bubble') {
    return <SpeechBubbleViewer data={data} accent={accent} />;
  }

  // Default: callout mode. Icon + colours honor per-block overrides, else the variant preset.
  const { className } = VARIANT_CONFIG[data.variant ?? 'info'];
  const Icon = resolveCalloutIcon(data);
  const overrideStyle: CSSProperties = {
    ...(data.bg_color ? { backgroundColor: data.bg_color } : {}),
    ...(data.border_color ? { borderColor: data.border_color } : {}),
    ...(data.text_color ? { color: data.text_color } : {}),
  };
  const textContent = (
    <div className="min-w-0">
      {data.title && (
        <p className="mb-1.5 font-bold text-base leading-snug">{data.title}</p>
      )}
      <div
        className="prose prose-sm max-w-none [&>p:last-child]:mb-0"
        dangerouslySetInnerHTML={{ __html: sanitizeHtml(data.html) }}
      />
    </div>
  );
  return (
    <div className={`flex gap-4 rounded-xl border p-5 ${className}`} style={overrideStyle}>
      {Icon && (
        <Icon
          className="mt-0.5 h-5 w-5 shrink-0"
          style={data.icon_color ? { color: data.icon_color } : undefined}
        />
      )}
      <div className="min-w-0 flex-1">
        <MediaWithContent media={data.media} position={data.media_position ?? 'top'}>
          {textContent}
        </MediaWithContent>
      </div>
    </div>
  );
}
