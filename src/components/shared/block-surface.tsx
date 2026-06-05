import { cn } from '@/lib/utils';
import { DEFAULT_BLOCK_STYLE, getBlockContainerBase } from '@/lib/content/gridConstants';

interface BlockSurfaceProps {
  /** Slide `settings.block_style` — defaults to light glass */
  blockStyle?: string;
  children: React.ReactNode;
  className?: string;
  /** Edge-to-edge content (video, full-bleed media) — skips inner padding */
  flush?: boolean;
  /** When false, the surface hugs content instead of filling the grid cell height */
  fillCell?: boolean;
  /** Minimum surface height in rem. The editor's auto-measure rides this so the
   *  persisted grid height grows to match (height control / sole-block fill). */
  minHeightRem?: number;
}

/**
 * Single visual container for a grid block. The surface is the draggable/resizable
 * cell content — viewers should not add their own card chrome on top.
 */
export function BlockSurface({ blockStyle, children, className, flush, fillCell = true, minHeightRem }: BlockSurfaceProps) {
  const resolved = blockStyle ?? DEFAULT_BLOCK_STYLE;
  const skin = getBlockContainerBase(resolved);

  return (
    <div
      data-block-style={resolved}
      style={minHeightRem ? { minHeight: `${minHeightRem}rem` } : undefined}
      className={cn(
        'w-full min-h-0 flex flex-col rounded-2xl',
        fillCell ? 'h-full' : 'h-auto',
        flush ? 'overflow-hidden' : 'overflow-visible',
        skin,
        className,
      )}
    >
      <div className={cn(
        'relative z-[1] w-full min-w-0 flex flex-col',
        flush ? 'flex-1 min-h-0 h-full' : 'min-h-0',
        flush ? '' : 'p-4 @md:p-5',
      )}>
        {children}
      </div>
    </div>
  );
}
