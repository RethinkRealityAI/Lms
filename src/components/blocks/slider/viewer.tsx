'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import type { BlockViewerProps } from '@/lib/content/block-registry';
import type { SliderData } from '@/lib/content/blocks/slider/schema';
import { BLOCK_CONTENT_SHELL, surfaceMutedClass } from '@/lib/content/block-surface-tokens';

const THUMB_RADIUS = 12; // 24px diameter thumb

function sanitizeHtml(html: string): string {
  return (html ?? '').replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
}

export default function SliderViewer({ data, context, onComplete }: BlockViewerProps<SliderData>) {
  const {
    question = '',
    min_value = 1,
    max_value = 10,
    default_value,
    increment = 1,
    decimals = 0,
    min_label,
    max_label,
    prefix = '',
    suffix = '',
    prompt,
    show_ticks = true,
    required = false,
  } = data;

  // Themeable accent (course → institution → fallback navy).
  const accent = context?.theme?.sliderAccent || '#1A3C6E';

  const clampedDefault =
    default_value !== undefined
      ? Math.min(Math.max(default_value, min_value), max_value)
      : min_value + Math.round(((max_value - min_value) / 2) / increment) * increment;

  const [value, setValue] = useState(clampedDefault);
  const [hasInteracted, setHasInteracted] = useState(false);

  const format = (v: number) => `${prefix}${parseFloat(v.toFixed(decimals))}${suffix}`;

  const range = max_value - min_value;
  const percentage = range === 0 ? 0 : ((value - min_value) / range) * 100;
  const tooltipLeft = `calc(${percentage}% + ${THUMB_RADIUS - percentage * (2 * THUMB_RADIUS) / 100}px)`;

  const steps = range > 0 ? Math.round(range / increment) : 0;
  const showTickNumbers = show_ticks && steps > 0 && steps <= 20;
  const ticks = showTickNumbers
    ? Array.from({ length: steps + 1 }, (_, i) => min_value + i * increment)
    : [];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue(Number(e.target.value));
    if (!hasInteracted) {
      setHasInteracted(true);
      onComplete?.();
    }
  };

  const handlePointerDown = () => {
    if (!hasInteracted) {
      setHasInteracted(true);
      onComplete?.();
    }
  };

  return (
    <div className={cn(BLOCK_CONTENT_SHELL, 'space-y-5')}>
      {question && (
        <div className="flex items-start gap-1.5 justify-center">
          <div
            className="text-lg font-semibold text-center leading-snug text-[color:var(--surface-text)] [&>p]:mb-0 [&>p:empty]:hidden"
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(question) }}
          />
          {required && (
            <span className="text-red-500 text-lg font-bold leading-none mt-0.5 shrink-0" title="Required">*</span>
          )}
        </div>
      )}

      {/* Prompt */}
      {prompt && (
        <p className={cn('text-xs font-medium uppercase tracking-widest text-center', surfaceMutedClass())}>
          {prompt}
        </p>
      )}

      <div className="px-1 pt-8 pb-1">
        <div className="relative">
          {/* Floating value tooltip */}
          <div
            className="absolute -top-8 -translate-x-1/2 pointer-events-none transition-[left] duration-75"
            style={{ left: tooltipLeft }}
          >
            <div className="text-white text-sm font-bold px-2.5 py-1 rounded-lg shadow-md whitespace-nowrap" style={{ backgroundColor: accent }}>
              {format(value)}
            </div>
            <div className="w-2 h-2 rotate-45 mx-auto -mt-1 rounded-sm" style={{ backgroundColor: accent }} />
          </div>

          {/* Range input */}
          <input
            type="range"
            min={min_value}
            max={max_value}
            step={increment}
            value={value}
            onChange={handleChange}
            onPointerDown={handlePointerDown}
            className={[
              'w-full h-2 rounded-full appearance-none cursor-pointer',
              '[&::-webkit-slider-thumb]:appearance-none',
              '[&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:w-6',
              '[&::-webkit-slider-thumb]:rounded-full',
              '[&::-webkit-slider-thumb]:bg-white',
              '[&::-webkit-slider-thumb]:shadow-[0_1px_4px_rgba(0,0,0,0.25)]',
              '[&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-[color:var(--slider-accent)]',
              '[&::-webkit-slider-thumb]:cursor-grab [&::-webkit-slider-thumb]:active:cursor-grabbing',
              '[&::-webkit-slider-thumb]:transition-transform',
              '[&::-webkit-slider-thumb]:hover:scale-110',
              '[&::-moz-range-thumb]:h-6 [&::-moz-range-thumb]:w-6',
              '[&::-moz-range-thumb]:rounded-full',
              '[&::-moz-range-thumb]:bg-white',
              '[&::-moz-range-thumb]:shadow-[0_1px_4px_rgba(0,0,0,0.25)]',
              '[&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-[color:var(--slider-accent)]',
              '[&::-moz-range-thumb]:cursor-grab',
            ].join(' ')}
            style={{
              ['--slider-accent' as string]: accent,
              background: `linear-gradient(to right, ${accent} 0%, ${accent} ${percentage}%, #e2e8f0 ${percentage}%, #e2e8f0 100%)`,
            }}
          />
        </div>

        {/* Tick numbers */}
        {showTickNumbers && (
          <div className="flex justify-between mt-2">
            {ticks.map((tick) => (
              <span key={tick} className={cn('text-xs font-medium leading-none', surfaceMutedClass())}>
                {parseFloat(tick.toFixed(decimals))}
              </span>
            ))}
          </div>
        )}

        {/* Min / max labels */}
        {(min_label || max_label) && (
          <div className="flex justify-between mt-1.5">
            <span className={cn('text-xs max-w-[42%] leading-tight', surfaceMutedClass())}>{min_label ?? ''}</span>
            <span className={cn('text-xs max-w-[42%] text-right leading-tight', surfaceMutedClass())}>{max_label ?? ''}</span>
          </div>
        )}
      </div>

      {/* Required indicator below the slider */}
      {required && !hasInteracted && (
        <p className="text-xs text-red-500 text-center font-medium">
          Please select a value to continue
        </p>
      )}
    </div>
  );
}
