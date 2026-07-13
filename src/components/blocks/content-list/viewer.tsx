'use client';

import { useId, useMemo, useState, type CSSProperties } from 'react';
import { ChevronDown, Plus, Minus } from 'lucide-react';
import type { BlockViewerProps } from '@/lib/content/block-registry';
import type {
  ContentListBulletStyle,
  ContentListData,
  ContentListFontSize,
  ContentListItem,
  ContentListItemAnimation,
} from '@/lib/content/blocks/content-list/schema';
import { MediaWithContent } from '@/components/blocks/shared/media-view';

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

const FONT_SIZE_CLASS: Record<Exclude<ContentListFontSize, 'auto'>, string> = {
  sm: 'text-sm leading-relaxed',
  md: 'text-base leading-relaxed',
  lg: 'text-lg leading-relaxed',
  xl: 'text-xl leading-relaxed',
};

const ITEM_ANIMATION_NAME: Record<ContentListItemAnimation, string> = {
  none: 'crossfade',
  left: 'slideFromLeft',
  right: 'slideFromRight',
  up: 'slideFromUp',
  down: 'slideFromDown',
};

function listTagForBulletStyle(style: ContentListBulletStyle): 'ul' | 'ol' {
  return style === 'decimal' ? 'ol' : 'ul';
}

function listStyleForBullet(style: ContentListBulletStyle): CSSProperties['listStyleType'] {
  switch (style) {
    case 'disc':
      return 'disc';
    case 'circle':
      return 'circle';
    case 'square':
      return 'square';
    case 'decimal':
      return 'decimal';
    case 'dash':
    case 'none':
      return 'none';
    default:
      return 'disc';
  }
}

function initialOpenSet(mode: string | undefined, count: number): Set<number> {
  if (mode === 'all') return new Set(Array.from({ length: count }, (_, i) => i));
  if (mode === 'first' && count > 0) return new Set([0]);
  return new Set();
}

// ─── Accordion ────────────────────────────────────────────────────────────────

/** Resolve an item's entrance direction: the shared direction when uniform, else its own. */
function resolveItemAnimation(
  data: ContentListData,
  item: ContentListItem,
  fallback: ContentListItemAnimation,
): ContentListItemAnimation {
  if (data.animation_uniform) return data.animation_direction ?? fallback;
  return item.animation ?? fallback;
}

