'use client';

import { Info, AlertTriangle, Lightbulb, CheckCircle, UserRound } from 'lucide-react';
import type { BlockViewerProps } from '@/lib/content/block-registry';
import type { CalloutData } from '@/lib/content/blocks/callout/schema';

const VARIANT_CONFIG = {
  info:    { icon: Info,          className: 'bg-blue-50 border-blue-200 text-blue-900' },
  warning: { icon: AlertTriangle, className: 'bg-yellow-50 border-yellow-200 text-yellow-900' },
  tip:     { icon: Lightbulb,     className: 'bg-green-50 border-green-200 text-green-900' },
  success: { icon: CheckCircle,   className: 'bg-emerald-50 border-emerald-200 text-emerald-900' },
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

function sanitizeHtml(html: string): string {
  return (html ?? '').replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
}

// ── Speech Bubble Viewer ─────────────────────────────────────────────────────

function SpeechBubbleViewer({ data }: { data: CalloutData }) {
  const {
    bubble_text = '',
    author_name,
    author_title,
    avatar_url,
    direction = 'right',
    bubble_style = 'light',
    avatar_style = 'circle',
  } = data;

  const isRight = direction === 'right'; // avatar on the right side
  const cfg = BUBBLE_CONFIGS[bubble_style] ?? BUBBLE_CONFIGS.light;
  const avatarClass = AVATAR_RADIUS[avatar_style] ?? AVATAR_RADIUS.circle;

  return (
    <div className={`flex items-end gap-3 ${!isRight ? 'flex-row-reverse' : ''}`}>
      {/* ── Speech bubble ───────────────────────────────────────────── */}
      <div className="relative flex-1 min-w-0">
        <div
          className="rounded-2xl px-5 py-4 leading-relaxed"
          style={{ backgroundColor: cfg.bg, color: cfg.text, boxShadow: cfg.shadow }}
        >
          {/* Message */}
          <div
            className="prose prose-sm max-w-none [&>p:last-child]:mb-0"
            style={{ color: 'inherit' }}
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(bubble_text) }}
          />

          {/* Attribution inside the bubble */}
          {(author_name || author_title) && (
            <div
              className="mt-3 pt-2.5 border-t"
              style={{ borderColor: `${cfg.text}20` }}
            >
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

        {/* Tail — CSS triangle pointing toward the avatar */}
        <div
          className={`absolute bottom-5 ${isRight ? '-right-[13px]' : '-left-[13px]'}`}
          style={{
            width: 0,
            height: 0,
            borderTop: '9px solid transparent',
            borderBottom: '9px solid transparent',
            ...(isRight
              ? { borderLeft: `13px solid ${cfg.bg}` }
              : { borderRight: `13px solid ${cfg.bg}` }),
          }}
        />
      </div>

      {/* ── Avatar ──────────────────────────────────────────────────── */}
      <div className="shrink-0 flex flex-col items-center gap-1.5">
        <div
          className={`w-14 h-14 overflow-hidden ${avatarClass} ring-2 ring-white/30 shadow-lg`}
        >
          {avatar_url ? (
            <img
              src={avatar_url}
              alt={author_name ?? 'Speaker'}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-indigo-400 to-violet-600 flex items-center justify-center">
              {author_name ? (
                <span className="text-white text-xl font-black select-none">
                  {author_name[0].toUpperCase()}
                </span>
              ) : (
                <UserRound className="w-7 h-7 text-white/80" />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Viewer ──────────────────────────────────────────────────────────────

export default function CalloutViewer({ data }: BlockViewerProps<CalloutData>) {
  if (data.mode === 'speech_bubble') {
    return <SpeechBubbleViewer data={data} />;
  }

  // Default: callout mode
  const { icon: Icon, className } = VARIANT_CONFIG[data.variant ?? 'info'];
  return (
    <div className={`flex gap-4 rounded-xl border p-5 ${className}`}>
      <Icon className="mt-0.5 h-5 w-5 shrink-0" />
      <div className="min-w-0">
        {data.title && (
          <p className="mb-1.5 font-bold text-base leading-snug">{data.title}</p>
        )}
        <div
          className="prose prose-sm max-w-none [&>p:last-child]:mb-0"
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(data.html) }}
        />
      </div>
    </div>
  );
}
