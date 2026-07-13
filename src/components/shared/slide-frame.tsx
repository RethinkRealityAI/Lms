'use client';

import type { ReactNode } from 'react';

export interface SlideFrameProps {
  lessonTitle: string;
  slideTitle?: string | null;
  slideTitleColor?: string;
  /** Course-level header theming (from global course settings). All optional. */
  lessonTitleColor?: string;
  numberColor?: string;
  progressColor?: string;
  progressTrackColor?: string;
  currentSlide: number;
  totalSlides: number;
  children: ReactNode;
  showNav?: boolean;
  onPrev?: () => void;
  onNext?: () => void;
  isPrevDisabled?: boolean;
  isNextDisabled?: boolean;
  hideNext?: boolean;
}

export function SlideFrame({
  lessonTitle,
  slideTitle,
  slideTitleColor,
  lessonTitleColor,
  numberColor,
  progressColor,
  progressTrackColor,
  currentSlide,
  totalSlides,
  children,
  showNav = false,
  onPrev,
  onNext,
  isPrevDisabled,
  isNextDisabled,
  hideNext,
}: SlideFrameProps) {
  const progress = totalSlides > 0 ? ((currentSlide) / totalSlides) * 100 : 0;
  const eyebrowColor = lessonTitleColor || '#64748b';
  const headlineColor = slideTitleColor || '#0F172A';
  const barColor = progressColor || '#1E3A5F';

  return (
    <div className="flex flex-col h-full bg-white overflow-hidden">
      <div className="px-5 pt-3 pb-3 shrink-0 border-b border-slate-100">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="min-w-0">
            {/* Lesson title = small eyebrow / kicker */}
            <span
              className="text-[11px] font-bold uppercase tracking-wider block break-words leading-tight"
              style={{ color: eyebrowColor }}
            >
              {lessonTitle}
            </span>
            {/* Slide title = the prominent headline the learner should focus on */}
            {slideTitle && (
              <span
                className="text-lg sm:text-xl font-black block break-words leading-tight mt-0.5"
                style={{ color: headlineColor }}
              >
                {slideTitle}
              </span>
            )}
          </div>
          <span
            className="text-sm font-bold shrink-0 tabular-nums pt-0.5"
            style={{ color: numberColor || '#64748b' }}
          >
            {currentSlide} / {totalSlides}
          </span>
        </div>
        <div
          className="w-full rounded-full h-[3px]"
          style={{ backgroundColor: progressTrackColor || '#f1f5f9' }}
        >
          <div
            className="h-[3px] rounded-full transition-all duration-300"
            style={{ width: `${progress}%`, backgroundColor: barColor }}
          />
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
        {children}
      </div>

      {showNav && (
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 shrink-0">
          <button
            onClick={onPrev}
            disabled={isPrevDisabled}
            className="inline-flex items-center px-4 py-2 text-sm font-bold border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          {!hideNext && (
            <button
              onClick={onNext}
              disabled={isNextDisabled}
              className="inline-flex items-center px-4 py-2 text-sm font-bold bg-[#1E3A5F] hover:bg-[#0F172A] text-white rounded-lg disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function SlideContentArea({ children }: { children: ReactNode }) {
  // `slide-cq` makes this a query container (see globals.css) so blocks respond
  // to the slide width, not the viewport — keeping editor preview ≈ real device.
  // Outer padding is intentionally minimal: per-block containers own the padding.
  return (
    <div className="slide-cq px-1.5 py-1.5 overflow-y-auto flex-1 min-h-0 flex flex-col gap-2.5">
      {children}
    </div>
  );
}