function AccordionView({
  items,
  data,
  sizeClass,
  enableAnimations,
  staggerMs,
  durationMs,
  themeAccent,
}: {
  items: ContentListItem[];
  data: ContentListData;
  sizeClass: string;
  enableAnimations: boolean;
  staggerMs: number;
  durationMs: number;
  themeAccent?: string;
}) {
  const baseId = useId();
  // Default accent cascades from global settings → institution → course theme.
  const accent = data.accordion_accent_color || themeAccent || DEFAULT_ACCENT;
  const iconKind = data.accordion_icon ?? 'caret';
  const iconAtStart = (data.accordion_icon_position ?? 'right') === 'left';
  const allowMultiple = data.accordion_multiple ?? false;

  const [open, setOpen] = useState<Set<number>>(() =>
    initialOpenSet(data.accordion_default_open, items.length),
  );

  const toggle = (index: number) => {
    setOpen((prev) => {
      const next = new Set(allowMultiple ? prev : []);
      if (prev.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  return (
    <div className={`content-list-accordion space-y-2 ${sizeClass}`.trim()}>
      {items.map((item, index) => {
        const isOpen = open.has(index);
        const title = item.title?.trim() || `Item ${index + 1}`;
        const headerId = `${baseId}-h-${index}`;
        const panelId = `${baseId}-p-${index}`;

        const itemAnim = resolveItemAnimation(data, item, 'up');
        const shouldAnimate = enableAnimations && itemAnim !== 'none';
        const cardStyle: CSSProperties = shouldAnimate
          ? {
              animationName: ITEM_ANIMATION_NAME[itemAnim],
              animationDelay: `${index * staggerMs}ms`,
              animationDuration: `${durationMs}ms`,
            }
          : {};

        const Icon = iconKind === 'plus' ? (isOpen ? Minus : Plus) : ChevronDown;

        const iconEl = (
          <span
            className="content-list-accordion__icon shrink-0 flex items-center justify-center w-6 h-6 rounded-full transition-all duration-300 ring-1"
            style={{
              color: isOpen ? '#fff' : 'var(--surface-text-muted, #475569)',
              backgroundColor: isOpen ? accent : 'var(--surface-chip-bg, rgba(255,255,255,0.85))',
              ...({
                '--tw-ring-color': isOpen ? accent : 'var(--surface-chip-border, rgba(148,163,184,0.42))',
              } as CSSProperties),
            }}
            aria-hidden="true"
          >
            <Icon
              className={`w-4 h-4 transition-transform duration-300 ${
                iconKind === 'caret' && isOpen ? 'rotate-180' : ''
              }`}
              strokeWidth={2.5}
            />
          </span>
        );

        return (
          <div
            key={index}
            className={`content-list-accordion__item rounded-xl border overflow-hidden backdrop-blur-md transition-colors duration-200 ${
              isOpen ? 'content-list-accordion__item--open' : ''
            } ${shouldAnimate ? 'content-list-item-animate' : ''}`}
            style={{
              ...cardStyle,
              // Frosted glass surface is provided by CSS (adapts to the slide's
              // block-surface mode). Only the theme-dynamic accent is set inline.
              color: 'var(--surface-text, #0f172a)',
              ...(isOpen
                ? { borderColor: accent, boxShadow: `inset 0 0 0 1px ${accent}33` }
                : {}),
            }}
          >
            <h3 className="m-0">
              <button
                type="button"
                id={headerId}
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => toggle(index)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left font-semibold cursor-pointer select-none transition-colors hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset ${
                  iconAtStart ? 'flex-row' : 'flex-row-reverse'
                }`}
                style={{
                  color: 'var(--surface-text, #0f172a)',
                  ...({ '--tw-ring-color': accent } as CSSProperties),
                }}
              >
                {iconEl}
                <span className="flex-1 min-w-0 leading-snug">{title}</span>
              </button>
            </h3>

            <div
              id={panelId}
              role="region"
              aria-labelledby={headerId}
              className={`grid transition-[grid-template-rows] duration-300 ease-out ${
                isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
              }`}
            >
              <div className="overflow-hidden">
                <div
                  className="px-4 pb-4 pt-0 rich-text-viewer prose max-w-none [&_p]:my-1.5 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0"
                  style={{
                    color: data.text_color || 'var(--surface-text, #0f172a)',
                    opacity: 0.92,
                  }}
                  dangerouslySetInnerHTML={{ __html: sanitizeHtml(item.html) }}
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── List (classic bulleted) ────────────────────────────────────────────────────

function ListView({
  items,
  data,
  sizeClass,
  enableAnimations,
  staggerMs,
  durationMs,
}: {
  items: ContentListItem[];
  data: ContentListData;
  sizeClass: string;
  enableAnimations: boolean;
  staggerMs: number;
  durationMs: number;
}) {
  const bulletStyle = data.bullet_style ?? 'disc';
  const ListTag = listTagForBulletStyle(bulletStyle);
  const isDash = bulletStyle === 'dash';

  const listStyle: CSSProperties = {
    listStyleType: listStyleForBullet(bulletStyle),
    ...(data.bullet_color ? { ['--content-list-marker-color' as string]: data.bullet_color } : {}),
  };

  if (items.length === 0) return null;

  return (
    <ListTag
      className={[
        'm-0 pl-5 space-y-2',
        sizeClass,
        isDash ? 'content-list-dash' : '',
        data.bullet_color ? 'content-list-colored-markers' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      style={listStyle}
    >
      {items.map((item, index) => {
        const itemAnim = resolveItemAnimation(data, item, 'left');
        const shouldAnimate = enableAnimations && itemAnim !== 'none';

        const liStyle: CSSProperties | undefined = shouldAnimate
          ? {
              animationName: ITEM_ANIMATION_NAME[itemAnim],
              animationDelay: `${index * staggerMs}ms`,
              animationDuration: `${durationMs}ms`,
            }
          : undefined;

        return (
          <li
            key={index}
            className={shouldAnimate ? 'content-list-item-animate' : undefined}
            style={liStyle}
          >
            <div
              className="rich-text-viewer prose max-w-none [&_p]:m-0"
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(item.html) }}
            />
          </li>
        );
      })}
    </ListTag>
  );
}

export default function ContentListViewer({ data, context }: BlockViewerProps<ContentListData>) {
  const items = useMemo(() => data.items ?? [], [data.items]);
  const themeAccent = context?.theme?.accent;
  const fontSize = data.font_size ?? 'auto';
  const enableAnimations = data.enable_animations ?? true;
  const staggerMs = data.animation_stagger_ms ?? 120;
  const durationMs = data.animation_duration_ms ?? 500;
  const isAccordion = (data.display_mode ?? 'list') === 'accordion';

  const sizeClass = fontSize === 'auto' ? '' : FONT_SIZE_CLASS[fontSize];

  const rootColorStyle: CSSProperties | undefined = data.text_color
    ? { color: data.text_color }
    : undefined;

  const listContent = (
    <div className="space-y-3">
      {data.heading ? (
        <h3
          className="font-semibold tracking-tight m-0"
          style={data.text_color ? { color: data.text_color } : undefined}
        >
          {data.heading}
        </h3>
      ) : null}

      {isAccordion ? (
        <AccordionView
          items={items}
          data={data}
          sizeClass={sizeClass}
          enableAnimations={enableAnimations}
          staggerMs={staggerMs}
          durationMs={durationMs}
          themeAccent={themeAccent}
        />
      ) : (
        <ListView
          items={items}
          data={data}
          sizeClass={sizeClass}
          enableAnimations={enableAnimations}
          staggerMs={staggerMs}
          durationMs={durationMs}
        />
      )}
    </div>
  );

  return (
    <div className={`content-list-viewer ${sizeClass}`.trim()} style={rootColorStyle}>
      <MediaWithContent media={data.media} position={data.media_position ?? 'left'}>
        {listContent}
      </MediaWithContent>
    </div>
  );
}
