'use client';

import type { CSSProperties } from 'react';
import { ExternalLink } from 'lucide-react';
import type { BlockViewerProps } from '@/lib/content/block-registry';
import type { CtaData, CtaFontSize, CtaRadius } from '@/lib/content/blocks/cta/schema';

const DEFAULT_ACCENT = '#1E3A5F';

const FONT_SIZE_CLASS: Record<CtaFontSize, string> = {
  sm: 'text-sm px-4 py-2 gap-1.5',
  md: 'text-base px-6 py-3 gap-2',
  lg: 'text-lg px-7 py-3.5 gap-2',
  xl: 'text-xl px-8 py-4 gap-2.5',
};

const ICON_SIZE_CLASS: Record<CtaFontSize, string> = {
  sm: 'h-3.5 w-3.5',
  md: 'h-4 w-4',
  lg: 'h-5 w-5',
  xl: 'h-5 w-5',
};

const RADIUS_CLASS: Record<CtaRadius, string> = {
  none: 'rounded-none',
  md: 'rounded-lg',
  lg: 'rounded-xl',
  full: 'rounded-full',
};

const ALIGN_CLASS: Record<string, string> = {
  left: 'items-start text-left',
  center: 'items-center text-center',
  right: 'items-end text-right',
};

/** #RRGGBB → rgba() with the given alpha; passthrough for anything else. */
function withAlpha(hex: string, alpha: number): string {
  const m = /^#([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return hex;
  const int = parseInt(m[1], 16);
  const r = (int >> 16) & 255;
  const g = (int >> 8) & 255;
  const b = int & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export default function CtaViewer({ data }: BlockViewerProps<CtaData>) {
  // Handle legacy navigation CTAs — render nothing (footer handles navigation now)
  const legacyAction = (data as Record<string, unknown>).action as string | undefined;
  if (legacyAction === 'complete_lesson' || legacyAction === 'next_lesson') {
    return null;
  }

  const accent = data.button_color || DEFAULT_ACCENT;
  const style = data.button_style ?? 'solid';
  const fontSize = data.font_size ?? 'md';
  const align = data.align ?? 'center';
  const radius = data.radius ?? 'lg';
  const fullWidth = data.full_width ?? false;
  const showIcon = data.show_icon !== false;
  const hasUrl = !!data.url;

  // Resolve per-style colours. Border uses longhand props (width/style/color) so the
  // border colour is reliably reflected regardless of CSSOM shorthand handling.
  let buttonStyle: CSSProperties;
  if (style === 'outline') {
    buttonStyle = {
      backgroundColor: 'transparent',
      color: data.text_color || accent,
      borderWidth: '2px',
      borderStyle: 'solid',
      borderColor: accent,
    };
  } else if (style === 'soft') {
    buttonStyle = {
      backgroundColor: withAlpha(accent, 0.14),
      color: data.text_color || accent,
      borderWidth: '2px',
      borderStyle: 'solid',
      borderColor: 'transparent',
    };
  } else {
    buttonStyle = {
      backgroundColor: accent,
      color: data.text_color || '#ffffff',
      borderWidth: '2px',
      borderStyle: 'solid',
      borderColor: 'transparent',
    };
  }

  const buttonClass = [
    'inline-flex items-center justify-center font-semibold transition-[filter,background-color,box-shadow] duration-200',
    FONT_SIZE_CLASS[fontSize],
    RADIUS_CLASS[radius],
    fullWidth ? 'w-full' : '',
    hasUrl ? 'hover:brightness-95 active:brightness-90 shadow-sm' : 'opacity-60 cursor-default',
  ]
    .filter(Boolean)
    .join(' ');

  const label = data.button_label || 'Click Here';
  const icon = showIcon ? <ExternalLink className={ICON_SIZE_CLASS[fontSize]} /> : null;

  return (
    <div className={`flex flex-col gap-3 py-4 ${ALIGN_CLASS[align]} ${fullWidth ? 'w-full' : ''}`}>
      {data.text && (
        <p
          className="text-base leading-relaxed"
          style={{ color: data.description_color || 'var(--surface-text, #374151)' }}
        >
          {data.text}
        </p>
      )}
      {hasUrl ? (
        <a
          href={data.url}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonClass}
          style={buttonStyle}
        >
          {label}
          {icon}
        </a>
      ) : (
        <div className={buttonClass} style={buttonStyle} title="No URL set — add a link in the block settings">
          {label}
          {icon}
        </div>
      )}
    </div>
  );
}
