'use client';

import type { ReactNode } from 'react';

export interface SlideFrameProps {
  lessonTitle: string;
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

  return (
    <div className="flex flex-col h-full bg-white overflow-hidden">
      <div className="px-5 pt-3 pb-3 shrink-0 border-b border-slate-100">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-black uppercase tracking-widest text-[#1E3A5F] truncate pr-4">
            {lessonTitle}
          </span>
          <span className="text-sm font-bold text-slate-500 shrink-0">
            {currentSlide} / {totalSlides}
          </span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-[3px]">
          <div
            className="bg-[#1E3A5F] h-[3px] rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col">
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
  return (
    <div className="px-3 py-3 sm:px-5 sm:py-4 overflow-y-auto flex-1 flex flex-col gap-4">
      {children}
    </div>
  );
}
