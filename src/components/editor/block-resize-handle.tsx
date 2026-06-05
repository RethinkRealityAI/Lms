'use client';

import { forwardRef } from 'react';
import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

type ResizeHandleAxis = 's' | 'w' | 'e' | 'n' | 'sw' | 'nw' | 'se' | 'ne';

interface BlockResizeHandleProps extends HTMLAttributes<HTMLSpanElement> {
  handleAxis?: ResizeHandleAxis;
}

/**
 * Custom react-grid-layout resize handle — larger hit targets, visible on hover/resize.
 * Must keep `react-resizable-handle` + axis class for RGL wiring.
 */
export const BlockResizeHandle = forwardRef<HTMLSpanElement, BlockResizeHandleProps>(
  function BlockResizeHandle({ handleAxis, className, ...rest }, ref) {
    return (
      <span
        ref={ref}
        {...rest}
        className={cn(
          'react-resizable-handle block-resize-handle',
          handleAxis && `react-resizable-handle-${handleAxis}`,
          handleAxis && `block-resize-handle-${handleAxis}`,
          className,
        )}
        onClick={(e) => e.stopPropagation()}
      />
    );
  },
);

/** Factory for react-grid-layout's `resizeHandle` prop. */
export function renderBlockResizeHandle(axis: ResizeHandleAxis, ref: React.Ref<HTMLElement>) {
  return <BlockResizeHandle ref={ref as React.Ref<HTMLSpanElement>} handleAxis={axis} />;
}
